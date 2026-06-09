const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const target = path.join(root, "scripts", "run_sachsen_zvg_with_normalizer.py");

if (!fs.existsSync(target)) {
  console.error("Not found:", target);
  process.exit(1);
}

let s = fs.readFileSync(target, "utf8");

if (!s.includes("STAGE122_GEOCODING")) {
  // ensure imports
  if (!s.includes("import urllib.parse")) {
    s = s.replace("import hashlib\n", "import hashlib\nimport urllib.parse\nimport urllib.request\nimport urllib.error\nimport time\n");
  }

  const patch = String.raw`

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

`;

  s = s.replace(/\ndef main\(\) -> int:\n/, patch + "\ndef main() -> int:\n");
}

fs.writeFileSync(target, s, "utf8");
console.log("patched", target);
console.log("");
console.log("Re-run with geocoding:");
console.log("  $env:ZVG_GEOCODE='1'");
console.log("  $env:ZVG_GEOCODE_EMAIL='your@email.de'");
console.log("  python .\\scripts\\run_sachsen_zvg_with_normalizer.py --normalize-existing .\\zvg_data --output .\\normalized");
