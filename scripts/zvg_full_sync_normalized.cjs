#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("node:fs");
const path = require("node:path");
const { PrismaClient, Prisma } = require("@prisma/client");

const prisma = new PrismaClient();
const args = process.argv.slice(2);

function arg(name, fallback = "") {
  const p = args.find((x) => x === `--${name}` || x.startsWith(`--${name}=`));
  if (!p) return fallback;
  return p.includes("=") ? p.split("=").slice(1).join("=") : "1";
}
function flag(name) {
  return args.includes(`--${name}`);
}

const INPUT_ROOT = path.resolve(arg("input", "normalized"));
const DRY = flag("dry-run");
const DELETE_DEMO = flag("delete-demo");
const DELETE_NOT_IN_NORMALIZED = flag("delete-not-in-normalized");
const LIMIT = Number(arg("limit", "0")) || 0;

const PUBLIC_ROOT = path.join(process.cwd(), "public");
const ASSET_ROOT = path.join(PUBLIC_ROOT, "imports", "zvg-normalized");
const REPORT_PATH = path.join(process.cwd(), "zvg_full_sync_report.json");

const dmmfModels = Prisma.dmmf.datamodel.models;
function model(name) {
  return dmmfModels.find((m) => m.name === name) || null;
}
function delegate(name) {
  return name.charAt(0).toLowerCase() + name.slice(1);
}
function fields(modelName) {
  return new Set((model(modelName)?.fields || []).map((f) => f.name));
}
function fieldInfo(modelName, fieldName) {
  return (model(modelName)?.fields || []).find((f) => f.name === fieldName) || null;
}
function has(modelName, fieldName) {
  return fields(modelName).has(fieldName);
}
function firstModel(names) {
  return names.find((n) => model(n) && prisma[delegate(n)]) || null;
}
function pick(modelName, data) {
  const f = fields(modelName);
  const out = {};
  for (const [k, v] of Object.entries(data || {})) {
    if (f.has(k) && v !== undefined && v !== null) out[k] = v;
  }
  return out;
}
function requiredScalarDefaults(modelName, data) {
  const out = { ...data };
  for (const f of model(modelName)?.fields || []) {
    if (f.kind !== "scalar" && f.kind !== "enum") continue;
    if (!f.isRequired) continue;
    if (f.hasDefaultValue) continue;
    if (out[f.name] !== undefined && out[f.name] !== null) continue;

    if (f.name === "id") continue;
    if (f.name === "createdAt" || f.name === "updatedAt") { out[f.name] = new Date(); continue; }
    if (/city/i.test(f.name)) { out[f.name] = "Unbekannt"; continue; }
    if (/state|bundesland/i.test(f.name)) { out[f.name] = "Sachsen"; continue; }
    if (/country/i.test(f.name)) { out[f.name] = "DE"; continue; }
    if (/propertyType|type/i.test(f.name)) { out[f.name] = "SONSTIGE"; continue; }
    if (/status/i.test(f.name)) { out[f.name] = "ACTIVE"; continue; }
    if (/title|name|filename/i.test(f.name)) { out[f.name] = "Unbekannt"; continue; }
    if (/url|path|src/i.test(f.name)) { out[f.name] = ""; continue; }
    if (f.type === "String") out[f.name] = "";
    else if (f.type === "Boolean") out[f.name] = false;
    else if (["Int", "Float", "Decimal", "BigInt"].includes(f.type)) out[f.name] = 0;
    else if (f.type === "DateTime") out[f.name] = new Date();
  }
  return out;
}

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }
function readJson(p) { return JSON.parse(fs.readFileSync(p, "utf8")); }
function normPath(p) { return String(p || "").replace(/\\/g, "/").replace(/^\/+/, ""); }
function parseDate(v) { if (!v) return undefined; const d = new Date(String(v)); return Number.isNaN(d.getTime()) ? undefined : d; }
function statusOf(n) {
  const s = String(n?.status?.status || "ACTIVE").toUpperCase();
  if (n?.status?.isCancelled || s === "CANCELLED") return "CANCELLED";
  if (s === "ARCHIVED") return "ARCHIVED";
  return "ACTIVE";
}
function mimeType(filename, bucket) {
  const f = String(filename || "").toLowerCase();
  if (f.endsWith(".pdf")) return "application/pdf";
  if (f.endsWith(".svg")) return "image/svg+xml";
  if (f.endsWith(".png")) return "image/png";
  if (f.endsWith(".webp")) return "image/webp";
  if (f.endsWith(".gif")) return "image/gif";
  return bucket === "images" ? "image/jpeg" : "application/octet-stream";
}
function baseName(p, fallback) {
  return path.basename(normPath(p)) || fallback;
}
function resolveLocalFile(objectDir, rel) {
  const r = normPath(rel);
  const candidates = [
    path.join(objectDir, r),
    path.join(objectDir, r.replace(/\//g, path.sep)),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}
function copyAsset(objectDir, rel, externalId, bucket, fallback) {
  const src = resolveLocalFile(objectDir, rel);
  if (!src) return null;
  const filename = baseName(rel, fallback);
  const folder = path.join(ASSET_ROOT, externalId || "unknown", bucket);
  ensureDir(folder);
  const dst = path.join(folder, filename);
  if (!DRY) fs.copyFileSync(src, dst);
  return "/" + path.relative(PUBLIC_ROOT, dst).replace(/\\/g, "/");
}
function placeholderFor(n) {
  const g = String(n?.property?.propertyTypeGroup || n?.property?.propertyType || "").toUpperCase();
  if (g.includes("WOHNUNG")) return "/placeholders/apartment.svg";
  if (g.includes("GRUND") || g.includes("LAND")) return "/placeholders/land.svg";
  if (g.includes("GEWERBE")) return "/placeholders/commercial.svg";
  if (g.includes("GARAGE")) return "/placeholders/garage.svg";
  if (g.includes("HAUS") || g.includes("WOHNHAEUSER") || g.includes("WOHNHÄUSER")) return "/placeholders/house.svg";
  return "/placeholders/other.svg";
}
function courtWebsite(detail) {
  const links = [...(detail?.external_links || []), ...(detail?.attachments || [])];
  const hit = links.find((x) => /gericht|justiz/i.test(`${x.label || ""} ${x.title || ""} ${x.url || ""}`));
  return hit?.url || undefined;
}
function normalizedFiles(root) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root)
    .filter((x) => !x.startsWith("_"))
    .map((x) => path.join(root, x, "normalized.json"))
    .filter((p) => fs.existsSync(p))
    .sort();
}

function addWhere(or, field, value) {
  if (value !== undefined && value !== null && value !== "" && has("Property", field)) or.push({ [field]: value });
}
async function findExisting(n) {
  const or = [];
  addWhere(or, "externalId", n.source?.externalId);
  addWhere(or, "sourceExternalId", n.source?.externalId);
  addWhere(or, "sourceId", n.source?.externalId);
  addWhere(or, "sourceUrl", n.source?.detailUrl);
  addWhere(or, "detailUrl", n.source?.detailUrl);
  addWhere(or, "normalizedAktenzeichen", n.case?.normalizedAktenzeichen);
  addWhere(or, "aktenzeichen", n.case?.aktenzeichen);
  addWhere(or, "caseNumber", n.case?.aktenzeichen);

  const pair = {};
  if (has("Property", "title") && n.property?.title) pair.title = n.property.title;
  if (has("Property", "address") && n.address?.fullAddress) pair.address = n.address.fullAddress;
  if (Object.keys(pair).length === 2) or.push(pair);

  if (!or.length) return null;
  return prisma.property.findFirst({ where: { OR: or } });
}

function propertyData(n, detail) {
  const s = n.source || {}, c = n.case || {}, st = statusOf(n);
  const a = n.auction || {}, p = n.property || {}, ad = n.address || {}, g = n.geo || {};
  const v = n.values || {}, ar = n.areas || {}, b = n.building || {}, lr = n.landRegister || {};
  const title = p.title || c.normalizedAktenzeichen || "Zwangsversteigerung";

  let data = pick("Property", {
    source: s.portal,
    sourcePortal: s.portal,
    sourceUrl: s.detailUrl,
    detailUrl: s.detailUrl,
    importUrl: s.detailUrl,
    externalId: s.externalId,
    sourceExternalId: s.externalId,
    sourceId: s.externalId,

    aktenzeichen: c.aktenzeichen,
    normalizedAktenzeichen: c.normalizedAktenzeichen,
    caseNumber: c.aktenzeichen,
    fileNumber: c.aktenzeichen,

    status: st,
    auctionStatus: st,
    terminStatus: st,
    isCancelled: st === "CANCELLED",
    cancelled: st === "CANCELLED",
    isActive: st === "ACTIVE",
    active: st === "ACTIVE",
    cancelledAt: st === "CANCELLED" ? new Date() : undefined,

    title,
    shortTitle: p.shortTitle || title,
    description: p.description || p.conditionSummary || "",
    conditionSummary: p.conditionSummary,
    propertyTypeGroup: p.propertyTypeGroup || "SONSTIGE",
    propertyType: p.propertyType || p.propertyTypeGroup || "SONSTIGE",
    type: p.propertyType || p.propertyTypeGroup || "SONSTIGE",
    propertyTypeOriginal: p.propertyTypeOriginal,
    usage: p.usage || "UNKNOWN",
    usageOriginal: p.usageOriginal,
    denkmalStatus: p.denkmalStatus,

    address: ad.fullAddress,
    fullAddress: ad.fullAddress,
    street: ad.street,
    houseNumber: ad.houseNumber,
    postalCode: ad.postalCode,
    zip: ad.postalCode,
    city: ad.city || "Unbekannt",
    state: ad.state || "Sachsen",
    country: ad.country || "DE",

    latitude: g.latitude,
    longitude: g.longitude,
    lat: g.latitude,
    lng: g.longitude,

    marketValue: v.marketValue,
    value: v.marketValue,
    trafficValue: v.marketValue,
    currency: v.currency || "EUR",
    plotArea: ar.plotArea,
    livingArea: ar.livingArea,
    usableArea: ar.usableArea,
    totalArea: ar.totalArea,
    grossFloorArea: ar.grossFloorArea,

    auctionDate: parseDate(a.dateTime),
    auctionDateTime: parseDate(a.dateTime),
    termin: parseDate(a.dateTime),
    auctionType: a.auctionType,
    auctionLocation: a.locationOriginal,
    locationOriginal: a.locationOriginal,
    room: a.room,
    auctionRoom: a.room,
    termNumber: a.termNumber,
    terminNumber: a.termNumber,
    wertgrenzenStatus: a.wertgrenzenStatus,
    wertgrenzenWeggefallen: a.wertgrenzenStatus === "REMOVED",

    court: a.courtName,
    courtName: a.courtName,
    courtAddress: a.courtAddress,
    courtWebsite: courtWebsite(detail),

    constructionYear: b.constructionYear,
    baujahr: b.constructionYear,
    basement: b.basement,
    floors: b.floors,
    outbuildings: b.outbuildings,
    outbuildingsDescription: b.outbuildingsDescription,

    grundbuchCourt: lr.grundbuchCourt,
    grundbuchamt: lr.grundbuchCourt,
    gemarkung: lr.gemarkung,
    flurstueck: lr.flurstueck,
    blatt: lr.blatt,

    normalizedJson: JSON.stringify(n),
    rawJson: JSON.stringify(n),
    updatedAt: new Date(),
  });

  return requiredScalarDefaults("Property", data);
}

async function logStatusChange(propertyId, before, after, n) {
  if (!propertyId || before === after) return;
  const hist = firstModel(["PropertyStatusHistory", "PropertyStatusLog", "StatusHistory", "PropertyChangeLog", "PropertyHistory"]);
  if (!hist) return;
  const data = requiredScalarDefaults(hist, pick(hist, {
    propertyId,
    oldStatus: before,
    previousStatus: before,
    newStatus: after,
    status: after,
    sourceUrl: n.source?.detailUrl,
    externalId: n.source?.externalId,
    aktenzeichen: n.case?.aktenzeichen,
    changedAt: new Date(),
    detectedAt: new Date(),
    rawJson: JSON.stringify({ status: n.status, auction: n.auction, source: n.source }),
  }));
  if (!DRY) await prisma[delegate(hist)].create({ data }).catch((e) => console.warn("[history warn]", e.message));
}

function mediaData(modelName, propertyId, item, n, url, bucket) {
  const filename = item.sourceFile || baseName(item.localPath, bucket === "images" ? "image.jpg" : "document.pdf");
  const data = pick(modelName, {
    propertyId,
    url,
    src: url,
    path: url,
    fileUrl: url,
    imageUrl: url,
    localPath: url,

    filename,
    fileName: filename,
    originalName: filename,
    originalFilename: filename,
    name: item.title || item.caption || filename,
    title: item.title || item.caption || filename,

    mimeType: mimeType(filename, bucket),
    contentType: mimeType(filename, bucket),

    type: item.type || (bucket === "images" ? "IMAGE" : "OTHER"),
    caption: item.caption,
    alt: item.caption || n.property?.title,
    isMain: !!item.isMain,
    main: !!item.isMain,
    sortOrder: item.sortOrder || 0,
    position: item.sortOrder || 0,
    sha1: item.sha1,
    hash: item.sha1,
  });
  return requiredScalarDefaults(modelName, data);
}
async function upsertMedia(modelName, propertyId, items, n, objectDir, bucket) {
  if (!modelName) return { model: null, count: 0, skipped: true };
  const del = prisma[delegate(modelName)], f = fields(modelName);
  let count = 0, missing = 0;
  for (const item of items || []) {
    const url = copyAsset(objectDir, item.localPath, n.source?.externalId, bucket, bucket === "images" ? "image.jpg" : "document.pdf");
    if (!url) { missing++; continue; }
    const data = mediaData(modelName, propertyId, item, n, url, bucket);
    const or = [];
    if (f.has("url")) or.push({ url });
    if (f.has("src")) or.push({ src: url });
    if (f.has("path")) or.push({ path: url });
    if (f.has("filename") && data.filename) or.push({ filename: data.filename });
    if (item.sha1 && f.has("sha1")) or.push({ sha1: item.sha1 });
    if (item.sha1 && f.has("hash")) or.push({ hash: item.sha1 });
    const where = { propertyId };
    if (or.length) where.OR = or;

    if (!DRY) {
      const existing = await del.findFirst({ where });
      if (existing) await del.update({ where: { id: existing.id }, data });
      else await del.create({ data });
    }
    count++;
  }
  return { model: modelName, count, missing };
}
async function ensurePlaceholder(modelName, propertyId, n) {
  if (!modelName) return false;
  const del = prisma[delegate(modelName)];
  const existing = await del.count({ where: { propertyId } });
  if (existing > 0) return false;

  const url = placeholderFor(n);
  const filename = url.split("/").pop();
  const item = { sourceFile: filename, localPath: url, title: "Placeholder", caption: "Placeholder", type: "PLACEHOLDER", isMain: true, sortOrder: 0 };
  const data = requiredScalarDefaults(modelName, pick(modelName, {
    propertyId,
    url,
    src: url,
    path: url,
    fileUrl: url,
    imageUrl: url,
    localPath: url,
    filename,
    fileName: filename,
    originalName: filename,
    name: "Placeholder",
    title: "Placeholder",
    mimeType: "image/svg+xml",
    contentType: "image/svg+xml",
    type: "PLACEHOLDER",
    caption: "Placeholder",
    alt: n.property?.title || "Property",
    isMain: true,
    main: true,
    sortOrder: 0,
    position: 0,
  }));
  if (!DRY) await del.create({ data });
  return true;
}

async function deleteDemo(normalizedKeys) {
  if (!DELETE_DEMO && !DELETE_NOT_IN_NORMALIZED) return { checked: 0, deleted: 0 };
  const select = { id: true };
  for (const f of ["title", "address", "aktenzeichen", "normalizedAktenzeichen", "sourceUrl", "detailUrl", "externalId", "sourceExternalId", "sourcePortal"]) {
    if (has("Property", f)) select[f] = true;
  }
  const rows = await prisma.property.findMany({ select });
  let deleted = 0, checked = rows.length;
  const knownDemo = [
    "Einfamilienhaus mit Grundstück in Chemnitz",
    "Doppelhaushälfte in Wohnlage in Dresden",
    "Mehrfamilienhaus mit Sanierungsbedarf in Leipzig",
    "Eigentumswohnung im Mehrfamilienhaus in Zwickau",
    "Garage / Stellplatz in Berlin",
    "Einfamilienhaus mit Grundstück in Erfurt",
    "Einfamilienhaus in Chemnitz",
    "Doppelhaushälfte in Dresden",
  ];
  for (const r of rows) {
    const key = r.sourceUrl || r.detailUrl || r.externalId || r.sourceExternalId || r.normalizedAktenzeichen || r.aktenzeichen || `${r.title}|${r.address}`;
    const isKnownDemo = knownDemo.includes(r.title) || String(r.externalId || r.sourceExternalId || "").match(/^(seed|demo|test)_/);
    const notInNormalized = DELETE_NOT_IN_NORMALIZED && key && !normalizedKeys.has(key);
    if (!isKnownDemo && !notInNormalized) continue;
    if (!DRY) {
      for (const m of ["Favorite", "PropertyImage", "Image", "PropertyPhoto", "Photo", "PropertyDocument", "Document", "PropertyFile", "File"]) {
        if (model(m) && prisma[delegate(m)] && has(m, "propertyId")) {
          await prisma[delegate(m)].deleteMany({ where: { propertyId: r.id } }).catch(() => {});
        }
      }
      await prisma.property.delete({ where: { id: r.id } }).catch(() => prisma.property.deleteMany({ where: { id: r.id } }));
    }
    deleted++;
    console.log("[delete-demo]", r.id, r.title || r.aktenzeichen || key);
  }
  return { checked, deleted };
}

async function main() {
  const imgModel = firstModel(["PropertyImage", "Image", "PropertyPhoto", "Photo"]);
  const docModel = firstModel(["PropertyDocument", "Document", "PropertyFile", "File"]);
  ensureDir(ASSET_ROOT);

  const filesAll = normalizedFiles(INPUT_ROOT);
  const files = LIMIT ? filesAll.slice(0, LIMIT) : filesAll;
  console.log("[sync] files:", files.length, "dry:", DRY, "image:", imgModel, "document:", docModel);

  const normalizedKeys = new Set();
  const report = { at: new Date().toISOString(), dryRun: DRY, total: files.length, created: 0, updated: 0, failed: 0, statusChanged: 0, placeholders: 0, items: [] };

  for (const file of files) {
    try {
      const objectDir = path.dirname(file);
      const n = readJson(file);
      const detailPath = path.join(objectDir, "detail.json");
      const detail = fs.existsSync(detailPath) ? readJson(detailPath) : {};

      const k1 = n.source?.detailUrl;
      const k2 = n.source?.externalId;
      const k3 = n.case?.normalizedAktenzeichen || n.case?.aktenzeichen;
      const k4 = `${n.property?.title}|${n.address?.fullAddress}`;
      for (const k of [k1, k2, k3, k4]) if (k) normalizedKeys.add(k);

      const before = await findExisting(n);
      const beforeStatus = before ? String(before.status || before.auctionStatus || before.terminStatus || (before.isCancelled ? "CANCELLED" : "UNKNOWN")).toUpperCase() : null;
      const afterStatus = statusOf(n);
      let id, action;
      const data = propertyData(n, detail);

      if (before) {
        id = before.id;
        action = "update";
        if (!DRY) await prisma.property.update({ where: { id }, data });
        if (beforeStatus && beforeStatus !== afterStatus) {
          report.statusChanged++;
          await logStatusChange(id, beforeStatus, afterStatus, n);
        }
      } else {
        action = "create";
        if (!DRY) {
          id = (await prisma.property.create({ data, select: { id: true } })).id;
        } else {
          id = "dry-created";
        }
      }

      const images = await upsertMedia(imgModel, id, n.images || [], n, objectDir, "images");
      const documents = await upsertMedia(docModel, id, n.documents || [], n, objectDir, "documents");
      const placeholder = await ensurePlaceholder(imgModel, id, n);
      if (placeholder) report.placeholders++;

      if (action === "create") report.created++; else report.updated++;
      report.items.push({ ok: true, action, id, aktenzeichen: n.case?.aktenzeichen, title: n.property?.title, statusBefore: beforeStatus, statusAfter: afterStatus, images, documents, placeholder });
      console.log(`[${action}]`, n.case?.aktenzeichen, n.property?.title, "img:", images.count, "doc:", documents.count, "ph:", placeholder);
    } catch (e) {
      report.failed++;
      report.items.push({ ok: false, file, error: e.message });
      console.error("[failed]", file, e.message);
    }
  }

  report.demoCleanup = await deleteDemo(normalizedKeys);
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
  console.log("[report]", REPORT_PATH);
}

main().finally(async () => prisma.$disconnect());
