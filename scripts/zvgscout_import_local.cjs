#!/usr/bin/env node
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
  return String(value || "").replace(/\s+/g, " ").trim();
}
function normalizeAktenzeichen(value) {
  return norm(value)
    .toUpperCase()
    .replace(/\s+/g, " ")
    .replace(/([0-9])\s*K\s*([0-9])/i, "$1 K $2")
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
  const n = Number(match[1].replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
function parseGermanDate(text) {
  const source = String(text || "");
  const m = source.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s*(?:um|,)?\s*(\d{1,2}):(\d{2}))?/);
  if (!m) return null;
  const [, dd, mm, yyyy, hh = "0", min = "0"] = m;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min));
  return Number.isNaN(d.getTime()) ? null : d;
}
function parseAktenzeichen(text) {
  const source = String(text || "");
  const patterns = [
    /Aktenzeichen\s*[:\-]?\s*([0-9A-Za-zÄÖÜäöüß\s.\/\-]{3,45})/i,
    /\b(\d{1,4}\s*[Kk]\s*\d{1,5}\/\d{2,4})\b/,
  ];
  for (const p of patterns) {
    const m = source.match(p);
    if (m?.[1]) return norm(m[1]);
  }
  return null;
}
function parseCourt(text) {
  const m = String(text || "").match(/Amtsgericht\s+([A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-\s]{2,50})/);
  return m ? norm("Amtsgericht " + m[1]) : null;
}
function parsePostalCodeCity(text) {
  const m = String(text || "").match(/\b(\d{5})\s+([A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-\s]{2,40})\b/);
  return m ? { postalCode: m[1], city: norm(m[2]) } : { postalCode: null, city: null };
}
function parseAddress(text) {
  const m = norm(text).match(/([A-ZÄÖÜ][A-Za-zÄÖÜäöüß0-9.'\-\s]+\s+\d+[a-zA-Z]?(?:\s*,\s*)?\d{5}\s+[A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-\s]+)/);
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
  return /wertgrenzen\s*(?:weggefallen|aufgehoben)|5\/10|7\/10|§\s*85a|§\s*74a|zweiter termin|2\.\s*termin|dritter termin|3\.\s*termin/i.test(text);
}
function termNumber(text, status, wg, auctionDate) {
  let n = 1;
  if (/2\.\s*termin|zweiter termin|erneuter termin/i.test(text)) n = Math.max(n, 2);
  if (/3\.\s*termin|dritter termin/i.test(text)) n = Math.max(n, 3);
  if (wg) n = Math.max(n, 2);
  if (wg && auctionDate && auctionDate.getTime() < Date.now()) n = Math.max(n, 3);
  return n;
}
function coords(text) {
  const source = String(text || "");
  const patterns = [
    /"lat"\s*:\s*(-?\d{1,2}\.\d+)\s*,\s*"lng"\s*:\s*(-?\d{1,3}\.\d+)/i,
    /"latitude"\s*:\s*(-?\d{1,2}\.\d+)\s*,\s*"longitude"\s*:\s*(-?\d{1,3}\.\d+)/i,
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
  const text = [record.title, record.rawText, JSON.stringify(record.raw || {})].join("\n");
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
    livingArea: parseNumberNear(/Wohnfl(?:ä|ae)che|Wfl\.?|Wohnfläche/, text),
    plotArea: parseNumberNear(/Grundst(?:ü|ue)cksfl(?:ä|ae)che|Grundstück|Flurstück|Grundst\.?/, text),
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
    const publicUrl = saved ? "/" + path.relative(path.join(process.cwd(), "public"), saved).replace(/\\/g, "/") : url;

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
    const publicUrl = saved ? "/" + path.relative(path.join(process.cwd(), "public"), saved).replace(/\\/g, "/") : url;

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

  const lines = fs.readFileSync(IN_JSONL, "utf8").split(/\r?\n/).filter(Boolean);
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
