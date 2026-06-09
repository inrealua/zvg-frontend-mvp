const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();

function full(rel) {
  return path.join(root, rel);
}

function write(rel, content) {
  const target = full(rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
  console.log("written", rel);
}

function patchPackage() {
  const pkgPath = full("package.json");
  if (!fs.existsSync(pkgPath)) {
    console.log("package.json not found, skip");
    return;
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  pkg.scripts = pkg.scripts || {};
  pkg.scripts["zvgscout:har"] = "python scripts/zvgscout_har_to_dataset.py";
  pkg.scripts["zvgscout:import-dataset"] = "node scripts/zvgscout_import_dataset.cjs";
  pkg.scripts["zvgscout:import-dataset:dry"] = "cross-env ZVGSCOUT_DRY_RUN=1 node scripts/zvgscout_import_dataset.cjs";

  pkg.devDependencies = pkg.devDependencies || {};
  if (!pkg.dependencies?.["cross-env"] && !pkg.devDependencies["cross-env"]) {
    pkg.devDependencies["cross-env"] = "^7.0.3";
  }

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
  console.log("patched package.json");
}

write("scripts/zvgscout_har_to_dataset.py", String.raw`#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ZvgScout HAR -> local dataset.

This script does NOT bypass Cloudflare or any security check.

Workflow:
1. Open zvgscout.com in your normal Chrome/Edge browser.
2. Accept cookies / login / press "Erneut versuchen" until objects are visible.
3. Open DevTools -> Network -> Preserve log.
4. Reload or move/zoom map / change filters.
5. Export HAR with content.
6. Run this script on the HAR file.

Output:
  var/imports/zvgscout-har/dataset.json
  var/imports/zvgscout-har/dataset.jsonl
  var/imports/zvgscout-har/debug/
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import re
import sys
from dataclasses import dataclass, asdict
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
    return any(
        marker in t
        for marker in [
            "sicherheitsüberprüfung wird durchgeführt",
            "cloudflare",
            "fehler beim laden der daten",
            "erneut versuchen",
            "ray id:",
        ]
    )


def parse_money(text: str) -> int | None:
    matches = re.findall(r"(\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})?|\d+)\s*(?:€|EUR)", text, flags=re.I)
    values: list[int] = []
    for m in matches:
        try:
            val = float(m.replace(".", "").replace(" ", "").replace(",", "."))
            values.append(round(val))
        except ValueError:
            pass
    return max(values) if values else None


def parse_area(label_re: str, text: str) -> float | None:
    m = re.search(label_re + r"[^\d]{0,60}(\d{1,5}(?:[,.]\d{1,2})?)\s*(?:m²|qm|m2)", text, flags=re.I)
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
    hh = hh or "0"
    minute = minute or "0"

    try:
        dt = datetime(int(yyyy), int(mm), int(dd), int(hh), int(minute))
        return dt.isoformat()
    except ValueError:
        return None


def parse_aktenzeichen(text: str) -> str | None:
    patterns = [
        r"Aktenzeichen\s*[:\-]?\s*([0-9A-Za-zÄÖÜäöüß\s./\-]{3,45})",
        r"\b(\d{1,4}\s*[Kk]\s*\d{1,5}/\d{2,4})\b",
    ]
    for p in patterns:
        m = re.search(p, text, flags=re.I)
        if m:
            return norm(m.group(1))
    return None


def normalize_aktenzeichen(value: str | None, fallback: str) -> str:
    raw = norm(value or fallback or "")
    raw = raw.upper()
    raw = re.sub(r"\s+", " ", raw)
    raw = re.sub(r"([0-9])\s*K\s*([0-9])", r"\1 K \2", raw, flags=re.I)
    raw = raw.strip()
    return raw or ("UNKNOWN-" + sha1(fallback)[:12].upper())


def parse_court(text: str) -> str | None:
    m = re.search(r"Amtsgericht\s+([A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-\s]{2,50})", text)
    return norm("Amtsgericht " + m.group(1)) if m else None


def parse_plz_city(text: str) -> tuple[str | None, str | None]:
    m = re.search(r"\b(\d{5})\s+([A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-\s]{2,40})\b", text)
    if not m:
        return None, None
    return m.group(1), norm(m.group(2))


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
    return "CANCELLED" if re.search(r"aufgehoben|abgesagt|cancelled|termin aufgehoben", text, flags=re.I) else "ACTIVE"


def detect_wertgrenzen_removed(text: str) -> bool:
    return bool(
        re.search(
            r"wertgrenzen\s*(?:weggefallen|aufgehoben)|5/10|7/10|§\s*85a|§\s*74a|zweiter termin|2\.\s*termin|dritter termin|3\.\s*termin",
            text,
            flags=re.I,
        )
    )


def term_number(text: str, wertgrenzen_removed: bool, auction_date: str | None) -> int:
    n = 1
    if re.search(r"2\.\s*termin|zweiter termin|erneuter termin", text, flags=re.I):
        n = max(n, 2)
    if re.search(r"3\.\s*termin|dritter termin", text, flags=re.I):
        n = max(n, 3)
    if wertgrenzen_removed:
        n = max(n, 2)
    if wertgrenzen_removed and auction_date:
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
        r'lat(?:itude)?["\'\s:=]+(-?\d{1,2}\.\d+)[,\s]+lng(?:itude)?["\'\s:=]+(-?\d{1,3}\.\d+)',
    ]
    for p in patterns:
        m = re.search(p, text, flags=re.I)
        if m:
            return float(m.group(1)), float(m.group(2))
    return None, None


def collect_urls(obj: Any, base_url: str = "") -> list[str]:
    urls: set[str] = set()

    def walk(value: Any) -> None:
        if value is None:
            return
        if isinstance(value, str):
            for m in re.finditer(r"https?://[^\"'\s<>]+", value):
                urls.add(m.group(0).rstrip("),.;"))
            for m in re.finditer(r"/[^\"'\s<>]+\.(?:jpg|jpeg|png|webp|pdf)(?:\?[^\"'\s<>]*)?", value, flags=re.I):
                urls.add(urljoin(base_url, m.group(0)))
            return
        if isinstance(value, list):
            for item in value:
                walk(item)
            return
        if isinstance(value, dict):
            for item in value.values():
                walk(item)

    walk(obj)
    return sorted(urls)


def is_image_url(url: str) -> bool:
    return bool(re.search(r"\.(jpg|jpeg|png|webp)(?:\?|$)", url, flags=re.I)) and not re.search(r"logo|favicon|sprite|icon", url, flags=re.I)


def is_doc_url(url: str) -> bool:
    return bool(re.search(r"\.pdf(?:\?|$)|download|gutachten|expos|dokument|bekanntmachung", url, flags=re.I))


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

    score = 0
    for marker in [
        "aktenzeichen",
        "verkehrswert",
        "amtsgericht",
        "auction",
        "versteiger",
        "adresse",
        "address",
        "latitude",
        "longitude",
        "wohnfläche",
        "grundstück",
        "termin",
        "court",
    ]:
        if marker.lower() in text.lower():
            score += 1

    return score >= 2 and len(text) > 180


def best_title(obj: dict[str, Any], text: str) -> str:
    keys = [
        "title",
        "name",
        "headline",
        "objectTitle",
        "propertyTitle",
        "bezeichnung",
        "beschreibung",
        "description",
    ]

    for k in keys:
        v = obj.get(k)
        if isinstance(v, str) and len(norm(v)) >= 4:
            return norm(v)[:180]

    first_line = norm(text)[:180]
    return first_line or "Zwangsversteigerung"


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

    # Try direct coordinate fields.
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


def load_har(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8", errors="ignore"))


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

        debug_hit = False

        parsed: Any = None
        if "json" in mime.lower() or body.lstrip().startswith(("{", "[")):
            try:
                parsed = json.loads(body)
            except Exception:
                parsed = None

        if parsed is not None:
            for obj in iter_dicts(parsed):
                if looks_like_property(obj):
                    rec = normalize_object(obj, request_url)
                    if rec and rec.normalizedAktenzeichen not in seen:
                        seen.add(rec.normalizedAktenzeichen)
                        records.append(rec)
                        debug_hit = True

        # HTML/JS fallback: keep only as raw text if it looks like multiple objects.
        if parsed is None and re.search(r"Aktenzeichen|Verkehrswert|Amtsgericht|Zwangsversteiger", body, flags=re.I):
            pseudo = {
                "raw": body[:200000],
                "sourceUrl": request_url,
            }
            rec = normalize_object(pseudo, request_url)
            if rec and rec.normalizedAktenzeichen not in seen:
                seen.add(rec.normalizedAktenzeichen)
                records.append(rec)
                debug_hit = True

        if debug_hit:
            (debug_dir / f"hit-{idx:04d}.txt").write_text(body[:300000], encoding="utf-8", errors="ignore")

    return records


def write_dataset(records: list[PropertyRecord], out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    debug_dir = out_dir / "debug"
    debug_dir.mkdir(parents=True, exist_ok=True)

    data = [asdict(r) for r in records]
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
        print(f"HAR not found: {har_path}", file=sys.stderr)
        return 1

    har = load_har(har_path)
    records = extract_records_from_har(har, debug_dir)
    write_dataset(records, out_dir)

    print(f"records: {len(records)}")
    print(f"dataset: {out_dir / 'dataset.json'}")
    print(f"jsonl: {out_dir / 'dataset.jsonl'}")
    print(f"summary: {out_dir / 'summary.json'}")

    if not records:
        print("")
        print("No objects found in HAR.")
        print("Make sure DevTools -> Network -> 'Preserve log' is ON and export HAR after objects are visible.")
        print("Also use 'Save all as HAR with content', not only headers.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
`)

write("scripts/zvgscout_import_dataset.cjs", String.raw`#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require("node:fs");
const path = require("node:path");
const { PrismaClient, Prisma } = require("@prisma/client");

const prisma = new PrismaClient();

const IN_JSON =
  process.env.ZVGSCOUT_DATASET ||
  path.join(process.cwd(), "var", "imports", "zvgscout-har", "dataset.json");

const PUBLIC_ROOT = path.join(process.cwd(), "public");
const IMPORT_ROOT = path.join(PUBLIC_ROOT, "imports", "zvgscout");
const SUMMARY_OUT = path.join(process.cwd(), "var", "imports", "zvgscout-har", "import-summary.json");
const DRY_RUN = process.env.ZVGSCOUT_DRY_RUN === "1" || process.argv.includes("--dry-run");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function model(modelName) {
  return Prisma.dmmf.datamodel.models.find((m) => m.name === modelName);
}

function fields(modelName) {
  return new Set((model(modelName)?.fields || []).map((f) => f.name));
}

function hasField(modelName, field) {
  return fields(modelName).has(field);
}

function pick(modelName, data) {
  const f = fields(modelName);
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    if (f.has(k) && v !== undefined) out[k] = v;
  }
  return out;
}

function delegateName(modelName) {
  return modelName.charAt(0).toLowerCase() + modelName.slice(1);
}

function imageModel() {
  return ["PropertyImage", "Image", "PropertyPhoto", "Photo"].find(model) || null;
}

function documentModel() {
  return ["PropertyDocument", "Document", "PropertyFile", "File"].find(model) || null;
}

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeAktenzeichen(value, fallback) {
  const raw = String(value || fallback || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ")
    .replace(/([0-9])\s*K\s*([0-9])/i, "$1 K $2");
  return raw || "UNKNOWN";
}

async function download(url, target) {
  try {
    ensureDir(path.dirname(target));
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 ZVG-DE local importer",
      },
    });
    if (!response.ok) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(target, buffer);
    return target;
  } catch (error) {
    console.warn("download failed", url, error.message);
    return null;
  }
}

function ext(url, fallback) {
  try {
    return path.extname(new URL(url).pathname) || fallback;
  } catch {
    return fallback;
  }
}

function propertyData(item) {
  const auctionDate = parseDate(item.auctionDate);
  const normalizedAktenzeichen = normalizeAktenzeichen(item.normalizedAktenzeichen || item.aktenzeichen, item.externalId);

  return pick("Property", {
    source: item.source || "zvgscout-har",
    sourceUrl: item.sourceUrl,
    externalId: item.externalId,
    importSource: item.source || "zvgscout-har",
    importUrl: item.sourceUrl,

    title: item.title || "Zwangsversteigerung",
    titleRu: item.title || "Zwangsversteigerung",
    titleDe: item.title || "Zwangsversteigerung",
    titleEn: item.title || "Zwangsversteigerung",
    headline: item.title || "Zwangsversteigerung",

    description: item.description || item.rawText || "",
    descriptionRu: item.description || item.rawText || "",
    descriptionDe: item.description || item.rawText || "",
    descriptionEn: item.description || item.rawText || "",

    address: item.address,
    postalCode: item.postalCode,
    zip: item.postalCode,
    city: item.city,
    court: item.court,

    aktenzeichen: item.aktenzeichen,
    normalizedAktenzeichen,
    caseNumber: item.aktenzeichen,
    fileNumber: item.aktenzeichen,

    auctionDate,
    termin: auctionDate,

    marketValue: item.marketValue,
    trafficValue: item.marketValue,
    value: item.marketValue,

    livingArea: item.livingArea,
    wohnflaeche: item.livingArea,
    plotArea: item.plotArea,
    grundstuecksflaeche: item.plotArea,

    propertyTypeGroup: item.propertyTypeGroup || "SONSTIGE",
    typeGroup: item.propertyTypeGroup || "SONSTIGE",
    status: item.status || "ACTIVE",

    wertgrenzenWeggefallen: Boolean(item.wertgrenzenWeggefallen),
    wertgrenzenRemoved: Boolean(item.wertgrenzenWeggefallen),
    valueLimitsRemoved: Boolean(item.wertgrenzenWeggefallen),

    termNumber: item.termNumber || 1,
    terminNumber: item.termNumber || 1,
    terminNr: item.termNumber || 1,
    anzahlTermine: item.termNumber || 1,

    latitude: item.latitude,
    longitude: item.longitude,
    lat: item.latitude,
    lng: item.longitude,

    isActive: (item.status || "ACTIVE") !== "CANCELLED",
  });
}

async function findExisting(item) {
  const or = [];

  if (hasField("Property", "normalizedAktenzeichen")) {
    or.push({
      normalizedAktenzeichen: normalizeAktenzeichen(item.normalizedAktenzeichen || item.aktenzeichen, item.externalId),
    });
  }
  if (hasField("Property", "sourceUrl") && item.sourceUrl) or.push({ sourceUrl: item.sourceUrl });
  if (hasField("Property", "externalId") && item.externalId) or.push({ externalId: item.externalId });
  if (hasField("Property", "aktenzeichen") && item.aktenzeichen) or.push({ aktenzeichen: item.aktenzeichen });
  if (hasField("Property", "address") && hasField("Property", "auctionDate") && item.address && item.auctionDate) {
    or.push({ address: item.address, auctionDate: parseDate(item.auctionDate) });
  }

  if (!or.length) return null;

  return prisma.property.findFirst({
    where: {
      OR: or,
    },
  });
}

async function upsertProperty(item) {
  const existing = await findExisting(item);
  const data = propertyData(item);

  if (DRY_RUN) {
    console.log(existing ? "[dry:update]" : "[dry:create]", data.normalizedAktenzeichen, data.title);
    return existing || { id: "dry-run" };
  }

  if (existing) {
    const updated = await prisma.property.update({
      where: { id: existing.id },
      data,
    });
    console.log("[updated]", updated.id, data.normalizedAktenzeichen, data.title);
    return updated;
  }

  const created = await prisma.property.create({ data });
  console.log("[created]", created.id, data.normalizedAktenzeichen, data.title);
  return created;
}

async function saveImages(propertyId, item) {
  const m = imageModel();
  if (!m || !propertyId || propertyId === "dry-run") return;

  const delegate = prisma[delegateName(m)];
  const f = fields(m);
  if (!delegate) return;

  const images = Array.isArray(item.images) ? item.images : [];
  const dir = path.join(IMPORT_ROOT, item.externalId || "unknown", "images");

  for (let i = 0; i < images.length; i += 1) {
    const url = typeof images[i] === "string" ? images[i] : images[i]?.url;
    if (!url) continue;

    const local = path.join(dir, String(i + 1).padStart(2, "0") + ext(url, ".jpg"));
    const saved = await download(url, local);
    const publicUrl = saved ? "/" + path.relative(PUBLIC_ROOT, saved).replace(/\\/g, "/") : url;

    const data = {};
    if (f.has("propertyId")) data.propertyId = propertyId;
    if (f.has("url")) data.url = publicUrl;
    if (f.has("src")) data.src = publicUrl;
    if (f.has("sourceUrl")) data.sourceUrl = url;
    if (f.has("originalUrl")) data.originalUrl = url;
    if (f.has("isMain")) data.isMain = i === 0;
    if (f.has("sortOrder")) data.sortOrder = i;
    if (f.has("alt")) data.alt = item.title || "Zwangsversteigerung";

    try {
      const existing = await delegate.findFirst({
        where: {
          propertyId,
          OR: [
            f.has("url") ? { url: publicUrl } : undefined,
            f.has("sourceUrl") ? { sourceUrl: url } : undefined,
            f.has("originalUrl") ? { originalUrl: url } : undefined,
          ].filter(Boolean),
        },
      });

      if (!existing) await delegate.create({ data });
    } catch (error) {
      console.warn("image save failed", error.message);
    }
  }
}

async function saveDocuments(propertyId, item) {
  const m = documentModel();
  if (!m || !propertyId || propertyId === "dry-run") return;

  const delegate = prisma[delegateName(m)];
  const f = fields(m);
  if (!delegate) return;

  const docs = Array.isArray(item.documents) ? item.documents : [];
  const dir = path.join(IMPORT_ROOT, item.externalId || "unknown", "documents");

  for (let i = 0; i < docs.length; i += 1) {
    const doc = docs[i];
    const url = typeof doc === "string" ? doc : doc?.href || doc?.url;
    if (!url) continue;

    const local = path.join(dir, String(i + 1).padStart(2, "0") + ext(url, ".pdf"));
    const saved = await download(url, local);
    const publicUrl = saved ? "/" + path.relative(PUBLIC_ROOT, saved).replace(/\\/g, "/") : url;

    const data = {};
    if (f.has("propertyId")) data.propertyId = propertyId;
    if (f.has("url")) data.url = publicUrl;
    if (f.has("src")) data.src = publicUrl;
    if (f.has("sourceUrl")) data.sourceUrl = url;
    if (f.has("originalUrl")) data.originalUrl = url;
    if (f.has("name")) data.name = doc?.text || path.basename(local);
    if (f.has("title")) data.title = doc?.text || path.basename(local);
    if (f.has("sortOrder")) data.sortOrder = i;

    try {
      const existing = await delegate.findFirst({
        where: {
          propertyId,
          OR: [
            f.has("url") ? { url: publicUrl } : undefined,
            f.has("sourceUrl") ? { sourceUrl: url } : undefined,
            f.has("originalUrl") ? { originalUrl: url } : undefined,
          ].filter(Boolean),
        },
      });

      if (!existing) await delegate.create({ data });
    } catch (error) {
      console.warn("document save failed", error.message);
    }
  }
}

async function main() {
  if (!fs.existsSync(IN_JSON)) {
    console.error("Dataset not found:", IN_JSON);
    process.exit(1);
  }

  ensureDir(path.dirname(SUMMARY_OUT));
  ensureDir(IMPORT_ROOT);

  const items = JSON.parse(fs.readFileSync(IN_JSON, "utf8"));
  const summary = [];

  for (const item of items) {
    try {
      const property = await upsertProperty(item);
      await saveImages(property.id, item);
      await saveDocuments(property.id, item);

      summary.push({
        ok: true,
        id: property.id,
        normalizedAktenzeichen: normalizeAktenzeichen(item.normalizedAktenzeichen || item.aktenzeichen, item.externalId),
        title: item.title,
      });
    } catch (error) {
      summary.push({
        ok: false,
        error: error.message,
        title: item.title,
        sourceUrl: item.sourceUrl,
      });
    }
  }

  fs.writeFileSync(SUMMARY_OUT, JSON.stringify(summary, null, 2), "utf8");
  await prisma.$disconnect();

  console.log("done:", summary.length);
  console.log("summary:", SUMMARY_OUT);
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
`)

write("docs/ZVGSCOUT_HAR_PIPELINE.md", String.raw`# ZvgScout HAR/Python pipeline

Direct scraping can fail because ZvgScout may show:

- `Fehler beim Laden der Daten`
- Cloudflare security check
- empty SPA skeleton

This pipeline does not try to bypass that.

Instead:

1. Load objects in your normal browser.
2. Export the network data as HAR with content.
3. Parse the HAR locally with Python.
4. Import the normalized dataset to Prisma.

## Step 1 — collect HAR manually

In Chrome/Edge:

1. Open:

```txt
https://zvgscout.com/zwangsversteigerungen?page=1&maplat=50.83871608853164&maplng=12.8785815480677&mapzoom=11.283512746895843
```

2. Accept cookies / login if needed.
3. Press `Erneut versuchen` until objects are visible.
4. Open DevTools:
   - F12
   - Network
   - enable `Preserve log`
   - enable `Disable cache`
5. Reload page or move map / change filters.
6. Right click in Network list:
   - `Save all as HAR with content`

Save as:

```txt
D:\Projects\zvg_frontend_mvp\var\imports\zvgscout-har\zvgscout.har
```

## Step 2 — parse HAR with Python

```powershell
cd D:\Projects\zvg_frontend_mvp
python .\scripts\zvgscout_har_to_dataset.py --har .\var\imports\zvgscout-har\zvgscout.har
```

Output:

```txt
var/imports/zvgscout-har/dataset.json
var/imports/zvgscout-har/dataset.jsonl
var/imports/zvgscout-har/summary.json
var/imports/zvgscout-har/debug/
```

## Step 3 — dry import

```powershell
$env:ZVGSCOUT_DRY_RUN="1"
npm run zvgscout:import-dataset
```

Check:

```txt
var/imports/zvgscout-har/import-summary.json
```

## Step 4 — real import

```powershell
Remove-Item Env:ZVGSCOUT_DRY_RUN -ErrorAction SilentlyContinue
npm run zvgscout:import-dataset
```

Images/documents are downloaded to:

```txt
public/imports/zvgscout/<externalId>/
```

## Notes

- Python script uses only standard library.
- It skips bad/error/security-check pages.
- It fills required `normalizedAktenzeichen`.
- Importer upserts by:
  - `normalizedAktenzeichen`
  - `sourceUrl`
  - `externalId`
  - `aktenzeichen`
  - `address + auctionDate`
`)

patchPackage();

console.log("Stage 115 completed.");
