#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("node:fs");
const path = require("node:path");
const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = new PrismaClient();

const args = process.argv.slice(2);
const arg = (n, d="") => {
  const p = args.find(x => x === `--${n}` || x.startsWith(`--${n}=`));
  return !p ? d : p.includes("=") ? p.split("=").slice(1).join("=") : "1";
};
const flag = (n) => args.includes(`--${n}`);

const INPUT_ROOT = path.resolve(arg("input", "normalized"));
const DRY_RUN = flag("dry-run");
const LIMIT = Number(arg("limit", "0")) || 0;
const PUBLIC_ROOT = path.join(process.cwd(), "public");
const IMPORT_ROOT = path.join(PUBLIC_ROOT, "imports", "zvg-normalized");
const REPORT = path.join(process.cwd(), "repair_import_report.json");

const models = Prisma.dmmf.datamodel.models;
const model = (name) => models.find(m => m.name === name) || null;
const delegate = (name) => name.charAt(0).toLowerCase() + name.slice(1);
const fset = (name) => new Set((model(name)?.fields || []).map(f => f.name));
const has = (name, field) => fset(name).has(field);
function pick(name, data) {
  const f = fset(name), out = {};
  for (const [k,v] of Object.entries(data || {})) {
    if (f.has(k) && v !== undefined && v !== null) out[k] = v;
  }
  return out;
}
function firstModel(names) {
  return names.find(n => model(n) && prisma[delegate(n)]) || null;
}
function ensureDir(p){ fs.mkdirSync(p,{recursive:true}); }
function readJson(p){ return JSON.parse(fs.readFileSync(p,"utf8")); }
function norm(p){ return String(p||"").replace(/\\/g,"/").replace(/^\/+/,""); }
function basename(p, fb){ return path.basename(norm(p)) || fb; }
function localFile(objectDir, rel) {
  if (!rel) return null;
  const p = norm(rel);
  const candidates = [path.join(objectDir, p), path.join(objectDir, p.replace(/\//g, path.sep))];
  for (const c of candidates) if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  return null;
}
function copyAsset(objectDir, rel, externalId, bucket, fallback) {
  const src = localFile(objectDir, rel);
  if (!src) return null;
  const name = basename(rel, fallback);
  const dir = path.join(IMPORT_ROOT, externalId || "unknown", bucket);
  ensureDir(dir);
  const dst = path.join(dir, name);
  if (!DRY_RUN) fs.copyFileSync(src, dst);
  return "/" + path.relative(PUBLIC_ROOT, dst).replace(/\\/g, "/");
}
function mime(name, bucket) {
  const f = String(name||"").toLowerCase();
  if (f.endsWith(".pdf")) return "application/pdf";
  if (f.endsWith(".svg")) return "image/svg+xml";
  if (f.endsWith(".png")) return "image/png";
  if (f.endsWith(".webp")) return "image/webp";
  if (f.endsWith(".gif")) return "image/gif";
  return bucket === "images" ? "image/jpeg" : "application/octet-stream";
}
function parseDate(v){ if(!v) return undefined; const d=new Date(String(v)); return Number.isNaN(d.getTime()) ? undefined : d; }
function statusOf(n) {
  const s = String(n?.status?.status || "ACTIVE").toUpperCase();
  return n?.status?.isCancelled || s === "CANCELLED" ? "CANCELLED" : s === "ARCHIVED" ? "ARCHIVED" : "ACTIVE";
}
function placeholder(n) {
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
  const x = links.find(l => /gericht|justiz/i.test(`${l.label||""} ${l.title||""} ${l.url||""}`));
  return x?.url || undefined;
}
function addWhere(or, field, val) {
  if (val !== undefined && val !== null && val !== "" && has("Property", field)) or.push({ [field]: val });
}
async function findProperty(n) {
  const or = [];
  addWhere(or, "externalId", n.source?.externalId);
  addWhere(or, "sourceExternalId", n.source?.externalId);
  addWhere(or, "sourceUrl", n.source?.detailUrl);
  addWhere(or, "detailUrl", n.source?.detailUrl);
  addWhere(or, "normalizedAktenzeichen", n.case?.normalizedAktenzeichen);
  addWhere(or, "aktenzeichen", n.case?.aktenzeichen);
  const pair = {};
  if (has("Property","title") && n.property?.title) pair.title = n.property.title;
  if (has("Property","address") && n.address?.fullAddress) pair.address = n.address.fullAddress;
  if (Object.keys(pair).length === 2) or.push(pair);
  if (!or.length) return null;
  return prisma.property.findFirst({ where: { OR: or } });
}
function propData(n, detail) {
  const a=n.auction||{}, p=n.property||{}, ad=n.address||{}, g=n.geo||{}, v=n.values||{}, ar=n.areas||{}, b=n.building||{};
  const st = statusOf(n);
  const title = p.title || n.case?.normalizedAktenzeichen || "Zwangsversteigerung";
  return pick("Property", {
    source: n.source?.portal, sourcePortal:n.source?.portal, sourceUrl:n.source?.detailUrl, detailUrl:n.source?.detailUrl,
    externalId:n.source?.externalId, sourceExternalId:n.source?.externalId,
    aktenzeichen:n.case?.aktenzeichen, normalizedAktenzeichen:n.case?.normalizedAktenzeichen, caseNumber:n.case?.aktenzeichen,
    status:st, auctionStatus:st, terminStatus:st, isCancelled:st==="CANCELLED", cancelled:st==="CANCELLED", isActive:st==="ACTIVE", active:st==="ACTIVE",
    title, shortTitle:p.shortTitle||title, description:p.description||p.conditionSummary||"", conditionSummary:p.conditionSummary,
    propertyTypeGroup:p.propertyTypeGroup||"SONSTIGE", propertyType:p.propertyType||p.propertyTypeGroup||"SONSTIGE", type:p.propertyType||p.propertyTypeGroup||"SONSTIGE",
    propertyTypeOriginal:p.propertyTypeOriginal, usage:p.usage, usageOriginal:p.usageOriginal, denkmalStatus:p.denkmalStatus,
    address:ad.fullAddress, fullAddress:ad.fullAddress, street:ad.street, houseNumber:ad.houseNumber, postalCode:ad.postalCode, zip:ad.postalCode,
    city:ad.city||"Unbekannt", state:ad.state||"Sachsen", country:ad.country||"DE",
    latitude:g.latitude, longitude:g.longitude, lat:g.latitude, lng:g.longitude,
    marketValue:v.marketValue, value:v.marketValue, currency:v.currency||"EUR", plotArea:ar.plotArea, livingArea:ar.livingArea, usableArea:ar.usableArea, totalArea:ar.totalArea,
    auctionDate:parseDate(a.dateTime), termin:parseDate(a.dateTime), court:a.courtName, courtName:a.courtName, courtAddress:a.courtAddress, courtWebsite:courtWebsite(detail),
    auctionRoom:a.room, room:a.room, auctionLocation:a.locationOriginal, locationOriginal:a.locationOriginal, auctionType:a.auctionType, termNumber:a.termNumber,
    wertgrenzenStatus:a.wertgrenzenStatus, wertgrenzenWeggefallen:a.wertgrenzenStatus==="REMOVED",
    constructionYear:b.constructionYear, baujahr:b.constructionYear, basement:b.basement, floors:b.floors, outbuildings:b.outbuildings, outbuildingsDescription:b.outbuildingsDescription,
    normalizedJson:JSON.stringify(n), rawJson:JSON.stringify(n), updatedAt:new Date()
  });
}
async function upsertMedia(modelName, propertyId, items, n, objectDir, bucket) {
  if (!modelName) return { model:null, count:0, skipped:true };
  const del = prisma[delegate(modelName)], f=fset(modelName);
  let count = 0;
  for (const item of items || []) {
    const url = copyAsset(objectDir, item.localPath, n.source?.externalId, bucket, bucket==="images"?"image.jpg":"document.pdf");
    if (!url) continue;
    const filename = item.sourceFile || basename(item.localPath, bucket==="images"?"image.jpg":"document.pdf");
    const data = pick(modelName, {
      propertyId, url, src:url, path:url, localPath:url, filename, fileName:filename, originalName:filename,
      name:item.title||item.caption||filename, title:item.title||item.caption||filename, mimeType:mime(filename,bucket), contentType:mime(filename,bucket),
      type:item.type||(bucket==="images"?"IMAGE":"OTHER"), caption:item.caption, alt:item.caption||n.property?.title,
      isMain:!!item.isMain, main:!!item.isMain, sortOrder:item.sortOrder||0, position:item.sortOrder||0, sha1:item.sha1, hash:item.sha1
    });
    const or=[]; if(f.has("url")) or.push({url}); if(f.has("src")) or.push({src:url}); if(f.has("filename")) or.push({filename});
    if(item.sha1 && f.has("sha1")) or.push({sha1:item.sha1}); if(item.sha1 && f.has("hash")) or.push({hash:item.sha1});
    const where={propertyId}; if(or.length) where.OR=or;
    if(!DRY_RUN){ const ex=await del.findFirst({where}); if(ex) await del.update({where:{id:ex.id},data}); else await del.create({data}); }
    count++;
  }
  return { model:modelName, count };
}
async function ensurePlaceholder(modelName, propertyId, n) {
  if (!modelName) return false;
  const del=prisma[delegate(modelName)];
  const existing=await del.count({where:{propertyId}});
  if(existing>0) return false;
  const url=placeholder(n), filename=url.split("/").pop();
  const data=pick(modelName,{propertyId,url,src:url,path:url,localPath:url,filename,fileName:filename,originalName:filename,name:"Placeholder",title:"Placeholder",mimeType:"image/svg+xml",contentType:"image/svg+xml",type:"PLACEHOLDER",caption:"Placeholder",alt:n.property?.title||"Property",isMain:true,main:true,sortOrder:0,position:0});
  if(!DRY_RUN) await del.create({data});
  return true;
}
function files(root){ if(!fs.existsSync(root)) return []; return fs.readdirSync(root).filter(x=>!x.startsWith("_")).map(x=>path.join(root,x,"normalized.json")).filter(fs.existsSync).sort(); }
async function main() {
  const imgModel=firstModel(["PropertyImage","Image","PropertyPhoto","Photo"]);
  const docModel=firstModel(["PropertyDocument","Document","PropertyFile","File"]);
  ensureDir(IMPORT_ROOT);
  const all=files(INPUT_ROOT), take=LIMIT?all.slice(0,LIMIT):all;
  const report={at:new Date().toISOString(),dryRun:DRY_RUN,total:take.length,ok:0,failed:0,items:[]};
  console.log("[repair] files:", take.length, "dry:", DRY_RUN, "image:", imgModel, "document:", docModel);
  for(const file of take){
    try{
      const objectDir=path.dirname(file), n=readJson(file);
      const detailFile=path.join(objectDir,"detail.json"), detail=fs.existsSync(detailFile)?readJson(detailFile):{};
      const prop=await findProperty(n);
      if(!prop){ console.log("[skip]", n.case?.aktenzeichen, "not found"); report.failed++; report.items.push({ok:false,file,reason:"property not found"}); continue; }
      if(!DRY_RUN) await prisma.property.update({where:{id:prop.id},data:propData(n,detail)});
      const images=await upsertMedia(imgModel,prop.id,n.images||[],n,objectDir,"images");
      const documents=await upsertMedia(docModel,prop.id,n.documents||[],n,objectDir,"documents");
      const ph=await ensurePlaceholder(imgModel,prop.id,n);
      report.ok++; report.items.push({ok:true,id:prop.id,aktenzeichen:n.case?.aktenzeichen,externalId:n.source?.externalId,images,documents,placeholder:ph});
      console.log("[ok]", n.case?.aktenzeichen, "images:", images.count, "docs:", documents.count, "placeholder:", ph);
    }catch(e){ console.error("[failed]", file, e.message); report.failed++; report.items.push({ok:false,file,error:e.message}); }
  }
  fs.writeFileSync(REPORT,JSON.stringify(report,null,2),"utf8");
  console.log("[report]", REPORT);
}
main().finally(()=>prisma.$disconnect());
