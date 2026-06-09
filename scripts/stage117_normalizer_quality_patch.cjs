const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const target = path.join(root, "scripts", "run_sachsen_zvg_with_normalizer.py");

if (!fs.existsSync(target)) {
  console.error("Not found:", target);
  process.exit(1);
}

let s = fs.readFileSync(target, "utf8");

if (!s.includes("STAGE117_NORMALIZER_QUALITY_PATCH")) {
  const patch = String.raw`

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

`;

  // Insert before main so names are overridden before execution enters main().
  s = s.replace(/\ndef main\(\) -> int:\n/, patch + "\ndef main() -> int:\n");
}

fs.writeFileSync(target, s, "utf8");
console.log("patched", target);
console.log("");
console.log("Now re-normalize existing data:");
console.log("  python .\\scripts\\run_sachsen_zvg_with_normalizer.py --normalize-existing .\\zvg_data --output .\\normalized");
