#!/usr/bin/env node
/* eslint-disable no-console */
require('./load_env.cjs');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const prisma = new PrismaClient();
const argv = process.argv.slice(2);
const DRY_RUN = argv.includes('--dry-run');
const NO_MEDIA = argv.includes('--no-media');
const FORCE_PUBLISH = argv.includes('--publish');
const inputArg = (() => {
  const i = argv.indexOf('--input');
  if (i >= 0) return argv[i + 1];
  const eq = argv.find((x) => x.startsWith('--input='));
  return eq ? eq.slice('--input='.length) : null;
})();

if (!inputArg) {
  console.error('Usage: npm run analysis:import -- --input "<pending-import folder>" [--dry-run] [--no-media] [--publish]');
  process.exit(2);
}
const INPUT = path.resolve(inputArg);
if (!fs.existsSync(INPUT) || !fs.statSync(INPUT).isDirectory()) {
  console.error('Input must be an extracted FINAL Site Package folder:', INPUT);
  process.exit(2);
}

function env(name) { return String(process.env[name] || '').trim(); }
const r2Configured = Boolean(env('R2_ACCOUNT_ID') && env('R2_ACCESS_KEY_ID') && env('R2_SECRET_ACCESS_KEY') && env('R2_BUCKET') && env('R2_PUBLIC_BASE_URL'));
if (!DRY_RUN && !NO_MEDIA && !r2Configured) {
  console.error('Missing R2 env variables: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BASE_URL');
  process.exit(2);
}
const s3 = r2Configured ? new S3Client({
  region: 'auto', endpoint: `https://${env('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: env('R2_ACCESS_KEY_ID'), secretAccessKey: env('R2_SECRET_ACCESS_KEY') },
}) : null;
const R2_BUCKET = env('R2_BUCKET');
const R2_PUBLIC_BASE_URL = env('R2_PUBLIC_BASE_URL').replace(/\/+$/, '');

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full)); else if (e.isFile()) out.push(full);
  }
  return out;
}
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function int(v) { const n = Number(v); return Number.isFinite(n) ? Math.round(n) : null; }
function num(v) { const n = Number(v); return Number.isFinite(n) ? n : null; }
function text(v) { return v == null ? null : String(v).trim() || null; }
function asJson(v) { return v == null ? undefined : v; }
function dateOnly(v) { if (!v) return null; const s=String(v).trim(); const d=/^\d{4}-\d{2}-\d{2}$/.test(s)?new Date(`${s}T12:00:00Z`):new Date(s); return Number.isNaN(d.getTime())?null:d; }
function isoDate(v) { if (!v) return null; const d=new Date(v); return Number.isNaN(d.getTime())?null:d; }
function normalizeAz(v) { return String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, ''); }
function sha256(file) { const h=crypto.createHash('sha256'); h.update(fs.readFileSync(file)); return h.digest('hex'); }
function resolveObjectFile(objectDir, rel) {
  if (!rel) return null;
  const clean = String(rel).replace(/\\/g,'/').replace(/^\.\//,'');
  const candidates = [path.resolve(objectDir, clean), path.resolve(INPUT, clean)];
  for (const file of candidates) {
    if ((file === path.resolve(objectDir) || file.startsWith(path.resolve(objectDir)+path.sep) || file.startsWith(path.resolve(INPUT)+path.sep)) && fs.existsSync(file)) return file;
  }
  return null;
}
function parseStreet(address) { const a=String(address||'').trim(); const first=a.split(',')[0].trim(); const m=first.match(/^(.*?)(?:\s+)(\d+[a-zA-Z]?)(?:\s*[-/]\s*\d+[a-zA-Z]?)?$/); return m?{street:m[1].trim(),houseNumber:m[2]}:{street:first||a||'Unbekannt',houseNumber:null}; }
function typeGroup(t) { const s=String(t||'').toLowerCase(); if(/wohnung|condo|apartment|eigentumswohnung|teileigentum/.test(s))return'WOHNUNGEN'; if(/haus|wohnhaus|family|villa|bungalow|reihen|doppel|mehrfamilien|einfamilien/.test(s))return'WOHNHAEUSER'; if(/gewerbe|commercial|office|büro|buero|laden|hotel|halle|werkstatt|restaurant/.test(s))return'GEWERBE'; if(/wald|forst|agrar|acker|landwirtschaft/.test(s))return'LAND_WALD'; if(/garage|stellplatz|parking/.test(s))return'GARAGEN'; if(/grundstück|grundstueck|land plot|parcel|bauplatz/.test(s))return'GRUNDSTUECKE'; return'SONSTIGE'; }
function occupancy(p) { const s=JSON.stringify([p?.occupancy,p?.mietverhaeltnis,p?.use]).toLowerCase(); if(/leer|vacant|unbewohnt/.test(s))return'VACANT'; if(/vermiet|rented|mietvertrag/.test(s))return'RENTED'; if(/eigen.?nutz|owner.?occupied/.test(s))return'OWNER_OCCUPIED'; return'UNKNOWN'; }
function auctionStatus(a) { const s=String(a?.status||'').toLowerCase(); if(/cancel|aufgehoben|abgesagt/.test(s))return'CANCELLED'; if(/sold|verkauft|zuschlag/.test(s))return'SOLD'; if(/archiv|finished|past/.test(s))return'ARCHIVED'; return'ACTIVE'; }
function publicationStatus(v) { if(FORCE_PUBLISH)return'PUBLISHED'; const s=String(v||'').toUpperCase(); return s==='ARCHIVED'?'ARCHIVED':'REVIEW'; }
function contentType(file) { const e=path.extname(file).toLowerCase(); return ({'.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.gif':'image/gif','.pdf':'application/pdf','.txt':'text/plain','.md':'text/markdown'})[e]||'application/octet-stream'; }
function publicUrl(key) { return `${R2_PUBLIC_BASE_URL}/${key.split('/').map(encodeURIComponent).join('/')}`; }
async function uploadFile(file,key){ if(NO_MEDIA)return{url:null,key,skipped:true}; const url=r2Configured?publicUrl(key):`DRY-RUN://${key}`; if(!DRY_RUN)await s3.send(new PutObjectCommand({Bucket:R2_BUCKET,Key:key,Body:fs.createReadStream(file),ContentType:contentType(file),CacheControl:contentType(file).startsWith('image/')?'public, max-age=31536000, immutable':'public, max-age=86400'})); return{url,key,skipped:false}; }
function documentType(v) { const s=String(v||'').toLowerCase(); if(/gutachten|verkehrswert|wertgutachten/.test(s))return'GUTACHTEN'; if(/bekannt|termin|versteiger/.test(s))return'BEKANNTMACHUNG'; if(/expos|kurzexpos/.test(s))return'EXPOSE'; if(/foto|photo|image/.test(s))return'FOTO'; return'OTHER'; }
function extractYear(v){ if(Number.isInteger(v)&&v>=1500&&v<=2100)return v; const m=String(v||'').match(/(?:18|19|20)\d{2}/); return m?Number(m[0]):null; }
function unitCount(p){ for(const v of[p?.units,p?.unitsApprox,p?.unitsInEntranceApprox,p?.legalUnitCountVerified]){const n=Number(v);if(Number.isFinite(n))return Math.round(n)} return null; }
function livingArea(p){return num(p?.livingAreaSqm??p?.livingAreaSqmApprox??p?.livingAndUsefulAreaSqmApprox)}
function plotArea(p){return num(p?.plotAreaSqm??p?.landAreaSqm)}
function overallConfidence(c){return text(c?.overall??c)}
function rangeValue(obj,key){const x=obj?.[key]||{}; return {low:int(x.low??x.valueLowEur??x.lowEur),base:int(x.base??x.valueBaseEur??x.baseEur),high:int(x.high??x.valueHighEur??x.highEur)};}
function scenarioBase(ren,key){const x=ren?.[key]||{}; const direct=int(x.costBaseEur??x.base??x.baseEur); if(direct!=null)return direct; const lo=Number(x.costLowEur??x.low),hi=Number(x.costHighEur??x.high); return Number.isFinite(lo)&&Number.isFinite(hi)?Math.round((lo+hi)/2):null;}
function bid(inv,...keys){for(const k of keys){const v=inv?.[k]; if(v&&typeof v==='object'){const n=int(v.base??v.amountEur??v.value); if(n!=null)return n;} const n=int(v); if(n!=null)return n;} return null;}

async function ensureMedia(objectDir,d){
  const rows=[]; const heroRel=text(d.media?.heroPhoto); const gallery=Array.isArray(d.media?.gallery)?d.media.gallery:[];
  const seen=new Set(); const items=[]; if(heroRel)items.push({rel:heroRel,main:true,sort:0}); gallery.forEach((rel,i)=>{if(rel)items.push({rel,main:false,sort:i+1})});
  for(const item of items){ const file=resolveObjectFile(objectDir,item.rel); if(!file)throw new Error(`Missing media file: ${item.rel}`); const hash=sha256(file); if(seen.has(hash)){ if(item.main)throw new Error('Hero image duplicates another selected image'); continue;} seen.add(hash); const ext=path.extname(file).toLowerCase()||'.jpg'; const key=`analysis/${d.canonicalId}/media/${item.main?'hero':`gallery/${String(item.sort).padStart(3,'0')}`}${ext}`; const up=await uploadFile(file,key); const assess=(Array.isArray(d.media?.photoAssessment)?d.media.photoAssessment:[]).find(x=>String(x?.path||'').replace(/\\/g,'/')===String(item.rel).replace(/\\/g,'/'))||{}; rows.push({url:up.url,alt:d.content?.de?.title||d.property?.address||d.canonicalId,isMain:item.main,sortOrder:item.sort,sourceDocument:text(assess.sourceDocument??assess.provenance),sourcePage:int(assess.page),sha256:hash}); }
  return rows;
}
function docTitle(meta,locale){ const v=meta?.displayTitle; if(v&&typeof v==='object')return text(v[locale]??v.de); if(typeof v==='string')return text(v); return null; }
async function ensureDocuments(objectDir,d){
  const declared=Array.isArray(d.documents)?d.documents:[]; const rows=[]; const used=new Set(); let sort=0;
  for(const meta of declared){ const rel=meta?.filePath??meta?.path; const file=resolveObjectFile(objectDir,rel); if(!file)throw new Error(`Missing declared document: ${rel}`); const hash=sha256(file); if(meta?.sha256&&String(meta.sha256).toLowerCase()!==hash)throw new Error(`Document SHA-256 mismatch: ${rel}`); if(used.has(hash))continue; used.add(hash); const key=`analysis/${d.canonicalId}/documents/${String(++sort).padStart(3,'0')}-${path.basename(file)}`; const up=await uploadFile(file,key); rows.push({url:up.url,filename:path.basename(file),documentType:documentType(meta?.type??path.basename(file)),sourceUrl:text(meta?.sourceUrl),sourcePortal:text(meta?.sourcePortal),originalFilename:text(meta?.originalFilename),sha256:hash,titleDe:docTitle(meta,'de'),titleRu:docTitle(meta,'ru'),titleEn:docTitle(meta,'en')}); }
  const docsDir=path.join(objectDir,'documents'); if(fs.existsSync(docsDir)) for(const file of walk(docsDir)){ if(!fs.statSync(file).isFile())continue; const hash=sha256(file); if(used.has(hash))continue; used.add(hash); const key=`analysis/${d.canonicalId}/documents/${String(++sort).padStart(3,'0')}-${path.basename(file)}`; const up=await uploadFile(file,key); rows.push({url:up.url,filename:path.basename(file),documentType:documentType(path.basename(file)),sourceUrl:null,sourcePortal:null,originalFilename:path.basename(file),sha256:hash,titleDe:null,titleRu:null,titleEn:null}); }
  return rows;
}
async function postalCenter(code){if(!code)return null;try{return await prisma.postalCode.findUnique({where:{code:String(code)},select:{latitude:true,longitude:true}})}catch{return null}}
function translationData(d,locale){ const lc=locale.toLowerCase(); const c=d.content?.[lc]||{}; const lf=d.localizedFields?.[lc]||{}; const r=d.recommendation||{}; return { title:text(c.title)||text(d.property?.address)||'Zwangsversteigerungsobjekt', propertyType:text(lf.propertyType)||text(c.propertyType), shortDescription:text(c.shortDescription), description:text(c.description)||text(c.shortDescription)||'', longDescription:text(c.longDescription), buildingAndLayout:text(c.buildingAndLayout), conditionAndRenovation:text(c.conditionAndRenovation), useAndOccupancy:text(c.useAndOccupancy), plotAndAccess:text(c.plotAndAccess), locationAndSurroundings:text(c.locationAndSurroundings), specialFeatures:text(c.specialFeatures), auctionAndLegalNotes:text(c.auctionAndLegalNotes), locationDescription:text(c.locationDescription)||text(c.locationAndSurroundings), recommendationSummary:text(c.recommendationSummary), marketSummary:text(c.marketSummary), renovationSummary:text(c.renovationSummary), riskSummary:text(c.riskSummary), localizedFieldsJson:asJson(lf), prosJson:asJson(r.pros?.[lc]||[]), consJson:asJson(r.cons?.[lc]||[]), checksBeforeAuctionJson:asJson(r.checksBeforeAuction?.[lc]||[]) }; }

async function importOne(file){
  const objectDir=path.dirname(file), d=readJson(file);
  if(!/^zac_[a-z0-9]+$/i.test(String(d.canonicalId||'')))throw new Error('Invalid/missing canonicalId');
  if(!d.content?.de||!d.content?.ru||!d.content?.en)throw new Error('content.de/ru/en are required');
  if(d.content?.uk)throw new Error('content.uk is not allowed');
  if(!d.localizedFields?.de||!d.localizedFields?.ru||!d.localizedFields?.en)throw new Error('localizedFields.de/ru/en are required by Quality v3');
  if(d.qualityGate?.passed!==true)throw new Error('qualityGate.passed=true is required');
  const p=d.property||{},a=d.auction||{},m=d.market||{},ren=d.renovation||{},inv=d.investment||{},de=d.content.de||{};
  const street=parseStreet(p.address),center=await postalCenter(p.postalCode),existing=await prisma.property.findUnique({where:{canonicalId:d.canonicalId},select:{id:true,latitude:true,longitude:true}}).catch(()=>null);
  const images=await ensureMedia(objectDir,d); const documents=await ensureDocuments(objectDir,d);
  const asIs=rangeValue(m,'asIsMarketValue'), quick=rangeValue(m,'quickSale6mValue'), rent=rangeValue(m,'rentMonthlyCold');
  const primary=d.primarySource||{};
  const data={ canonicalId:d.canonicalId,publicationStatus:publicationStatus(d.publicationStatus),analysisSchemaVersion:text(d.schemaVersion),analysisVersion:text(d.analysisVersion),sourceBatchId:text(d.sourceBatchId),analyzedAt:isoDate(d.analyzedAt),marketResearchedAt:dateOnly(d.marketResearchedAt??m.researchedAt), primarySourcePortal:text(primary.portal),primarySourceUrl:text(primary.url), officialVerkehrswertEur:int(a.officialVerkehrswertEur??a.verkehrswertEur), analyzedMarketValueLowEur:asIs.low,analyzedMarketValueBaseEur:asIs.base,analyzedMarketValueHighEur:asIs.high,quickSale6mLowEur:quick.low,quickSale6mBaseEur:quick.base,quickSale6mHighEur:quick.high,rentMonthlyColdLowEur:rent.low,rentMonthlyColdBaseEur:rent.base,rentMonthlyColdHighEur:rent.high, renovationMinimalBaseEur:scenarioBase(ren,'minimal'),renovationStandardBaseEur:scenarioBase(ren,'standard'),renovationFullBaseEur:scenarioBase(ren,'full'),renovationWorstCaseBaseEur:scenarioBase(ren,'worstCase'), bidVeryAttractiveEur:bid(inv,'bidVeryAttractiveEur','veryAttractiveBid','veryAttractiveBidEur'),bidReasonableEur:bid(inv,'bidReasonableEur','reasonableBid','reasonableBidEur'),bidMaximumEur:bid(inv,'bidMaximumEur','maximumBid','maximumBidEur'),doNotBuyAboveEur:bid(inv,'doNotBuyAboveEur','doNotBuyAbove'), investmentScore:int(inv.score??d.recommendation?.score),investmentRecommendation:text(inv.recommendation??d.recommendation?.decision),analysisConfidence:overallConfidence(d.confidence), rooms:num(p.rooms),units:unitCount(p),floor:text(p.floor??p.floors),heating:text(p.heating),conditionSummary:text(p.condition??p.conditionSummary),securityDepositEur:int(a.securityDepositEur),valuationDate:dateOnly(a.valuationDate),versteigerungsvermerkDate:dateOnly(a.versteigerungsvermerkDate), lotsJson:asJson(d.lots),cadastralJson:asJson(d.cadastral),marketJson:asJson(d.market),renovationJson:asJson(d.renovation),constructionRisksJson:asJson(d.constructionRisks),legalRisksJson:asJson(d.legalRisks),investmentJson:asJson(d.investment),evidenceJson:asJson(d.evidence),enrichmentJson:asJson(d.enrichment),qualityGateJson:asJson(d.qualityGate),confidenceJson:asJson(d.confidence),warningsJson:asJson(d.warnings),sourcesJson:asJson(d.sources),unknownsToVerifyJson:asJson(d.unknownsToVerify),photoAssessmentJson:asJson(d.media?.photoAssessment),analysisRawJson:asJson(d), aktenzeichen:text(a.aktenzeichen)||d.canonicalId,normalizedAktenzeichen:normalizeAz(a.aktenzeichen||d.canonicalId),court:text(a.court)||'Unbekannt',state:text(p.state??p.bundesland)||'Unbekannt',city:text(p.city)||'Unbekannt',postalCode:text(p.postalCode)||'00000',street:street.street,houseNumber:street.houseNumber,address:text(p.address)||`${p.postalCode||''} ${p.city||''}`.trim()||'Unbekannt', latitude:existing?.latitude??num(p.latitude)??center?.latitude??null,longitude:existing?.longitude??num(p.longitude)??center?.longitude??null, title:text(de.title)||text(p.address)||d.canonicalId,propertyType:text(d.localizedFields?.de?.propertyType)||text(p.propertyType)||'Sonstige',propertyTypeGroup:typeGroup(d.localizedFields?.de?.propertyType??p.propertyType),status:auctionStatus(a),occupancyStatus:occupancy(p), auctionDate:dateOnly(a.date??a.auctionDate),auctionTime:text(a.time),auctionLocation:text(a.place??a.location),marketValue:int(a.officialVerkehrswertEur??a.verkehrswertEur),livingArea:livingArea(p),usableArea:num(p.usableAreaSqm),totalArea:num(p.totalAreaSqm??p.livingAndUsefulAreaSqmApprox),plotArea:plotArea(p),yearBuilt:extractYear(p.buildingYear??p.yearBuilt),hasDenkmalschutz:Boolean(p.hasDenkmalschutz||p.denkmalschutz),wertgrenzenWeggefallen:Boolean(a.wertgrenzenWeggefallen),auctionAttempt:int(a.auctionAttempt)||1, description:text(de.description)||text(de.shortDescription)||'',locationDescription:text(de.locationAndSurroundings??de.locationDescription),cancellationText:null,source:'AI_ANALYSIS',sourceUrl:text(primary.url)||text(d.sources?.[0]?.url??d.sources?.[0]?.sourceUrl),lastSourceUpdate:isoDate(d.analyzedAt)||new Date() };
  if(DRY_RUN)return{canonicalId:d.canonicalId,action:existing?'update':'create',publicationStatus:data.publicationStatus,images:images.length,documents:documents.length,title:data.title};
  const txWork=async(tx)=>{ const saved=await tx.property.upsert({where:{canonicalId:d.canonicalId},update:data,create:data}); await tx.propertyTranslation.deleteMany({where:{propertyId:saved.id,locale:{in:['DE','RU','EN']}}}); await tx.propertyTranslation.createMany({data:['DE','RU','EN'].map(loc=>({propertyId:saved.id,locale:loc,...translationData(d,loc)}))}); if(!NO_MEDIA){await tx.propertyImage.deleteMany({where:{propertyId:saved.id}});if(images.length)await tx.propertyImage.createMany({data:images.map(row=>({propertyId:saved.id,...row}))});await tx.propertyDocument.deleteMany({where:{propertyId:saved.id}});if(documents.length)await tx.propertyDocument.createMany({data:documents.map(row=>({propertyId:saved.id,...row}))});} return saved; };
  let property; for(let attempt=1;attempt<=3;attempt++){try{property=await prisma.$transaction(txWork,{maxWait:20000,timeout:60000});break}catch(e){const msg=String(e?.message||e),retryable=/P2028|P2034|Transaction not found|closed transaction|timed out|timeout/i.test(msg);if(!retryable||attempt===3)throw e;console.warn(`[retry] ${d.canonicalId} DB transaction ${attempt}/3 failed`);await new Promise(r=>setTimeout(r,1000*attempt));}}
  return{canonicalId:d.canonicalId,propertyId:property.id,action:existing?'updated':'created',publicationStatus:data.publicationStatus,images:images.length,documents:documents.length,title:data.title};
}

async function main(){ const files=walk(INPUT).filter(f=>path.basename(f)==='analysis_result.json').sort(); console.log('='.repeat(72));console.log('ZVG-DE Quality v3 Site Importer v3.0');console.log('='.repeat(72));console.log('Input:',INPUT);console.log('Objects:',files.length);console.log('Dry run:',DRY_RUN?'yes':'no');console.log('Media:',NO_MEDIA?'skip':(DRY_RUN?'validate only':'R2 upload'));console.log('Force publish:',FORCE_PUBLISH?'yes':'no');if(!files.length)throw new Error('No analysis_result.json files found'); const report={at:new Date().toISOString(),input:INPUT,dryRun:DRY_RUN,ok:0,failed:0,items:[]}; for(const file of files){try{const r=await importOne(file);report.ok++;report.items.push({ok:true,...r});console.log(`[ok] ${r.canonicalId} ${r.action} ${r.publicationStatus} images=${r.images} docs=${r.documents}`)}catch(e){report.failed++;report.items.push({ok:false,file,error:e.message});console.error('[failed]',file,e.message)}} const out=path.join(process.cwd(),`analysis_site_import_report${DRY_RUN?'.dry-run':''}.json`);fs.writeFileSync(out,JSON.stringify(report,null,2),'utf8');console.log('='.repeat(72));console.log(`Complete: ok=${report.ok} failed=${report.failed}`);console.log('Report:',out);if(report.failed)process.exitCode=1; }
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>prisma.$disconnect());
