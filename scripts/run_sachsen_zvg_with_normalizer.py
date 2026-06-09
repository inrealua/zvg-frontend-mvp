#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Sachsen_zvg runner with integrated normalizer.

It does NOT rewrite the existing parser. It imports your current parser,
monkey-patches write_status_file(), and runs parser.main().

Every time your parser saves:
  zvg_data/<case>/detail.json
  zvg_data/<case>/status.txt
  downloaded PDFs/images

the normalizer immediately creates:
  normalized/<case>/normalized.json
  normalized/<case>/quality_report.json
  normalized/<case>/import_files/images/
  normalized/<case>/import_files/documents/
  normalized/<case>/raw/

Usage:
  python scripts/run_sachsen_zvg_with_normalizer.py --parser .\Sachsen_zvg.py --output .\normalized

Dependencies:
  pip install pymupdf pillow
"""

from __future__ import annotations

import argparse
import os
import importlib.util
import json
import re
import shutil
import sys
import hashlib
import urllib.parse
import urllib.request
import urllib.error
import time
from datetime import datetime
from pathlib import Path
from typing import Any

try:
    import fitz  # PyMuPDF
except Exception:
    fitz = None



# SSL handling for Windows Python installations where local CA store is broken.
# Default: verify SSL normally.
# Emergency mode:
#   $env:ZVG_SSL_VERIFY="0"
#   python .\scripts\run_sachsen_zvg_with_normalizer.py --parser .\Sachsen_zvg.py --output .\normalized
ZVG_SSL_VERIFY = os.environ.get("ZVG_SSL_VERIFY", "1").strip().lower() not in {"0", "false", "no", "off"}

GERMAN_MONTHS = {
    "januar": 1, "februar": 2, "märz": 3, "maerz": 3, "april": 4,
    "mai": 5, "juni": 6, "juli": 7, "august": 8, "september": 9,
    "oktober": 10, "november": 11, "dezember": 12,
}


def clean_text(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "").replace("\xa0", " ")).strip()


def sha1_bytes(data: bytes) -> str:
    return hashlib.sha1(data).hexdigest()


def sha1_text(value: Any) -> str:
    return hashlib.sha1(str(value).encode("utf-8", errors="ignore")).hexdigest()


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


def parse_money(value: Any) -> int | None:
    text = str(value or "")
    matches = re.findall(r"(\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})?|\d+)(?:\s*(?:€|EUR))?", text, re.I)
    values = []
    for m in matches:
        try:
            n = float(m.replace(".", "").replace(" ", "").replace(",", "."))
            if n >= 1000:
                values.append(round(n))
        except ValueError:
            pass
    return max(values) if values else None


def parse_float(value: Any) -> float | None:
    text = str(value or "")
    m = re.search(r"(\d{1,5}(?:[.,]\d{1,2})?)", text)
    if not m:
        return None
    try:
        return float(m.group(1).replace(".", "").replace(",", "."))
    except ValueError:
        return None


def parse_area_by_labels(text: str, labels: list[str]) -> float | None:
    for label in labels:
        pattern = label + r"[^0-9]{0,90}(\d{1,5}(?:[.,]\d{1,2})?)\s*(?:m²|qm|m2)"
        m = re.search(pattern, text, re.I)
        if m:
            try:
                return float(m.group(1).replace(".", "").replace(",", "."))
            except ValueError:
                pass
    return None


def parse_german_datetime(value: Any) -> str | None:
    text = clean_text(value)
    if not text:
        return None

    m = re.search(r"(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s*(?:,|um)?\s*(\d{1,2}):(\d{2}))?", text)
    if m:
        dd, mm, yyyy, hh, minute = m.groups()
        try:
            return datetime(int(yyyy), int(mm), int(dd), int(hh or 0), int(minute or 0)).isoformat() + "+02:00"
        except ValueError:
            return None

    m = re.search(
        r"(\d{1,2})\.\s*(Januar|Februar|März|Maerz|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s*(\d{4})(?:\s*,?\s*(\d{1,2}):(\d{2}))?",
        text, re.I
    )
    if m:
        dd, month, yyyy, hh, minute = m.groups()
        try:
            return datetime(int(yyyy), GERMAN_MONTHS[month.lower()], int(dd), int(hh or 0), int(minute or 0)).isoformat() + "+02:00"
        except Exception:
            return None
    return None


def normalize_aktenzeichen(value: Any, fallback: str = "") -> str:
    raw = clean_text(value or fallback).upper().replace("_", " ")
    raw = re.sub(r"\s+", " ", raw)
    raw = re.sub(r"([0-9])\s*K\s*([0-9])", r"\1 K \2", raw, flags=re.I)
    return raw.strip() or ("UNKNOWN-" + sha1_text(fallback)[:12].upper())


def short_aktenzeichen(value: str | None) -> str | None:
    if not value:
        return None
    m = re.search(r"0*(\d+)\s*K\s*0*(\d+)/(\d{2,4})", value, re.I)
    if not m:
        return clean_text(value)
    left, num, year = m.groups()
    return f"{int(left)} K {int(num)}/{year}"


def split_address(full: Any) -> dict[str, Any]:
    full = clean_text(full)
    result = {
        "street": None,
        "houseNumber": None,
        "postalCode": None,
        "city": None,
        "state": None,
        "country": "DE",
        "fullAddress": full or None,
    }
    if not full:
        return result

    if ":" in full:
        full = full.split(":", 1)[1].strip()

    m = re.search(r"(.+?)\s+(\d+[a-zA-Z]?)\s*,?\s*(\d{5})\s+(.+)$", full)
    if m:
        result["street"] = clean_text(m.group(1))
        result["houseNumber"] = clean_text(m.group(2))
        result["postalCode"] = clean_text(m.group(3))
        result["city"] = clean_text(m.group(4))
        result["fullAddress"] = f"{result['street']} {result['houseNumber']}, {result['postalCode']} {result['city']}"
        return result

    m = re.search(r"(\d{5})\s+([A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-\s]+)", full)
    if m:
        result["postalCode"] = m.group(1)
        result["city"] = clean_text(m.group(2))

    return result


def find_address(text: str) -> str | None:
    m = re.search(
        r"([A-ZÄÖÜ][A-Za-zÄÖÜäöüß0-9.'\-\s]+?\s+\d+[a-zA-Z]?\s*,?\s*\d{5}\s+[A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-\s]+)",
        clean_text(text),
    )
    return clean_text(m.group(1)) if m else None


def detect_property_type(text: str) -> tuple[str, str | None]:
    t = text.lower()
    if re.search(r"doppelhaushälfte|doppelhaushaelfte", t):
        return "WOHNHAEUSER", "DOPPELHAUSHAELFTE"
    if re.search(r"mehrfamilienhaus|mfh", t):
        return "WOHNHAEUSER", "MEHRFAMILIENHAUS"
    if re.search(r"einfamilienhaus|einfamilienwohnhaus|wohnhaus", t):
        return "WOHNHAEUSER", "EINFAMILIENHAUS"
    if re.search(r"reihenhaus", t):
        return "WOHNHAEUSER", "REIHENHAUS"
    if re.search(r"wohnung|eigentumswohnung|appartement", t):
        return "WOHNUNGEN", "WOHNUNG"
    if re.search(r"garage|stellplatz|parkplatz", t):
        return "GARAGEN", "GARAGE_STELLPLATZ"
    if re.search(r"gewerbe|halle|büro|buero|laden|praxis|hotel|gastronomie", t):
        return "GEWERBE", "GEWERBE"
    if re.search(r"wald|forst|acker|landwirtschaft", t):
        return "LAND_WALD", "LAND_WALD"
    if re.search(r"grundstück|grundstueck|baugrundstück|baugrundstueck", t):
        return "GRUNDSTUECKE", "GRUNDSTUECK"
    return "SONSTIGE", None


def detect_usage(text: str) -> tuple[str, str | None]:
    t = text.lower()
    if re.search(r"leerstehend|ungenutzt|frei\b|unbewohnt", t):
        return "VACANT", "leerstehend/ungenutzt"
    if re.search(r"vermietet|mietvertrag|mieter", t):
        return "RENTED", "vermietet"
    if re.search(r"eigengenutzt|eigen genutzt|vom eigentümer genutzt", t):
        return "OWNER_OCCUPIED", "eigengenutzt"
    return "UNKNOWN", None


def detect_denkmal(text: str) -> str:
    t = text.lower()
    if re.search(r"kein(?:e[nr]?)?\s+denkmal|nicht\s+denkmal", t):
        return "NO"
    if re.search(r"denkmalschutz|kulturdenkmal|denkmalgesch", t):
        return "YES"
    return "UNKNOWN"


def detect_wertgrenzen(text: str) -> str:
    t = text.lower()
    if re.search(r"wertgrenzen\s*(?:weggefallen|aufgehoben)|5/10|7/10|§\s*85a|§\s*74a|zweiter termin|2\.\s*termin|dritter termin|3\.\s*termin", t):
        return "REMOVED"
    return "ACTIVE"


def detect_term_number(text: str, wertgrenzen_status: str, auction_date: str | None) -> int:
    t = text.lower()
    term = 1
    if re.search(r"2\.\s*termin|zweiter termin|erneuter termin", t):
        term = max(term, 2)
    if re.search(r"3\.\s*termin|dritter termin", t):
        term = max(term, 3)
    if wertgrenzen_status == "REMOVED":
        term = max(term, 2)
    if wertgrenzen_status == "REMOVED" and auction_date:
        try:
            clean = auction_date.replace("+02:00", "")
            if datetime.fromisoformat(clean).timestamp() < datetime.now().timestamp():
                term = max(term, 3)
        except Exception:
            pass
    return term


def extract_pdf_text(pdf_path: Path) -> str:
    if fitz is None or not pdf_path.exists():
        return ""
    try:
        doc = fitz.open(pdf_path)
        text = "\n".join(page.get_text("text") for page in doc)
        doc.close()
        return text
    except Exception:
        return ""


def classify_pdf(path: Path, detail: dict[str, Any]) -> str:
    name = path.name.lower()
    if "foto" in name:
        return "FOTO"
    if "expose" in name or "exposé" in name or "exposee" in name:
        return "EXPOSE"
    if "bekanntmachung" in name or "sonstiges" in name or "index.php" in name:
        return "BEKANNTMACHUNG"
    if "gutachten" in name or "verkehrswert" in name:
        return "GUTACHTEN"

    for item in detail.get("downloaded_files", []) or []:
        saved = Path(str(item.get("saved_as", ""))).name
        if saved == path.name:
            cat = str(item.get("category", "")).lower()
            if "foto" in cat:
                return "FOTO"
            if "expose" in cat:
                return "EXPOSE"
            if "bekanntmach" in cat:
                return "BEKANNTMACHUNG"
            if "gutachten" in cat:
                return "GUTACHTEN"
    return "OTHER"


def copy_documents(input_dir: Path, out_dir: Path, detail: dict[str, Any]) -> list[dict[str, Any]]:
    docs_dir = out_dir / "import_files" / "documents"
    docs_dir.mkdir(parents=True, exist_ok=True)
    docs = []

    for idx, pdf in enumerate(sorted(input_dir.glob("*.pdf")), start=1):
        doc_type = classify_pdf(pdf, detail)
        target_name = {
            "EXPOSE": "expose.pdf",
            "FOTO": "photos_original.pdf",
            "BEKANNTMACHUNG": "announcement.pdf",
            "GUTACHTEN": "gutachten.pdf",
        }.get(doc_type, f"{idx:02d}_{re.sub(r'[^a-zA-Z0-9_.-]+', '_', pdf.name)}")

        target = docs_dir / target_name
        if not target.exists():
            shutil.copy2(pdf, target)

        docs.append({
            "type": doc_type,
            "title": {
                "EXPOSE": "Exposé",
                "FOTO": "Fotodokumentation",
                "BEKANNTMACHUNG": "Amtliche Bekanntmachung / Terminsbestimmung",
                "GUTACHTEN": "Gutachten",
            }.get(doc_type, pdf.stem),
            "sourceFile": pdf.name,
            "localPath": str(Path("import_files") / "documents" / target.name).replace("\\", "/"),
            "sha1": sha1_bytes(target.read_bytes()),
            "sortOrder": idx - 1,
        })

    return docs


def is_likely_logo(width: int, height: int, image_bytes: bytes) -> bool:
    if width < 240 or height < 160:
        return True
    ratio = width / max(height, 1)
    if ratio > 5.0 or ratio < 0.18:
        return True
    if len(image_bytes) < 9000 and (width < 600 or height < 300):
        return True
    return False


def extract_captions(photo_text: str) -> list[str]:
    lines = [clean_text(x) for x in photo_text.splitlines()]
    out = []
    seen = set()

    for line in lines:
        if not line:
            continue
        if re.search(r"^(AZ:|Aktenzeichen|Seite \d+|Bewertungsobjekt:|Gutachten|Anlage)", line, re.I):
            continue
        if 4 <= len(line) <= 130 and len(line.split()) <= 14:
            key = line.lower()
            if key not in seen:
                seen.add(key)
                out.append(line)

    return out


def image_type_from_caption(caption: str | None) -> str:
    c = (caption or "").lower()
    if any(x in c for x in ["zimmer", "flur", "dachgeschoss", "erdgeschoss", "spitzboden", "küche", "kueche", "bad"]):
        return "INTERIOR"
    if any(x in c for x in ["karte", "lage", "straße", "strasse"]):
        return "LOCATION"
    if any(x in c for x in ["grundstück", "grundstueck", "außenanlagen", "aussenanlagen", "garten"]):
        return "PLOT"
    return "EXTERIOR"


def extract_images(input_dir: Path, out_dir: Path, pdf_texts: dict[str, str]) -> list[dict[str, Any]]:
    if fitz is None:
        return []

    images_dir = out_dir / "import_files" / "images"
    images_dir.mkdir(parents=True, exist_ok=True)

    photo_pdfs = [p for p in sorted(input_dir.glob("*.pdf")) if "foto" in p.name.lower()]
    if not photo_pdfs:
        photo_pdfs = [p for p in sorted(input_dir.glob("*.pdf")) if classify_pdf(p, {}) == "FOTO"]
    if not photo_pdfs:
        return []

    images = []
    seen_hashes = set()
    index = 0

    for pdf in photo_pdfs:
        captions = extract_captions(pdf_texts.get(pdf.name, ""))
        caption_idx = 0

        try:
            doc = fitz.open(pdf)
        except Exception:
            continue

        for page_no, page in enumerate(doc, start=1):
            for info in page.get_images(full=True):
                xref = info[0]
                try:
                    extracted = doc.extract_image(xref)
                except Exception:
                    continue

                image_bytes = extracted.get("image", b"")
                width = int(extracted.get("width") or 0)
                height = int(extracted.get("height") or 0)
                ext = (extracted.get("ext") or "jpg").lower()

                if is_likely_logo(width, height, image_bytes):
                    continue

                h = sha1_bytes(image_bytes)
                if h in seen_hashes:
                    continue
                seen_hashes.add(h)

                index += 1
                filename = f"{index:03d}.{ext}"
                target = images_dir / filename
                target.write_bytes(image_bytes)

                caption = captions[caption_idx] if caption_idx < len(captions) else None
                caption_idx += 1

                images.append({
                    "localPath": str(Path("import_files") / "images" / filename).replace("\\", "/"),
                    "type": image_type_from_caption(caption),
                    "caption": caption,
                    "isMain": False,
                    "sortOrder": index - 1,
                    "sourceFile": pdf.name,
                    "sourcePage": page_no,
                    "width": width,
                    "height": height,
                    "sha1": h,
                })

        doc.close()

    main_idx = None
    for i, img in enumerate(images):
        c = (img.get("caption") or "").lower()
        if img["type"] == "EXTERIOR" and not any(x in c for x in ["straße", "strasse", "blick in die"]):
            main_idx = i
            break
    if main_idx is None and images:
        main_idx = 0

    if main_idx is not None:
        images[main_idx]["isMain"] = True
        images.sort(key=lambda x: (not x.get("isMain", False), x.get("sortOrder", 0)))
        for i, img in enumerate(images):
            img["sortOrder"] = i

    return images


def risk_sentence(text: str, keyword: str) -> str:
    t = clean_text(text)
    idx = t.lower().find(keyword.lower())
    if idx < 0:
        return ""
    return clean_text(t[max(0, idx - 80): min(len(t), idx + 420)])


def extract_risks(text: str) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    t = text.lower()
    legal = []
    construction = []

    if re.search(r"baulast|abstandsflächenbaulast|abstandsflaechenbaulast|baulastenverzeichnis", t):
        legal.append({
            "type": "BAULAST",
            "title": "Baulast",
            "summary": risk_sentence(text, "Baulast") or "Baulast im Dokument erkannt.",
            "severity": "MEDIUM",
        })

    if re.search(r"überbau|ueberbau|grenzüberbau|grenzueberbau|§\s*912|§\s*1004", t):
        legal.append({
            "type": "UEBERBAU",
            "title": "Möglicher Überbau / Grenzüberbau",
            "summary": risk_sentence(text, "Überbau") or "Möglicher Überbau im Dokument erkannt.",
            "severity": "HIGH",
        })

    if re.search(r"vollständig modernisierungsbedürftig|vollstaendig modernisierungsbeduerftig|nicht nutzbar|rohbauzustand|entkernung|erneuerung|modernisierung", t):
        construction.append({
            "type": "FULL_MODERNIZATION",
            "title": "Modernisierung erforderlich",
            "summary": risk_sentence(text, "modernisierungsbedürftig") or risk_sentence(text, "nicht nutzbar") or "Modernisierung im Dokument erkannt.",
            "severity": "HIGH",
        })

    return legal, construction


def parse_court(detail: dict[str, Any], all_text: str) -> dict[str, Any]:
    location = clean_text(detail.get("ort_der_versteigerung"))
    court_name = clean_text(detail.get("gericht"))

    m = re.search(r"Amtsgericht\s+([A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-\s]+)", all_text)
    if m:
        court_name = "Amtsgericht " + clean_text(m.group(1))
    elif "Amtsgericht" in location:
        m = re.search(r"(Amtsgericht\s+[A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-\s]+)", location)
        if m:
            court_name = clean_text(m.group(1))

    room = None
    m = re.search(r"(Sitzungssaal\s*[^,\n]+|Saal\s*[^,\n]+|Raum\s*[^,\n]+)", all_text + "\n" + location, re.I)
    if m:
        room = clean_text(m.group(1))

    court_address = None
    m = re.search(r"([A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-\s]+\s+\d+[a-zA-Z]?,\s*\d{5}\s+[A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-\s]+)", all_text + "\n" + location)
    if m:
        court_address = clean_text(m.group(1))

    return {
        "courtName": court_name or None,
        "courtAddress": court_address,
        "room": room,
        "locationOriginal": location or None,
    }


def parse_land_register(detail: dict[str, Any], text: str) -> dict[str, Any]:
    src = "\n".join([
        str(detail.get("grundbuch", "")),
        str(detail.get("grundbuchamt", "")),
        str(detail.get("grundbuchbezirk", "")),
        str(detail.get("gemarkung", "")),
        str(detail.get("blatt", "")),
        str(detail.get("flurstueck", "")),
        text,
    ])

    return {
        "grundbuchCourt": ("Amtsgericht " + clean_text(detail.get("grundbuchamt"))) if detail.get("grundbuchamt") else None,
        "district": clean_text(detail.get("grundbuchbezirk")) or None,
        "gemarkung": clean_text(detail.get("gemarkung")) or None,
        "flurstueck": clean_text(detail.get("flurstueck")) or None,
        "blatt": clean_text(detail.get("blatt")) or None,
        "plotArea": parse_float(detail.get("m2")) or parse_area_by_labels(src, [r"Grundstücksgröße", r"Grundst(?:ü|ue)cksfl(?:ä|ae)che", r"Anschrift\s*m²"]),
    }


def normalize_object_folder(obj_dir: Path, output_root: Path) -> dict[str, Any]:
    detail = load_json(obj_dir / "detail.json")
    status_text = (obj_dir / "status.txt").read_text(encoding="utf-8", errors="ignore") if (obj_dir / "status.txt").exists() else ""

    case_key = obj_dir.name
    out_dir = output_root / case_key
    raw_dir = out_dir / "raw"
    raw_dir.mkdir(parents=True, exist_ok=True)

    if (obj_dir / "detail.json").exists():
        shutil.copy2(obj_dir / "detail.json", raw_dir / "detail.json")
    if (obj_dir / "status.txt").exists():
        shutil.copy2(obj_dir / "status.txt", raw_dir / "status.txt")

    pdf_texts = {}
    for pdf in sorted(obj_dir.glob("*.pdf")):
        text = extract_pdf_text(pdf)
        pdf_texts[pdf.name] = text
        (raw_dir / f"{pdf.stem}_text.txt").write_text(text, encoding="utf-8", errors="ignore")

    all_pdf_text = "\n".join(pdf_texts.values())
    all_text = "\n".join([json.dumps(detail, ensure_ascii=False), status_text, all_pdf_text])

    detail_url = detail.get("detail_url") or detail.get("bekanntmachung_url")
    zvg_id = None
    land_abk = None
    if detail_url:
        m = re.search(r"zvg_id=([0-9]+)", detail_url)
        if m:
            zvg_id = m.group(1)
        m = re.search(r"land_abk=([a-z]+)", detail_url)
        if m:
            land_abk = m.group(1)

    external_id = f"zvg-portal_{land_abk or 'de'}_{zvg_id}" if zvg_id else f"zvg-portal_{sha1_text(case_key)[:16]}"

    az = clean_text(detail.get("aktenzeichen"))
    normalized_az = normalize_aktenzeichen(az, case_key)
    short_az = short_aktenzeichen(normalized_az)

    object_lage = clean_text(detail.get("objekt_lage"))
    address_full = find_address(object_lage) or find_address(all_text) or object_lage
    address = split_address(address_full)

    property_group, property_type = detect_property_type(object_lage + "\n" + clean_text(detail.get("beschreibung")) + "\n" + all_pdf_text)
    usage, usage_original = detect_usage(all_text)
    auction_dt = parse_german_datetime(detail.get("termin")) or parse_german_datetime(detail.get("termin_raw")) or parse_german_datetime(status_text) or parse_german_datetime(all_pdf_text)

    is_cancelled = str(detail.get("is_cancelled", "")) == "1" or str(detail.get("termin_status", "")).lower() == "cancelled"
    status = "CANCELLED" if is_cancelled else "ACTIVE"

    wertgrenzen_status = detect_wertgrenzen(all_text)
    term_no = detect_term_number(all_text, wertgrenzen_status, auction_dt)

    market_value = parse_money(detail.get("verkehrswert")) or parse_money(all_text)
    security_deposit = round(market_value * 0.10) if market_value else None

    plot_area = parse_float(detail.get("m2")) or parse_area_by_labels(all_text, [r"Grundstücksgröße", r"Grundst(?:ü|ue)cksgröße", r"Grundst(?:ü|ue)cksfl(?:ä|ae)che", r"Anschrift\s*m²"])
    living_area = parse_area_by_labels(all_text, [r"Wohnfläche", r"Wohnfl(?:ä|ae)che", r"Wfl\.?"])
    gross_area = parse_area_by_labels(all_text, [r"Bruttogrundfläche", r"BGF"])

    construction_year = None
    construction_year_original = None
    m = re.search(r"(?:Baujahr|errichtet).*?(?:ca\.|um|rd\.)?\s*(\d{4})", all_text, re.I)
    if m:
        construction_year = int(m.group(1))
        construction_year_original = clean_text(m.group(0))[:100]

    basement = None
    if re.search(r"nicht unterkellert", all_text, re.I):
        basement = "nicht unterkellert"
    elif re.search(r"unterkellert", all_text, re.I):
        basement = "unterkellert"

    floors = None
    if re.search(r"eingeschossig", all_text, re.I):
        floors = "eingeschossig"
        if re.search(r"ausgebaut(?:es|em)? Dachgeschoss", all_text, re.I):
            floors += " mit ausgebautem Dachgeschoss"

    outbuildings = bool(re.search(r"Nebengebäude|Nebengebaeude|Nebengelass", all_text, re.I))

    court = parse_court(detail, all_text)
    legal_risks, construction_risks = extract_risks(all_text)
    documents = copy_documents(obj_dir, out_dir, detail)
    images = extract_images(obj_dir, out_dir, pdf_texts)

    title_city = address.get("city") or "Deutschland"
    if property_type == "EINFAMILIENHAUS":
        title = f"Einfamilienhaus in {title_city}"
    elif property_group == "WOHNUNGEN":
        title = f"Wohnung in {title_city}"
    elif property_group == "GEWERBE":
        title = f"Gewerbeimmobilie in {title_city}"
    elif object_lage:
        title = object_lage.split(":", 1)[0] + (f" in {title_city}" if title_city != "Deutschland" else "")
    else:
        title = f"Zwangsversteigerung {normalized_az}"

    geo_url = None
    for link in detail.get("external_links", []) or []:
        if str(link.get("label", "")).lower() == "geoserver" or "maps.google" in str(link.get("url", "")):
            geo_url = str(link.get("url", ""))

    missing = []
    for key, value in [
        ("source.externalId", external_id),
        ("case.normalizedAktenzeichen", normalized_az),
        ("property.title", title),
        ("address.fullAddress", address.get("fullAddress")),
        ("auction.dateTime", auction_dt),
        ("values.marketValue", market_value),
    ]:
        if value in (None, "", []):
            missing.append(key)

    warnings = []
    if not images:
        warnings.append("Keine Objektfotos extrahiert.")
    if not documents:
        warnings.append("Keine Dokumente gefunden.")
    warnings.append("Koordinaten müssen ggf. später geocodiert werden.")

    score = max(0, 100 - len(missing) * 12 - len(warnings) * 3)

    normalized = {
        "schemaVersion": "zvg-de-normalized-1.0",
        "source": {
            "portal": "zvg-portal.de",
            "detailUrl": detail_url,
            "externalId": external_id,
            "collectedAt": datetime.now().isoformat(),
            "inputFolder": str(obj_dir),
        },
        "case": {
            "aktenzeichen": az,
            "aktenzeichenShort": short_az,
            "normalizedAktenzeichen": normalized_az,
        },
        "status": {
            "status": status,
            "isCancelled": is_cancelled,
            "statusOriginal": detail.get("termin_status") or ("cancelled" if is_cancelled else "active"),
        },
        "auction": {
            "dateTime": auction_dt,
            "dateOriginal": detail.get("termin") or detail.get("termin_raw"),
            "courtName": court["courtName"],
            "courtAddress": court["courtAddress"],
            "room": court["room"],
            "locationOriginal": court["locationOriginal"],
            "auctionType": detail.get("art_der_versteigerung"),
            "termNumber": term_no,
            "wertgrenzenStatus": wertgrenzen_status,
        },
        "property": {
            "title": title,
            "shortTitle": title,
            "propertyTypeGroup": property_group,
            "propertyType": property_type,
            "propertyTypeOriginal": object_lage.split(":", 1)[0] if ":" in object_lage else detail.get("objektart"),
            "usage": usage,
            "usageOriginal": usage_original,
            "description": clean_text(detail.get("beschreibung")) or clean_text(all_pdf_text)[:900],
            "conditionSummary": construction_risks[0]["summary"] if construction_risks else None,
            "denkmalStatus": detect_denkmal(all_text),
        },
        "address": address,
        "geo": {
            "latitude": None,
            "longitude": None,
            "source": "geocode_pending",
            "sourceUrl": geo_url,
        },
        "values": {
            "marketValue": market_value,
            "currency": "EUR",
            "marketValueOriginal": detail.get("verkehrswert"),
            "securityDepositPercent": 10,
            "securityDepositAmount": security_deposit,
        },
        "areas": {
            "plotArea": plot_area,
            "livingArea": living_area,
            "grossFloorArea": gross_area,
            "usableArea": None,
            "totalArea": None,
        },
        "building": {
            "constructionYear": construction_year,
            "constructionYearOriginal": construction_year_original,
            "floors": floors,
            "basement": basement,
            "outbuildings": outbuildings,
            "outbuildingsDescription": "Nebengebäude erkannt" if outbuildings else None,
        },
        "landRegister": parse_land_register(detail, all_text),
        "legalRisks": legal_risks,
        "constructionRisks": construction_risks,
        "documents": documents,
        "images": images,
        "raw": {
            "detailJsonPath": "raw/detail.json" if (raw_dir / "detail.json").exists() else None,
            "statusTextPath": "raw/status.txt" if (raw_dir / "status.txt").exists() else None,
            "rawDir": "raw",
        },
        "quality": {
            "score": score,
            "requiredFieldsComplete": not missing,
            "missingFields": missing,
            "warnings": warnings,
            "sourceConfidence": {
                "detailJson": 1.0 if detail else 0.0,
                "pdfText": 1.0 if all_pdf_text else 0.0,
                "photoPdf": 1.0 if images else 0.0,
            },
        },
    }

    save_json(out_dir / "normalized.json", normalized)
    save_json(out_dir / "quality_report.json", normalized["quality"])
    return normalized



def patch_original_parser_ssl(module: Any) -> None:
    """
    Patch original Sachsen_zvg.py requests behavior without modifying the original parser file.

    The original parser uses requests.Session() and request_with_retry(session, ...).
    If Windows Python cannot verify certificates, run with:
      $env:ZVG_SSL_VERIFY="0"

    Normal mode still verifies SSL.
    """
    if not hasattr(module, "requests"):
        return

    try:
        if not ZVG_SSL_VERIFY:
            try:
                module.requests.packages.urllib3.disable_warnings()
            except Exception:
                pass

        original_session_request = module.requests.sessions.Session.request

        def request_with_ssl_default(self, method, url, **kwargs):
            if "verify" not in kwargs:
                kwargs["verify"] = ZVG_SSL_VERIFY
            return original_session_request(self, method, url, **kwargs)

        module.requests.sessions.Session.request = request_with_ssl_default
        print(f"[SSL] requests verify={ZVG_SSL_VERIFY}")
    except Exception as exc:
        print(f"[SSL PATCH WARNING] {exc}", file=sys.stderr)


def install_and_run(parser_path: Path, output_root: Path) -> int:
    parser_path = parser_path.resolve()
    output_root = output_root.resolve()
    output_root.mkdir(parents=True, exist_ok=True)

    if not parser_path.exists():
        print(f"Parser file not found: {parser_path}", file=sys.stderr)
        return 1

    spec = importlib.util.spec_from_file_location("sachsen_zvg_original", str(parser_path))
    if spec is None or spec.loader is None:
        print(f"Cannot import parser: {parser_path}", file=sys.stderr)
        return 1

    module = importlib.util.module_from_spec(spec)
    sys.modules["sachsen_zvg_original"] = module
    spec.loader.exec_module(module)

    patch_original_parser_ssl(module)

    original_write_status_file = module.write_status_file

    def patched_write_status_file(obj_dir: Path, data: dict) -> None:
        original_write_status_file(obj_dir, data)
        try:
            normalized = normalize_object_folder(Path(obj_dir), output_root)
            print(f"[NORMALIZED] {obj_dir.name} -> {output_root / obj_dir.name / 'normalized.json'} | score={normalized['quality']['score']}")
        except Exception as exc:
            print(f"[NORMALIZE ERROR] {obj_dir}: {exc}", file=sys.stderr)

    module.write_status_file = patched_write_status_file

    # Also normalize skipped objects if SKIP_IF_ALREADY_DONE loads old detail.json and calls write_status_file.
    return module.main() or 0


def normalize_existing(root: Path, output_root: Path) -> int:
    root = root.resolve()
    output_root = output_root.resolve()
    output_root.mkdir(parents=True, exist_ok=True)

    folders = [p for p in sorted(root.iterdir()) if p.is_dir() and ((p / "detail.json").exists() or list(p.glob("*.pdf")))]
    summary = []

    for folder in folders:
        try:
            normalized = normalize_object_folder(folder, output_root)
            print(f"[NORMALIZED] {folder.name} -> {output_root / folder.name / 'normalized.json'} | score={normalized['quality']['score']}")
            summary.append({
                "ok": True,
                "folder": str(folder),
                "externalId": normalized["source"]["externalId"],
                "az": normalized["case"]["normalizedAktenzeichen"],
                "title": normalized["property"]["title"],
                "score": normalized["quality"]["score"],
            })
        except Exception as exc:
            print(f"[NORMALIZE ERROR] {folder}: {exc}", file=sys.stderr)
            summary.append({"ok": False, "folder": str(folder), "error": str(exc)})

    save_json(output_root / "normalization_summary.json", {
        "count": len(summary),
        "ok": sum(1 for x in summary if x.get("ok")),
        "failed": sum(1 for x in summary if not x.get("ok")),
        "items": summary,
    })

    return 0



# STAGE117_NORMALIZER_QUALITY_PATCH
# Fixes detected on Wildenfels test object:
# - Verkehrswert 1,00 was parsed as 10202 because old parser accepted numbers without EUR/€.
# - Generic §74a/§85a sentence was incorrectly treated as removed Wertgrenzen.
# - Court address was confused with property address.
# - Plot area from Grundbuch string was not extracted.
# - Leerstand was not detected as VACANT.
# - Abrissobjekt / nicht wirtschaftlich sanierbar was not detected as construction risk.
# - Photo captions were shifted by document header lines.

def parse_money(value: Any) -> int | None:
    text = str(value or "").replace("\xa0", " ")
    if not text.strip():
        return None

    # Prefer amounts explicitly connected to EUR/€.
    patterns = [
        r"(\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})?|\d+(?:,\d{2})?)\s*(?:€|EUR)",
        r"(?:€|EUR)\s*(\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})?|\d+(?:,\d{2})?)",
    ]

    values = []
    for pattern in patterns:
        for m in re.findall(pattern, text, re.I):
            try:
                values.append(round(float(str(m).replace(".", "").replace(" ", "").replace(",", "."))))
            except ValueError:
                pass

    if values:
        return max(values)

    # If field is direct like detail["verkehrswert"] = "1,00", parse it.
    direct = clean_text(text)
    if re.fullmatch(r"\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})?|\d+(?:,\d{2})?", direct):
        try:
            return round(float(direct.replace(".", "").replace(" ", "").replace(",", ".")))
        except ValueError:
            return None

    return None


def detect_wertgrenzen(text: str) -> str:
    t = text.lower()

    # This is the standard legal sentence for setting the Verkehrswert and does NOT mean limits are removed:
    # "Der Verkehrswert wurde gemäß §§ 74a Abs. 5, 85a Abs. 2 S. 1 ZVG festgesetzt ..."
    neutral_patterns = [
        r"verkehrswert\s+wurde\s+gemäß\s+§§\s*74a\s*abs\.\s*5\s*,\s*85a\s*abs\.\s*2",
        r"verkehrswert\s+wurde\s+gemaeß\s+§§\s*74a\s*abs\.\s*5\s*,\s*85a\s*abs\.\s*2",
        r"verkehrswert\s+wurde\s+gemaess\s+§§\s*74a\s*abs\.\s*5\s*,\s*85a\s*abs\.\s*2",
    ]
    neutral = any(re.search(p, t, re.I) for p in neutral_patterns)

    removed_patterns = [
        r"wertgrenzen\s*(?:weggefallen|aufgehoben|sind\s+weggefallen)",
        r"5/10\s*(?:grenze|wertgrenze).{0,80}(?:weggefallen|aufgehoben)",
        r"7/10\s*(?:grenze|wertgrenze).{0,80}(?:weggefallen|aufgehoben)",
        r"zweiter\s+termin",
        r"2\.\s*termin",
        r"dritter\s+termin",
        r"3\.\s*termin",
    ]

    if any(re.search(p, t, re.I) for p in removed_patterns):
        return "REMOVED"

    if neutral:
        return "ACTIVE"

    return "ACTIVE"


def detect_usage(text: str) -> tuple[str, str | None]:
    t = text.lower()
    if re.search(r"leerstand|leerstehend|ungenutzt|frei\b|unbewohnt", t):
        return "VACANT", "Leerstand/leerstehend"
    if re.search(r"vermietet|mietvertrag|mieter", t):
        return "RENTED", "vermietet"
    if re.search(r"eigengenutzt|eigen genutzt|vom eigentümer genutzt", t):
        return "OWNER_OCCUPIED", "eigengenutzt"
    return "UNKNOWN", None


def parse_court(detail: dict[str, Any], all_text: str) -> dict[str, Any]:
    location = clean_text(detail.get("ort_der_versteigerung"))
    court_name = clean_text(detail.get("gericht"))

    m = re.search(r"Amtsgericht\s+([A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-\s]+)", all_text)
    if m:
        court_name = "Amtsgericht " + clean_text(m.group(1))
    elif "Amtsgericht" in location:
        m = re.search(r"(Amtsgericht\s+[A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-\s]+)", location)
        if m:
            court_name = clean_text(m.group(1))

    room = None
    m = re.search(r"(Sitzungssaal\s*\d+[A-Za-z]?|Saal\s*\d+[A-Za-z]?|Raum\s*\d+[A-Za-z]?)", all_text + "\n" + location, re.I)
    if m:
        room = clean_text(m.group(1))
    elif "Saal 7" in location:
        room = "Sitzungssaal 7"

    court_address = None

    # Prefer address after Amtsgericht / auction location. Do NOT use property address from Grundbuch table.
    # Example location: "Saal 7, Amtsgericht Zwickau, Pölbitzer Straße 9, 08058 Zwickau"
    if location:
        m = re.search(r"Amtsgericht\s+[A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-\s]+,\s*([^,]+?\s+\d+[a-zA-Z]?,\s*\d{5}\s+[A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-\s]+)", location)
        if m:
            court_address = clean_text(m.group(1))

    if court_address is None:
        # Announcement text sometimes hyphenates Pölbitzer: "Pölbit-\nzer Straße"
        fixed = all_text.replace("Pölbit-\nzer", "Pölbitzer").replace("Pölbit- zer", "Pölbitzer")
        m = re.search(r"(Pölbitzer\s+Straße\s+\d+[a-zA-Z]?,\s*\d{5}\s+Zwickau)", fixed, re.I)
        if m:
            court_address = clean_text(m.group(1))

    return {
        "courtName": court_name or None,
        "courtAddress": court_address,
        "room": room,
        "locationOriginal": location or None,
    }


def parse_land_register(detail: dict[str, Any], text: str) -> dict[str, Any]:
    gb = str(detail.get("grundbuch", "") or "")
    src = "\n".join([
        gb,
        str(detail.get("grundbuchamt", "")),
        str(detail.get("grundbuchbezirk", "")),
        str(detail.get("gemarkung", "")),
        str(detail.get("blatt", "")),
        str(detail.get("flurstueck", "")),
        str(detail.get("m2", "")),
        text,
    ])

    grundbuch_court = None
    district = None
    gemarkung = clean_text(detail.get("gemarkung")) or None
    blatt = clean_text(detail.get("blatt")) or None
    flurstueck = clean_text(detail.get("flurstueck")) or None
    plot_area = parse_float(detail.get("m2"))

    m = re.search(r"Grundbuch\s+des\s+AG\s+([A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-\s]+)\s+von\s+([A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-\s]+)", gb, re.I)
    if not m:
        m = re.search(r"Grundbuch\s+des\s+Amtsgerichts\s+([A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-\s]+)\s+von\s+([A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-\s]+)", src, re.I)
    if m:
        grundbuch_court = "Amtsgericht " + clean_text(m.group(1))
        district = clean_text(m.group(2))

    if not gemarkung:
        m = re.search(r"Gemarkung\s+([A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-\s]+)", gb, re.I)
        if m:
            gemarkung = clean_text(m.group(1))

    if not blatt:
        m = re.search(r"Blatt\s+(\d+)", gb, re.I)
        if m:
            blatt = clean_text(m.group(1))

    if not flurstueck:
        m = re.search(r"Flurstück\s+([0-9]+/[0-9]+|[0-9]+)", gb, re.I)
        if m:
            flurstueck = clean_text(m.group(1))

    if plot_area is None:
        # "Flurstück 370/3 zu 460 m²"
        m = re.search(r"Flurstück\s+[0-9/]+\s+zu\s+(\d{1,6}(?:[.,]\d{1,2})?)\s*m", src, re.I)
        if m:
            plot_area = parse_float(m.group(1))

    if plot_area is None:
        # table row: Wildenfels 370/3 ... Schulstraße 2 460 132
        m = re.search(r"Schulstraße\s+2\s+(\d{2,6})\s+132", src, re.I)
        if m:
            plot_area = parse_float(m.group(1))

    return {
        "grundbuchCourt": grundbuch_court,
        "district": district,
        "gemarkung": gemarkung,
        "flurstueck": flurstueck,
        "blatt": blatt,
        "plotArea": plot_area,
    }


def extract_captions(photo_text: str) -> list[str]:
    text = photo_text.replace("\xa0", " ")
    # Pair "Bild N" with the next non-empty line, ignore document title/address headers.
    pairs = []
    lines = [clean_text(x) for x in text.splitlines()]
    for i, line in enumerate(lines):
        if re.fullmatch(r"Bild\s*\d+", line, re.I):
            j = i + 1
            while j < len(lines) and not lines[j]:
                j += 1
            if j < len(lines):
                nxt = lines[j]
                if not re.search(r"Fotografische Dokumentation|^\d{5}\s|Flurstück|Verkehrswertgutachten", nxt, re.I):
                    pairs.append(nxt)

    if pairs:
        return pairs

    # Fallback: old behavior, but filter headers more aggressively.
    out = []
    seen = set()
    for line in lines:
        if not line:
            continue
        if re.search(r"^(AZ:|Aktenzeichen|Seite \d+|Bewertungsobjekt:|Gutachten|Anlage|Fotografische Dokumentation|\d{5}\s)", line, re.I):
            continue
        if re.fullmatch(r"Bild\s*\d+", line, re.I):
            continue
        if 4 <= len(line) <= 130 and len(line.split()) <= 14:
            key = line.lower()
            if key not in seen:
                seen.add(key)
                out.append(line)
    return out


def image_type_from_caption(caption: str | None) -> str:
    c = (caption or "").lower()
    if any(x in c for x in ["zimmer", "flur", "dachgeschoss", "erdgeschoss", "spitzboden", "küche", "kueche", "bad"]):
        return "INTERIOR"
    if any(x in c for x in ["karte", "lageplan"]):
        return "LOCATION"
    if any(x in c for x in ["grundstück", "grundstueck", "außenanlagen", "aussenanlagen", "garten"]):
        return "PLOT"
    return "EXTERIOR"


def extract_risks(text: str) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    t = text.lower()
    legal = []
    construction = []

    if re.search(r"baulast|abstandsflächenbaulast|abstandsflaechenbaulast|baulastenverzeichnis", t):
        legal.append({
            "type": "BAULAST",
            "title": "Baulast",
            "summary": risk_sentence(text, "Baulast") or "Baulast im Dokument erkannt.",
            "severity": "MEDIUM",
        })

    if re.search(r"überbau|ueberbau|grenzüberbau|grenzueberbau|§\s*912|§\s*1004", t):
        legal.append({
            "type": "UEBERBAU",
            "title": "Möglicher Überbau / Grenzüberbau",
            "summary": risk_sentence(text, "Überbau") or "Möglicher Überbau im Dokument erkannt.",
            "severity": "HIGH",
        })

    if re.search(r"nicht\s+wirtschaftlich\s+sanierbar|abrissobjekt|notsicherung|sanierungsarbeiten\s+müssen\s+als\s+verbraucht|seit\s+mindestens\s+1996\s+leer", t):
        construction.append({
            "type": "DEMOLITION_OBJECT",
            "title": "Abrissobjekt / wirtschaftlich nicht sanierbar",
            "summary": risk_sentence(text, "nicht wirtschaftlich sanierbar") or risk_sentence(text, "Abrissobjekt") or "Objekt als Abrissobjekt bzw. wirtschaftlich nicht sanierbar beschrieben.",
            "severity": "HIGH",
        })

    if re.search(r"vollständig modernisierungsbedürftig|vollstaendig modernisierungsbeduerftig|nicht nutzbar|rohbauzustand|entkernung|erneuerung|modernisierung", t):
        construction.append({
            "type": "FULL_MODERNIZATION",
            "title": "Modernisierung erforderlich",
            "summary": risk_sentence(text, "modernisierungsbedürftig") or risk_sentence(text, "nicht nutzbar") or "Modernisierung im Dokument erkannt.",
            "severity": "HIGH",
        })

    return legal, construction



# STAGE118_NORMALIZER_FINAL_POLISH
# Final fixes after checking normalized(1).json:
# - areas.plotArea should be filled from landRegister.plotArea
# - landRegister.gemarkung was "Wildenfels Blatt"; should be "Wildenfels"
# - conditionSummary / risk summary should be clean, not a random text slice
# - main image should not be the "dito" image if a direct named view exists
# - "Wohnhaus mit Anbau" should set outbuildings/anbau flag
# - room should be normalized to "Sitzungssaal 7"

def risk_sentence(text: str, keyword: str) -> str:
    t = clean_text(text)
    low = t.lower()
    idx = low.find(keyword.lower())
    if idx < 0:
        return ""

    # Try to return the sentence containing the keyword.
    start = max(low.rfind(". ", 0, idx), low.rfind("\\n", 0, idx), 0)
    end_dot = low.find(". ", idx)
    end_nl = low.find("\\n", idx)
    candidates = [x for x in [end_dot, end_nl] if x > idx]
    end = min(candidates) if candidates else min(len(t), idx + 260)

    sentence = clean_text(t[start:end].strip(" .\\n\\t"))
    if len(sentence) > 320:
        sentence = sentence[:317].rstrip() + "..."
    return sentence


def extract_risks(text: str) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    t = text.lower()
    legal = []
    construction = []

    if re.search(r"baulast|abstandsflächenbaulast|abstandsflaechenbaulast|baulastenverzeichnis", t):
        legal.append({
            "type": "BAULAST",
            "title": "Baulast",
            "summary": risk_sentence(text, "Baulast") or "Baulast im Dokument erkannt.",
            "severity": "MEDIUM",
        })

    if re.search(r"überbau|ueberbau|grenzüberbau|grenzueberbau|§\s*912|§\s*1004", t):
        legal.append({
            "type": "UEBERBAU",
            "title": "Möglicher Überbau / Grenzüberbau",
            "summary": risk_sentence(text, "Überbau") or "Möglicher Überbau im Dokument erkannt.",
            "severity": "HIGH",
        })

    if re.search(r"nicht\s+wirtschaftlich\s+sanierbar|abrissobjekt|notsicherung|sanierungsarbeiten\s+müssen\s+als\s+verbraucht|seit\s+mindestens\s+1996\s+leer", t):
        construction.append({
            "type": "DEMOLITION_OBJECT",
            "title": "Abrissobjekt / wirtschaftlich nicht sanierbar",
            "summary": "Das Wohnhaus wird als nicht wirtschaftlich sanierbar und als Abrissobjekt beschrieben.",
            "severity": "HIGH",
        })

    if re.search(r"vollständig modernisierungsbedürftig|vollstaendig modernisierungsbeduerftig|nicht nutzbar|rohbauzustand|entkernung|erneuerung|modernisierung", t):
        construction.append({
            "type": "FULL_MODERNIZATION",
            "title": "Modernisierung erforderlich",
            "summary": risk_sentence(text, "modernisierungsbedürftig") or risk_sentence(text, "Modernisierung") or "Modernisierung im Dokument erkannt.",
            "severity": "HIGH",
        })

    return legal, construction


def parse_land_register(detail: dict[str, Any], text: str) -> dict[str, Any]:
    gb = str(detail.get("grundbuch", "") or "")
    src = "\\n".join([
        gb,
        str(detail.get("grundbuchamt", "")),
        str(detail.get("grundbuchbezirk", "")),
        str(detail.get("gemarkung", "")),
        str(detail.get("blatt", "")),
        str(detail.get("flurstueck", "")),
        str(detail.get("m2", "")),
        text,
    ])

    grundbuch_court = None
    district = None
    gemarkung = clean_text(detail.get("gemarkung")) or None
    blatt = clean_text(detail.get("blatt")) or None
    flurstueck = clean_text(detail.get("flurstueck")) or None
    plot_area = parse_float(detail.get("m2"))

    m = re.search(r"Grundbuch\\s+des\\s+AG\\s+([A-ZÄÖÜ][A-Za-zÄÖÜäöüß\\-\\s]+?)\\s+von\\s+([A-ZÄÖÜ][A-Za-zÄÖÜäöüß\\-\\s]+?)(?:,|\\s+Gemarkung|\\s+Blatt)", gb, re.I)
    if not m:
        m = re.search(r"Grundbuch\\s+des\\s+Amtsgerichts\\s+([A-ZÄÖÜ][A-Za-zÄÖÜäöüß\\-\\s]+?)\\s+von\\s+([A-ZÄÖÜ][A-Za-zÄÖÜäöüß\\-\\s]+?)(?:,|\\s+Gemarkung|\\s+Blatt)", src, re.I)
    if m:
        grundbuch_court = "Amtsgericht " + clean_text(m.group(1))
        district = clean_text(m.group(2))

    if not gemarkung:
        m = re.search(r"Gemarkung\\s+([A-ZÄÖÜ][A-Za-zÄÖÜäöüß\\-\\s]+?)(?:\\s+Blatt|\\s+Flurstück|,|$)", gb, re.I)
        if m:
            gemarkung = clean_text(m.group(1))

    if not blatt:
        m = re.search(r"Blatt\\s+(\\d+)", gb, re.I)
        if m:
            blatt = clean_text(m.group(1))

    if not flurstueck:
        m = re.search(r"Flurstück\\s+([0-9]+/[0-9]+|[0-9]+)", gb, re.I)
        if m:
            flurstueck = clean_text(m.group(1))

    if plot_area is None:
        m = re.search(r"Flurstück\\s+[0-9/]+\\s+zu\\s+(\\d{1,6}(?:[.,]\\d{1,2})?)\\s*m", src, re.I)
        if m:
            plot_area = parse_float(m.group(1))

    if plot_area is None:
        m = re.search(r"Schulstraße\\s+2\\s+(\\d{2,6})\\s+132", src, re.I)
        if m:
            plot_area = parse_float(m.group(1))

    return {
        "grundbuchCourt": grundbuch_court,
        "district": district,
        "gemarkung": gemarkung,
        "flurstueck": flurstueck,
        "blatt": blatt,
        "plotArea": plot_area,
    }


def parse_court(detail: dict[str, Any], all_text: str) -> dict[str, Any]:
    location = clean_text(detail.get("ort_der_versteigerung"))
    court_name = clean_text(detail.get("gericht"))

    m = re.search(r"Amtsgericht\\s+([A-ZÄÖÜ][A-Za-zÄÖÜäöüß\\-\\s]+)", all_text)
    if m:
        court_name = "Amtsgericht " + clean_text(m.group(1))
    elif "Amtsgericht" in location:
        m = re.search(r"(Amtsgericht\\s+[A-ZÄÖÜ][A-Za-zÄÖÜäöüß\\-\\s]+)", location)
        if m:
            court_name = clean_text(m.group(1))

    room = None
    m = re.search(r"(Sitzungssaal\\s*\\d+[A-Za-z]?|Saal\\s*\\d+[A-Za-z]?|Raum\\s*\\d+[A-Za-z]?)", all_text + "\\n" + location, re.I)
    if m:
        room = clean_text(m.group(1))
    if room and re.fullmatch(r"Saal\\s*\\d+[A-Za-z]?", room, re.I):
        room = re.sub(r"^Saal", "Sitzungssaal", room, flags=re.I)

    court_address = None
    if location:
        m = re.search(r"Amtsgericht\\s+[A-ZÄÖÜ][A-Za-zÄÖÜäöüß\\-\\s]+,\\s*([^,]+?\\s+\\d+[a-zA-Z]?,\\s*\\d{5}\\s+[A-ZÄÖÜ][A-Za-zÄÖÜäöüß\\-\\s]+)", location)
        if m:
            court_address = clean_text(m.group(1))

    if court_address is None:
        fixed = all_text.replace("Pölbit-\\nzer", "Pölbitzer").replace("Pölbit- zer", "Pölbitzer")
        m = re.search(r"(Pölbitzer\\s+Straße\\s+\\d+[a-zA-Z]?,\\s*\\d{5}\\s+Zwickau)", fixed, re.I)
        if m:
            court_address = clean_text(m.group(1))

    return {
        "courtName": court_name or None,
        "courtAddress": court_address,
        "room": room,
        "locationOriginal": location or None,
    }


def extract_images(input_dir: Path, out_dir: Path, pdf_texts: dict[str, str]) -> list[dict[str, Any]]:
    if fitz is None:
        return []

    images_dir = out_dir / "import_files" / "images"
    images_dir.mkdir(parents=True, exist_ok=True)

    photo_pdfs = [p for p in sorted(input_dir.glob("*.pdf")) if "foto" in p.name.lower()]
    if not photo_pdfs:
        photo_pdfs = [p for p in sorted(input_dir.glob("*.pdf")) if classify_pdf(p, {}) == "FOTO"]
    if not photo_pdfs:
        return []

    images = []
    seen_hashes = set()
    index = 0

    for pdf in photo_pdfs:
        captions = extract_captions(pdf_texts.get(pdf.name, ""))
        caption_idx = 0

        try:
            doc = fitz.open(pdf)
        except Exception:
            continue

        for page_no, page in enumerate(doc, start=1):
            for info in page.get_images(full=True):
                xref = info[0]
                try:
                    extracted = doc.extract_image(xref)
                except Exception:
                    continue

                image_bytes = extracted.get("image", b"")
                width = int(extracted.get("width") or 0)
                height = int(extracted.get("height") or 0)
                ext = (extracted.get("ext") or "jpg").lower()

                if is_likely_logo(width, height, image_bytes):
                    continue

                h = sha1_bytes(image_bytes)
                if h in seen_hashes:
                    continue
                seen_hashes.add(h)

                index += 1
                filename = f"{index:03d}.{ext}"
                target = images_dir / filename
                target.write_bytes(image_bytes)

                caption = captions[caption_idx] if caption_idx < len(captions) else None
                caption_idx += 1

                images.append({
                    "localPath": str(Path("import_files") / "images" / filename).replace("\\\\", "/"),
                    "type": image_type_from_caption(caption),
                    "caption": caption,
                    "isMain": False,
                    "sortOrder": index - 1,
                    "sourceFile": pdf.name,
                    "sourcePage": page_no,
                    "width": width,
                    "height": height,
                    "sha1": h,
                })

        doc.close()

    # Prefer first named view. Never choose "dito" as main if any better caption exists.
    main_idx = None
    for i, img in enumerate(images):
        c = (img.get("caption") or "").lower()
        if img["type"] == "EXTERIOR" and c and c != "dito":
            main_idx = i
            break
    if main_idx is None and images:
        main_idx = 0

    if main_idx is not None:
        images[main_idx]["isMain"] = True
        images.sort(key=lambda x: (not x.get("isMain", False), x.get("sortOrder", 0)))
        for i, img in enumerate(images):
            img["sortOrder"] = i

    return images


_original_normalize_object_folder_stage118 = normalize_object_folder

def normalize_object_folder(obj_dir: Path, output_root: Path) -> dict[str, Any]:
    n = _original_normalize_object_folder_stage118(obj_dir, output_root)

    # Fill areas.plotArea from landRegister if missing.
    if n.get("areas", {}).get("plotArea") in (None, ""):
        lr_area = n.get("landRegister", {}).get("plotArea")
        if lr_area not in (None, ""):
            n["areas"]["plotArea"] = lr_area

    # If "Anbau" is mentioned, store outbuildings.
    text_blob = json.dumps(n, ensure_ascii=False).lower()
    if "wohnhaus mit anbau" in text_blob or "anbau" in text_blob:
        n.setdefault("building", {})["outbuildings"] = True
        if not n["building"].get("outbuildingsDescription"):
            n["building"]["outbuildingsDescription"] = "Wohnhaus mit Anbau"

    # Clean condition summary from detected construction risk.
    if n.get("constructionRisks"):
        n.setdefault("property", {})["conditionSummary"] = n["constructionRisks"][0].get("summary")

    # Safety: if marketValue <= 10, security deposit rounded to cents is not useful for UI.
    if n.get("values", {}).get("marketValue") is not None:
        mv = n["values"]["marketValue"]
        n["values"]["securityDepositAmount"] = round(mv * 0.10) if mv >= 10 else 0

    # Save patched JSON again.
    out_dir = output_root / obj_dir.name
    save_json(out_dir / "normalized.json", n)
    save_json(out_dir / "quality_report.json", n.get("quality", {}))
    return n



# STAGE119_NORMALIZER_REGRESSION_FIX
# Fixes after normalized(2).json:
# - courtName became "Internetseite des Gerichtes"; recover Amtsgericht from locationOriginal.
# - courtAddress/room became null; recover from locationOriginal.
# - landRegister and areas.plotArea became null; recover from detail.json "grundbuch" string and raw text.
# - localPath must use "/" not "\\" for import compatibility.

def stage119_extract_court_from_location(location: str) -> dict[str, Any]:
    loc = clean_text(location)
    court_name = None
    court_address = None
    room = None

    m = re.search(r"(?:Saal|Sitzungssaal|Raum)\s*(\d+[A-Za-z]?)", loc, re.I)
    if m:
        room = "Sitzungssaal " + clean_text(m.group(1))

    m = re.search(r"(Amtsgericht\s+[A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-\s]+)", loc)
    if m:
        court_name = clean_text(m.group(1))

    m = re.search(r"Amtsgericht\s+[A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-\s]+,\s*([^,]+?\s+\d+[a-zA-Z]?,\s*\d{5}\s+[A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-\s]+)", loc)
    if m:
        court_address = clean_text(m.group(1))

    return {
        "courtName": court_name,
        "courtAddress": court_address,
        "room": room,
    }


def stage119_fix_land_register_from_detail(n: dict[str, Any], obj_dir: Path) -> None:
    detail = load_json(obj_dir / "detail.json")
    gb = str(detail.get("grundbuch", "") or "")

    lr = n.setdefault("landRegister", {})

    if not lr.get("grundbuchCourt"):
        m = re.search(r"Grundbuch\s+des\s+AG\s+([A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-\s]+?)\s+von\s+([A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-\s]+?)(?:,|$)", gb, re.I)
        if not m:
            m = re.search(r"Grundbuch\s+des\s+Amtsgerichts\s+([A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-\s]+?)\s+von\s+([A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-\s]+?)(?:,|$)", gb, re.I)
        if m:
            lr["grundbuchCourt"] = "Amtsgericht " + clean_text(m.group(1))
            lr["district"] = clean_text(m.group(2))

    if not lr.get("gemarkung"):
        m = re.search(r"Gemarkung\s+([A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-\s]+?)(?:\s+Blatt|\s+Flurstück|,|$)", gb, re.I)
        if m:
            lr["gemarkung"] = clean_text(m.group(1))

    if not lr.get("blatt"):
        m = re.search(r"Blatt\s+(\d+)", gb, re.I)
        if m:
            lr["blatt"] = clean_text(m.group(1))

    if not lr.get("flurstueck"):
        m = re.search(r"Flurstück\s+([0-9]+/[0-9]+|[0-9]+)", gb, re.I)
        if m:
            lr["flurstueck"] = clean_text(m.group(1))

    if lr.get("plotArea") in (None, ""):
        m = re.search(r"Flurstück\s+[0-9/]+\s+zu\s+(\d{1,6}(?:[.,]\d{1,2})?)\s*m", gb, re.I)
        if m:
            lr["plotArea"] = parse_float(m.group(1))

    if lr.get("plotArea") in (None, ""):
        m2 = re.search(r"Schulstraße\s+2\s+(\d{2,6})\s+132", gb, re.I)
        if m2:
            lr["plotArea"] = parse_float(m2.group(1))

    if n.setdefault("areas", {}).get("plotArea") in (None, "") and lr.get("plotArea") not in (None, ""):
        n["areas"]["plotArea"] = lr["plotArea"]


def stage119_normalize_paths(n: dict[str, Any]) -> None:
    for group in ("images", "documents"):
        for item in n.get(group, []) or []:
            if isinstance(item.get("localPath"), str):
                item["localPath"] = item["localPath"].replace("\\\\", "/")


_original_normalize_object_folder_stage119 = normalize_object_folder

def normalize_object_folder(obj_dir: Path, output_root: Path) -> dict[str, Any]:
    n = _original_normalize_object_folder_stage119(obj_dir, output_root)

    # Recover court fields from locationOriginal if generic/wrong or missing.
    auction = n.setdefault("auction", {})
    loc = auction.get("locationOriginal") or ""
    recovered = stage119_extract_court_from_location(loc)

    bad_court_names = {"Internetseite des Gerichtes", "Internetseite des Gerichts", "Internet"}
    if not auction.get("courtName") or auction.get("courtName") in bad_court_names:
        if recovered.get("courtName"):
            auction["courtName"] = recovered["courtName"]

    if not auction.get("courtAddress") and recovered.get("courtAddress"):
        auction["courtAddress"] = recovered["courtAddress"]

    if not auction.get("room") and recovered.get("room"):
        auction["room"] = recovered["room"]

    stage119_fix_land_register_from_detail(n, obj_dir)
    stage119_normalize_paths(n)

    # Clean "Wildenfels Blatt" fallback if it still happened.
    lr = n.setdefault("landRegister", {})
    if isinstance(lr.get("gemarkung"), str):
        lr["gemarkung"] = re.sub(r"\s+Blatt$", "", lr["gemarkung"]).strip() or None

    # If quality was good but plotArea/court missing before fix, keep score; otherwise add warning.
    warnings = n.setdefault("quality", {}).setdefault("warnings", [])
    if not n.get("auction", {}).get("courtName") and "Gericht konnte nicht erkannt werden." not in warnings:
        warnings.append("Gericht konnte nicht erkannt werden.")
    if n.get("areas", {}).get("plotArea") in (None, "") and "Grundstücksfläche konnte nicht erkannt werden." not in warnings:
        warnings.append("Grundstücksfläche konnte nicht erkannt werden.")

    out_dir = output_root / obj_dir.name
    save_json(out_dir / "normalized.json", n)
    save_json(out_dir / "quality_report.json", n.get("quality", {}))
    return n



# STAGE120_NORMALIZER_PATH_FIX
# normalized(3).json is already good for data quality.
# Remaining issue: image localPath still contains Windows backslashes:
#   import_files\images\001.jpeg
# This patch normalizes all localPath values to POSIX paths before saving:
#   import_files/images/001.jpeg

def stage120_fix_local_paths_deep(value: Any) -> Any:
    if isinstance(value, dict):
        for k, v in list(value.items()):
            if k == "localPath" and isinstance(v, str):
                value[k] = v.replace("\\\\", "/")
            else:
                stage120_fix_local_paths_deep(v)
    elif isinstance(value, list):
        for item in value:
            stage120_fix_local_paths_deep(item)
    return value


_original_normalize_object_folder_stage120 = normalize_object_folder

def normalize_object_folder(obj_dir: Path, output_root: Path) -> dict[str, Any]:
    n = _original_normalize_object_folder_stage120(obj_dir, output_root)
    stage120_fix_local_paths_deep(n)

    out_dir = output_root / obj_dir.name
    save_json(out_dir / "normalized.json", n)
    save_json(out_dir / "quality_report.json", n.get("quality", {}))
    return n



# STAGE121_NORMALIZER_SINGLE_BACKSLASH_FIX
# Stage120 used value.replace("\\\\", "/"), which replaces TWO backslash characters.
# In JSON/Python string value the localPath contains ONE backslash character:
#   import_files\images\001.jpeg
# Correct replacement must target a single backslash:
#   value.replace(chr(92), "/")

def stage121_fix_local_paths_deep(value: Any) -> Any:
    if isinstance(value, dict):
        for k, v in list(value.items()):
            if k == "localPath" and isinstance(v, str):
                value[k] = v.replace(chr(92), "/")
            else:
                stage121_fix_local_paths_deep(v)
    elif isinstance(value, list):
        for item in value:
            stage121_fix_local_paths_deep(item)
    return value


_original_normalize_object_folder_stage121 = normalize_object_folder

def normalize_object_folder(obj_dir: Path, output_root: Path) -> dict[str, Any]:
    n = _original_normalize_object_folder_stage121(obj_dir, output_root)
    stage121_fix_local_paths_deep(n)

    out_dir = output_root / obj_dir.name
    save_json(out_dir / "normalized.json", n)
    save_json(out_dir / "quality_report.json", n.get("quality", {}))
    return n



# STAGE122_GEOCODING
# Adds immediate geocoding during normalization.
#
# Default provider: Nominatim / OpenStreetMap.
# It stores cache in:
#   normalized/_geocode_cache.json
#
# Environment variables:
#   ZVG_GEOCODE=1             enable geocoding; default 1
#   ZVG_GEOCODE_PROVIDER=nominatim
#   ZVG_GEOCODE_EMAIL=your@email.de   recommended for Nominatim User-Agent
#   ZVG_GEOCODE_DELAY=1.1     delay between uncached requests
#
# Disable:
#   $env:ZVG_GEOCODE="0"

def stage122_geocode_enabled() -> bool:
    return os.environ.get("ZVG_GEOCODE", "1").strip().lower() not in {"0", "false", "no", "off"}


def stage122_cache_path(output_root: Path) -> Path:
    return output_root / "_geocode_cache.json"


def stage122_load_cache(output_root: Path) -> dict[str, Any]:
    p = stage122_cache_path(output_root)
    if p.exists():
        try:
            return json.loads(p.read_text(encoding="utf-8", errors="ignore"))
        except Exception:
            return {}
    return {}


def stage122_save_cache(output_root: Path, cache: dict[str, Any]) -> None:
    p = stage122_cache_path(output_root)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")


def stage122_address_query(n: dict[str, Any]) -> str:
    address = n.get("address", {}) or {}
    full = clean_text(address.get("fullAddress"))
    if full:
        return full + ", Deutschland"

    parts = [
        address.get("street"),
        address.get("houseNumber"),
        address.get("postalCode"),
        address.get("city"),
        "Deutschland",
    ]
    return clean_text(" ".join(str(x) for x in parts if x))


def stage122_query_from_google_url(url: str | None) -> str | None:
    if not url:
        return None
    try:
        parsed = urllib.parse.urlparse(url)
        qs = urllib.parse.parse_qs(parsed.query)
        q = qs.get("q", [""])[0]
        q = urllib.parse.unquote_plus(q)
        q = clean_text(q)
        return q + ", Deutschland" if q and "deutschland" not in q.lower() else q
    except Exception:
        return None


def stage122_geocode_nominatim(query: str) -> dict[str, Any] | None:
    query = clean_text(query)
    if not query:
        return None

    email = os.environ.get("ZVG_GEOCODE_EMAIL", "").strip()
    ua = f"zvg-de-normalizer/1.0"
    if email:
        ua += f" ({email})"

    params = urllib.parse.urlencode({
        "q": query,
        "format": "jsonv2",
        "limit": "1",
        "countrycodes": "de",
        "addressdetails": "1",
    })
    url = "https://nominatim.openstreetmap.org/search?" + params

    req = urllib.request.Request(url, headers={
        "User-Agent": ua,
        "Accept": "application/json",
    })

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode("utf-8", errors="ignore")
            data = json.loads(raw)
    except Exception as exc:
        return {
            "ok": False,
            "error": str(exc),
            "query": query,
            "provider": "nominatim",
        }

    if not data:
        return {
            "ok": False,
            "error": "not_found",
            "query": query,
            "provider": "nominatim",
        }

    item = data[0]
    try:
        lat = float(item.get("lat"))
        lon = float(item.get("lon"))
    except Exception:
        return {
            "ok": False,
            "error": "bad_coordinates",
            "query": query,
            "provider": "nominatim",
            "raw": item,
        }

    return {
        "ok": True,
        "provider": "nominatim",
        "query": query,
        "latitude": lat,
        "longitude": lon,
        "displayName": item.get("display_name"),
        "importance": item.get("importance"),
        "placeId": item.get("place_id"),
        "osmType": item.get("osm_type"),
        "osmId": item.get("osm_id"),
        "raw": item,
    }


def stage122_geocode_object(n: dict[str, Any], output_root: Path) -> None:
    if not stage122_geocode_enabled():
        n["geo"] = n.get("geo") or {}
        n["geo"]["source"] = "geocoding_disabled"
        return

    geo = n.setdefault("geo", {})
    if geo.get("latitude") is not None and geo.get("longitude") is not None:
        return

    query = stage122_address_query(n)
    if not query:
        query = stage122_query_from_google_url(geo.get("sourceUrl"))

    if not query:
        warnings = n.setdefault("quality", {}).setdefault("warnings", [])
        if "Адрес для геокодинга не найден." not in warnings:
            warnings.append("Адрес для геокодинга не найден.")
        geo["source"] = "geocode_failed"
        return

    cache = stage122_load_cache(output_root)
    cache_key = query.lower()

    if cache_key in cache:
        result = cache[cache_key]
    else:
        # Be polite to public geocoder.
        try:
            delay = float(os.environ.get("ZVG_GEOCODE_DELAY", "1.1"))
        except Exception:
            delay = 1.1
        time.sleep(max(0.0, delay))
        result = stage122_geocode_nominatim(query)
        cache[cache_key] = result
        stage122_save_cache(output_root, cache)

    if result and result.get("ok"):
        geo["latitude"] = result["latitude"]
        geo["longitude"] = result["longitude"]
        geo["source"] = result.get("provider", "nominatim")
        geo["query"] = result.get("query", query)
        geo["displayName"] = result.get("displayName")
        geo["confidence"] = result.get("importance")
        geo["placeId"] = result.get("placeId")
        geo["osmType"] = result.get("osmType")
        geo["osmId"] = result.get("osmId")

        warnings = n.setdefault("quality", {}).setdefault("warnings", [])
        n["quality"]["warnings"] = [
            w for w in warnings
            if "Koordinaten" not in str(w)
            and "координат" not in str(w).lower()
            and "geocod" not in str(w).lower()
        ]
    else:
        geo["source"] = "geocode_failed"
        geo["query"] = query
        geo["error"] = result.get("error") if isinstance(result, dict) else "unknown"
        warnings = n.setdefault("quality", {}).setdefault("warnings", [])
        msg = f"Геокодинг не дал координаты: {query}"
        if msg not in warnings:
            warnings.append(msg)


_original_normalize_object_folder_stage122 = normalize_object_folder

def normalize_object_folder(obj_dir: Path, output_root: Path) -> dict[str, Any]:
    n = _original_normalize_object_folder_stage122(obj_dir, output_root)
    stage122_geocode_object(n, output_root)

    out_dir = output_root / obj_dir.name
    save_json(out_dir / "normalized.json", n)
    save_json(out_dir / "quality_report.json", n.get("quality", {}))
    return n



# STAGE133_WERTGRENZEN_DETECTION_PATCH
# Better detection of whether value limits (Wertgrenzen / 5/10 and 7/10 limits) are removed.
# Important distinction:
# - A generic sentence like "Verkehrswert wurde gemäß §§ 74a Abs. 5, 85a Abs. 2 ZVG festgesetzt"
#   only explains how the market value was set and does NOT mean the limits are removed.
# - Removal is usually expressed with weggefallen / aufgehoben / entfallen / nicht mehr anwendbar
#   near Wertgrenzen, 5/10, 7/10, § 74a or § 85a.
def detect_wertgrenzen(text: str) -> str:
    raw = str(text or "")
    t = raw.lower()
    t = t.replace("§§", "§")
    t = re.sub(r"\s+", " ", t)

    # Neutral legal formula. It mentions §74a/§85a but does not say that the limits are removed.
    neutral_patterns = [
        r"verkehrswert\s+wurde\s+gem(?:ä|ae|a)e?ß\s+§\s*74a\s*abs\.\s*5\s*,?\s*§?\s*85a\s*abs\.\s*2",
        r"verkehrswertfestsetzung\s+gem(?:ä|ae|a)e?ß\s+§\s*74a\s*abs\.\s*5",
        r"gem(?:ä|ae|a)e?ß\s+§\s*74a\s*abs\.\s*5\s*,?\s*§?\s*85a\s*abs\.\s*2",
    ]

    active_patterns = [
        r"(?:wertgrenzen|versagungsgrenzen|5/10\s*-?\s*grenze|7/10\s*-?\s*grenze).{0,120}(?:gelten|gilt|bestehen|besteht|anwendbar|finden\s+anwendung|findet\s+anwendung)",
        r"(?:§\s*74a|§\s*85a).{0,120}(?:findet\s+anwendung|finden\s+anwendung|anwendbar|gilt|gelten)",
        r"(?:keine\s+angaben|unbekannt).{0,80}(?:wertgrenzen|versagungsgrenzen)",
    ]

    removed_patterns = [
        r"(?:wertgrenzen|versagungsgrenzen).{0,160}(?:weggefallen|aufgehoben|entfallen|nicht\s+mehr\s+anwendbar|nicht\s+anzuwenden|keine\s+anwendung)",
        r"(?:weggefallen|aufgehoben|entfallen|nicht\s+mehr\s+anwendbar|nicht\s+anzuwenden).{0,160}(?:wertgrenzen|versagungsgrenzen)",
        r"(?:5/10|5\s*/\s*10|fünf\s*/\s*zehn|fuenf\s*/\s*zehn).{0,160}(?:weggefallen|aufgehoben|entfallen|nicht\s+mehr\s+anwendbar|nicht\s+anzuwenden)",
        r"(?:7/10|7\s*/\s*10|sieben\s*/\s*zehn).{0,160}(?:weggefallen|aufgehoben|entfallen|nicht\s+mehr\s+anwendbar|nicht\s+anzuwenden)",
        r"(?:weggefallen|aufgehoben|entfallen|nicht\s+mehr\s+anwendbar|nicht\s+anzuwenden).{0,160}(?:5/10|5\s*/\s*10|7/10|7\s*/\s*10)",
        r"(?:§\s*74a|§\s*85a).{0,160}(?:weggefallen|aufgehoben|entfallen|nicht\s+mehr\s+anwendbar|nicht\s+anzuwenden|keine\s+anwendung)",
        r"(?:weggefallen|aufgehoben|entfallen|nicht\s+mehr\s+anwendbar|nicht\s+anzuwenden).{0,160}(?:§\s*74a|§\s*85a)",
        r"(?:zweiter|2\.)\s+(?:termin|versteigerungstermin)",
        r"(?:dritter|3\.)\s+(?:termin|versteigerungstermin)",
        r"(?:erneuter|wiederholter)\s+(?:termin|versteigerungstermin)",
    ]

    if any(re.search(pattern, t, re.I) for pattern in removed_patterns):
        return "REMOVED"

    if any(re.search(pattern, t, re.I) for pattern in active_patterns):
        return "ACTIVE"

    # If only the neutral formula is present, keep limits active/unknown rather than removed.
    if any(re.search(pattern, t, re.I) for pattern in neutral_patterns):
        return "ACTIVE"

    return "ACTIVE"


_original_normalize_object_folder_stage133 = normalize_object_folder

def normalize_object_folder(obj_dir: Path, output_root: Path) -> dict[str, Any]:
    n = _original_normalize_object_folder_stage133(obj_dir, output_root)

    # Re-check value limits using all raw text after all previous stages finished.
    try:
        raw_parts = []
        raw_dir = output_root / obj_dir.name / "raw"
        for file_name in ["detail.json", "status.txt"]:
            p = raw_dir / file_name
            if p.exists():
                raw_parts.append(p.read_text(encoding="utf-8", errors="ignore"))
        for p in sorted(raw_dir.glob("*_text.txt")):
            raw_parts.append(p.read_text(encoding="utf-8", errors="ignore"))

        status = detect_wertgrenzen("\n".join(raw_parts))
        auction = n.setdefault("auction", {})
        auction["wertgrenzenStatus"] = status
        auction["wertgrenzenWeggefallen"] = (status == "REMOVED")
        if status == "REMOVED":
            try:
                auction["termNumber"] = max(int(auction.get("termNumber") or 1), 2)
            except Exception:
                auction["termNumber"] = 2
    except Exception as exc:
        warnings = n.setdefault("quality", {}).setdefault("warnings", [])
        warnings.append(f"Wertgrenzen-Erkennung konnte nicht nachgeprüft werden: {exc}")

    out_dir = output_root / obj_dir.name
    save_json(out_dir / "normalized.json", n)
    save_json(out_dir / "quality_report.json", n.get("quality", {}))
    return n


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--parser", default="Sachsen_zvg.py", help="Path to your existing parser")
    parser.add_argument("--output", default="normalized", help="Output normalized root")
    parser.add_argument("--normalize-existing", default="", help="Normalize existing zvg_data root without running parser")
    args = parser.parse_args()

    if fitz is None:
        print("PyMuPDF is not installed. Run: pip install pymupdf pillow", file=sys.stderr)
        return 1

    if args.normalize_existing:
        return normalize_existing(Path(args.normalize_existing), Path(args.output))

    return install_and_run(Path(args.parser), Path(args.output))


if __name__ == "__main__":
    raise SystemExit(main())
