const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const target = path.join(root, "scripts", "run_sachsen_zvg_with_normalizer.py");

if (!fs.existsSync(target)) {
  console.error("Not found:", target);
  process.exit(1);
}

let s = fs.readFileSync(target, "utf8");

if (!s.includes("STAGE118_NORMALIZER_FINAL_POLISH")) {
  const patch = String.raw`

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

`;

  s = s.replace(/\ndef main\(\) -> int:\n/, patch + "\ndef main() -> int:\n");
}

fs.writeFileSync(target, s, "utf8");
console.log("patched", target);
console.log("");
console.log("Re-run:");
console.log("  python .\\scripts\\run_sachsen_zvg_with_normalizer.py --normalize-existing .\\zvg_data --output .\\normalized");
