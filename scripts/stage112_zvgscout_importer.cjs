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
 * Stage 112 — ZvgScout importer.
 *
 * Adds a robust importer that:
 * - crawls list pages from zvgscout.com;
 * - opens detail pages;
 * - extracts core data, images and documents;
 * - downloads files to public/imports/zvgscout/<externalId>/;
 * - upserts properties without duplicates;
 * - creates image/document rows when corresponding Prisma models exist;
 * - writes raw JSON snapshots for audit/debug.
 *
 * It is intentionally schema-tolerant: it inspects Prisma DMMF and only writes
 * fields that exist in your current schema.
 */

/* -------------------------------------------------------------------------- */
/* 1. Importer                                                                 */
/* -------------------------------------------------------------------------- */

write("scripts/import_zvgscout.cjs", `#!/usr/bin/env node
/* eslint-disable no-console */

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const { PrismaClient, Prisma } = require("@prisma/client");

let chromium;
try {
  ({ chromium } = require("playwright"));
} catch (error) {
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

const MAX_PAGES = Number(process.env.ZVGSCOUT_MAX_PAGES || process.argv.find((arg) => arg.startsWith("--pages="))?.split("=")[1] || 2);
const HEADLESS = process.env.ZVGSCOUT_HEADLESS !== "0";
const DRY_RUN = process.env.ZVGSCOUT_DRY_RUN === "1" || process.argv.includes("--dry-run");
const SLOW_MS = Number(process.env.ZVGSCOUT_SLOW_MS || 600);
const IMPORT_ROOT = path.join(process.cwd(), "public", "imports", "zvgscout");
const RAW_ROOT = path.join(process.cwd(), "var", "imports", "zvgscout");
const USER_AGENT =
  process.env.ZVGSCOUT_USER_AGENT ||
  "Mozilla/5.0 (compatible; ZVG-DE Importer; +https://zvg-de.com; respectful-rate-limit)";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function sha1(value) {
  return crypto.createHash("sha1").update(String(value)).digest("hex");
}

function absUrl(baseUrl, maybeUrl) {
  if (!maybeUrl) return null;

  try {
    return new URL(maybeUrl, baseUrl).toString();
  } catch {
    return null;
  }
}

function slug(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\\u0300-\\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 80);
}

function normalizeWhitespace(value) {
  return String(value || "").replace(/\\s+/g, " ").trim();
}

function parseMoney(value) {
  const text = String(value || "");
  const match = text.match(/(?:Verkehrswert|Wert|Gebot|Preis)?[^\\d]*(\\d{1,3}(?:[.\\s]\\d{3})*(?:,\\d{2})?|\\d+)(?:\\s*€|\\s*EUR)/i);
  if (!match) return null;

  const number = match[1].replace(/[.\\s]/g, "").replace(",", ".");
  const parsed = Number(number);

  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function parseNumberNear(labelRegex, text) {
  const source = String(text || "");
  const match = source.match(new RegExp(labelRegex.source + "[^\\\\d]{0,30}(\\\\d{1,5}(?:[,.]\\\\d{1,2})?)\\\\s*(?:m²|qm|m2)", "i"));
  if (!match) return null;

  const parsed = Number(match[1].replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseGermanDate(text) {
  const source = String(text || "");

  const numeric = source.match(/(\\d{1,2})\\.(\\d{1,2})\\.(\\d{4})(?:\\s*(?:um|,)?\\s*(\\d{1,2}):(\\d{2}))?/);
  if (numeric) {
    const [, dd, mm, yyyy, hh = "0", min = "0"] = numeric;
    const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min));
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  const months = {
    januar: 0,
    februar: 1,
    märz: 2,
    maerz: 2,
    april: 3,
    mai: 4,
    juni: 5,
    juli: 6,
    august: 7,
    september: 8,
    oktober: 9,
    november: 10,
    dezember: 11,
  };

  const long = source.match(/(\\d{1,2})\\.\\s*(Januar|Februar|März|Maerz|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\\s*(\\d{4})(?:\\s*(?:um|,)?\\s*(\\d{1,2}):(\\d{2}))?/i);
  if (long) {
    const [, dd, monthName, yyyy, hh = "0", min = "0"] = long;
    const date = new Date(Number(yyyy), months[monthName.toLowerCase()], Number(dd), Number(hh), Number(min));
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  return null;
}

function parseAktenzeichen(text) {
  const source = String(text || "");
  const patterns = [
    /Aktenzeichen\\s*[:\\-]?\\s*([0-9A-Za-zÄÖÜäöüß\\s.\\/\\-]{3,40})/i,
    /\\b(\\d{1,4}\\s*[Kk]\\s*\\d{1,5}\\/\\d{2,4})\\b/,
    /\\b(\\d{1,4}\\s*[Kk]\\s*\\d{1,5}\\s*-\\s*\\d{2,4})\\b/,
  ];

  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match?.[1]) return normalizeWhitespace(match[1]);
  }

  return null;
}

function parseCourt(text) {
  const source = String(text || "");
  const match = source.match(/Amtsgericht\\s+([A-ZÄÖÜ][A-Za-zÄÖÜäöüß\\-\\s]{2,50})/);
  return match ? normalizeWhitespace("Amtsgericht " + match[1]) : null;
}

function parsePostalCodeCity(text) {
  const source = String(text || "");
  const match = source.match(/\\b(\\d{5})\\s+([A-ZÄÖÜ][A-Za-zÄÖÜäöüß\\-\\s]{2,40})\\b/);
  if (!match) return { postalCode: null, city: null };

  return {
    postalCode: match[1],
    city: normalizeWhitespace(match[2]),
  };
}

function parseAddress(text) {
  const source = normalizeWhitespace(text);
  const match = source.match(/([A-ZÄÖÜ][A-Za-zÄÖÜäöüß0-9.'\\-\\s]+\\s+\\d+[a-zA-Z]?(?:\\s*,\\s*)?\\d{5}\\s+[A-ZÄÖÜ][A-Za-zÄÖÜäöüß\\-\\s]+)/);
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
  return /wertgrenzen\\s*(?:weggefallen|aufgehoben)|5\\/10|7\\/10|§\\s*85a|§\\s*74a|zweiter termin|2\\.\\s*termin|dritter termin|3\\.\\s*termin/.test(t);
}

function detectTermNumber(text, status, wertgrenzenRemoved, auctionDateIso) {
  const t = String(text || "").toLowerCase();

  let term = 1;
  if (/2\\.\\s*termin|zweiter termin|erneuter termin/.test(t)) term = Math.max(term, 2);
  if (/3\\.\\s*termin|dritter termin/.test(t)) term = Math.max(term, 3);

  if (wertgrenzenRemoved) term = Math.max(term, 2);

  const isArchived =
    status === "ARCHIVED" ||
    (auctionDateIso && new Date(auctionDateIso).getTime() < Date.now());

  if (wertgrenzenRemoved && isArchived) term = Math.max(term, 3);

  return term;
}

function extractCoordinatesFromText(text) {
  const source = String(text || "");

  const candidates = [
    /lat(?:itude)?["'\\s:=]+(-?\\d{1,2}\\.\\d+)[,\\s]+lng(?:itude)?["'\\s:=]+(-?\\d{1,3}\\.\\d+)/i,
    /"lat"\\s*:\\s*(-?\\d{1,2}\\.\\d+)\\s*,\\s*"lng"\\s*:\\s*(-?\\d{1,3}\\.\\d+)/i,
    /"latitude"\\s*:\\s*(-?\\d{1,2}\\.\\d+)\\s*,\\s*"longitude"\\s*:\\s*(-?\\d{1,3}\\.\\d+)/i,
  ];

  for (const pattern of candidates) {
    const match = source.match(pattern);
    if (match) {
      return {
        latitude: Number(match[1]),
        longitude: Number(match[2]),
      };
    }
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
    if (fields.has(key) && value !== undefined) {
      result[key] = value;
    }
  }

  return result;
}

function findImageModel() {
  const candidates = ["PropertyImage", "Image", "PropertyPhoto", "Photo"];

  for (const name of candidates) {
    if (model(name)) return name;
  }

  return null;
}

function findDocumentModel() {
  const candidates = ["PropertyDocument", "Document", "PropertyFile", "File"];

  for (const name of candidates) {
    if (model(name)) return name;
  }

  return null;
}

function relationDelegateName(modelName) {
  return modelName.charAt(0).toLowerCase() + modelName.slice(1);
}

async function downloadFile(url, targetPath) {
  if (!url) return null;
  ensureDir(path.dirname(targetPath));

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
      },
    });

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
    const pathname = new URL(url).pathname;
    const ext = path.extname(pathname).slice(0, 12);
    return ext || fallback;
  } catch {
    return fallback;
  }
}

async function collectListLinks(page, pageUrl) {
  await page.goto(pageUrl, { waitUntil: "networkidle", timeout: 60000 });
  await sleep(SLOW_MS);

  const data = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll("a[href]"));

    return anchors.map((a) => ({
      href: a.href,
      text: (a.innerText || a.textContent || "").replace(/\\s+/g, " ").trim(),
    }));
  });

  const links = data
    .map((item) => item.href)
    .filter(Boolean)
    .filter((href) => {
      try {
        const url = new URL(href);
        if (url.hostname !== "zvgscout.com" && url.hostname !== "www.zvgscout.com") return false;
        if (!/zwangsversteigerungen/i.test(url.pathname)) return false;
        if (/^\\/zwangsversteigerungen\\/?$/.test(url.pathname)) return false;
        if (/page=/.test(url.search)) return false;
        return true;
      } catch {
        return false;
      }
    });

  return Array.from(new Set(links));
}

async function extractDetail(page, detailUrl) {
  await page.goto(detailUrl, { waitUntil: "networkidle", timeout: 60000 });
  await sleep(SLOW_MS);

  const raw = await page.evaluate(() => {
    function clean(value) {
      return String(value || "").replace(/\\s+/g, " ").trim();
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
            const first = part.trim().split(/\\s+/)[0];
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
      .filter((item) => /\\.pdf(?:\\?|$)|download|gutachten|exposé|expose|dokument|termin|bekanntmachung/i.test(item.href + " " + item.text));

    const jsonScripts = Array.from(document.querySelectorAll("script"))
      .map((script) => script.textContent || "")
      .filter((text) => /Aktenzeichen|latitude|longitude|Verkehrswert|zwangsversteigerung/i.test(text))
      .slice(0, 20);

    return {
      title,
      bodyText,
      htmlSample: html.slice(0, 200000),
      images,
      docs,
      jsonScripts,
    };
  });

  const allText = [raw.title, raw.bodyText, raw.jsonScripts.join("\\n")].join("\\n");
  const coordinates = extractCoordinatesFromText(raw.htmlSample + "\\n" + raw.jsonScripts.join("\\n"));
  const pcCity = parsePostalCodeCity(allText);
  const auctionDate = parseGermanDate(allText);
  const status = detectStatus(allText);
  const wertgrenzenRemoved = detectWertgrenzenRemoved(allText);

  const detail = {
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
    livingArea: parseNumberNear(/Wohnfl(?:ä|ae)che|Wfl\\.?|Wohnfläche/, allText),
    plotArea: parseNumberNear(/Grundst(?:ü|ue)cksfl(?:ä|ae)che|Grundstück|Flurstück|Grundst\\.?/, allText),
    propertyTypeGroup: detectPropertyType(allText),
    status,
    wertgrenzenWeggefallen: wertgrenzenRemoved,
    termNumber: detectTermNumber(allText, status, wertgrenzenRemoved, auctionDate),
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    images: Array.from(new Set(raw.images)).slice(0, 30),
    documents: raw.docs
      .filter((doc, index, arr) => arr.findIndex((other) => other.href === doc.href) === index)
      .slice(0, 30),
    rawText: raw.bodyText,
  };

  return detail;
}

function buildPropertyData(detail) {
  const rawData = {
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
  };

  return pickExisting("Property", rawData);
}

async function findExistingProperty(detail) {
  const or = [];

  if (hasField("Property", "sourceUrl")) or.push({ sourceUrl: detail.sourceUrl });
  if (hasField("Property", "externalId")) or.push({ externalId: detail.externalId });
  if (hasField("Property", "importUrl")) or.push({ importUrl: detail.sourceUrl });
  if (hasField("Property", "aktenzeichen") && detail.caseNumber) or.push({ aktenzeichen: detail.caseNumber });
  if (hasField("Property", "caseNumber") && detail.caseNumber) or.push({ caseNumber: detail.caseNumber });

  if (detail.address && detail.auctionDate && hasField("Property", "address") && hasField("Property", "auctionDate")) {
    or.push({
      address: detail.address,
      auctionDate: new Date(detail.auctionDate),
    });
  }

  if (!or.length) return null;

  return prisma.property.findFirst({
    where: {
      OR: or,
    },
  });
}

async function saveImages(propertyId, detail, localDir) {
  const imageModel = findImageModel();
  if (!imageModel) return;

  const delegate = prisma[relationDelegateName(imageModel)];
  if (!delegate) return;

  const fields = fieldNames(imageModel);

  for (let index = 0; index < detail.images.length; index += 1) {
    const url = detail.images[index];
    const ext = extensionFromUrl(url, ".jpg");
    const localPath = path.join(localDir, "images", String(index + 1).padStart(2, "0") + ext);
    const downloaded = await downloadFile(url, localPath);
    const publicUrl = downloaded ? "/" + path.relative(path.join(process.cwd(), "public"), downloaded).replace(/\\\\/g, "/") : url;

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
      if (fields.has("propertyId") && (fields.has("url") || fields.has("src"))) {
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
      }
    } catch (error) {
      console.warn("image save failed", url, error.message);
    }
  }
}

async function saveDocuments(propertyId, detail, localDir) {
  const documentModel = findDocumentModel();
  if (!documentModel) return;

  const delegate = prisma[relationDelegateName(documentModel)];
  if (!delegate) return;

  const fields = fieldNames(documentModel);

  for (let index = 0; index < detail.documents.length; index += 1) {
    const doc = detail.documents[index];
    const ext = extensionFromUrl(doc.href, ".pdf");
    const localPath = path.join(localDir, "documents", String(index + 1).padStart(2, "0") + ext);
    const downloaded = await downloadFile(doc.href, localPath);
    const publicUrl = downloaded ? "/" + path.relative(path.join(process.cwd(), "public"), downloaded).replace(/\\\\/g, "/") : doc.href;

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
      if (fields.has("propertyId") && (fields.has("url") || fields.has("src"))) {
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
      }
    } catch (error) {
      console.warn("document save failed", doc.href, error.message);
    }
  }
}

async function upsertProperty(detail) {
  const data = buildPropertyData(detail);
  const existing = await findExistingProperty(detail);

  if (DRY_RUN) {
    console.log(existing ? "[dry-run:update]" : "[dry-run:create]", detail.title, detail.sourceUrl);
    return existing || { id: "dry-run" };
  }

  let property;
  if (existing) {
    property = await prisma.property.update({
      where: {
        id: existing.id,
      },
      data,
    });
    console.log("[updated]", property.id, detail.title);
  } else {
    property = await prisma.property.create({
      data,
    });
    console.log("[created]", property.id, detail.title);
  }

  return property;
}

function pageUrl(base, pageNo) {
  const url = new URL(base);
  url.searchParams.set("page", String(pageNo));
  return url.toString();
}

async function main() {
  ensureDir(IMPORT_ROOT);
  ensureDir(RAW_ROOT);

  console.log("ZvgScout import");
  console.log("start url:", START_URL);
  console.log("pages:", MAX_PAGES);
  console.log("dry run:", DRY_RUN);

  const browser = await chromium.launch({
    headless: HEADLESS,
  });

  const context = await browser.newContext({
    userAgent: USER_AGENT,
    viewport: {
      width: 1440,
      height: 1200,
    },
    locale: "de-DE",
  });

  const page = await context.newPage();

  const detailLinks = new Set();

  for (let pageNo = 1; pageNo <= MAX_PAGES; pageNo += 1) {
    const url = pageUrl(START_URL, pageNo);
    console.log("[list]", url);

    const links = await collectListLinks(page, url);
    links.forEach((link) => detailLinks.add(link));

    console.log("  detail links found:", links.length);

    await sleep(SLOW_MS);
  }

  console.log("total unique detail links:", detailLinks.size);

  const results = [];

  for (const link of detailLinks) {
    try {
      console.log("[detail]", link);
      const detail = await extractDetail(page, link);

      const externalDir = path.join(IMPORT_ROOT, detail.externalId);
      const rawDir = path.join(RAW_ROOT, detail.externalId);
      ensureDir(externalDir);
      ensureDir(rawDir);

      fs.writeFileSync(path.join(rawDir, "raw.json"), JSON.stringify(detail, null, 2), "utf8");

      const property = await upsertProperty(detail);

      if (!DRY_RUN && property?.id) {
        await saveImages(property.id, detail, externalDir);
        await saveDocuments(property.id, detail, externalDir);
      }

      results.push({
        sourceUrl: detail.sourceUrl,
        title: detail.title,
        id: property?.id,
      });

      await sleep(SLOW_MS);
    } catch (error) {
      console.error("[detail failed]", link, error);
      results.push({
        sourceUrl: link,
        error: error.message,
      });
    }
  }

  fs.writeFileSync(path.join(RAW_ROOT, "import-summary.json"), JSON.stringify(results, null, 2), "utf8");

  await context.close();
  await browser.close();
  await prisma.$disconnect();

  console.log("done. imported/processed:", results.length);
  console.log("raw summary:", path.join(RAW_ROOT, "import-summary.json"));
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
`);

/* -------------------------------------------------------------------------- */
/* 2. Package scripts / dependency                                             */
/* -------------------------------------------------------------------------- */

patch("package.json", (s) => {
  const pkg = JSON.parse(s);

  pkg.scripts = pkg.scripts || {};
  pkg.scripts["import:zvgscout"] = "node scripts/import_zvgscout.cjs";
  pkg.scripts["import:zvgscout:dry"] = "ZVGSCOUT_DRY_RUN=1 node scripts/import_zvgscout.cjs";

  pkg.devDependencies = pkg.devDependencies || {};
  pkg.dependencies = pkg.dependencies || {};

  if (!pkg.dependencies.playwright && !pkg.devDependencies.playwright) {
    pkg.devDependencies.playwright = "^1.49.0";
  }

  return JSON.stringify(pkg, null, 2) + "\n";
});

/* -------------------------------------------------------------------------- */
/* 3. README                                                                   */
/* -------------------------------------------------------------------------- */

write("docs/ZVGSCOUT_IMPORT.md", `# ZvgScout import

Importer:

\`\`\`txt
scripts/import_zvgscout.cjs
\`\`\`

## What it does

- opens ZvgScout list pages with Playwright;
- collects detail links;
- opens every detail page;
- extracts:
  - title;
  - address;
  - PLZ/city;
  - court;
  - Aktenzeichen;
  - auction date;
  - Verkehrswert;
  - living area;
  - plot area;
  - object type;
  - status;
  - Wertgrenzen;
  - term number;
  - coordinates if available;
  - images;
  - documents;
- downloads images/documents to:

\`\`\`txt
public/imports/zvgscout/<externalId>/
\`\`\`

- writes raw audit JSON to:

\`\`\`txt
var/imports/zvgscout/<externalId>/raw.json
var/imports/zvgscout/import-summary.json
\`\`\`

- imports to Prisma without duplicates:
  - sourceUrl / externalId if fields exist;
  - Aktenzeichen if field exists;
  - address + auctionDate fallback.

## Install

\`\`\`powershell
cd D:\\Projects\\zvg_frontend_mvp
npm install
npx playwright install chromium
\`\`\`

## Dry run

PowerShell:

\`\`\`powershell
$env:ZVGSCOUT_DRY_RUN="1"
$env:ZVGSCOUT_MAX_PAGES="1"
npm run import:zvgscout
\`\`\`

CMD:

\`\`\`cmd
set ZVGSCOUT_DRY_RUN=1
set ZVGSCOUT_MAX_PAGES=1
npm run import:zvgscout
\`\`\`

## Real import

PowerShell:

\`\`\`powershell
Remove-Item Env:ZVGSCOUT_DRY_RUN -ErrorAction SilentlyContinue
$env:ZVGSCOUT_MAX_PAGES="5"
npm run import:zvgscout
\`\`\`

Custom start URL:

\`\`\`powershell
$env:ZVGSCOUT_URL="https://zvgscout.com/zwangsversteigerungen?page=1&maplat=50.83871608853164&maplng=12.8785815480677&mapzoom=11.283512746895843"
$env:ZVGSCOUT_MAX_PAGES="3"
npm run import:zvgscout
\`\`\`

## Notes

The importer is schema-tolerant. It checks Prisma DMMF and writes only fields that exist in the current schema.

If you later add exact fields to Prisma, the importer will start filling them automatically if their names match:

\`\`\`txt
sourceUrl
externalId
aktenzeichen
caseNumber
auctionDate
marketValue
livingArea
plotArea
propertyTypeGroup
wertgrenzenWeggefallen
termNumber
latitude
longitude
\`\`\`
`);

console.log("Stage 112 completed.");
