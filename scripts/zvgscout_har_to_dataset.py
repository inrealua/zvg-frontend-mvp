#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ZvgScout HAR -> dataset.json

Использование:
python .\scripts\zvgscout_har_to_dataset.py --har .\var\imports\zvgscout-har\zvgscout.har

Смысл:
- ты открываешь ZvgScout в обычном Chrome/Edge;
- вручную проходишь cookies/login/Erneut versuchen;
- экспортируешь Network -> Save all as HAR with content;
- этот скрипт извлекает объекты из HAR и делает dataset.json.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import re
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import urljoin, urlparse

DEFAULT_OUT = Path("var/imports/zvgscout-har")


def norm(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def sha1(value: Any) -> str:
    return hashlib.sha1(str(value).encode("utf-8", errors="ignore")).hexdigest()


def is_bad_text(text: str) -> bool:
    t = text.lower()
    return any(x in t for x in [
        "sicherheitsüberprüfung wird durchgeführt",
        "cloudflare",
        "fehler beim laden der daten",
        "erneut versuchen",
        "ray id:",
    ])


def parse_money(text: str) -> int | None:
    matches = re.findall(r"(\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})?|\d+)\s*(?:€|EUR)", text, re.I)
    vals = []
    for m in matches:
        try:
            vals.append(round(float(m.replace(".", "").replace(" ", "").replace(",", "."))))
        except ValueError:
            pass
    return max(vals) if vals else None


def parse_area(label_re: str, text: str) -> float | None:
    m = re.search(label_re + r"[^\d]{0,60}(\d{1,5}(?:[,.]\d{1,2})?)\s*(?:m²|qm|m2)", text, re.I)
    if not m:
        return None
    try:
        return float(m.group(1).replace(",", "."))
    except ValueError:
        return None


def parse_date(text: str) -> str | None:
    m = re.search(r"(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s*(?:um|,)?\s*(\d{1,2}):(\d{2}))?", text)
    if not m:
        return None
    dd, mm, yyyy, hh, minute = m.groups()
    try:
        return datetime(int(yyyy), int(mm), int(dd), int(hh or 0), int(minute or 0)).isoformat()
    except ValueError:
        return None


def parse_aktenzeichen(text: str) -> str | None:
    patterns = [
        r"Aktenzeichen\s*[:\-]?\s*([0-9A-Za-zÄÖÜäöüß\s./\-]{3,45})",
        r"\b(\d{1,4}\s*[Kk]\s*\d{1,5}/\d{2,4})\b",
    ]
    for p in patterns:
        m = re.search(p, text, re.I)
        if m:
            return norm(m.group(1))
    return None


def normalize_aktenzeichen(value: str | None, fallback: str) -> str:
    raw = norm(value or fallback).upper()
    raw = re.sub(r"\s+", " ", raw)
    raw = re.sub(r"([0-9])\s*K\s*([0-9])", r"\1 K \2", raw, flags=re.I).strip()
    return raw or ("UNKNOWN-" + sha1(fallback)[:12].upper())


def parse_court(text: str) -> str | None:
    m = re.search(r"Amtsgericht\s+([A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-\s]{2,50})", text)
    return norm("Amtsgericht " + m.group(1)) if m else None


def parse_plz_city(text: str) -> tuple[str | None, str | None]:
    m = re.search(r"\b(\d{5})\s+([A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-\s]{2,40})\b", text)
    return (m.group(1), norm(m.group(2))) if m else (None, None)


def parse_address(text: str) -> str | None:
    m = re.search(
        r"([A-ZÄÖÜ][A-Za-zÄÖÜäöüß0-9.'\-\s]+\s+\d+[a-zA-Z]?(?:\s*,\s*)?\d{5}\s+[A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-\s]+)",
        norm(text),
    )
    return norm(m.group(1)) if m else None


def detect_type(text: str) -> str:
    t = text.lower()
    if re.search(r"wohnung|eigentumswohnung|appartement", t):
        return "WOHNUNGEN"
    if re.search(r"grundstück|baugrundstück|acker|land|wald|forst", t):
        return "GRUNDSTUECKE"
    if re.search(r"garage|stellplatz|parkplatz", t):
        return "GARAGEN"
    if re.search(r"gewerbe|halle|laden|büro|praxis|hotel|gastronomie", t):
        return "GEWERBE"
    if re.search(r"mehrfamilienhaus|mfh|zweifamilienhaus|einfamilienhaus|wohnhaus|haus|doppelhaushälfte|reihenhaus", t):
        return "WOHNHAEUSER"
    return "SONSTIGE"


def detect_status(text: str) -> str:
    return "CANCELLED" if re.search(r"aufgehoben|abgesagt|cancelled|termin aufgehoben", text, re.I) else "ACTIVE"


def detect_wertgrenzen_removed(text: str) -> bool:
    return bool(re.search(
        r"wertgrenzen\s*(?:weggefallen|aufgehoben)|5/10|7/10|§\s*85a|§\s*74a|zweiter termin|2\.\s*termin|dritter termin|3\.\s*termin",
        text, re.I
    ))


def term_number(text: str, wg: bool, auction_date: str | None) -> int:
    n = 1
    if re.search(r"2\.\s*termin|zweiter termin|erneuter termin", text, re.I):
        n = max(n, 2)
    if re.search(r"3\.\s*termin|dritter termin", text, re.I):
        n = max(n, 3)
    if wg:
        n = max(n, 2)
    if wg and auction_date:
        try:
            if datetime.fromisoformat(auction_date).timestamp() < datetime.now().timestamp():
                n = max(n, 3)
        except ValueError:
            pass
    return n


def parse_coordinates(text: str) -> tuple[float | None, float | None]:
    patterns = [
        r'"lat"\s*:\s*(-?\d{1,2}\.\d+)\s*,\s*"lng"\s*:\s*(-?\d{1,3}\.\d+)',
        r'"latitude"\s*:\s*(-?\d{1,2}\.\d+)\s*,\s*"longitude"\s*:\s*(-?\d{1,3}\.\d+)',
    ]
    for p in patterns:
        m = re.search(p, text, re.I)
        if m:
            return float(m.group(1)), float(m.group(2))
    return None, None


def collect_urls(obj: Any, base_url: str = "") -> list[str]:
    urls: set[str] = set()

    def walk(v: Any) -> None:
        if v is None:
            return
        if isinstance(v, str):
            for m in re.finditer(r"https?://[^\"'\s<>]+", v):
                urls.add(m.group(0).rstrip("),.;"))
            for m in re.finditer(r"/[^\"'\s<>]+\.(?:jpg|jpeg|png|webp|pdf)(?:\?[^\"'\s<>]*)?", v, re.I):
                urls.add(urljoin(base_url, m.group(0)))
            return
        if isinstance(v, list):
            for item in v:
                walk(item)
            return
        if isinstance(v, dict):
            for item in v.values():
                walk(item)

    walk(obj)
    return sorted(urls)


def is_image_url(url: str) -> bool:
    return bool(re.search(r"\.(jpg|jpeg|png|webp)(?:\?|$)", url, re.I)) and not re.search(r"logo|favicon|sprite|icon", url, re.I)


def is_doc_url(url: str) -> bool:
    return bool(re.search(r"\.pdf(?:\?|$)|download|gutachten|expos|dokument|bekanntmachung", url, re.I))


def iter_dicts(obj: Any) -> Iterable[dict[str, Any]]:
    if isinstance(obj, dict):
        yield obj
        for v in obj.values():
            yield from iter_dicts(v)
    elif isinstance(obj, list):
        for item in obj:
            yield from iter_dicts(item)


def looks_like_property(obj: dict[str, Any]) -> bool:
    text = json.dumps(obj, ensure_ascii=False)
    if is_bad_text(text):
        return False
    markers = ["aktenzeichen", "verkehrswert", "amtsgericht", "auction", "versteiger", "adresse", "address", "latitude", "longitude", "termin", "court"]
    score = sum(1 for m in markers if m.lower() in text.lower())
    return score >= 2 and len(text) > 180


def best_title(obj: dict[str, Any], text: str) -> str:
    for k in ["title", "name", "headline", "objectTitle", "propertyTitle", "bezeichnung", "beschreibung", "description"]:
        v = obj.get(k)
        if isinstance(v, str) and len(norm(v)) >= 4:
            return norm(v)[:180]
    return norm(text)[:180] or "Zwangsversteigerung"


@dataclass
class PropertyRecord:
    externalId: str
    source: str
    sourceUrl: str
    title: str
    description: str
    address: str | None
    postalCode: str | None
    city: str | None
    court: str | None
    aktenzeichen: str | None
    normalizedAktenzeichen: str
    auctionDate: str | None
    marketValue: int | None
    livingArea: float | None
    plotArea: float | None
    propertyTypeGroup: str
    status: str
    wertgrenzenWeggefallen: bool
    termNumber: int
    latitude: float | None
    longitude: float | None
    images: list[str]
    documents: list[dict[str, str]]
    rawSourceUrl: str
    rawText: str


def normalize_object(obj: dict[str, Any], raw_url: str) -> PropertyRecord | None:
    text = json.dumps(obj, ensure_ascii=False)
    if is_bad_text(text):
        return None

    urls = collect_urls(obj, raw_url)
    images = [u for u in urls if is_image_url(u)]
    docs = [{"href": u, "text": Path(urlparse(u).path).name or "Dokument"} for u in urls if is_doc_url(u)]

    aktenzeichen = parse_aktenzeichen(text)
    normalized = normalize_aktenzeichen(aktenzeichen, raw_url + text[:200])
    plz, city = parse_plz_city(text)
    auction_date = parse_date(text)
    wg = detect_wertgrenzen_removed(text)
    lat, lng = parse_coordinates(text)

    for lat_key, lng_key in [("lat", "lng"), ("latitude", "longitude")]:
        if lat is None and isinstance(obj.get(lat_key), (int, float)) and isinstance(obj.get(lng_key), (int, float)):
            lat, lng = float(obj[lat_key]), float(obj[lng_key])

    record_id = sha1((aktenzeichen or "") + raw_url + text[:1000])[:24]

    return PropertyRecord(
        externalId=record_id,
        source="zvgscout-har",
        sourceUrl=raw_url,
        title=best_title(obj, text),
        description=norm(text)[:5000],
        address=parse_address(text),
        postalCode=plz,
        city=city,
        court=parse_court(text),
        aktenzeichen=aktenzeichen,
        normalizedAktenzeichen=normalized,
        auctionDate=auction_date,
        marketValue=parse_money(text),
        livingArea=parse_area(r"Wohnfl(?:ä|ae)che|Wfl\.?|Wohnfläche", text),
        plotArea=parse_area(r"Grundst(?:ü|ue)cksfl(?:ä|ae)che|Grundstück|Flurstück|Grundst\.?", text),
        propertyTypeGroup=detect_type(text),
        status=detect_status(text),
        wertgrenzenWeggefallen=wg,
        termNumber=term_number(text, wg, auction_date),
        latitude=lat,
        longitude=lng,
        images=images[:30],
        documents=docs[:30],
        rawSourceUrl=raw_url,
        rawText=text[:200000],
    )


def decode_har_content(content: dict[str, Any]) -> str:
    text = content.get("text") or ""
    if content.get("encoding") == "base64":
        try:
            return base64.b64decode(text).decode("utf-8", errors="ignore")
        except Exception:
            return ""
    return text


def extract_records_from_har(har: dict[str, Any], debug_dir: Path) -> list[PropertyRecord]:
    records: list[PropertyRecord] = []
    seen: set[str] = set()

    entries = har.get("log", {}).get("entries", [])
    for idx, entry in enumerate(entries):
        request_url = entry.get("request", {}).get("url", "")
        content = entry.get("response", {}).get("content", {})
        mime = content.get("mimeType", "")
        body = decode_har_content(content)

        if not body or is_bad_text(body):
            continue

        parsed: Any = None
        if "json" in mime.lower() or body.lstrip().startswith(("{", "[")):
            try:
                parsed = json.loads(body)
            except Exception:
                parsed = None

        hit = False
        if parsed is not None:
            for obj in iter_dicts(parsed):
                if looks_like_property(obj):
                    rec = normalize_object(obj, request_url)
                    if rec and rec.normalizedAktenzeichen not in seen:
                        seen.add(rec.normalizedAktenzeichen)
                        records.append(rec)
                        hit = True

        if parsed is None and re.search(r"Aktenzeichen|Verkehrswert|Amtsgericht|Zwangsversteiger", body, re.I):
            rec = normalize_object({"raw": body[:200000], "sourceUrl": request_url}, request_url)
            if rec and rec.normalizedAktenzeichen not in seen:
                seen.add(rec.normalizedAktenzeichen)
                records.append(rec)
                hit = True

        if hit:
            (debug_dir / f"hit-{idx:04d}.txt").write_text(body[:300000], encoding="utf-8", errors="ignore")

    return records


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--har", required=True, help="Path to exported HAR file with content")
    parser.add_argument("--out", default=str(DEFAULT_OUT), help="Output directory")
    args = parser.parse_args()

    har_path = Path(args.har)
    out_dir = Path(args.out)
    debug_dir = out_dir / "debug"
    debug_dir.mkdir(parents=True, exist_ok=True)

    if not har_path.exists():
        print(f"HAR not found: {har_path}")
        return 1

    har = json.loads(har_path.read_text(encoding="utf-8", errors="ignore"))
    records = extract_records_from_har(har, debug_dir)
    data = [asdict(r) for r in records]

    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "dataset.json").write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    with (out_dir / "dataset.jsonl").open("w", encoding="utf-8") as f:
        for item in data:
            f.write(json.dumps(item, ensure_ascii=False) + "\n")

    summary = {
        "count": len(records),
        "outJson": str(out_dir / "dataset.json"),
        "outJsonl": str(out_dir / "dataset.jsonl"),
        "records": [
            {
                "normalizedAktenzeichen": r.normalizedAktenzeichen,
                "title": r.title,
                "city": r.city,
                "marketValue": r.marketValue,
                "auctionDate": r.auctionDate,
                "images": len(r.images),
                "documents": len(r.documents),
            }
            for r in records
        ],
    }
    (out_dir / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"records: {len(records)}")
    print(f"dataset: {out_dir / 'dataset.json'}")
    print(f"summary: {out_dir / 'summary.json'}")

    if not records:
        print("No objects found. Export HAR only after objects are visible and use 'Save all as HAR with content'.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
