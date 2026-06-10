import os
import re
import csv
import json
import time
import random
from pathlib import Path
from urllib.parse import urljoin, urlparse, unquote, parse_qs

import requests
from bs4 import BeautifulSoup
from tqdm import tqdm


BASE_URL = "https://www.zvg-portal.de/"
SEARCH_ALL_URL = "https://www.zvg-portal.de/index.php?button=Suchen&all=1"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
    "Content-Type": "application/x-www-form-urlencoded",
    "Referer": "https://www.zvg-portal.de/index.php?button=Termine+suchen",
}

LAND_ABK = "sn"
DOWNLOAD_ROOT = Path("zvg_data")
SEARCH_CSV = Path("zvg_search_results_with_links.csv")
DETAILS_CSV = Path("zvg_details.csv")
FAILED_CSV = Path("zvg_failed.csv")

REQUEST_TIMEOUT = 180
MIN_DELAY = 0.8
MAX_DELAY = 1.8
MIN_FILE_DELAY = 0.4
MAX_FILE_DELAY = 1.0
RETRY_COUNT = 3

# Если True — уже обработанные detail.json пропускаются.
SKIP_IF_ALREADY_DONE = False

# Если True — к названию папки отменённого объекта добавляется __TERMIN_AUFGEHOBEN.
# Это удобно визуально, но если объект потом снова появится с новым термином,
# будет создана новая папка без этого суффикса.
ADD_CANCELLED_SUFFIX_TO_DIR = True


DETAILS_FIELDNAMES = [
    "aktenzeichen",
    "termin_status",
    "is_cancelled",
    "aktualisierung",
    "art_der_versteigerung",
    "grundbuch",
    "objektart",
    "grundbuchamt",
    "grundbuchbezirk",
    "gemarkung",
    "blatt",
    "flurstueck",
    "m2",
    "objekt_lage",
    "beschreibung",
    "verkehrswert",
    "termin",
    "termin_raw",
    "ort_der_versteigerung",
    "informationen_zum_glaeubiger",
    "gericht",
    "geoserver",
    "detail_url",
    "attachments_count",
    "downloaded_files_count",
]

SEARCH_FIELDNAMES = [
    "aktenzeichen",
    "termin_status",
    "is_cancelled",
    "aktualisierung",
    "amtsgericht",
    "objekt_lage",
    "verkehrswert",
    "termin",
    "termin_raw",
    "detail_url",
    "bekanntmachung_url",
]


def sleep_human(min_s=MIN_DELAY, max_s=MAX_DELAY):
    time.sleep(random.uniform(min_s, max_s))


def clean_text(s: str) -> str:
    if not s:
        return ""
    s = s.replace("\xa0", " ")
    s = re.sub(r"\s+", " ", s)
    return s.strip()


def safe_name(s: str) -> str:
    s = clean_text(s)
    s = s.replace("/", "_").replace("\\", "_").replace(":", "_")
    s = re.sub(r'[<>:"|?*]+', "_", s)
    s = re.sub(r"\s+", "_", s)
    return s[:180] if s else "item"


def ensure_dir(path: Path):
    path.mkdir(parents=True, exist_ok=True)


def decode_html(response: requests.Response) -> str:
    raw = response.content
    variants = []

    for enc in ("utf-8", "ISO-8859-1", "cp1252"):
        try:
            txt = raw.decode(enc, errors="replace")
            score = txt.count("Ã") + txt.count("�")
            variants.append((score, txt, enc))
        except Exception:
            pass

    if not variants:
        return response.text

    variants.sort(key=lambda x: x[0])
    return variants[0][1]


def request_with_retry(session: requests.Session, method: str, url: str, **kwargs) -> requests.Response:
    last_exc = None
    for attempt in range(1, RETRY_COUNT + 1):
        try:
            r = session.request(method=method, url=url, timeout=REQUEST_TIMEOUT, **kwargs)
            r.raise_for_status()
            return r
        except Exception as e:
            last_exc = e
            if attempt < RETRY_COUNT:
                time.sleep(1.5 * attempt + random.uniform(0.2, 0.8))
            else:
                raise last_exc


def get_soup(session: requests.Session, url: str, data: dict | None = None) -> tuple[BeautifulSoup, str]:
    if data is None:
        r = request_with_retry(session, "GET", url, headers=HEADERS)
    else:
        r = request_with_retry(session, "POST", url, headers=HEADERS, data=data)
    html = decode_html(r)
    return BeautifulSoup(html, "html.parser"), r.url


def extract_total_count(html: str):
    m = re.search(r"Alle Termine,\s*Insgesamt\s*(\d+)", html, re.IGNORECASE)
    return int(m.group(1)) if m else None


def detect_termin_status(termin_text: str) -> dict:
    """
    Возвращает нормализованный статус термина.

    Пример отменённого термина на сайте:
    Der Termin Montag, 11. Mai 2026, 14:30 Uhr wurde aufgehoben.
    """
    raw = clean_text(termin_text)
    low = raw.lower()

    cancelled_patterns = [
        "wurde aufgehoben",
        "termin wurde aufgehoben",
        "termin ist aufgehoben",
        "aufgehoben",
        "abgesagt",
        "entfällt",
        "entfaellt",
    ]

    is_cancelled = any(p in low for p in cancelled_patterns)

    if is_cancelled:
        status = "cancelled"
    elif raw:
        status = "active"
    else:
        status = "unknown"

    return {
        "termin_status": status,
        "is_cancelled": "1" if is_cancelled else "0",
        "termin_raw": raw,
    }


def extract_cancelled_date_from_termin(termin_text: str) -> str:
    """
    Из строки отмены пытаемся вытащить саму дату/время без фразы 'wurde aufgehoben'.
    Если не получается — возвращаем исходный текст.
    """
    txt = clean_text(termin_text)
    m = re.search(r"Der\s+Termin\s+(.+?)\s+wurde\s+aufgehoben\.?$", txt, flags=re.IGNORECASE)
    if m:
        return clean_text(m.group(1))
    return txt


def split_grundbuch_block(text: str):
    text = clean_text(text)
    fields = {
        "objektart": "",
        "grundbuchamt": "",
        "grundbuchbezirk": "",
        "gemarkung": "",
        "blatt": "",
        "flurstueck": "",
        "m2": "",
    }
    patterns = {
        "objektart": r"Objektart:\s*(.*?)(?=Grundbuchamt:|$)",
        "grundbuchamt": r"Grundbuchamt:\s*(.*?)(?=Grundbuchbezirk:|$)",
        "grundbuchbezirk": r"Grundbuchbezirk:\s*(.*?)(?=Gemarkung:|$)",
        "gemarkung": r"Gemarkung:\s*(.*?)(?=Blatt:|$)",
        "blatt": r"Blatt:\s*(.*?)(?=Objektanteil:|Flurstück:|m²:|m2:|$)",
        "flurstueck": r"Flurstück:\s*(.*?)(?=m²:|m2:|Lage:|$)",
        "m2": r"(?:m²|m2):\s*(.*?)(?=Lage:|$)",
    }
    for key, pat in patterns.items():
        m = re.search(pat, text, flags=re.IGNORECASE)
        if m:
            fields[key] = clean_text(m.group(1))
    return fields


def categorize_attachment(title: str, url: str, label: str = "") -> str:
    t = f"{label} {title} {url}".lower()
    if "bekanntmach" in t:
        return "Bekanntmachung"
    if "expose" in t or "exposé" in t or "exposee" in t:
        return "Expose"
    if "foto" in t or "bild" in t or "image" in t:
        return "Foto"
    if "gutachten" in t or "verkehrswertgutachten" in t or "wertermittlung" in t:
        return "Gutachten"
    return "Sonstiges"


def normalize_aktenzeichen_for_dir(aktenzeichen: str, is_cancelled: bool = False) -> str:
    aktenzeichen = aktenzeichen.replace("(Detailansicht)", "").strip()
    name = safe_name(aktenzeichen)
    if ADD_CANCELLED_SUFFIX_TO_DIR and is_cancelled:
        name = f"{name}__TERMIN_AUFGEHOBEN"
    return name


def make_object_dir_from_item(item: dict) -> Path:
    status = detect_termin_status(item.get("termin_raw") or item.get("termin") or "")
    is_cancelled = status["is_cancelled"] == "1"
    nice_name = normalize_aktenzeichen_for_dir(item.get("aktenzeichen", ""), is_cancelled=is_cancelled)
    return DOWNLOAD_ROOT / nice_name


def parse_search_results(soup: BeautifulSoup, current_url: str):
    results = []
    rows = soup.find_all("tr")
    current = None

    for row in rows:
        row_text = clean_text(row.get_text(" ", strip=True))
        if not row_text:
            continue

        tds = row.find_all("td")
        if len(tds) >= 2:
            left = clean_text(tds[0].get_text(" ", strip=True))
            right = clean_text(tds[1].get_text(" ", strip=True))

            if left == "Aktenzeichen":
                if current:
                    status = detect_termin_status(current.get("termin_raw") or current.get("termin") or "")
                    current.update(status)
                    if current["termin_status"] == "cancelled":
                        current["termin"] = extract_cancelled_date_from_termin(current.get("termin_raw", ""))
                    results.append(current)

                current = {
                    "aktenzeichen": right,
                    "aktualisierung": "",
                    "amtsgericht": "",
                    "objekt_lage": "",
                    "verkehrswert": "",
                    "termin": "",
                    "termin_raw": "",
                    "termin_status": "unknown",
                    "is_cancelled": "0",
                    "detail_url": "",
                    "bekanntmachung_url": "",
                }

                # У активных объектов часто есть ссылка Detailansicht прямо в строке Aktenzeichen.
                # У отменённых терминов её может не быть — это больше не ошибка, папка всё равно создаётся.
                a = row.find("a", href=True)
                if a:
                    current["detail_url"] = urljoin(current_url, a["href"])
                continue

        if current is None:
            continue

        if "letzte Aktualisierung" in row_text:
            current["aktualisierung"] = row_text

        elif len(tds) >= 2:
            left = clean_text(tds[0].get_text(" ", strip=True))
            right = clean_text(tds[1].get_text(" ", strip=True))

            if left == "Amtsgericht":
                current["amtsgericht"] = right
            elif left == "Objekt/Lage":
                current["objekt_lage"] = right
            elif left.startswith("Verkehrswert"):
                current["verkehrswert"] = clean_text(row.get_text(" ", strip=True).replace(left, "", 1))
            elif left == "Termin":
                current["termin_raw"] = right
                current["termin"] = right

        for a in row.find_all("a", href=True):
            txt = clean_text(a.get_text(" ", strip=True)).lower()
            if "bekanntmachung" in txt:
                current["bekanntmachung_url"] = urljoin(current_url, a["href"])

    if current:
        status = detect_termin_status(current.get("termin_raw") or current.get("termin") or "")
        current.update(status)
        if current["termin_status"] == "cancelled":
            current["termin"] = extract_cancelled_date_from_termin(current.get("termin_raw", ""))
        results.append(current)

    uniq = []
    seen = set()
    for item in results:
        key = (item["aktenzeichen"], item["objekt_lage"], item["termin_raw"] or item["termin"])
        if key not in seen:
            seen.add(key)
            uniq.append(item)
    return uniq


def parse_detail_page(soup: BeautifulSoup, current_url: str):
    data = {
        "aktenzeichen": "",
        "aktualisierung": "",
        "art_der_versteigerung": "",
        "grundbuch": "",
        "objektart": "",
        "grundbuchamt": "",
        "grundbuchbezirk": "",
        "gemarkung": "",
        "blatt": "",
        "flurstueck": "",
        "m2": "",
        "objekt_lage": "",
        "beschreibung": "",
        "verkehrswert": "",
        "termin": "",
        "termin_raw": "",
        "termin_status": "unknown",
        "is_cancelled": "0",
        "ort_der_versteigerung": "",
        "informationen_zum_glaeubiger": "",
        "gericht": "",
        "geoserver": "",
        "attachments": [],
        "external_links": [],
    }

    page_text = clean_text(soup.get_text(" ", strip=True))

    m = re.search(r"(\d{4}\s*K\s*\d+/\d{4}).*?\(letzte Aktualisierung:?\s*([^)]+)\)", page_text)
    if m:
        data["aktenzeichen"] = clean_text(m.group(1))
        data["aktualisierung"] = clean_text(m.group(2))

    rows = soup.find_all("tr")
    attachments = []
    external_links = []

    attachment_labels = {
        "exposee",
        "exposé",
        "expose",
        "foto",
        "bilder",
        "amtliche bekanntmachung",
        "gutachten",
        "verkehrswertgutachten",
        "bewertung",
        "bewertungsgutachten",
    }

    for row in rows:
        tds = row.find_all("td")
        if len(tds) < 2:
            continue

        label = clean_text(tds[0].get_text(" ", strip=True)).rstrip(":")
        value = clean_text(tds[1].get_text(" ", strip=True))
        label_l = label.lower()

        if label == "Art der Versteigerung":
            data["art_der_versteigerung"] = value
        elif label == "Grundbuch":
            block = clean_text(row.get_text(" ", strip=True).replace("Grundbuch:", "", 1))
            data["grundbuch"] = block
            data.update(split_grundbuch_block(block))
        elif label == "Objekt/Lage":
            data["objekt_lage"] = value
        elif label == "Beschreibung":
            data["beschreibung"] = value
        elif label.startswith("Verkehrswert"):
            data["verkehrswert"] = value
        elif label == "Termin":
            data["termin_raw"] = value
            data["termin"] = value
            status = detect_termin_status(value)
            data.update(status)
            if data["termin_status"] == "cancelled":
                data["termin"] = extract_cancelled_date_from_termin(value)
        elif label == "Ort der Versteigerung":
            data["ort_der_versteigerung"] = value
        elif label == "Informationen zum Gläubiger":
            data["informationen_zum_glaeubiger"] = value
        elif label == "Gericht":
            data["gericht"] = value
        elif label == "GeoServer":
            data["geoserver"] = value

        row_links = row.find_all("a", href=True)

        for a in row_links:
            href = urljoin(current_url, a["href"])
            title = clean_text(a.get_text(" ", strip=True))
            external_links.append({
                "label": label,
                "title": title,
                "url": href,
            })

        if label_l in attachment_labels:
            for a in row_links:
                href = urljoin(current_url, a["href"])
                title = clean_text(a.get_text(" ", strip=True)) or label
                attachments.append({
                    "label": label,
                    "title": title,
                    "url": href,
                    "category": categorize_attachment(title, href, label),
                })

    for a in soup.find_all("a", href=True):
        href = urljoin(current_url, a["href"])
        title = clean_text(a.get_text(" ", strip=True))
        combo = f"{title} {href}".lower()

        if (
            "showanhang" in combo
            or ".pdf" in combo
            or "bekanntmachung" in combo
            or "expose" in combo
            or "exposé" in combo
            or "exposee" in combo
            or "foto" in combo
            or "gutachten" in combo
            or "verkehrswertgutachten" in combo
            or "zvsachsen.de" in combo
        ):
            attachments.append({
                "label": "",
                "title": title or os.path.basename(urlparse(href).path),
                "url": href,
                "category": categorize_attachment(title, href, ""),
            })

    uniq_att = []
    seen_att = set()
    for att in attachments:
        url = att["url"].strip()
        if url not in seen_att:
            seen_att.add(url)
            att["url"] = url
            uniq_att.append(att)

    uniq_links = []
    seen_links = set()
    for link in external_links:
        url = link["url"].strip()
        if url not in seen_links:
            seen_links.add(url)
            link["url"] = url
            uniq_links.append(link)

    data["attachments"] = uniq_att
    data["external_links"] = uniq_links
    return data


def extension_from_headers(url: str, response: requests.Response) -> str:
    cd = response.headers.get("Content-Disposition", "") or ""
    ct = (response.headers.get("Content-Type", "") or "").lower()

    m = re.search(r'filename="?([^"]+)"?', cd, flags=re.IGNORECASE)
    if m:
        fname = unquote(m.group(1))
        ext = Path(fname).suffix
        if ext:
            return ext.lower()

    if "application/pdf" in ct:
        return ".pdf"
    if "image/jpeg" in ct:
        return ".jpg"
    if "image/png" in ct:
        return ".png"
    if "image/gif" in ct:
        return ".gif"
    if "image/webp" in ct:
        return ".webp"

    path_ext = Path(urlparse(url).path).suffix
    if path_ext:
        return path_ext.lower()

    return ".bin"


def filename_for_attachment(att: dict, response: requests.Response, index: int) -> str:
    title = clean_text(att.get("title", "")) or clean_text(att.get("label", "")) or "file"
    category = clean_text(att.get("category", "Sonstiges")) or "Sonstiges"

    parsed = urlparse(att["url"])
    qs = parse_qs(parsed.query)
    file_id = qs.get("file_id", [""])[0]

    ext = extension_from_headers(att["url"], response)

    # Так как теперь всё лежит в одной папке, добавляем категорию и номер,
    # чтобы файлы не перезаписывались и были понятны.
    base = f"{index:02d}_{safe_name(category)}_{safe_name(title)}"
    if file_id:
        base = f"{base}_{safe_name(file_id)}"

    return base + ext


def download_file(session: requests.Session, att: dict, dest_dir: Path, index: int) -> Path:
    r = request_with_retry(session, "GET", att["url"], headers=HEADERS, stream=True)

    ct = (r.headers.get("Content-Type") or "").lower()
    if "text/html" in ct and "showanhang" not in att["url"].lower():
        raise RuntimeError(f"Ссылка ведет на HTML, а не на файл: {att['url']}")

    filename = filename_for_attachment(att, r, index=index)
    dest_path = dest_dir / filename

    # Защита от перезаписи, если имена внезапно совпали.
    if dest_path.exists():
        stem = dest_path.stem
        suffix = dest_path.suffix
        n = 2
        while True:
            candidate = dest_dir / f"{stem}_{n}{suffix}"
            if not candidate.exists():
                dest_path = candidate
                break
            n += 1

    with open(dest_path, "wb") as f:
        for chunk in r.iter_content(chunk_size=65536):
            if chunk:
                f.write(chunk)

    return dest_path


def save_json(path: Path, obj: dict):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)


def write_csv(path: Path, rows: list[dict], fieldnames: list[str]):
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def append_failed(rows: list[dict]):
    if not rows:
        return
    exists = FAILED_CSV.exists()
    with open(FAILED_CSV, "a", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=["aktenzeichen", "url", "stage", "error"])
        if not exists:
            writer.writeheader()
        writer.writerows(rows)


def write_status_file(obj_dir: Path, data: dict):
    status = data.get("termin_status", "unknown")
    is_cancelled = data.get("is_cancelled", "0") == "1"

    lines = []
    lines.append(f"Aktenzeichen: {data.get('aktenzeichen', '')}")
    lines.append(f"Termin-Status: {status}")
    lines.append(f"Termin aufgehoben: {'JA' if is_cancelled else 'NEIN'}")
    lines.append(f"Termin: {data.get('termin', '')}")
    lines.append(f"Termin raw: {data.get('termin_raw', '')}")
    lines.append(f"Letzte Aktualisierung: {data.get('aktualisierung', '')}")
    lines.append(f"Objekt/Lage: {data.get('objekt_lage', '')}")
    lines.append(f"Verkehrswert: {data.get('verkehrswert', '')}")
    lines.append(f"Detail URL: {data.get('detail_url', '')}")

    with open(obj_dir / "status.txt", "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    # Дополнительный визуальный маркер для Windows Explorer.
    marker = obj_dir / "TERMIN_AUFGEHOBEN.txt"
    if is_cancelled:
        with open(marker, "w", encoding="utf-8") as f:
            f.write("Der Termin wurde aufgehoben.\n")
            f.write(data.get("termin_raw", ""))
    elif marker.exists():
        marker.unlink()


def build_minimal_detail_from_search_item(item: dict) -> dict:
    """
    Для объектов без detail_url, особенно отменённых терминов,
    создаём полноценный detail.json только из поисковой выдачи.
    """
    status = detect_termin_status(item.get("termin_raw") or item.get("termin") or "")
    termin_value = item.get("termin", "")
    if status["termin_status"] == "cancelled":
        termin_value = extract_cancelled_date_from_termin(status["termin_raw"])

    return {
        "aktenzeichen": item.get("aktenzeichen", "").replace("(Detailansicht)", "").strip(),
        "aktualisierung": item.get("aktualisierung", ""),
        "art_der_versteigerung": "",
        "grundbuch": "",
        "objektart": "",
        "grundbuchamt": "",
        "grundbuchbezirk": "",
        "gemarkung": "",
        "blatt": "",
        "flurstueck": "",
        "m2": "",
        "objekt_lage": item.get("objekt_lage", ""),
        "beschreibung": "",
        "verkehrswert": item.get("verkehrswert", ""),
        "termin": termin_value,
        "termin_raw": status["termin_raw"],
        "termin_status": status["termin_status"],
        "is_cancelled": status["is_cancelled"],
        "ort_der_versteigerung": "",
        "informationen_zum_glaeubiger": "",
        "gericht": item.get("amtsgericht", ""),
        "geoserver": "",
        "detail_url": item.get("detail_url", ""),
        "bekanntmachung_url": item.get("bekanntmachung_url", ""),
        "attachments": [],
        "external_links": [],
        "downloaded_files": [],
    }


def detail_to_csv_row(detail_data: dict) -> dict:
    return {
        "aktenzeichen": detail_data.get("aktenzeichen", ""),
        "termin_status": detail_data.get("termin_status", "unknown"),
        "is_cancelled": detail_data.get("is_cancelled", "0"),
        "aktualisierung": detail_data.get("aktualisierung", ""),
        "art_der_versteigerung": detail_data.get("art_der_versteigerung", ""),
        "grundbuch": detail_data.get("grundbuch", ""),
        "objektart": detail_data.get("objektart", ""),
        "grundbuchamt": detail_data.get("grundbuchamt", ""),
        "grundbuchbezirk": detail_data.get("grundbuchbezirk", ""),
        "gemarkung": detail_data.get("gemarkung", ""),
        "blatt": detail_data.get("blatt", ""),
        "flurstueck": detail_data.get("flurstueck", ""),
        "m2": detail_data.get("m2", ""),
        "objekt_lage": detail_data.get("objekt_lage", ""),
        "beschreibung": detail_data.get("beschreibung", ""),
        "verkehrswert": detail_data.get("verkehrswert", ""),
        "termin": detail_data.get("termin", ""),
        "termin_raw": detail_data.get("termin_raw", ""),
        "ort_der_versteigerung": detail_data.get("ort_der_versteigerung", ""),
        "informationen_zum_glaeubiger": detail_data.get("informationen_zum_glaeubiger", ""),
        "gericht": detail_data.get("gericht", ""),
        "geoserver": detail_data.get("geoserver", ""),
        "detail_url": detail_data.get("detail_url", ""),
        "attachments_count": len(detail_data.get("attachments", [])),
        "downloaded_files_count": len(detail_data.get("downloaded_files", [])),
    }


def main():
    ensure_dir(DOWNLOAD_ROOT)
    session = requests.Session()

    print("Получаю общую выдачу...")
    r = request_with_retry(
        session,
        "POST",
        SEARCH_ALL_URL,
        headers=HEADERS,
        data={"land_abk": LAND_ABK},
    )
    html = decode_html(r)
    total = extract_total_count(html)
    print(f"Всего объектов по выдаче: {total}")

    soup = BeautifulSoup(html, "html.parser")
    search_results = parse_search_results(soup, r.url)
    print(f"Распарсено объектов: {len(search_results)}")

    write_csv(SEARCH_CSV, search_results, SEARCH_FIELDNAMES)

    details_rows = []
    failed_rows = []

    progress = tqdm(search_results, desc="Карточки", unit="obj")

    for item in progress:
        aktenzeichen = item.get("aktenzeichen", "").replace("(Detailansicht)", "").strip()
        detail_url = item.get("detail_url", "").strip()

        # Папку создаём всегда — даже если detail_url отсутствует.
        obj_dir = make_object_dir_from_item(item)
        ensure_dir(obj_dir)

        detail_json_path = obj_dir / "detail.json"
        progress.set_postfix_str(obj_dir.name[:40])

        if SKIP_IF_ALREADY_DONE and detail_json_path.exists():
            try:
                with open(detail_json_path, "r", encoding="utf-8") as f:
                    old = json.load(f)
                details_rows.append(detail_to_csv_row(old))
                write_status_file(obj_dir, old)
                continue
            except Exception:
                pass

        # Если нет detail_url — это больше не считаем ошибкой автоматически.
        # Особенно для отменённых терминов это нормальная ситуация.
        if not detail_url:
            detail_data = build_minimal_detail_from_search_item(item)
            save_json(detail_json_path, detail_data)
            write_status_file(obj_dir, detail_data)
            details_rows.append(detail_to_csv_row(detail_data))

            if detail_data.get("termin_status") != "cancelled":
                failed_rows.append({
                    "aktenzeichen": aktenzeichen,
                    "url": "",
                    "stage": "search_result",
                    "error": "missing detail_url for non-cancelled item",
                })
            continue

        try:
            sleep_human()
            detail_soup, final_detail_url = get_soup(session, detail_url)
            detail_data = parse_detail_page(detail_soup, final_detail_url)

            if not detail_data.get("aktenzeichen"):
                detail_data["aktenzeichen"] = aktenzeichen
            if not detail_data.get("objekt_lage"):
                detail_data["objekt_lage"] = item.get("objekt_lage", "")
            if not detail_data.get("termin"):
                detail_data["termin"] = item.get("termin", "")
            if not detail_data.get("termin_raw"):
                detail_data["termin_raw"] = item.get("termin_raw", item.get("termin", ""))
            if not detail_data.get("verkehrswert"):
                detail_data["verkehrswert"] = item.get("verkehrswert", "")
            if not detail_data.get("aktualisierung"):
                detail_data["aktualisierung"] = item.get("aktualisierung", "")

            # Если на детальной странице статус не определился, берём статус из поисковой выдачи.
            if detail_data.get("termin_status") == "unknown":
                status = detect_termin_status(item.get("termin_raw") or item.get("termin") or "")
                detail_data.update(status)
                if detail_data["termin_status"] == "cancelled":
                    detail_data["termin"] = extract_cancelled_date_from_termin(status["termin_raw"])

            detail_data["detail_url"] = final_detail_url

            print(f"\n[{obj_dir.name}] attachments found: {len(detail_data.get('attachments', []))}")
            for att in detail_data.get("attachments", []):
                print("   ", att.get("category", ""), att.get("url", ""))

            downloaded = []
            for idx, att in enumerate(detail_data.get("attachments", []), start=1):
                try:
                    sleep_human(MIN_FILE_DELAY, MAX_FILE_DELAY)

                    # ВАЖНО: теперь все файлы сохраняются прямо в папку объекта.
                    saved_path = download_file(session, att, obj_dir, index=idx)

                    downloaded.append({
                        "title": att.get("title", ""),
                        "url": att.get("url", ""),
                        "category": att.get("category", "Sonstiges"),
                        "saved_as": str(saved_path),
                    })
                except Exception as e:
                    failed_rows.append({
                        "aktenzeichen": detail_data.get("aktenzeichen", aktenzeichen),
                        "url": att.get("url", ""),
                        "stage": "download_attachment",
                        "error": str(e),
                    })

            detail_data["downloaded_files"] = downloaded
            save_json(detail_json_path, detail_data)
            write_status_file(obj_dir, detail_data)
            details_rows.append(detail_to_csv_row(detail_data))

        except Exception as e:
            # Даже при ошибке детальной страницы сохраняем минимальную карточку из поиска.
            detail_data = build_minimal_detail_from_search_item(item)
            detail_data["detail_url"] = detail_url
            detail_data["detail_page_error"] = str(e)
            save_json(detail_json_path, detail_data)
            write_status_file(obj_dir, detail_data)
            details_rows.append(detail_to_csv_row(detail_data))

            failed_rows.append({
                "aktenzeichen": aktenzeichen,
                "url": detail_url,
                "stage": "detail_page",
                "error": str(e),
            })

    write_csv(DETAILS_CSV, details_rows, DETAILS_FIELDNAMES)
    append_failed(failed_rows)

    print("\nГотово.")
    print(f"Краткий CSV: {SEARCH_CSV}")
    print(f"Детальный CSV: {DETAILS_CSV}")
    print(f"Папка с файлами: {DOWNLOAD_ROOT}")
    if failed_rows:
        print(f"Ошибки записаны в: {FAILED_CSV}")


if __name__ == "__main__":
    main()
