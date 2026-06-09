#!/usr/bin/env node
/* eslint-disable no-console */

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const { PrismaClient, Prisma } = require("@prisma/client");

let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  console.error("");
  console.error("Playwright is not installed.");
  console.error("Run:");
  console.error("  npm install");
  console.error("  npx playwright install chromium");
  console.error("");
  process.exit(1);
}

const prisma = new PrismaClient();

const START_URL =
  process.env.ZVGSCOUT_URL ||
  "https://zvgscout.com/zwangsversteigerungen?page=1&maplat=50.83871608853164&maplng=12.8785815480677&mapzoom=11.283512746895843";

const MAX_PAGES = Number(process.env.ZVGSCOUT_MAX_PAGES || process.argv.find((arg) => arg.startsWith("--pages="))?.split("=")[1] || 1);
const HEADLESS = process.env.ZVGSCOUT_HEADLESS !== "0";
const DRY_RUN = process.env.ZVGSCOUT_DRY_RUN === "1" || process.argv.includes("--dry-run");
const DISCOVERY_ONLY = process.env.ZVGSCOUT_DISCOVERY_ONLY === "1" || process.argv.includes("--discovery-only");
const SLOW_MS = Number(process.env.ZVGSCOUT_SLOW_MS || 900);
const GOTO_TIMEOUT = Number(process.env.ZVGSCOUT_GOTO_TIMEOUT || 45000);
const IMPORT_ROOT = path.join(process.cwd(), "public", "imports", "zvgscout");
const RAW_ROOT = path.join(process.cwd(), "var", "imports", "zvgscout");
const DEBUG_ROOT = path.join(RAW_ROOT, "_debug");
const USER_AGENT =
  process.env.ZVGSCOUT_USER_AGENT ||
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}
function sha1(value) {
  return crypto.createHash("sha1").update(String(value)).digest("hex");
}
function normalizeWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}
function pageUrl(base, pageNo) {
  const url = new URL(base);
  url.searchParams.set("page", String(pageNo));
  return url.toString();
}
function safeFilename(value) {
  return String(value || "file").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
}
function absUrl(baseUrl, maybeUrl) {
  if (!maybeUrl) return null;
  try {
    return new URL(String(maybeUrl), baseUrl).toString();
  } catch {
    return null;
  }
}

function parseMoney(value) {
  const text = String(value || "");
  const matches = Array.from(text.matchAll(/(\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})?|\d+)\s*(?:€|EUR)/gi));
  if (!matches.length) return null;

  const best = matches
    .map((m) => Number(m[1].replace(/[.\s]/g, "").replace(",", ".")))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => b - a)[0];

  return Number.isFinite(best) ? Math.round(best) : null;
}
function parseNumberNear(labelRegex, text) {
  const source = String(text || "");
  const match = source.match(new RegExp(labelRegex.source + "[^\\d]{0,50}(\\d{1,5}(?:[,.]\\d{1,2})?)\\s*(?:m²|qm|m2)", "i"));
  if (!match) return null;
  const parsed = Number(match[1].replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}
function parseGermanDate(text) {
  const source = String(text || "");
  const numeric = source.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s*(?:um|,)?\s*(\d{1,2}):(\d{2}))?/);
  if (numeric) {
    const [, dd, mm, yyyy, hh = "0", min = "0"] = numeric;
    const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min));
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  return null;
}
function parseAktenzeichen(text) {
  const source = String(text || "");
  const patterns = [
    /Aktenzeichen\s*[:\-]?\s*([0-9A-Za-zÄÖÜäöüß\s.\/\-]{3,45})/i,
    /\b(\d{1,4}\s*[Kk]\s*\d{1,5}\/\d{2,4})\b/,
  ];
  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match?.[1]) return normalizeWhitespace(match[1]);
  }
  return null;
}
function parseCourt(text) {
  const source = String(text || "");
  const match = source.match(/Amtsgericht\s+([A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-\s]{2,50})/);
  return match ? normalizeWhitespace("Amtsgericht " + match[1]) : null;
}
function parsePostalCodeCity(text) {
  const source = String(text || "");
  const match = source.match(/\b(\d{5})\s+([A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-\s]{2,40})\b/);
  if (!match) return { postalCode: null, city: null };
  return { postalCode: match[1], city: normalizeWhitespace(match[2]) };
}
function parseAddress(text) {
  const source = normalizeWhitespace(text);
  const match = source.match(/([A-ZÄÖÜ][A-Za-zÄÖÜäöüß0-9.'\-\s]+\s+\d+[a-zA-Z]?(?:\s*,\s*)?\d{5}\s+[A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-\s]+)/);
  return match ? normalizeWhitespace(match[1]) : null;
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
  const t = String(text || "").toLowerCase();
  if (/aufgehoben|abgesagt|cancelled|canceled|termin aufgehoben/.test(t)) return "CANCELLED";
  return "ACTIVE";
}
function detectWertgrenzenRemoved(text) {
  const t = String(text || "").toLowerCase();
  return /wertgrenzen\s*(?:weggefallen|aufgehoben)|5\/10|7\/10|§\s*85a|§\s*74a|zweiter termin|2\.\s*termin|dritter termin|3\.\s*termin/.test(t);
}
function detectTermNumber(text, status, wertgrenzenRemoved, auctionDateIso) {
  const t = String(text || "").toLowerCase();
  let term = 1;
  if (/2\.\s*termin|zweiter termin|erneuter termin/.test(t)) term = Math.max(term, 2);
  if (/3\.\s*termin|dritter termin/.test(t)) term = Math.max(term, 3);
  if (wertgrenzenRemoved) term = Math.max(term, 2);
  const isArchived = status === "ARCHIVED" || (auctionDateIso && new Date(auctionDateIso).getTime() < Date.now());
  if (wertgrenzenRemoved && isArchived) term = Math.max(term, 3);
  return term;
}
function extractCoordinatesFromText(text) {
  const source = String(text || "");
  const patterns = [
    /"lat"\s*:\s*(-?\d{1,2}\.\d+)\s*,\s*"lng"\s*:\s*(-?\d{1,3}\.\d+)/i,
    /"latitude"\s*:\s*(-?\d{1,2}\.\d+)\s*,\s*"longitude"\s*:\s*(-?\d{1,3}\.\d+)/i,
    /lat(?:itude)?["'\s:=]+(-?\d{1,2}\.\d+)[,\s]+lng(?:itude)?["'\s:=]+(-?\d{1,3}\.\d+)/i,
  ];
  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match) return { latitude: Number(match[1]), longitude: Number(match[2]) };
  }
  return { latitude: null, longitude: null };
}

function model(modelName) {
  return Prisma.dmmf.datamodel.models.find((item) => item.name === modelName);
}
function fieldNames(modelName) {
  return new Set((model(modelName)?.fields || []).map((field) => field.name));
}
function hasField(modelName, fieldName) {
  return fieldNames(modelName).has(fieldName);
}
function pickExisting(modelName, data) {
  const fields = fieldNames(modelName);
  const result = {};
  for (const [key, value] of Object.entries(data)) {
    if (fields.has(key) && value !== undefined) result[key] = value;
  }
  return result;
}
function findImageModel() {
  for (const name of ["PropertyImage", "Image", "PropertyPhoto", "Photo"]) {
    if (model(name)) return name;
  }
  return null;
}
function findDocumentModel() {
  for (const name of ["PropertyDocument", "Document", "PropertyFile", "File"]) {
    if (model(name)) return name;
  }
  return null;
}
function delegateName(modelName) {
  return modelName.charAt(0).toLowerCase() + modelName.slice(1);
}

async function downloadFile(url, targetPath) {
  ensureDir(path.dirname(targetPath));
  try {
    const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    fs.writeFileSync(targetPath, Buffer.from(arrayBuffer));
    return targetPath;
  } catch (error) {
    console.warn("download failed", url, error.message);
    return null;
  }
}
function extensionFromUrl(url, fallback) {
  try {
    const ext = path.extname(new URL(url).pathname).slice(0, 12);
    return ext || fallback;
  } catch {
    return fallback;
  }
}

function extractUrlsFromAny(value, baseUrl, out = new Set()) {
  if (value == null) return out;
  if (typeof value === "string") {
    const text = value;

    // Full URLs.
    for (const match of text.matchAll(/https?:\/\/[^"'\s<>]+/g)) {
      const url = match[0].replace(/[),.;]+$/, "");
      if (/zvgscout\.com/i.test(url)) out.add(url);
    }

    // Relative detail candidates.
    for (const match of text.matchAll(/\/(?:zwangsversteigerungen|versteigerung|objekt|objects?|properties?)[^"'\s<>)]{3,200}/gi)) {
      const url = absUrl(baseUrl, match[0]);
      if (url) out.add(url);
    }

    return out;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => extractUrlsFromAny(item, baseUrl, out));
    return out;
  }
  if (typeof value === "object") {
    Object.values(value).forEach((item) => extractUrlsFromAny(item, baseUrl, out));
  }
  return out;
}

function isDetailUrl(url) {
  try {
    const parsed = new URL(url);
    if (!/zvgscout\.com$/i.test(parsed.hostname.replace(/^www\./, ""))) return false;

    const p = parsed.pathname.toLowerCase();
    if (p === "/zwangsversteigerungen" || p === "/zwangsversteigerungen/") return false;
    if (parsed.searchParams.has("page")) return false;

    // Accept likely detail URLs.
    if (/\/zwangsversteigerungen\/.+/.test(p)) return true;
    if (/\/(versteigerung|objekt|objects|properties)\/.+/.test(p)) return true;

    // Some SPA routes can be slug directly after zwangsversteigerungen-like base.
    if (/zvg|zwangsversteigerung|amtsgericht|k-\d|\d+k/i.test(url) && p.split("/").filter(Boolean).length >= 2) return true;

    return false;
  } catch {
    return false;
  }
}

async function gotoSafe(page, url) {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: GOTO_TIMEOUT });
  } catch (error) {
    console.warn("[goto warning]", error.message);
  }

  // Wait for client render without requiring networkidle.
  try {
    await page.waitForLoadState("load", { timeout: 15000 });
  } catch {}
  await sleep(SLOW_MS);
}

async function collectListLinks(page, pageUrl, networkJsons, pageNo) {
  await gotoSafe(page, pageUrl);

  ensureDir(DEBUG_ROOT);
  const debugPrefix = path.join(DEBUG_ROOT, "list-page-" + pageNo);

  try {
    await page.screenshot({ path: debugPrefix + ".png", fullPage: true });
  } catch {}

  const debug = await page.evaluate(() => {
    const attrs = [];
    for (const el of Array.from(document.querySelectorAll("*"))) {
      for (const attr of Array.from(el.attributes || [])) {
        const value = attr.value || "";
        if (/zvg|versteiger|objekt|auction|property/i.test(value)) {
          attrs.push({
            tag: el.tagName,
            name: attr.name,
            value,
            text: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 300),
          });
        }
      }
    }

    const anchors = Array.from(document.querySelectorAll("a[href]")).map((a) => ({
      href: a.href,
      text: (a.innerText || a.textContent || "").replace(/\s+/g, " ").trim(),
    }));

    const buttons = Array.from(document.querySelectorAll("button, [role=button]")).map((b) => ({
      text: (b.innerText || b.textContent || "").replace(/\s+/g, " ").trim(),
      html: b.outerHTML.slice(0, 1000),
    }));

    const scripts = Array.from(document.querySelectorAll("script"))
      .map((script) => script.textContent || "")
      .filter((text) => /zvg|versteiger|Aktenzeichen|Verkehrswert|auction|property/i.test(text))
      .slice(0, 30);

    const text = (document.body?.innerText || "").replace(/\s+/g, " ").trim();

    return {
      url: location.href,
      title: document.title,
      textSample: text.slice(0, 10000),
      anchors,
      buttons,
      attrs,
      scripts,
      htmlSample: document.documentElement.outerHTML.slice(0, 300000),
    };
  });

  fs.writeFileSync(debugPrefix + ".json", JSON.stringify(debug, null, 2), "utf8");
  fs.writeFileSync(debugPrefix + ".html", debug.htmlSample, "utf8");

  const candidates = new Set();

  for (const a of debug.anchors) extractUrlsFromAny(a.href, pageUrl, candidates);
  for (const attr of debug.attrs) extractUrlsFromAny(attr.value, pageUrl, candidates);
  for (const script of debug.scripts) extractUrlsFromAny(script, pageUrl, candidates);
  for (const json of networkJsons) extractUrlsFromAny(json, pageUrl, candidates);

  const links = Array.from(candidates).filter(isDetailUrl);

  fs.writeFileSync(debugPrefix + ".links.json", JSON.stringify({ links, candidates: Array.from(candidates) }, null, 2), "utf8");

  return links;
}

async function extractDetail(page, detailUrl, networkJsons) {
  await gotoSafe(page, detailUrl);

  const raw = await page.evaluate(() => {
    function clean(value) {
      return String(value || "").replace(/\s+/g, " ").trim();
    }

    const title =
      clean(document.querySelector("h1")?.textContent) ||
      clean(document.querySelector("h2")?.textContent) ||
      clean(document.title);

    const bodyText = clean(document.body?.innerText || "");
    const html = document.documentElement.innerHTML;

    const images = Array.from(document.querySelectorAll("img[src], source[srcset]"))
      .flatMap((el) => {
        const src = el.getAttribute("src");
        const srcset = el.getAttribute("srcset");
        const values = [];
        if (src) values.push(src);
        if (srcset) {
          for (const part of srcset.split(",")) {
            const first = part.trim().split(/\s+/)[0];
            if (first) values.push(first);
          }
        }
        return values;
      })
      .map((url) => new URL(url, location.href).toString())
      .filter((url) => !/logo|favicon|sprite|icon/i.test(url));

    const docs = Array.from(document.querySelectorAll("a[href]"))
      .map((a) => ({
        href: new URL(a.getAttribute("href"), location.href).toString(),
        text: clean(a.textContent),
      }))
      .filter((item) => /\.pdf(?:\?|$)|download|gutachten|exposé|expose|dokument|termin|bekanntmachung/i.test(item.href + " " + item.text));

    const jsonScripts = Array.from(document.querySelectorAll("script"))
      .map((script) => script.textContent || "")
      .filter((text) => /Aktenzeichen|latitude|longitude|Verkehrswert|zwangsversteigerung|property/i.test(text))
      .slice(0, 30);

    return { title, bodyText, htmlSample: html.slice(0, 250000), images, docs, jsonScripts };
  });

  const allNetworkText = JSON.stringify(networkJsons).slice(0, 200000);
  const allText = [raw.title, raw.bodyText, raw.jsonScripts.join("\n"), allNetworkText].join("\n");
  const coordinates = extractCoordinatesFromText(raw.htmlSample + "\n" + raw.jsonScripts.join("\n") + "\n" + allNetworkText);
  const pcCity = parsePostalCodeCity(allText);
  const auctionDate = parseGermanDate(allText);
  const status = detectStatus(allText);
  const wertgrenzenRemoved = detectWertgrenzenRemoved(allText);

  return {
    source: "zvgscout",
    sourceUrl: detailUrl,
    externalId: sha1(detailUrl).slice(0, 24),
    title: raw.title || "Zwangsversteigerung",
    description: raw.bodyText.slice(0, 5000),
    address: parseAddress(allText),
    postalCode: pcCity.postalCode,
    city: pcCity.city,
    court: parseCourt(allText),
    caseNumber: parseAktenzeichen(allText),
    auctionDate,
    marketValue: parseMoney(allText),
    livingArea: parseNumberNear(/Wohnfl(?:ä|ae)che|Wfl\.?|Wohnfläche/, allText),
    plotArea: parseNumberNear(/Grundst(?:ü|ue)cksfl(?:ä|ae)che|Grundstück|Flurstück|Grundst\.?/, allText),
    propertyTypeGroup: detectPropertyType(allText),
    status,
    wertgrenzenWeggefallen: wertgrenzenRemoved,
    termNumber: detectTermNumber(allText, status, wertgrenzenRemoved, auctionDate),
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    images: Array.from(new Set(raw.images)).slice(0, 30),
    documents: raw.docs.filter((doc, index, arr) => arr.findIndex((other) => other.href === doc.href) === index).slice(0, 30),
    rawText: raw.bodyText,
  };
}

function buildPropertyData(detail) {
  return pickExisting("Property", {
    source: detail.source,
    sourceUrl: detail.sourceUrl,
    externalId: detail.externalId,
    importSource: detail.source,
    importUrl: detail.sourceUrl,
    title: detail.title,
    titleRu: detail.title,
    titleDe: detail.title,
    titleEn: detail.title,
    headline: detail.title,
    description: detail.description,
    descriptionRu: detail.description,
    descriptionDe: detail.description,
    descriptionEn: detail.description,
    address: detail.address,
    postalCode: detail.postalCode,
    zip: detail.postalCode,
    city: detail.city,
    court: detail.court,
    aktenzeichen: detail.caseNumber,
    caseNumber: detail.caseNumber,
    fileNumber: detail.caseNumber,
    auctionDate: detail.auctionDate ? new Date(detail.auctionDate) : null,
    termin: detail.auctionDate ? new Date(detail.auctionDate) : null,
    marketValue: detail.marketValue,
    trafficValue: detail.marketValue,
    value: detail.marketValue,
    livingArea: detail.livingArea,
    wohnflaeche: detail.livingArea,
    plotArea: detail.plotArea,
    grundstuecksflaeche: detail.plotArea,
    propertyTypeGroup: detail.propertyTypeGroup,
    typeGroup: detail.propertyTypeGroup,
    status: detail.status,
    wertgrenzenWeggefallen: detail.wertgrenzenWeggefallen,
    wertgrenzenRemoved: detail.wertgrenzenWeggefallen,
    valueLimitsRemoved: detail.wertgrenzenWeggefallen,
    termNumber: detail.termNumber,
    terminNumber: detail.termNumber,
    terminNr: detail.termNumber,
    anzahlTermine: detail.termNumber,
    latitude: detail.latitude,
    longitude: detail.longitude,
    lat: detail.latitude,
    lng: detail.longitude,
    isActive: detail.status !== "CANCELLED",
  });
}

async function findExistingProperty(detail) {
  const or = [];
  if (hasField("Property", "sourceUrl")) or.push({ sourceUrl: detail.sourceUrl });
  if (hasField("Property", "externalId")) or.push({ externalId: detail.externalId });
  if (hasField("Property", "importUrl")) or.push({ importUrl: detail.sourceUrl });
  if (hasField("Property", "aktenzeichen") && detail.caseNumber) or.push({ aktenzeichen: detail.caseNumber });
  if (hasField("Property", "caseNumber") && detail.caseNumber) or.push({ caseNumber: detail.caseNumber });
  if (detail.address && detail.auctionDate && hasField("Property", "address") && hasField("Property", "auctionDate")) {
    or.push({ address: detail.address, auctionDate: new Date(detail.auctionDate) });
  }
  if (!or.length) return null;
  return prisma.property.findFirst({ where: { OR: or } });
}

async function saveImages(propertyId, detail, localDir) {
  const imageModel = findImageModel();
  if (!imageModel) return;
  const delegate = prisma[delegateName(imageModel)];
  if (!delegate) return;
  const fields = fieldNames(imageModel);

  for (let index = 0; index < detail.images.length; index += 1) {
    const url = detail.images[index];
    const ext = extensionFromUrl(url, ".jpg");
    const localPath = path.join(localDir, "images", String(index + 1).padStart(2, "0") + ext);
    const downloaded = await downloadFile(url, localPath);
    const publicUrl = downloaded ? "/" + path.relative(path.join(process.cwd(), "public"), downloaded).replace(/\\/g, "/") : url;

    const data = {};
    if (fields.has("propertyId")) data.propertyId = propertyId;
    if (fields.has("url")) data.url = publicUrl;
    if (fields.has("src")) data.src = publicUrl;
    if (fields.has("originalUrl")) data.originalUrl = url;
    if (fields.has("sourceUrl")) data.sourceUrl = url;
    if (fields.has("isMain")) data.isMain = index === 0;
    if (fields.has("sortOrder")) data.sortOrder = index;
    if (fields.has("alt")) data.alt = detail.title;
    if (fields.has("title")) data.title = detail.title;

    try {
      const existing = await delegate.findFirst({
        where: {
          propertyId,
          OR: [
            fields.has("url") ? { url: publicUrl } : undefined,
            fields.has("sourceUrl") ? { sourceUrl: url } : undefined,
            fields.has("originalUrl") ? { originalUrl: url } : undefined,
          ].filter(Boolean),
        },
      });
      if (!existing) await delegate.create({ data });
    } catch (error) {
      console.warn("image save failed", url, error.message);
    }
  }
}

async function saveDocuments(propertyId, detail, localDir) {
  const documentModel = findDocumentModel();
  if (!documentModel) return;
  const delegate = prisma[delegateName(documentModel)];
  if (!delegate) return;
  const fields = fieldNames(documentModel);

  for (let index = 0; index < detail.documents.length; index += 1) {
    const doc = detail.documents[index];
    const ext = extensionFromUrl(doc.href, ".pdf");
    const localPath = path.join(localDir, "documents", String(index + 1).padStart(2, "0") + ext);
    const downloaded = await downloadFile(doc.href, localPath);
    const publicUrl = downloaded ? "/" + path.relative(path.join(process.cwd(), "public"), downloaded).replace(/\\/g, "/") : doc.href;

    const data = {};
    if (fields.has("propertyId")) data.propertyId = propertyId;
    if (fields.has("url")) data.url = publicUrl;
    if (fields.has("src")) data.src = publicUrl;
    if (fields.has("originalUrl")) data.originalUrl = doc.href;
    if (fields.has("sourceUrl")) data.sourceUrl = doc.href;
    if (fields.has("name")) data.name = doc.text || path.basename(localPath);
    if (fields.has("title")) data.title = doc.text || path.basename(localPath);
    if (fields.has("sortOrder")) data.sortOrder = index;

    try {
      const existing = await delegate.findFirst({
        where: {
          propertyId,
          OR: [
            fields.has("url") ? { url: publicUrl } : undefined,
            fields.has("sourceUrl") ? { sourceUrl: doc.href } : undefined,
            fields.has("originalUrl") ? { originalUrl: doc.href } : undefined,
          ].filter(Boolean),
        },
      });
      if (!existing) await delegate.create({ data });
    } catch (error) {
      console.warn("document save failed", doc.href, error.message);
    }
  }
}

async function upsertProperty(detail) {
  const data = buildPropertyData(detail);
  const existing = await findExistingProperty(detail);

  if (DRY_RUN || DISCOVERY_ONLY) {
    console.log(existing ? "[dry-run:update]" : "[dry-run:create]", detail.title, detail.sourceUrl);
    return existing || { id: "dry-run" };
  }

  let property;
  if (existing) {
    property = await prisma.property.update({ where: { id: existing.id }, data });
    console.log("[updated]", property.id, detail.title);
  } else {
    property = await prisma.property.create({ data });
    console.log("[created]", property.id, detail.title);
  }
  return property;
}

async function main() {
  ensureDir(IMPORT_ROOT);
  ensureDir(RAW_ROOT);
  ensureDir(DEBUG_ROOT);

  console.log("ZvgScout import");
  console.log("start url:", START_URL);
  console.log("pages:", MAX_PAGES);
  console.log("dry run:", DRY_RUN);
  console.log("discovery only:", DISCOVERY_ONLY);

  const browser = await chromium.launch({ headless: HEADLESS });
  const context = await browser.newContext({
    userAgent: USER_AGENT,
    viewport: { width: 1440, height: 1200 },
    locale: "de-DE",
  });

  const networkJsons = [];
  context.on("response", async (response) => {
    const url = response.url();
    const ct = response.headers()["content-type"] || "";
    if (!/json|text|javascript/i.test(ct) && !/_next|api|trpc|graphql|zwangsversteiger/i.test(url)) return;
    try {
      const text = await response.text();
      if (/Aktenzeichen|Verkehrswert|zwangsversteiger|property|latitude|longitude|amtsgericht/i.test(text)) {
        networkJsons.push({ url, contentType: ct, text: text.slice(0, 500000) });
      }
    } catch {}
  });

  const page = await context.newPage();
  const detailLinks = new Set();
  const results = [];

  try {
    for (let pageNo = 1; pageNo <= MAX_PAGES; pageNo += 1) {
      const url = pageUrl(START_URL, pageNo);
      console.log("[list]", url);

      try {
        const beforeCount = networkJsons.length;
        const links = await collectListLinks(page, url, networkJsons.slice(beforeCount), pageNo);
        links.forEach((link) => detailLinks.add(link));
        console.log("  detail links found:", links.length);
      } catch (error) {
        console.error("[list failed]", url, error.message);
        results.push({ listUrl: url, error: error.message });
      }

      await sleep(SLOW_MS);
    }

    fs.writeFileSync(path.join(DEBUG_ROOT, "network-jsons.json"), JSON.stringify(networkJsons, null, 2), "utf8");
    fs.writeFileSync(path.join(DEBUG_ROOT, "detail-links.json"), JSON.stringify(Array.from(detailLinks), null, 2), "utf8");

    console.log("total unique detail links:", detailLinks.size);

    if (!detailLinks.size) {
      results.push({
        warning: "NO_DETAIL_LINKS_FOUND",
        debugDir: path.relative(process.cwd(), DEBUG_ROOT),
        hint: "Open var/imports/zvgscout/_debug/list-page-1.png and list-page-1.json to inspect actual DOM/API.",
      });
      return;
    }

    for (const link of detailLinks) {
      try {
        console.log("[detail]", link);
        const beforeCount = networkJsons.length;
        const detail = await extractDetail(page, link, networkJsons.slice(beforeCount));

        const externalDir = path.join(IMPORT_ROOT, detail.externalId);
        const rawDir = path.join(RAW_ROOT, detail.externalId);
        ensureDir(externalDir);
        ensureDir(rawDir);

        fs.writeFileSync(path.join(rawDir, "raw.json"), JSON.stringify(detail, null, 2), "utf8");

        const property = await upsertProperty(detail);

        if (!DRY_RUN && !DISCOVERY_ONLY && property?.id) {
          await saveImages(property.id, detail, externalDir);
          await saveDocuments(property.id, detail, externalDir);
        }

        results.push({ sourceUrl: detail.sourceUrl, title: detail.title, id: property?.id });
        await sleep(SLOW_MS);
      } catch (error) {
        console.error("[detail failed]", link, error.message);
        results.push({ sourceUrl: link, error: error.message });
      }
    }
  } finally {
    fs.writeFileSync(path.join(RAW_ROOT, "import-summary.json"), JSON.stringify(results, null, 2), "utf8");
    await context.close();
    await browser.close();
    await prisma.$disconnect();
    console.log("summary:", path.join(RAW_ROOT, "import-summary.json"));
    console.log("debug:", DEBUG_ROOT);
  }

  console.log("done. processed:", results.length);
}

main().catch(async (error) => {
  console.error(error);
  ensureDir(RAW_ROOT);
  fs.writeFileSync(path.join(RAW_ROOT, "import-summary.json"), JSON.stringify([{ fatal: error.message, stack: error.stack }], null, 2), "utf8");
  await prisma.$disconnect();
  process.exit(1);
});
