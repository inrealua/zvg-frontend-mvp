const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();

function full(rel) {
  return path.join(root, rel);
}
function exists(rel) {
  return fs.existsSync(full(rel));
}
function read(rel) {
  return fs.readFileSync(full(rel), "utf8");
}
function write(rel, content) {
  const target = full(rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
  console.log("written", rel);
}
function patch(rel, fn) {
  if (!exists(rel)) {
    console.log("skip missing", rel);
    return;
  }

  const before = read(rel);
  const after = fn(before);

  if (after !== before) {
    write(rel, after);
    console.log("patched", rel);
  } else {
    console.log("unchanged", rel);
  }
}

/**
 * Stage 114 — local ZvgScout pipeline.
 *
 * Why:
 * ZvgScout returned "Fehler beim Laden der Daten" and Cloudflare checks.
 * Direct production/server scraping is not stable. Better architecture:
 *
 * 1) LOCAL COLLECTOR:
 *    - runs only on your Windows machine;
 *    - uses persistent Playwright browser profile;
 *    - you can manually accept cookies / login / pass Cloudflare once;
 *    - captures network JSON and DOM;
 *    - never writes to DB;
 *    - exports normalized JSONL and debug.
 *
 * 2) LOCAL IMPORTER:
 *    - reads JSONL;
 *    - validates records;
 *    - skips Cloudflare/error pages;
 *    - downloads photos/docs;
 *    - upserts into Prisma without duplicates;
 *    - fills required fields like normalizedAktenzeichen.
 */

/* -------------------------------------------------------------------------- */
/* 1. Local collector                                                          */
/* -------------------------------------------------------------------------- */

write("scripts/zvgscout_collect_local.cjs", `#!/usr/bin/env node
/* eslint-disable no-console */

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  console.error("Playwright is not installed. Run: npm install && npx playwright install chromium");
  process.exit(1);
}

const START_URL =
  process.env.ZVGSCOUT_URL ||
  "https://zvgscout.com/zwangsversteigerungen?page=1&maplat=50.83871608853164&maplng=12.8785815480677&mapzoom=11.283512746895843";

const OUT_ROOT = path.join(process.cwd(), "var", "imports", "zvgscout-local");
const PROFILE_DIR = process.env.ZVGSCOUT_PROFILE_DIR || path.join(OUT_ROOT, "_browser-profile");
const OUT_JSONL = process.env.ZVGSCOUT_OUT || path.join(OUT_ROOT, "records.jsonl");
const DEBUG_DIR = path.join(OUT_ROOT, "_debug");
const HEADLESS = process.env.ZVGSCOUT_HEADLESS === "1";
const WAIT_MS = Number(process.env.ZVGSCOUT_WAIT_MS || 45000);
const PAGES = Number(process.env.ZVGSCOUT_MAX_PAGES || 1);

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}
function sha1(value) {
  return crypto.createHash("sha1").update(String(value)).digest("hex");
}
function norm(value) {
  return String(value || "").replace(/\\s+/g, " ").trim();
}
function pageUrl(base, pageNo) {
  const url = new URL(base);
  url.searchParams.set("page", String(pageNo));
  return url.toString();
}
function appendJsonl(file, obj) {
  fs.appendFileSync(file, JSON.stringify(obj) + "\\n", "utf8");
}
function safeFile(value) {
  return String(value || "file").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
}
function isBadPageText(text) {
  const t = String(text || "").toLowerCase();
  return (
    t.includes("sicherheitsüberprüfung wird durchgeführt") ||
    t.includes("cloudflare") ||
    t.includes("fehler beim laden der daten") ||
    t.includes("fehler erneut versuchen")
  );
}
function abs(base, value) {
  try {
    return new URL(value, base).toString();
  } catch {
    return null;
  }
}
function extractPropertyCandidatesFromObject(obj, sourceUrl, out = []) {
  if (!obj || typeof obj !== "object") return out;

  if (Array.isArray(obj)) {
    obj.forEach((item) => extractPropertyCandidatesFromObject(item, sourceUrl, out));
    return out;
  }

  const text = JSON.stringify(obj);
  const looksLikeProperty =
    /aktenzeichen|verkehrswert|amtsgericht|auction|versteiger|adresse|address|latitude|longitude|wohnfläche|grundstück/i.test(text) &&
    text.length > 200;

  if (looksLikeProperty) {
    out.push({
      source: "network-json-object",
      sourceUrl,
      raw: obj,
      rawText: text.slice(0, 200000),
    });
  }

  for (const value of Object.values(obj)) {
    if (value && typeof value === "object") extractPropertyCandidatesFromObject(value, sourceUrl, out);
  }

  return out;
}
function extractUrls(text, baseUrl) {
  const urls = new Set();
  const source = String(text || "");

  for (const match of source.matchAll(/https?:\\/\\/[^"'\\s<>]+/g)) {
    const url = match[0].replace(/[),.;]+$/, "");
    if (/zvgscout\\.com/i.test(url)) urls.add(url);
  }

  for (const match of source.matchAll(/\\/(?:zwangsversteigerungen|versteigerung|objekt|objects?|properties?)[^"'\\s<>)]{3,200}/gi)) {
    const url = abs(baseUrl, match[0]);
    if (url) urls.add(url);
  }

  return Array.from(urls);
}
function isDetailUrl(url) {
  try {
    const u = new URL(url);
    const p = u.pathname.toLowerCase();

    if (!/zvgscout\\.com$/i.test(u.hostname.replace(/^www\\./, ""))) return false;
    if (p === "/" || p === "/zwangsversteigerungen" || p === "/zwangsversteigerungen/") return false;
    if (p.includes("/_next/")) return false;
    if (p.endsWith(".js") || p.endsWith(".css") || p.endsWith(".png") || p.endsWith(".jpg") || p.endsWith(".ico")) return false;
    if (u.searchParams.has("page")) return false;

    return /zwangsversteiger|versteigerung|objekt|property|immobilie|\\d/.test(p + " " + u.search);
  } catch {
    return false;
  }
}

async function clickCookieButtons(page) {
  const candidates = [
    "Alle akzeptieren",
    "Nur notwendige",
    "Akzeptieren",
    "Accept all",
    "Accept",
  ];

  for (const label of candidates) {
    try {
      const button = page.getByRole("button", { name: new RegExp(label, "i") });
      if (await button.count()) {
        await button.first().click({ timeout: 2500 });
        await page.waitForTimeout(1000);
        return true;
      }
    } catch {}
  }

  return false;
}

async function collectFromPage(page, url, pageNo, networkItems) {
  console.log("[open]", url);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 }).catch((e) => {
    console.warn("[goto warning]", e.message);
  });

  await page.waitForTimeout(2500);
  await clickCookieButtons(page);

  /*
    If site shows "Fehler beim Laden der Daten", give user/manual profile time.
    In visible browser you can click "Erneut versuchen", login, accept cookies, etc.
  */
  console.log("[wait]", WAIT_MS, "ms for client data/manual actions");
  await page.waitForTimeout(WAIT_MS);

  ensureDir(DEBUG_DIR);
  const prefix = path.join(DEBUG_DIR, "page-" + pageNo);
  await page.screenshot({ path: prefix + ".png", fullPage: true }).catch(() => {});

  const dom = await page.evaluate(() => {
    const text = (document.body?.innerText || "").replace(/\\s+/g, " ").trim();
    const html = document.documentElement.outerHTML;
    const anchors = Array.from(document.querySelectorAll("a[href]")).map((a) => ({
      href: a.href,
      text: (a.innerText || a.textContent || "").replace(/\\s+/g, " ").trim(),
    }));
    const scripts = Array.from(document.querySelectorAll("script"))
      .map((s) => s.textContent || "")
      .filter((t) => /versteiger|Aktenzeichen|Verkehrswert|property|auction|amtsgericht/i.test(t))
      .slice(0, 40);
    return {
      title: document.title,
      url: location.href,
      text,
      htmlSample: html.slice(0, 500000),
      anchors,
      scripts,
    };
  });

  fs.writeFileSync(prefix + ".json", JSON.stringify({ dom, networkItems }, null, 2), "utf8");
  fs.writeFileSync(prefix + ".html", dom.htmlSample, "utf8");

  if (isBadPageText(dom.text)) {
    console.warn("[bad page]", "site returned error/cloudflare text; saved debug:", prefix + ".png");
  }

  const detailUrls = new Set();
  for (const a of dom.anchors) {
    if (isDetailUrl(a.href)) detailUrls.add(a.href);
  }
  for (const script of dom.scripts) {
    extractUrls(script, url).filter(isDetailUrl).forEach((u) => detailUrls.add(u));
  }
  for (const item of networkItems) {
    extractUrls(item.text || JSON.stringify(item.json || ""), url).filter(isDetailUrl).forEach((u) => detailUrls.add(u));
  }

  const candidates = [];
  for (const item of networkItems) {
    if (item.json) extractPropertyCandidatesFromObject(item.json, item.url, candidates);
    if (item.text && /aktenzeichen|verkehrswert|amtsgericht|versteiger/i.test(item.text)) {
      candidates.push({
        source: "network-text",
        sourceUrl: item.url,
        rawText: item.text.slice(0, 200000),
      });
    }
  }

  for (const script of dom.scripts) {
    candidates.push({
      source: "script",
      sourceUrl: url,
      rawText: script.slice(0, 200000),
    });
  }

  fs.writeFileSync(prefix + ".detail-urls.json", JSON.stringify(Array.from(detailUrls), null, 2), "utf8");
  fs.writeFileSync(prefix + ".candidates.json", JSON.stringify(candidates, null, 2), "utf8");

  return {
    detailUrls: Array.from(detailUrls),
    candidates,
    isBadPage: isBadPageText(dom.text),
  };
}

async function collectDetail(page, url, index) {
  console.log("[detail]", url);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 }).catch((e) => {
    console.warn("[detail goto warning]", e.message);
  });
  await page.waitForTimeout(4000);

  const raw = await page.evaluate(() => {
    const clean = (v) => String(v || "").replace(/\\s+/g, " ").trim();
    const title = clean(document.querySelector("h1")?.textContent) || clean(document.querySelector("h2")?.textContent) || document.title;
    const text = clean(document.body?.innerText || "");
    const html = document.documentElement.outerHTML;
    const images = Array.from(document.querySelectorAll("img[src], source[srcset]"))
      .flatMap((el) => {
        const values = [];
        const src = el.getAttribute("src");
        const srcset = el.getAttribute("srcset");
        if (src) values.push(src);
        if (srcset) {
          for (const part of srcset.split(",")) {
            const first = part.trim().split(/\\s+/)[0];
            if (first) values.push(first);
          }
        }
        return values;
      })
      .map((v) => new URL(v, location.href).toString())
      .filter((v) => !/logo|favicon|sprite|icon/i.test(v));
    const docs = Array.from(document.querySelectorAll("a[href]"))
      .map((a) => ({ href: new URL(a.getAttribute("href"), location.href).toString(), text: clean(a.textContent) }))
      .filter((d) => /pdf|download|gutachten|expos|dokument|bekanntmachung/i.test(d.href + " " + d.text));
    return {
      source: "detail-dom",
      sourceUrl: location.href,
      title,
      rawText: text,
      htmlSample: html.slice(0, 500000),
      images,
      documents: docs,
    };
  });

  const prefix = path.join(DEBUG_DIR, "detail-" + String(index).padStart(3, "0") + "-" + safeFile(sha1(url).slice(0, 8)));
  await page.screenshot({ path: prefix + ".png", fullPage: true }).catch(() => {});
  fs.writeFileSync(prefix + ".json", JSON.stringify(raw, null, 2), "utf8");
  return raw;
}

async function main() {
  ensureDir(OUT_ROOT);
  ensureDir(DEBUG_DIR);

  if (fs.existsSync(OUT_JSONL)) fs.unlinkSync(OUT_JSONL);

  const allNetwork = [];
  const records = [];
  const detailUrls = new Set();

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: HEADLESS,
    viewport: { width: 1440, height: 1100 },
    locale: "de-DE",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
  });

  context.on("response", async (response) => {
    const url = response.url();
    const ct = response.headers()["content-type"] || "";
    if (!/json|text|javascript|html/i.test(ct) && !/api|trpc|graphql|_next|versteiger/i.test(url)) return;

    try {
      const text = await response.text();
      if (!/versteiger|Aktenzeichen|Verkehrswert|amtsgericht|property|auction|address|adresse/i.test(text)) return;

      let json = null;
      if (/json/i.test(ct)) {
        try {
          json = JSON.parse(text);
        } catch {}
      }

      allNetwork.push({
        url,
        contentType: ct,
        status: response.status(),
        text: text.slice(0, 500000),
        json,
      });
    } catch {}
  });

  const page = await context.newPage();

  try {
    for (let pageNo = 1; pageNo <= PAGES; pageNo += 1) {
      const before = allNetwork.length;
      const url = pageUrl(START_URL, pageNo);
      const result = await collectFromPage(page, url, pageNo, allNetwork.slice(before));

      result.detailUrls.forEach((u) => detailUrls.add(u));

      for (const candidate of result.candidates) {
        const rec = {
          collectedAt: new Date().toISOString(),
          externalId: sha1(candidate.sourceUrl + ":" + sha1(candidate.rawText || JSON.stringify(candidate.raw || ""))).slice(0, 24),
          sourceUrl: candidate.sourceUrl,
          source: candidate.source,
          rawText: candidate.rawText || JSON.stringify(candidate.raw || ""),
        };
        records.push(rec);
        appendJsonl(OUT_JSONL, rec);
      }
    }

    let i = 0;
    for (const url of detailUrls) {
      i += 1;
      const raw = await collectDetail(page, url, i);
      const rec = {
        collectedAt: new Date().toISOString(),
        externalId: sha1(url).slice(0, 24),
        sourceUrl: url,
        source: raw.source,
        title: raw.title,
        rawText: raw.rawText,
        images: raw.images,
        documents: raw.documents,
      };
      records.push(rec);
      appendJsonl(OUT_JSONL, rec);
    }
  } finally {
    fs.writeFileSync(path.join(OUT_ROOT, "network.json"), JSON.stringify(allNetwork, null, 2), "utf8");
    fs.writeFileSync(path.join(OUT_ROOT, "detail-urls.json"), JSON.stringify(Array.from(detailUrls), null, 2), "utf8");
    fs.writeFileSync(path.join(OUT_ROOT, "collect-summary.json"), JSON.stringify({
      records: records.length,
      detailUrls: detailUrls.size,
      out: OUT_JSONL,
      profileDir: PROFILE_DIR,
      debugDir: DEBUG_DIR,
    }, null, 2), "utf8");

    await context.close();
  }

  console.log("collector done");
  console.log("records:", records.length);
  console.log("detail urls:", detailUrls.size);
  console.log("out:", OUT_JSONL);
  console.log("debug:", DEBUG_DIR);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
`);

/* -------------------------------------------------------------------------- */
/* 2. Local importer                                                           */
/* -------------------------------------------------------------------------- */

write("scripts/zvgscout_import_local.cjs", `#!/usr/bin/env node
/* eslint-disable no-console */

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const { PrismaClient, Prisma } = require("@prisma/client");

const prisma = new PrismaClient();

const IN_JSONL = process.env.ZVGSCOUT_IN || path.join(process.cwd(), "var", "imports", "zvgscout-local", "records.jsonl");
const IMPORT_ROOT = path.join(process.cwd(), "public", "imports", "zvgscout");
const RAW_ROOT = path.join(process.cwd(), "var", "imports", "zvgscout-local", "normalized");
const DRY_RUN = process.env.ZVGSCOUT_DRY_RUN === "1" || process.argv.includes("--dry-run");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}
function sha1(value) {
  return crypto.createHash("sha1").update(String(value)).digest("hex");
}
function norm(value) {
  return String(value || "").replace(/\\s+/g, " ").trim();
}
function normalizeAktenzeichen(value) {
  return norm(value)
    .toUpperCase()
    .replace(/\\s+/g, " ")
    .replace(/([0-9])\\s*K\\s*([0-9])/i, "$1 K $2")
    .trim() || "UNKNOWN-" + Date.now();
}
function isBadRecord(text) {
  const t = String(text || "").toLowerCase();
  return (
    !t ||
    t.includes("sicherheitsüberprüfung wird durchgeführt") ||
    t.includes("cloudflare") ||
    t.includes("fehler beim laden der daten") ||
    t.includes("erneut versuchen")
  );
}
function parseMoney(value) {
  const text = String(value || "");
  const matches = Array.from(text.matchAll(/(\\d{1,3}(?:[.\\s]\\d{3})*(?:,\\d{2})?|\\d+)\\s*(?:€|EUR)/gi));
  if (!matches.length) return null;
  const best = matches
    .map((m) => Number(m[1].replace(/[.\\s]/g, "").replace(",", ".")))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => b - a)[0];
  return Number.isFinite(best) ? Math.round(best) : null;
}
function parseNumberNear(labelRegex, text) {
  const source = String(text || "");
  const match = source.match(new RegExp(labelRegex.source + "[^\\\\d]{0,50}(\\\\d{1,5}(?:[,.]\\\\d{1,2})?)\\\\s*(?:m²|qm|m2)", "i"));
  if (!match) return null;
  const n = Number(match[1].replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
function parseGermanDate(text) {
  const source = String(text || "");
  const m = source.match(/(\\d{1,2})\\.(\\d{1,2})\\.(\\d{4})(?:\\s*(?:um|,)?\\s*(\\d{1,2}):(\\d{2}))?/);
  if (!m) return null;
  const [, dd, mm, yyyy, hh = "0", min = "0"] = m;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min));
  return Number.isNaN(d.getTime()) ? null : d;
}
function parseAktenzeichen(text) {
  const source = String(text || "");
  const patterns = [
    /Aktenzeichen\\s*[:\\-]?\\s*([0-9A-Za-zÄÖÜäöüß\\s.\\/\\-]{3,45})/i,
    /\\b(\\d{1,4}\\s*[Kk]\\s*\\d{1,5}\\/\\d{2,4})\\b/,
  ];
  for (const p of patterns) {
    const m = source.match(p);
    if (m?.[1]) return norm(m[1]);
  }
  return null;
}
function parseCourt(text) {
  const m = String(text || "").match(/Amtsgericht\\s+([A-ZÄÖÜ][A-Za-zÄÖÜäöüß\\-\\s]{2,50})/);
  return m ? norm("Amtsgericht " + m[1]) : null;
}
function parsePostalCodeCity(text) {
  const m = String(text || "").match(/\\b(\\d{5})\\s+([A-ZÄÖÜ][A-Za-zÄÖÜäöüß\\-\\s]{2,40})\\b/);
  return m ? { postalCode: m[1], city: norm(m[2]) } : { postalCode: null, city: null };
}
function parseAddress(text) {
  const m = norm(text).match(/([A-ZÄÖÜ][A-Za-zÄÖÜäöüß0-9.'\\-\\s]+\\s+\\d+[a-zA-Z]?(?:\\s*,\\s*)?\\d{5}\\s+[A-ZÄÖÜ][A-Za-zÄÖÜäöüß\\-\\s]+)/);
  return m ? norm(m[1]) : null;
}
function detectPropertyType(text) {
  const t = String(text || "").toLowerCase();
  if (/wohnung|eigentumswohnung|appartement/.test(t)) return "WOHNUNGEN";
  if (/grundstück|baugrundstück|acker|land|wald|forst/.test(t)) return "GRUNDSTUECKE";
  if (/garage|stellplatz|parkplatz/.test(t)) return "GARAGEN";
  if (/gewerbe|halle|laden|büro|praxis|hotel|gastronomie/.test(t)) return "GEWERBE";
  if (/mehrfamilienhaus|mfh|zweifamilienhaus|einfamilienhaus|wohnhaus|haus|doppelhaushälfte|reihenhaus/.test(t)) return "WOHNHAEUSER";
  return "SONSTIGE";
}
function detectStatus(text) {
  return /aufgehoben|abgesagt|cancelled|termin aufgehoben/i.test(text) ? "CANCELLED" : "ACTIVE";
}
function detectWertgrenzenRemoved(text) {
  return /wertgrenzen\\s*(?:weggefallen|aufgehoben)|5\\/10|7\\/10|§\\s*85a|§\\s*74a|zweiter termin|2\\.\\s*termin|dritter termin|3\\.\\s*termin/i.test(text);
}
function termNumber(text, status, wg, auctionDate) {
  let n = 1;
  if (/2\\.\\s*termin|zweiter termin|erneuter termin/i.test(text)) n = Math.max(n, 2);
  if (/3\\.\\s*termin|dritter termin/i.test(text)) n = Math.max(n, 3);
  if (wg) n = Math.max(n, 2);
  if (wg && auctionDate && auctionDate.getTime() < Date.now()) n = Math.max(n, 3);
  return n;
}
function coords(text) {
  const source = String(text || "");
  const patterns = [
    /"lat"\\s*:\\s*(-?\\d{1,2}\\.\\d+)\\s*,\\s*"lng"\\s*:\\s*(-?\\d{1,3}\\.\\d+)/i,
    /"latitude"\\s*:\\s*(-?\\d{1,2}\\.\\d+)\\s*,\\s*"longitude"\\s*:\\s*(-?\\d{1,3}\\.\\d+)/i,
  ];
  for (const p of patterns) {
    const m = source.match(p);
    if (m) return { latitude: Number(m[1]), longitude: Number(m[2]) };
  }
  return { latitude: null, longitude: null };
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
function pick(modelName, obj) {
  const f = fields(modelName);
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
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
async function download(url, target) {
  try {
    ensureDir(path.dirname(target));
    const res = await fetch(url);
    if (!res.ok) return null;
    fs.writeFileSync(target, Buffer.from(await res.arrayBuffer()));
    return target;
  } catch {
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

function normalizeRecord(record) {
  const text = [record.title, record.rawText, JSON.stringify(record.raw || {})].join("\\n");
  if (isBadRecord(text)) return null;

  const pc = parsePostalCodeCity(text);
  const az = parseAktenzeichen(text);
  const nAz = normalizeAktenzeichen(az || record.sourceUrl || record.externalId);
  const auctionDate = parseGermanDate(text);
  const status = detectStatus(text);
  const wg = detectWertgrenzenRemoved(text);
  const c = coords(text);
  const title = norm(record.title) || norm(text).slice(0, 120) || "Zwangsversteigerung";

  return {
    source: "zvgscout-local",
    sourceUrl: record.sourceUrl,
    externalId: record.externalId || sha1(record.sourceUrl || text).slice(0, 24),
    title,
    description: norm(text).slice(0, 5000),
    address: parseAddress(text),
    postalCode: pc.postalCode,
    city: pc.city,
    court: parseCourt(text),
    aktenzeichen: az,
    normalizedAktenzeichen: nAz,
    auctionDate,
    marketValue: parseMoney(text),
    livingArea: parseNumberNear(/Wohnfl(?:ä|ae)che|Wfl\\.?|Wohnfläche/, text),
    plotArea: parseNumberNear(/Grundst(?:ü|ue)cksfl(?:ä|ae)che|Grundstück|Flurstück|Grundst\\.?/, text),
    propertyTypeGroup: detectPropertyType(text),
    status,
    wertgrenzenWeggefallen: wg,
    termNumber: termNumber(text, status, wg, auctionDate),
    latitude: c.latitude,
    longitude: c.longitude,
    images: Array.isArray(record.images) ? record.images : [],
    documents: Array.isArray(record.documents) ? record.documents : [],
    rawText: text,
  };
}

async function findExisting(detail) {
  const or = [];
  if (hasField("Property", "sourceUrl")) or.push({ sourceUrl: detail.sourceUrl });
  if (hasField("Property", "externalId")) or.push({ externalId: detail.externalId });
  if (hasField("Property", "normalizedAktenzeichen")) or.push({ normalizedAktenzeichen: detail.normalizedAktenzeichen });
  if (hasField("Property", "aktenzeichen") && detail.aktenzeichen) or.push({ aktenzeichen: detail.aktenzeichen });
  if (detail.address && detail.auctionDate && hasField("Property", "address") && hasField("Property", "auctionDate")) {
    or.push({ address: detail.address, auctionDate: detail.auctionDate });
  }
  if (!or.length) return null;
  return prisma.property.findFirst({ where: { OR: or } });
}
function propertyData(detail) {
  return pick("Property", {
    source: detail.source,
    sourceUrl: detail.sourceUrl,
    externalId: detail.externalId,
    title: detail.title,
    titleRu: detail.title,
    titleDe: detail.title,
    titleEn: detail.title,
    description: detail.description,
    descriptionRu: detail.description,
    descriptionDe: detail.description,
    descriptionEn: detail.description,
    address: detail.address,
    postalCode: detail.postalCode,
    zip: detail.postalCode,
    city: detail.city,
    court: detail.court,
    aktenzeichen: detail.aktenzeichen,
    normalizedAktenzeichen: detail.normalizedAktenzeichen,
    caseNumber: detail.aktenzeichen,
    auctionDate: detail.auctionDate,
    marketValue: detail.marketValue,
    livingArea: detail.livingArea,
    plotArea: detail.plotArea,
    propertyTypeGroup: detail.propertyTypeGroup,
    status: detail.status,
    wertgrenzenWeggefallen: detail.wertgrenzenWeggefallen,
    termNumber: detail.termNumber,
    latitude: detail.latitude,
    longitude: detail.longitude,
    isActive: detail.status !== "CANCELLED",
  });
}
async function upsert(detail) {
  const existing = await findExisting(detail);
  const data = propertyData(detail);

  if (DRY_RUN) {
    console.log(existing ? "[dry:update]" : "[dry:create]", detail.normalizedAktenzeichen, detail.title);
    return existing || { id: "dry-run" };
  }

  if (existing) {
    const p = await prisma.property.update({ where: { id: existing.id }, data });
    console.log("[updated]", p.id, detail.normalizedAktenzeichen, detail.title);
    return p;
  }

  const p = await prisma.property.create({ data });
  console.log("[created]", p.id, detail.normalizedAktenzeichen, detail.title);
  return p;
}
async function saveImages(propertyId, detail) {
  const m = imageModel();
  if (!m || !propertyId || propertyId === "dry-run") return;
  const d = prisma[delegateName(m)];
  const f = fields(m);
  if (!d) return;
  const dir = path.join(IMPORT_ROOT, detail.externalId, "images");

  for (let i = 0; i < detail.images.length; i++) {
    const url = typeof detail.images[i] === "string" ? detail.images[i] : detail.images[i]?.url;
    if (!url) continue;
    const local = path.join(dir, String(i + 1).padStart(2, "0") + ext(url, ".jpg"));
    const saved = await download(url, local);
    const publicUrl = saved ? "/" + path.relative(path.join(process.cwd(), "public"), saved).replace(/\\\\/g, "/") : url;

    const data = {};
    if (f.has("propertyId")) data.propertyId = propertyId;
    if (f.has("url")) data.url = publicUrl;
    if (f.has("src")) data.src = publicUrl;
    if (f.has("sourceUrl")) data.sourceUrl = url;
    if (f.has("originalUrl")) data.originalUrl = url;
    if (f.has("isMain")) data.isMain = i === 0;
    if (f.has("sortOrder")) data.sortOrder = i;
    if (f.has("alt")) data.alt = detail.title;

    try {
      const existing = await d.findFirst({ where: { propertyId, OR: [f.has("url") ? { url: publicUrl } : undefined, f.has("sourceUrl") ? { sourceUrl: url } : undefined].filter(Boolean) } });
      if (!existing) await d.create({ data });
    } catch (e) {
      console.warn("image save failed", e.message);
    }
  }
}
async function saveDocuments(propertyId, detail) {
  const m = documentModel();
  if (!m || !propertyId || propertyId === "dry-run") return;
  const d = prisma[delegateName(m)];
  const f = fields(m);
  if (!d) return;
  const dir = path.join(IMPORT_ROOT, detail.externalId, "documents");

  for (let i = 0; i < detail.documents.length; i++) {
    const doc = detail.documents[i];
    const url = typeof doc === "string" ? doc : doc?.href || doc?.url;
    if (!url) continue;
    const local = path.join(dir, String(i + 1).padStart(2, "0") + ext(url, ".pdf"));
    const saved = await download(url, local);
    const publicUrl = saved ? "/" + path.relative(path.join(process.cwd(), "public"), saved).replace(/\\\\/g, "/") : url;

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
      const existing = await d.findFirst({ where: { propertyId, OR: [f.has("url") ? { url: publicUrl } : undefined, f.has("sourceUrl") ? { sourceUrl: url } : undefined].filter(Boolean) } });
      if (!existing) await d.create({ data });
    } catch (e) {
      console.warn("document save failed", e.message);
    }
  }
}

async function main() {
  ensureDir(IMPORT_ROOT);
  ensureDir(RAW_ROOT);

  if (!fs.existsSync(IN_JSONL)) {
    console.error("Input JSONL not found:", IN_JSONL);
    process.exit(1);
  }

  const lines = fs.readFileSync(IN_JSONL, "utf8").split(/\\r?\\n/).filter(Boolean);
  const summary = [];

  for (const line of lines) {
    try {
      const record = JSON.parse(line);
      const detail = normalizeRecord(record);

      if (!detail) {
        summary.push({ skipped: true, reason: "BAD_OR_EMPTY_RECORD", sourceUrl: record.sourceUrl });
        continue;
      }

      fs.writeFileSync(path.join(RAW_ROOT, detail.externalId + ".json"), JSON.stringify(detail, null, 2), "utf8");

      const property = await upsert(detail);
      await saveImages(property.id, detail);
      await saveDocuments(property.id, detail);

      summary.push({ ok: true, id: property.id, normalizedAktenzeichen: detail.normalizedAktenzeichen, title: detail.title });
    } catch (e) {
      summary.push({ ok: false, error: e.message });
    }
  }

  fs.writeFileSync(path.join(RAW_ROOT, "import-summary.json"), JSON.stringify(summary, null, 2), "utf8");
  await prisma.$disconnect();

  console.log("done", summary.length);
  console.log("summary:", path.join(RAW_ROOT, "import-summary.json"));
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
`);

/* -------------------------------------------------------------------------- */
/* 3. package scripts                                                          */
/* -------------------------------------------------------------------------- */

patch("package.json", (s) => {
  const pkg = JSON.parse(s);
  pkg.scripts = pkg.scripts || {};
  pkg.scripts["zvgscout:collect"] = "node scripts/zvgscout_collect_local.cjs";
  pkg.scripts["zvgscout:import"] = "node scripts/zvgscout_import_local.cjs";
  pkg.scripts["zvgscout:import:dry"] = "cross-env ZVGSCOUT_DRY_RUN=1 node scripts/zvgscout_import_local.cjs";

  pkg.devDependencies = pkg.devDependencies || {};
  if (!pkg.dependencies?.playwright && !pkg.devDependencies.playwright) {
    pkg.devDependencies.playwright = "^1.49.0";
  }
  if (!pkg.dependencies?.["cross-env"] && !pkg.devDependencies["cross-env"]) {
    pkg.devDependencies["cross-env"] = "^7.0.3";
  }

  return JSON.stringify(pkg, null, 2) + "\n";
});

/* -------------------------------------------------------------------------- */
/* 4. docs                                                                     */
/* -------------------------------------------------------------------------- */

write("docs/ZVGSCOUT_LOCAL_PIPELINE.md", `# ZvgScout local pipeline

Direct server scraping is unstable because the page can return:

- "Fehler beim Laden der Daten"
- Cloudflare security check
- SPA skeleton without data

So import is split into two steps.

## Step 1 — local collect

Runs on your Windows machine. It opens a real browser profile.

\`\`\`powershell
cd D:\\Projects\\zvg_frontend_mvp
npm install
npx playwright install chromium
$env:ZVGSCOUT_HEADLESS="0"
$env:ZVGSCOUT_MAX_PAGES="1"
$env:ZVGSCOUT_WAIT_MS="60000"
npm run zvgscout:collect
\`\`\`

During the visible browser window:

1. accept cookies;
2. login if needed;
3. click "Erneut versuchen" if the page shows error;
4. wait until objects load.

Output:

\`\`\`txt
var/imports/zvgscout-local/records.jsonl
var/imports/zvgscout-local/collect-summary.json
var/imports/zvgscout-local/detail-urls.json
var/imports/zvgscout-local/network.json
var/imports/zvgscout-local/_debug/
\`\`\`

The browser profile is saved here:

\`\`\`txt
var/imports/zvgscout-local/_browser-profile
\`\`\`

So cookies/session can be reused on next run.

## Step 2 — dry import

\`\`\`powershell
$env:ZVGSCOUT_DRY_RUN="1"
npm run zvgscout:import
\`\`\`

Check:

\`\`\`txt
var/imports/zvgscout-local/normalized/import-summary.json
\`\`\`

## Step 3 — real import

\`\`\`powershell
Remove-Item Env:ZVGSCOUT_DRY_RUN -ErrorAction SilentlyContinue
npm run zvgscout:import
\`\`\`

Files go to:

\`\`\`txt
public/imports/zvgscout/<externalId>/
\`\`\`

## Important

The importer skips bad records containing:

- Cloudflare
- Sicherheitsüberprüfung
- Fehler beim Laden der Daten
- Erneut versuchen

It also fills required \`normalizedAktenzeichen\`, so Prisma create should not fail on that field.
`);

console.log("Stage 114 completed.");
