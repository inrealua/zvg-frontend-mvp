const fs = require('node:fs');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const root = process.cwd();
const normalizedRoot = path.resolve(process.argv.find(a => a.startsWith('--normalized='))?.split('=')[1] || 'normalized');

function readJson(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } }
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) out.push(...walk(full));
    else if (item.isFile() && item.name === 'normalized.json') out.push(full);
  }
  return out;
}
function runtimeModel(name) {
  return prisma._runtimeDataModel?.models?.[name] || prisma._runtimeDataModel?.models?.[name[0].toLowerCase() + name.slice(1)];
}
function hasField(modelName, field) {
  const m = runtimeModel(modelName);
  return !!m?.fields?.some(f => f.name === field);
}
function propWhere(n) {
  const OR = [];
  const externalId = n.source?.externalId;
  if (externalId && hasField('Property', 'sourceExternalId')) OR.push({ sourceExternalId: externalId });
  if (externalId && hasField('Property', 'sourceId')) OR.push({ sourceId: externalId });
  if (n.case?.aktenzeichen && n.auction?.courtName) OR.push({ aktenzeichen: n.case.aktenzeichen, court: n.auction.courtName });
  if (n.case?.aktenzeichenShort && n.auction?.courtName) OR.push({ aktenzeichen: n.case.aktenzeichenShort, court: n.auction.courtName });
  if (n.address?.fullAddress && n.property?.title) OR.push({ title: n.property.title, address: n.address.fullAddress });
  return OR.length ? { OR } : null;
}
function localMaterial(n) {
  const imgs = (n.images || []).map(x => x.sha1 || x.localPath || x.url).filter(Boolean).sort();
  const docs = (n.documents || []).map(x => x.sha1 || x.localPath || x.url).filter(Boolean).sort();
  return { images: imgs, documents: docs, imageCount: imgs.length, documentCount: docs.length };
}
async function dbMaterial(propertyId) {
  const result = { images: [], documents: [], imageCount: 0, documentCount: 0 };
  if (prisma.propertyImage) {
    const rows = await prisma.propertyImage.findMany({ where: { propertyId }, select: { sha1: hasField('PropertyImage','sha1'), url: true } });
    result.images = rows.map(r => r.sha1 || r.url).filter(Boolean).sort();
    result.imageCount = rows.length;
  }
  if (prisma.propertyDocument) {
    const rows = await prisma.propertyDocument.findMany({ where: { propertyId }, select: { sha1: hasField('PropertyDocument','sha1'), url: true } });
    result.documents = rows.map(r => r.sha1 || r.url).filter(Boolean).sort();
    result.documentCount = rows.length;
  }
  return result;
}
(async () => {
  const files = walk(normalizedRoot);
  const changed = [];
  const same = [];
  const missing = [];
  for (const file of files) {
    const n = readJson(file);
    if (!n) continue;
    const where = propWhere(n);
    const rel = path.relative(normalizedRoot, file);
    if (!where) { changed.push({ file: rel, reason: 'no-match-keys' }); continue; }
    const p = await prisma.property.findFirst({ where, select: { id: true, updatedAt: true } });
    if (!p) { missing.push({ file: rel, externalId: n.source?.externalId, az: n.case?.aktenzeichen, court: n.auction?.courtName }); continue; }
    const local = localMaterial(n);
    const db = await dbMaterial(p.id);
    const needs = local.imageCount > db.imageCount || local.documentCount > db.documentCount;
    if (needs) changed.push({ file: rel, propertyId: p.id, reason: 'local-has-more-materials', local, db });
    else same.push({ file: rel, propertyId: p.id, local, db });
  }
  const report = { at: new Date().toISOString(), normalizedRoot, total: files.length, missingCount: missing.length, changedCount: changed.length, sameCount: same.length, missing, changed, same };
  fs.writeFileSync(path.join(root, 'stage142_import_delta_report.json'), JSON.stringify(report, null, 2));
  console.log('[stage142 import delta]');
  console.log('total:', report.total, 'missing:', report.missingCount, 'changed:', report.changedCount, 'same:', report.sameCount);
  console.log('report: stage142_import_delta_report.json');
})().catch(e => { console.error(e); process.exit(1); }).finally(async () => prisma.$disconnect());
