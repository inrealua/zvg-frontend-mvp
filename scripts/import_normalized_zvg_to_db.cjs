#!/usr/bin/env node
/* eslint-disable no-console */
try { require("dotenv").config(); } catch (_) {}

const fs = require("node:fs");
const path = require("node:path");
const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = new PrismaClient();

const args = process.argv.slice(2);
const arg = (name, def = "") => {
  const p = args.find((x) => x === `--${name}` || x.startsWith(`--${name}=`));
  if (!p) return def;
  return p.includes("=") ? p.split("=").slice(1).join("=") : "1";
};

const INPUT_ROOT = path.resolve(arg("input", process.env.ZVG_NORMALIZED_ROOT || "normalized"));
const DRY_RUN = args.includes("--dry-run") || process.env.ZVG_DRY_RUN === "1";
const LIMIT = Number(arg("limit", "0")) || 0;
const PUBLIC_ROOT = path.join(process.cwd(), "public");
const PUBLIC_IMPORT_ROOT = path.join(PUBLIC_ROOT, "imports", "zvg-normalized");
const REPORT_PATH = path.join(INPUT_ROOT, "db_import_report.json");

function ensureDir(d) { fs.mkdirSync(d, { recursive: true }); }
function normPath(p) { return String(p || "").replace(/\\/g, "/"); }
function parseDate(v) { if (!v) return null; const d = new Date(String(v)); return Number.isNaN(d.getTime()) ? null : d; }
function money(v) { const n = Number(v); return Number.isFinite(n) ? n : null; }
function model(name) { return Prisma.dmmf.datamodel.models.find((m) => m.name === name) || null; }
function delegate(name) { return name.charAt(0).toLowerCase() + name.slice(1); }
function fieldSet(name) { return new Set((model(name)?.fields || []).map((f) => f.name)); }
function has(name, field) { return fieldSet(name).has(field); }
function pick(name, data) {
  const f = fieldSet(name), out = {};
  for (const [k, v] of Object.entries(data)) if (f.has(k) && v !== undefined) out[k] = v;
  return out;
}
function firstModel(names) { return names.find((n) => model(n) && prisma[delegate(n)]) || null; }

function nStatus(n) {
  const s = String(n?.status?.status || "ACTIVE").toUpperCase();
  if (n?.status?.isCancelled || s === "CANCELLED") return "CANCELLED";
  if (s === "ARCHIVED") return "ARCHIVED";
  return "ACTIVE";
}
function isCancelled(n) { return nStatus(n) === "CANCELLED"; }

function existingSelect() {
  const f = fieldSet("Property");
  const select = { id: true };
  for (const k of ["status","auctionStatus","terminStatus","isCancelled","cancelled","isActive","active","normalizedAktenzeichen","externalId","sourceUrl","detailUrl","title"]) {
    if (f.has(k)) select[k] = true;
  }
  return select;
}
function statusOf(row) {
  if (!row) return null;
  if (row.status) return String(row.status).toUpperCase();
  if (row.auctionStatus) return String(row.auctionStatus).toUpperCase();
  if (row.terminStatus) return String(row.terminStatus).toUpperCase();
  if (row.isCancelled || row.cancelled) return "CANCELLED";
  if (row.isActive === false || row.active === false) return "INACTIVE";
  return "UNKNOWN";
}

function propertyData(n) {
  const s = n.source || {}, c = n.case || {}, st = nStatus(n), cancel = st === "CANCELLED";
  const a = n.auction || {}, p = n.property || {}, ad = n.address || {}, g = n.geo || {};
  const v = n.values || {}, ar = n.areas || {}, b = n.building || {}, lr = n.landRegister || {};
  const title = p.title || c.normalizedAktenzeichen || "Zwangsversteigerung";
  const desc = p.description || p.conditionSummary || "";
  const data = {
    source: s.portal, sourcePortal: s.portal, sourceUrl: s.detailUrl, detailUrl: s.detailUrl,
    externalId: s.externalId, importSource: s.portal, importUrl: s.detailUrl,
    aktenzeichen: c.aktenzeichen, normalizedAktenzeichen: c.normalizedAktenzeichen,
    aktenzeichenShort: c.aktenzeichenShort, caseNumber: c.aktenzeichen, fileNumber: c.aktenzeichen,

    status: st, auctionStatus: st, terminStatus: st, statusOriginal: n?.status?.statusOriginal,
    isCancelled: cancel, cancelled: cancel, isActive: st === "ACTIVE", active: st === "ACTIVE",
    lastStatusCheckAt: new Date(), statusCheckedAt: new Date(),
    cancelledAt: cancel ? new Date() : null, statusChangedAt: new Date(),

    auctionDate: parseDate(a.dateTime), termin: parseDate(a.dateTime),
    auctionDateOriginal: a.dateOriginal, dateOriginal: a.dateOriginal,
    court: a.courtName, courtName: a.courtName, courtAddress: a.courtAddress,
    auctionRoom: a.room, room: a.room, auctionLocation: a.locationOriginal,
    locationOriginal: a.locationOriginal, auctionType: a.auctionType, artDerVersteigerung: a.auctionType,
    termNumber: a.termNumber, terminNumber: a.termNumber, terminNr: a.termNumber,
    anzahlTermine: a.termNumber, wertgrenzenStatus: a.wertgrenzenStatus,
    wertgrenzenWeggefallen: a.wertgrenzenStatus === "REMOVED",
    wertgrenzenRemoved: a.wertgrenzenStatus === "REMOVED",
    valueLimitsRemoved: a.wertgrenzenStatus === "REMOVED",

    title, titleDe: title, titleRu: title, titleEn: title, shortTitle: p.shortTitle || title,
    description: desc, descriptionDe: desc, descriptionRu: desc, descriptionEn: desc,
    conditionSummary: p.conditionSummary, propertyTypeGroup: p.propertyTypeGroup,
    typeGroup: p.propertyTypeGroup, propertyType: p.propertyType, type: p.propertyType,
    propertyTypeOriginal: p.propertyTypeOriginal, usage: p.usage, usageOriginal: p.usageOriginal,
    denkmalStatus: p.denkmalStatus,

    address: ad.fullAddress, fullAddress: ad.fullAddress, street: ad.street, houseNumber: ad.houseNumber,
    postalCode: ad.postalCode, zip: ad.postalCode, city: ad.city, state: ad.state, country: ad.country || "DE",

    latitude: g.latitude, longitude: g.longitude, lat: g.latitude, lng: g.longitude,
    geoSource: g.source, geocodeSource: g.source, geocodeQuery: g.query,
    geocodeDisplayName: g.displayName, geocodeConfidence: g.confidence,

    marketValue: money(v.marketValue), trafficValue: money(v.marketValue), value: money(v.marketValue),
    currency: v.currency || "EUR", securityDepositPercent: v.securityDepositPercent,
    securityDepositAmount: v.securityDepositAmount,

    plotArea: ar.plotArea, grundstuecksflaeche: ar.plotArea,
    livingArea: ar.livingArea, wohnflaeche: ar.livingArea,
    grossFloorArea: ar.grossFloorArea, usableArea: ar.usableArea, totalArea: ar.totalArea,

    constructionYear: b.constructionYear, baujahr: b.constructionYear,
    floors: b.floors, basement: b.basement, outbuildings: b.outbuildings,
    outbuildingsDescription: b.outbuildingsDescription,

    grundbuchCourt: lr.grundbuchCourt, grundbuchamt: lr.grundbuchCourt,
    grundbuchbezirk: lr.district, gemarkung: lr.gemarkung, flurstueck: lr.flurstueck, blatt: lr.blatt,

    normalizedJson: JSON.stringify(n), rawJson: JSON.stringify(n), updatedAt: new Date(),
  };
  return pick("Property", data);
}

async function findExisting(n) {
  const s = n.source || {}, c = n.case || {}, ad = n.address || {}, a = n.auction || {};
  const or = [];
  if (has("Property","externalId") && s.externalId) or.push({ externalId: s.externalId });
  if (has("Property","sourceUrl") && s.detailUrl) or.push({ sourceUrl: s.detailUrl });
  if (has("Property","detailUrl") && s.detailUrl) or.push({ detailUrl: s.detailUrl });
  if (has("Property","normalizedAktenzeichen") && c.normalizedAktenzeichen) or.push({ normalizedAktenzeichen: c.normalizedAktenzeichen });
  if (has("Property","aktenzeichen") && c.aktenzeichen) or.push({ aktenzeichen: c.aktenzeichen });
  const d = parseDate(a.dateTime);
  if (d && ad.fullAddress && has("Property","address") && has("Property","auctionDate")) or.push({ address: ad.fullAddress, auctionDate: d });
  if (d && ad.fullAddress && has("Property","fullAddress") && has("Property","auctionDate")) or.push({ fullAddress: ad.fullAddress, auctionDate: d });
  if (!or.length) return null;
  return prisma.property.findFirst({ where: { OR: or }, select: existingSelect() });
}

async function logStatusChange(propertyId, before, after, n) {
  if (!propertyId || before === after) return null;
  const historyModel = firstModel(["PropertyStatusHistory","PropertyStatusLog","StatusHistory","PropertyChangeLog","PropertyHistory"]);
  const dataBase = {
    propertyId, source: n?.source?.portal || "zvg-portal.de", sourceUrl: n?.source?.detailUrl,
    externalId: n?.source?.externalId, aktenzeichen: n?.case?.normalizedAktenzeichen,
    oldStatus: before, previousStatus: before, newStatus: after, status: after,
    changedAt: new Date(), detectedAt: new Date(), rawJson: JSON.stringify({ status: n.status, auction: n.auction, source: n.source })
  };
  if (historyModel && !DRY_RUN) {
    try { await prisma[delegate(historyModel)].create({ data: pick(historyModel, dataBase) }); } catch (e) { console.warn("[history]", e.message); }
  }
  return { model: historyModel, ...dataBase };
}

function copyToPublic(objectDir, localPath, externalId, bucket) {
  const rel = normPath(localPath);
  const src = path.join(objectDir, rel);
  if (!fs.existsSync(src)) return null;
  const dir = path.join(PUBLIC_IMPORT_ROOT, externalId || "unknown", bucket);
  ensureDir(dir);
  const dst = path.join(dir, path.basename(rel));
  if (!fs.existsSync(dst)) fs.copyFileSync(src, dst);
  return "/" + path.relative(PUBLIC_ROOT, dst).replace(/\\/g, "/");
}

async function upsertMedia(modelName, propertyId, items, n, objectDir, bucket) {
  if (!modelName || !propertyId || propertyId.startsWith("dry-")) return { model: modelName, count: 0 };
  const del = prisma[delegate(modelName)], f = fieldSet(modelName);
  let count = 0;
  for (const item of items || []) {
    const url = copyToPublic(objectDir, item.localPath, n?.source?.externalId, bucket);
    if (!url) continue;
    const isImage = bucket === "images";
    const data = pick(modelName, {
      propertyId, url, src: url, path: url, localPath: url,
      isMain: Boolean(item.isMain), main: Boolean(item.isMain),
      sortOrder: item.sortOrder || 0, position: item.sortOrder || 0,
      caption: item.caption, title: item.caption || item.title || n?.property?.title,
      alt: item.caption || n?.property?.title, name: item.title || item.type || "Dokument",
      type: item.type || "OTHER", sourceFile: item.sourceFile, sha1: item.sha1, hash: item.sha1,
    });
    if (DRY_RUN) { count++; continue; }
    const or = [];
    if (f.has("url")) or.push({ url });
    if (f.has("src")) or.push({ src: url });
    if (f.has("sha1") && item.sha1) or.push({ sha1: item.sha1 });
    if (f.has("hash") && item.sha1) or.push({ hash: item.sha1 });
    const where = { propertyId }; if (or.length) where.OR = or;
    const ex = await del.findFirst({ where });
    if (ex) await del.update({ where: { id: ex.id }, data });
    else await del.create({ data });
    count++;
  }
  return { model: modelName, count };
}


// STAGE124_IMPORT_STATE_FIX
// Fix: Prisma Property.state is required String, but normalized address.state can be null.
// For zvg-portal.de land_abk=sn and Saxony courts/addresses, infer "Sachsen".
// Also sanitize create/update data: remove null/undefined values where possible, but keep
// explicit status fields because CANCELLED must overwrite DB status.

function stage124InferState(n) {
  const existing = n?.address?.state;
  if (existing && String(existing).trim()) return existing;

  const blob = JSON.stringify({
    source: n?.source,
    auction: n?.auction,
    address: n?.address,
    geo: n?.geo,
  }).toLowerCase();

  if (
    blob.includes("land_abk=sn") ||
    blob.includes("sachsen") ||
    blob.includes("amtsgericht zwickau") ||
    blob.includes("amtsgericht bautzen") ||
    blob.includes("amtsgericht görlitz") ||
    blob.includes("amtsgericht goerlitz") ||
    /^0[1-9]\d{3}$/.test(String(n?.address?.postalCode || ""))
  ) {
    return "Sachsen";
  }

  return "Unbekannt";
}

function stage124SanitizeDataForPrisma(data) {
  const out = {};
  for (const [k, v] of Object.entries(data || {})) {
    if (v === undefined) continue;

    // Keep explicit null only for status timestamps where schema may allow it is risky.
    // In practice, non-nullable fields should not receive null.
    if (v === null) continue;

    out[k] = v;
  }
  return out;
}

const _propertyData_stage124 = propertyData;
propertyData = function stage124PropertyData(n) {
  if (!n.address) n.address = {};
  n.address.state = stage124InferState(n);

  const data = _propertyData_stage124(n);

  // Ensure required state is always present if Property.state exists.
  if (has("Property", "state") && (data.state === undefined || data.state === null || data.state === "")) {
    data.state = stage124InferState(n);
  }

  // Safety for country if required in schema.
  if (has("Property", "country") && (data.country === undefined || data.country === null || data.country === "")) {
    data.country = "DE";
  }

  return stage124SanitizeDataForPrisma(data);
};



// STAGE125_IMPORT_FILENAME_FIX
// Fix: media/document model has required filename:String.
// Previous importer created document with only propertyId + url.
// This patch wraps upsertMedia and guarantees filename/originalName/mimeType where fields exist.

function stage125FileNameFromItem(item, url, bucket) {
  if (item && item.sourceFile) return String(item.sourceFile);
  if (item && item.fileName) return String(item.fileName);
  if (item && item.localPath) return String(item.localPath).replace(/\\/g, "/").split("/").pop();
  if (url) return String(url).split("/").pop();
  return bucket === "images" ? "image.jpg" : "document.pdf";
}

function stage125MimeType(filename, bucket) {
  const f = String(filename || "").toLowerCase();
  if (f.endsWith(".pdf")) return "application/pdf";
  if (f.endsWith(".png")) return "image/png";
  if (f.endsWith(".webp")) return "image/webp";
  if (f.endsWith(".gif")) return "image/gif";
  if (f.endsWith(".jpg") || f.endsWith(".jpeg")) return "image/jpeg";
  return bucket === "images" ? "image/jpeg" : "application/octet-stream";
}

function stage125MediaData(modelName, propertyId, item, n, objectDir, bucket) {
  const url = copyToPublic(objectDir, item.localPath, n?.source?.externalId, bucket);
  if (!url) return null;

  const filename = stage125FileNameFromItem(item, url, bucket);
  const mimeType = stage125MimeType(filename, bucket);

  return pick(modelName, {
    propertyId,
    url,
    src: url,
    path: url,
    localPath: url,

    filename,
    fileName: filename,
    originalName: filename,
    originalFilename: filename,
    name: item.title || item.caption || filename,
    title: item.title || item.caption || filename,

    mimeType,
    contentType: mimeType,

    isMain: Boolean(item.isMain),
    main: Boolean(item.isMain),
    sortOrder: item.sortOrder || 0,
    position: item.sortOrder || 0,
    caption: item.caption,
    alt: item.caption || n?.property?.title,
    type: item.type || (bucket === "images" ? "IMAGE" : "OTHER"),
    sourceFile: item.sourceFile,
    sha1: item.sha1,
    hash: item.sha1,
  });
}

upsertMedia = async function stage125UpsertMedia(modelName, propertyId, items, n, objectDir, bucket) {
  if (!modelName || !propertyId || String(propertyId).startsWith("dry-")) return { model: modelName, count: 0 };
  const del = prisma[delegate(modelName)], f = fieldSet(modelName);
  let count = 0;

  for (const item of items || []) {
    const data = stage125MediaData(modelName, propertyId, item, n, objectDir, bucket);
    if (!data) continue;

    if (DRY_RUN) {
      count++;
      continue;
    }

    const or = [];
    if (f.has("url") && data.url) or.push({ url: data.url });
    if (f.has("src") && data.src) or.push({ src: data.src });
    if (f.has("filename") && data.filename) or.push({ filename: data.filename });
    if (f.has("fileName") && data.fileName) or.push({ fileName: data.fileName });
    if (f.has("sha1") && item.sha1) or.push({ sha1: item.sha1 });
    if (f.has("hash") && item.sha1) or.push({ hash: item.sha1 });

    const where = { propertyId };
    if (or.length) where.OR = or;

    const ex = await del.findFirst({ where });
    if (ex) await del.update({ where: { id: ex.id }, data });
    else await del.create({ data });

    count++;
  }

  return { model: modelName, count };
};


function findFiles(root) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root).filter((x) => !x.startsWith("_")).map((x) => path.join(root, x, "normalized.json")).filter(fs.existsSync).sort();
}

async function main() {
  if (!model("Property")) throw new Error("Prisma model Property was not found.");
  const filesAll = findFiles(INPUT_ROOT);
  const files = LIMIT > 0 ? filesAll.slice(0, LIMIT) : filesAll;
  const imgModel = firstModel(["PropertyImage","Image","PropertyPhoto","Photo"]);
  const docModel = firstModel(["PropertyDocument","Document","PropertyFile","File"]);
  ensureDir(PUBLIC_IMPORT_ROOT);
  const report = { startedAt: new Date().toISOString(), inputRoot: INPUT_ROOT, dryRun: DRY_RUN, total: files.length, created: 0, updated: 0, failed: 0, statusChanged: 0, cancelledImported: 0, items: [] };
  console.log("[input]", INPUT_ROOT, "[files]", files.length, "[dry-run]", DRY_RUN);
  for (const file of files) {
    const objectDir = path.dirname(file);
    try {
      const n = JSON.parse(fs.readFileSync(file, "utf8"));
      const before = await findExisting(n);
      const beforeStatus = statusOf(before);
      const afterStatus = nStatus(n);
      let id, action;
      if (before) {
        action = "update"; id = before.id;
        if (!DRY_RUN) await prisma.property.update({ where: { id }, data: propertyData(n) });
        await logStatusChange(id, beforeStatus, afterStatus, n);
      } else {
        action = "create";
        if (DRY_RUN) id = "dry-created";
        else id = (await prisma.property.create({ data: propertyData(n), select: { id: true } })).id;
      }
      const images = await upsertMedia(imgModel, id, n.images, n, objectDir, "images");
      const documents = await upsertMedia(docModel, id, n.documents, n, objectDir, "documents");
      if (action === "create") report.created++; else report.updated++;
      if (before && beforeStatus !== afterStatus) report.statusChanged++;
      if (afterStatus === "CANCELLED") report.cancelledImported++;
      const item = { ok: true, action, propertyId: id, externalId: n?.source?.externalId, aktenzeichen: n?.case?.normalizedAktenzeichen, title: n?.property?.title, statusBefore: beforeStatus, statusAfter: afterStatus, statusChanged: Boolean(before && beforeStatus !== afterStatus), images, documents };
      report.items.push(item);
      console.log(`[${action}]`, item.aktenzeichen, beforeStatus ? `${beforeStatus}->${afterStatus}` : afterStatus, item.title);
    } catch (e) {
      report.failed++; report.items.push({ ok: false, file, error: e.message }); console.error("[failed]", file, e.message);
    }
  }
  report.finishedAt = new Date().toISOString();
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
  console.log("[report]", REPORT_PATH);
  await prisma.$disconnect();
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
