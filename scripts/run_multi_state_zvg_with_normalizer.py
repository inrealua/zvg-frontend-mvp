#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Stage142 multi-state ZVG runner.

It reuses:
- your current parser: Sachsen_zvg.py
- your current normalizer: scripts/run_sachsen_zvg_with_normalizer.py

It does not touch frontend files.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import os
import re
import sys
import hashlib
from pathlib import Path
from typing import Any
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse

BAD_COURTS = {"", "in sachsen", "internetseite des gerichtes", "internetseite des gerichts"}


def clean_text(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "").replace("\xa0", " ")).strip()


def slugify(value: Any, fallback: str = "unknown") -> str:
    text = clean_text(value) or fallback
    text = text.replace("Ä", "Ae").replace("Ö", "Oe").replace("Ü", "Ue")
    text = text.replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
    text = re.sub(r"[^A-Za-z0-9]+", "_", text).strip("_")
    return (text[:100] or fallback)


def sha1_text(value: Any) -> str:
    return hashlib.sha1(str(value).encode("utf-8", errors="ignore")).hexdigest()


def sha1_bytes(data: bytes) -> str:
    return hashlib.sha1(data).hexdigest()


def load_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8", errors="ignore"))
    except Exception:
        return {}


def save_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def import_module_from_file(name: str, file: Path) -> Any:
    spec = importlib.util.spec_from_file_location(name, str(file.resolve()))
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot import {file}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def extract_zvg_id(url: str) -> str | None:
    m = re.search(r"[?&]zvg_id=([0-9]+)", str(url or ""))
    return m.group(1) if m else None


def normalize_az(value: Any) -> str:
    text = clean_text(value).replace("(Detailansicht)", "").strip().upper().replace("_", " ")
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"([0-9])\s*K\s*([0-9])", r"\1 K \2", text, flags=re.I)
    return text


def item_court(item: dict[str, Any], state_name: str) -> str:
    value = clean_text(item.get("amtsgericht") or item.get("gericht") or item.get("court") or "")
    if value and value.lower() not in BAD_COURTS:
        return value if value.lower().startswith("amtsgericht") else f"Amtsgericht {value}"
    return f"unknown-court-{state_name}"


def make_case_identity(state_slug: str, state_cfg: dict[str, Any], item: dict[str, Any]) -> tuple[str, str, str]:
    court_name = item_court(item, state_cfg.get("name", state_slug))
    court_slug = slugify(court_name, "unknown_court")
    az = normalize_az(item.get("aktenzeichen") or "")
    az_slug = slugify(az, "unknown_az")
    url = clean_text(item.get("detail_url") or item.get("bekanntmachung_url") or "")
    zvg_id = extract_zvg_id(url)
    if zvg_id:
        suffix = f"zvg_{state_cfg.get('land_abk', state_slug)}_{zvg_id}"
    else:
        raw = "|".join([
            state_slug, court_name, az,
            clean_text(item.get("objekt_lage")),
            clean_text(item.get("termin_raw") or item.get("termin")),
            clean_text(item.get("aktualisierung")),
        ])
        suffix = "hash_" + sha1_text(raw)[:12]
    return court_slug, f"{az_slug}__{suffix}", court_name


def item_signature(item: dict[str, Any]) -> dict[str, Any]:
    termin_raw = clean_text(item.get("termin_raw") or item.get("termin") or "")
    status_raw = clean_text(item.get("termin_status") or "")
    cancelled = str(item.get("is_cancelled", "")).strip() == "1" or status_raw.lower() == "cancelled" or "aufgehoben" in termin_raw.lower()
    attachments = item.get("attachments")
    return {
        "aktenzeichen": normalize_az(item.get("aktenzeichen")),
        "aktualisierung": clean_text(item.get("aktualisierung")),
        "terminRaw": termin_raw,
        "terminStatus": status_raw,
        "isCancelled": cancelled,
        "detailUrl": clean_text(item.get("detail_url")),
        "bekanntmachungUrl": clean_text(item.get("bekanntmachung_url")),
        "attachmentsCount": len(attachments) if isinstance(attachments, list) else None,
    }


def material_manifest(folder: Path) -> dict[str, Any]:
    files = []
    if folder.exists():
        for p in sorted(folder.rglob("*")):
            if not p.is_file():
                continue
            if p.name.startswith("_stage142_") or p.name.startswith("."):
                continue
            try:
                b = p.read_bytes()
                files.append({"path": p.relative_to(folder).as_posix(), "size": len(b), "sha1": sha1_bytes(b)})
            except Exception:
                continue
    return {"fileCount": len(files), "files": files, "hash": sha1_text(json.dumps(files, sort_keys=True, ensure_ascii=False))}


def existing_is_current(target_dir: Path, item: dict[str, Any]) -> bool:
    if not (target_dir / "detail.json").exists():
        return False
    old = load_json(target_dir / "_stage142_download_state.json")
    new = item_signature(item)
    if new.get("isCancelled") and not old.get("isCancelled"):
        return False
    for key in ["aktualisierung", "terminRaw", "terminStatus", "isCancelled", "detailUrl", "bekanntmachungUrl", "attachmentsCount"]:
        if old.get(key) != new.get(key):
            return False
    return True


def force_redownload_if_changed(target_dir: Path, item: dict[str, Any]) -> None:
    if existing_is_current(target_dir, item):
        return
    detail = target_dir / "detail.json"
    if detail.exists():
        backup = target_dir / "detail.previous-stage142.json"
        try:
            if backup.exists():
                backup.unlink()
            detail.rename(backup)
        except Exception:
            pass


def patch_parser_for_state(module: Any, normalizer: Any, state_slug: str, state_cfg: dict[str, Any], data_root: Path, normalized_root: Path, force_normalize: bool) -> None:
    land_abk = state_cfg["land_abk"]
    state_name = state_cfg.get("name", state_slug)
    state_data_root = data_root / state_slug
    state_data_root.mkdir(parents=True, exist_ok=True)

    # Original parser posts data={"land_abk": LAND_ABK}; replacing this makes it multi-state.
    for attr in ["LAND_ABK", "land_abk"]:
        if hasattr(module, attr):
            setattr(module, attr, land_abk)

    for attr in ["DOWNLOAD_ROOT", "OUTPUT_ROOT", "DATA_ROOT"]:
        if hasattr(module, attr):
            try:
                setattr(module, attr, state_data_root)
            except Exception:
                pass

    for attr, file_name in {
        "SEARCH_CSV": f"{state_slug}_zvg_search_results_with_links.csv",
        "DETAILS_CSV": f"{state_slug}_zvg_details.csv",
        "FAILED_CSV": f"{state_slug}_zvg_failed.csv",
    }.items():
        if hasattr(module, attr):
            try:
                setattr(module, attr, state_data_root / file_name)
            except Exception:
                pass

    if hasattr(module, "requests"):
        original_request = module.requests.sessions.Session.request
        def request_with_state(self, method, url, **kwargs):
            data = kwargs.get("data")
            if isinstance(data, dict):
                data = dict(data)
                data["land_abk"] = land_abk
                kwargs["data"] = data
            try:
                parsed = urlparse(str(url))
                qs = parse_qs(parsed.query)
                if "land_abk" in qs:
                    qs["land_abk"] = [land_abk]
                    url = urlunparse(parsed._replace(query=urlencode(qs, doseq=True)))
            except Exception:
                pass
            return original_request(self, method, url, **kwargs)
        module.requests.sessions.Session.request = request_with_state

    if hasattr(module, "make_object_dir_from_item"):
        def make_object_dir_from_item_stage142(item):
            court_slug, case_key, court_name = make_case_identity(state_slug, state_cfg, item)
            target_dir = state_data_root / court_slug / case_key
            target_dir.mkdir(parents=True, exist_ok=True)
            save_json(target_dir / "_stage142_search_item.json", {
                "stateSlug": state_slug, "stateName": state_name, "landAbk": land_abk,
                "courtName": court_name, "courtSlug": court_slug, "caseKey": case_key, "item": item,
            })
            force_redownload_if_changed(target_dir, item)
            return target_dir
        module.make_object_dir_from_item = make_object_dir_from_item_stage142

    original_write_status_file = getattr(module, "write_status_file", None)
    if original_write_status_file:
        def write_status_file_stage142(obj_dir: Path, data: dict):
            original_write_status_file(obj_dir, data)
            obj = Path(obj_dir)
            meta = load_json(obj / "_stage142_search_item.json")
            item = meta.get("item") or data or {}
            state_sig = item_signature(item)
            save_json(obj / "_stage142_download_state.json", state_sig)

            court_slug = meta.get("courtSlug") or slugify(item_court(data, state_name), "unknown_court")
            case_key = meta.get("caseKey") or obj.name
            out_parent = normalized_root / state_slug / court_slug
            out_dir = out_parent / case_key
            out_dir.mkdir(parents=True, exist_ok=True)

            new_manifest = material_manifest(obj)
            old_manifest = load_json(out_dir / "_stage142_material_manifest.json")
            if (not force_normalize) and old_manifest.get("hash") == new_manifest.get("hash"):
                print(f"[STAGE142 SKIP NORMALIZE] {state_slug}/{court_slug}/{case_key} unchanged")
                return

            try:
                n = normalizer.normalize_object_folder(obj, out_parent)
                n.setdefault("source", {})
                n["source"].update({
                    "stateSlug": state_slug,
                    "stateName": state_name,
                    "landAbk": land_abk,
                    "courtSlug": court_slug,
                    "caseKey": case_key,
                })
                zvg_id = extract_zvg_id(str(n["source"].get("detailUrl") or data.get("detail_url") or ""))
                if zvg_id:
                    n["source"]["externalId"] = f"zvg-portal_{land_abk}_{zvg_id}"
                elif not n["source"].get("externalId"):
                    n["source"]["externalId"] = f"zvg-portal_{land_abk}_{court_slug}_{case_key}"
                normalizer.save_json(out_dir / "normalized.json", n)
                normalizer.save_json(out_dir / "quality_report.json", n.get("quality", {}))
                save_json(out_dir / "_stage142_material_manifest.json", new_manifest)
                print(f"[STAGE142 NORMALIZED] {state_slug}/{court_slug}/{case_key} files={new_manifest['fileCount']}")
            except Exception as exc:
                print(f"[STAGE142 NORMALIZE ERROR] {obj}: {exc}", file=sys.stderr)
        module.write_status_file = write_status_file_stage142


def load_states(config_path: Path, selected: str) -> dict[str, Any]:
    cfg = load_json(config_path)
    if not cfg:
        raise RuntimeError(f"Invalid states config: {config_path}")
    if selected.lower().strip() in {"all", "*"}:
        return {k: v for k, v in cfg.items() if v.get("enabled", True)}
    names = [x.strip() for x in selected.split(",") if x.strip()]
    missing = [x for x in names if x not in cfg]
    if missing:
        raise RuntimeError(f"Unknown states: {missing}. Add them to {config_path}")
    return {k: cfg[k] for k in names}


def run_state(parser_path: Path, normalizer_path: Path, state_slug: str, state_cfg: dict[str, Any], data_root: Path, normalized_root: Path, force_normalize: bool) -> int:
    normalizer = import_module_from_file(f"stage142_normalizer_{state_slug}", normalizer_path)
    parser = import_module_from_file(f"stage142_parser_{state_slug}", parser_path)
    if hasattr(normalizer, "patch_original_parser_ssl"):
        normalizer.patch_original_parser_ssl(parser)
    patch_parser_for_state(parser, normalizer, state_slug, state_cfg, data_root, normalized_root, force_normalize)
    print(f"\n=== STAGE142 {state_slug} / {state_cfg.get('name')} / land_abk={state_cfg.get('land_abk')} ===")
    return int(parser.main() or 0)


def normalize_existing(normalizer_path: Path, data_root: Path, normalized_root: Path, force_normalize: bool) -> int:
    normalizer = import_module_from_file("stage142_normalizer_existing", normalizer_path)
    ok = skipped = failed = 0
    for folder in sorted(data_root.glob("*/*/*")):
        if not folder.is_dir() or not ((folder / "detail.json").exists() or list(folder.glob("*.pdf"))):
            continue
        state_slug, court_slug, case_key = folder.relative_to(data_root).parts[:3]
        out_parent = normalized_root / state_slug / court_slug
        out_dir = out_parent / case_key
        new_manifest = material_manifest(folder)
        old_manifest = load_json(out_dir / "_stage142_material_manifest.json")
        if (not force_normalize) and old_manifest.get("hash") == new_manifest.get("hash"):
            print(f"[STAGE142 SKIP NORMALIZE] {state_slug}/{court_slug}/{case_key} unchanged")
            skipped += 1
            continue
        try:
            normalizer.normalize_object_folder(folder, out_parent)
            save_json(out_dir / "_stage142_material_manifest.json", new_manifest)
            print(f"[STAGE142 NORMALIZED EXISTING] {state_slug}/{court_slug}/{case_key}")
            ok += 1
        except Exception as exc:
            print(f"[STAGE142 NORMALIZE ERROR] {folder}: {exc}", file=sys.stderr)
            failed += 1
    save_json(normalized_root / "stage142_normalization_summary.json", {"normalized": ok, "skipped": skipped, "failed": failed})
    return 0 if failed == 0 else 1


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--parser", default="Sachsen_zvg.py")
    ap.add_argument("--normalizer", default="scripts/run_sachsen_zvg_with_normalizer.py")
    ap.add_argument("--states-config", default="scripts/zvg_states.json")
    ap.add_argument("--states", default="sachsen,thueringen,sachsen-anhalt,brandenburg,bayern")
    ap.add_argument("--data-root", default="zvg_data")
    ap.add_argument("--output", default="normalized")
    ap.add_argument("--normalize-existing", action="store_true")
    ap.add_argument("--force-normalize", action="store_true")
    args = ap.parse_args()

    parser_path = Path(args.parser)
    normalizer_path = Path(args.normalizer)
    data_root = Path(args.data_root)
    normalized_root = Path(args.output)

    if args.normalize_existing:
        return normalize_existing(normalizer_path, data_root, normalized_root, args.force_normalize)

    states = load_states(Path(args.states_config), args.states)
    failures = []
    for slug, cfg in states.items():
        try:
            code = run_state(parser_path, normalizer_path, slug, cfg, data_root, normalized_root, args.force_normalize)
            if code:
                failures.append({"state": slug, "code": code})
        except Exception as exc:
            print(f"[STAGE142 STATE ERROR] {slug}: {exc}", file=sys.stderr)
            failures.append({"state": slug, "error": str(exc)})
    save_json(normalized_root / "stage142_run_summary.json", {"states": list(states.keys()), "failures": failures})
    return 0 if not failures else 1


if __name__ == "__main__":
    raise SystemExit(main())
