const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const target = path.join(root, "scripts", "run_sachsen_zvg_with_normalizer.py");

if (!fs.existsSync(target)) {
  console.error("Not found:", target);
  process.exit(1);
}

let s = fs.readFileSync(target, "utf8");

if (!s.includes("STAGE119_NORMALIZER_REGRESSION_FIX")) {
  const patch = String.raw`

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

`;

  s = s.replace(/\ndef main\(\) -> int:\n/, patch + "\ndef main() -> int:\n");
}

fs.writeFileSync(target, s, "utf8");
console.log("patched", target);
console.log("");
console.log("Re-run:");
console.log("  python .\\scripts\\run_sachsen_zvg_with_normalizer.py --normalize-existing .\\zvg_data --output .\\normalized");
