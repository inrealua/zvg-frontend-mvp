#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require("node:fs");
const path = require("node:path");
const { PrismaClient, Prisma } = require("@prisma/client");

const prisma = new PrismaClient();

const IN_JSON =
  process.env.ZVGSCOUT_DATASET ||
  path.join(process.cwd(), "var", "imports", "zvgscout-har", "dataset.json");

const PUBLIC_ROOT = path.join(process.cwd(), "public");
const IMPORT_ROOT = path.join(PUBLIC_ROOT, "imports", "zvgscout");
const SUMMARY_OUT = path.join(process.cwd(), "var", "imports", "zvgscout-har", "import-summary.json");
const DRY_RUN = process.env.ZVGSCOUT_DRY_RUN === "1" || process.argv.includes("--dry-run");

function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function model(name) { return Prisma.dmmf.datamodel.models.find((m) => m.name === name); }
function fields(name) { return new Set((model(name)?.fields || []).map((f) => f.name)); }
function hasField(name, field) { return fields(name).has(field); }
function pick(name, data) {
  const f = fields(name);
  const out = {};
  for (const [k, v] of Object.entries(data)) if (f.has(k) && v !== undefined) out[k] = v;
  return out;
}
function delegateName(name) { return name.charAt(0).toLowerCase() + name.slice(1); }
function imageModel() { return ["PropertyImage", "Image", "PropertyPhoto", "Photo"].find(model) || null; }
function documentModel() { return ["PropertyDocument", "Document", "PropertyFile", "File"].find(model) || null; }
function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
function normalizeAz(value, fallback) {
  const raw = String(value || fallback || "").trim().toUpperCase().replace(/\s+/g, " ").replace(/([0-9])\s*K\s*([0-9])/i, "$1 K $2");
  return raw || "UNKNOWN";
}
async function download(url, target) {
  try {
    ensureDir(path.dirname(target));
    const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 ZVG-DE local importer" } });
    if (!response.ok) return null;
    fs.writeFileSync(target, Buffer.from(await response.arrayBuffer()));
    return target;
  } catch (e) {
    console.warn("download failed", url, e.message);
    return null;
  }
}
function ext(url, fallback) {
  try { return path.extname(new URL(url).pathname) || fallback; } catch { return fallback; }
}

function propertyData(item) {
  const auctionDate = parseDate(item.auctionDate);
  const normalizedAktenzeichen = normalizeAz(item.normalizedAktenzeichen || item.aktenzeichen, item.externalId);

  return pick("Property", {
    source: item.source || "zvgscout-har",
    sourceUrl: item.sourceUrl,
    externalId: item.externalId,
    importSource: item.source || "zvgscout-har",
    importUrl: item.sourceUrl,

    title: item.title || "Zwangsversteigerung",
    titleRu: item.title || "Zwangsversteigerung",
    titleDe: item.title || "Zwangsversteigerung",
    titleEn: item.title || "Zwangsversteigerung",
    headline: item.title || "Zwangsversteigerung",

    description: item.description || item.rawText || "",
    descriptionRu: item.description || item.rawText || "",
    descriptionDe: item.description || item.rawText || "",
    descriptionEn: item.description || item.rawText || "",

    address: item.address,
    postalCode: item.postalCode,
    zip: item.postalCode,
    city: item.city,
    court: item.court,

    aktenzeichen: item.aktenzeichen,
    normalizedAktenzeichen,
    caseNumber: item.aktenzeichen,
    fileNumber: item.aktenzeichen,

    auctionDate,
    termin: auctionDate,

    marketValue: item.marketValue,
    trafficValue: item.marketValue,
    value: item.marketValue,

    livingArea: item.livingArea,
    wohnflaeche: item.livingArea,
    plotArea: item.plotArea,
    grundstuecksflaeche: item.plotArea,

    propertyTypeGroup: item.propertyTypeGroup || "SONSTIGE",
    typeGroup: item.propertyTypeGroup || "SONSTIGE",
    status: item.status || "ACTIVE",

    wertgrenzenWeggefallen: Boolean(item.wertgrenzenWeggefallen),
    wertgrenzenRemoved: Boolean(item.wertgrenzenWeggefallen),
    valueLimitsRemoved: Boolean(item.wertgrenzenWeggefallen),

    termNumber: item.termNumber || 1,
    terminNumber: item.termNumber || 1,
    terminNr: item.termNumber || 1,
    anzahlTermine: item.termNumber || 1,

    latitude: item.latitude,
    longitude: item.longitude,
    lat: item.latitude,
    lng: item.longitude,

    isActive: (item.status || "ACTIVE") !== "CANCELLED",
  });
}

async function findExisting(item) {
  const or = [];
  const normalizedAktenzeichen = normalizeAz(item.normalizedAktenzeichen || item.aktenzeichen, item.externalId);

  if (hasField("Property", "normalizedAktenzeichen")) or.push({ normalizedAktenzeichen });
  if (hasField("Property", "sourceUrl") && item.sourceUrl) or.push({ sourceUrl: item.sourceUrl });
  if (hasField("Property", "externalId") && item.externalId) or.push({ externalId: item.externalId });
  if (hasField("Property", "aktenzeichen") && item.aktenzeichen) or.push({ aktenzeichen: item.aktenzeichen });
  if (hasField("Property", "address") && hasField("Property", "auctionDate") && item.address && item.auctionDate) {
    or.push({ address: item.address, auctionDate: parseDate(item.auctionDate) });
  }

  if (!or.length) return null;
  return prisma.property.findFirst({ where: { OR: or } });
}

async function upsertProperty(item) {
  const existing = await findExisting(item);
  const data = propertyData(item);

  if (DRY_RUN) {
    console.log(existing ? "[dry:update]" : "[dry:create]", data.normalizedAktenzeichen, data.title);
    return existing || { id: "dry-run" };
  }

  if (existing) {
    const updated = await prisma.property.update({ where: { id: existing.id }, data });
    console.log("[updated]", updated.id, data.normalizedAktenzeichen, data.title);
    return updated;
  }

  const created = await prisma.property.create({ data });
  console.log("[created]", created.id, data.normalizedAktenzeichen, data.title);
  return created;
}

async function saveImages(propertyId, item) {
  const m = imageModel();
  if (!m || !propertyId || propertyId === "dry-run") return;
  const delegate = prisma[delegateName(m)];
  const f = fields(m);
  if (!delegate) return;

  const images = Array.isArray(item.images) ? item.images : [];
  const dir = path.join(IMPORT_ROOT, item.externalId || "unknown", "images");

  for (let i = 0; i < images.length; i += 1) {
    const url = typeof images[i] === "string" ? images[i] : images[i]?.url;
    if (!url) continue;
    const local = path.join(dir, String(i + 1).padStart(2, "0") + ext(url, ".jpg"));
    const saved = await download(url, local);
    const publicUrl = saved ? "/" + path.relative(PUBLIC_ROOT, saved).replace(/\\/g, "/") : url;

    const data = {};
    if (f.has("propertyId")) data.propertyId = propertyId;
    if (f.has("url")) data.url = publicUrl;
    if (f.has("src")) data.src = publicUrl;
    if (f.has("sourceUrl")) data.sourceUrl = url;
    if (f.has("originalUrl")) data.originalUrl = url;
    if (f.has("isMain")) data.isMain = i === 0;
    if (f.has("sortOrder")) data.sortOrder = i;
    if (f.has("alt")) data.alt = item.title || "Zwangsversteigerung";

    try {
      const existing = await delegate.findFirst({
        where: { propertyId, OR: [f.has("url") ? { url: publicUrl } : undefined, f.has("sourceUrl") ? { sourceUrl: url } : undefined, f.has("originalUrl") ? { originalUrl: url } : undefined].filter(Boolean) },
      });
      if (!existing) await delegate.create({ data });
    } catch (e) {
      console.warn("image save failed", e.message);
    }
  }
}

async function saveDocuments(propertyId, item) {
  const m = documentModel();
  if (!m || !propertyId || propertyId === "dry-run") return;
  const delegate = prisma[delegateName(m)];
  const f = fields(m);
  if (!delegate) return;

  const docs = Array.isArray(item.documents) ? item.documents : [];
  const dir = path.join(IMPORT_ROOT, item.externalId || "unknown", "documents");

  for (let i = 0; i < docs.length; i += 1) {
    const doc = docs[i];
    const url = typeof doc === "string" ? doc : doc?.href || doc?.url;
    if (!url) continue;
    const local = path.join(dir, String(i + 1).padStart(2, "0") + ext(url, ".pdf"));
    const saved = await download(url, local);
    const publicUrl = saved ? "/" + path.relative(PUBLIC_ROOT, saved).replace(/\\/g, "/") : url;

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
      const existing = await delegate.findFirst({
        where: { propertyId, OR: [f.has("url") ? { url: publicUrl } : undefined, f.has("sourceUrl") ? { sourceUrl: url } : undefined, f.has("originalUrl") ? { originalUrl: url } : undefined].filter(Boolean) },
      });
      if (!existing) await delegate.create({ data });
    } catch (e) {
      console.warn("document save failed", e.message);
    }
  }
}

async function main() {
  if (!fs.existsSync(IN_JSON)) {
    console.error("Dataset not found:", IN_JSON);
    process.exit(1);
  }

  ensureDir(path.dirname(SUMMARY_OUT));
  ensureDir(IMPORT_ROOT);

  const items = JSON.parse(fs.readFileSync(IN_JSON, "utf8"));
  const summary = [];

  for (const item of items) {
    try {
      const property = await upsertProperty(item);
      await saveImages(property.id, item);
      await saveDocuments(property.id, item);
      summary.push({ ok: true, id: property.id, normalizedAktenzeichen: normalizeAz(item.normalizedAktenzeichen || item.aktenzeichen, item.externalId), title: item.title });
    } catch (e) {
      summary.push({ ok: false, error: e.message, title: item.title, sourceUrl: item.sourceUrl });
    }
  }

  fs.writeFileSync(SUMMARY_OUT, JSON.stringify(summary, null, 2), "utf8");
  await prisma.$disconnect();
  console.log("done:", summary.length);
  console.log("summary:", SUMMARY_OUT);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
