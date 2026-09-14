#!/usr/bin/env node
const fs=require('fs'),path=require('path');
const ROOT=process.cwd();
const DATA=path.join(ROOT,'data','zvg-chemnitz-v5','chemnitz_39_v5.json');
const GEO=path.join(ROOT,'var','chemnitz_v5_locations.json');
const MEDIA=path.join(ROOT,'var','chemnitz_v5_media_manifest.json');
function die(s){console.error('[ERROR]',s);process.exit(2)}
if(!fs.existsSync(DATA)||!fs.existsSync(GEO)||!fs.existsSync(MEDIA))die('V5 data/geo/media files are missing');
const data=JSON.parse(fs.readFileSync(DATA,'utf8'));
const geo=JSON.parse(fs.readFileSync(GEO,'utf8'));
const media=JSON.parse(fs.readFileSync(MEDIA,'utf8'));
let err=[],warn=[]; const exact=new Set(['house_number','multi_address_centroid','parcel']);
if(data.records?.length!==39)err.push(`record count ${data.records?.length}`);
const seen=new Set();
function sourceHasExactObjectImage(m,needle){
  return (m.images||[]).some(x=>String(x.source||'').includes(needle));
}
for(const r of data.records){
  if(seen.has(r.caseKey))err.push(`duplicate ${r.caseKey}`); seen.add(r.caseKey);
  const g=geo.locations?.[r.caseKey];
  if(!g||!exact.has(g.precision))err.push(`${r.caseKey}: non-exact/missing geo`);
  const m=media.records?.[r.caseKey];
  if(!m){err.push(`${r.caseKey}: media row missing`);continue}
  if(!m.documents?.length)err.push(`${r.caseKey}: no locally cached document`);
  for(const d of m.documents||[]){
    if(!String(d.url||'').startsWith('/zvg-docs/chemnitz-v5/'))err.push(`${r.caseKey}: external/dead document URL ${d.url}`);
    const fp=path.join(ROOT,'public',String(d.url||'').replace(/^\//,''));
    if(!fs.existsSync(fp))err.push(`${r.caseKey}: document missing ${fp}`);
    else {const b=fs.readFileSync(fp);if(b.subarray(0,5).toString()!=='%PDF-')err.push(`${r.caseKey}: cached document is not PDF ${fp}`)}
  }
  for(const im of m.images||[]){
    if(!String(im.url||'').startsWith('/zvg-media/chemnitz-v5/'))err.push(`${r.caseKey}: non-local image ${im.url}`);
    const fp=path.join(ROOT,'public',String(im.url||'').replace(/^\//,''));
    if(!fs.existsSync(fp)||fs.statSync(fp).size<8000)err.push(`${r.caseKey}: missing/tiny image ${fp}`);
  }
  // Source failure is hard only when the object is still left without any verified photo.
  for(const [name,s] of Object.entries(m.sources||{})){
    const advertised=Math.max(Number(s.expected||0),Number(s.v51Expected||0));
    const dl=Math.max(Number(s.downloaded||0),Number(s.v51Downloaded||0));
    if(advertised>0 && (m.imageCount||0)===0) err.push(`${r.caseKey}: ${name} advertises ${advertised} photo(s), object still has zero`);
    else if(advertised>0 && dl===0 && (m.imageCount||0)>0) warn.push(`${r.caseKey}: ${name} source unavailable, covered by other verified source (${m.imageCount} image(s))`);
  }
  if(r.caseKey==='0015K0184/2024' && r.occupancyStatus!=='UNKNOWN')err.push('Waldheim 15 K 184 occupancy must remain UNKNOWN');
}
const totalImg=Object.values(media.records||{}).reduce((s,x)=>s+(x.imageCount||0),0);
const withImg=Object.values(media.records||{}).filter(x=>(x.imageCount||0)>0).length;
const totalDocs=Object.values(media.records||{}).reduce((s,x)=>s+(x.documentCount||0),0);
const reit=media.records?.['0023K0093/2024'];
const wald=media.records?.['0015K0184/2024'];
if((reit?.imageCount||0)<4)err.push(`Reitbahnstraße 25: need >=4 verified object images, got ${reit?.imageCount||0}`);
if(!sourceHasExactObjectImage(reit||{},'ZvgScout') && !sourceHasExactObjectImage(reit||{},'court PDF'))err.push('Reitbahnstraße 25: no exact-source image provenance');
if((wald?.imageCount||0)<1)err.push(`Waldheim Talstraße 6: need >=1 verified exact-object image, got ${wald?.imageCount||0}`);
if(!sourceHasExactObjectImage(wald||{},'ZvgScout') && !sourceHasExactObjectImage(wald||{},'ImmobilienScout24'))err.push('Waldheim Talstraße 6: image exists but exact-source provenance is missing');
if(totalImg<250)err.push(`court media unexpectedly low: ${totalImg} images; expected >=250 after V5 enrichment`);
if(withImg<33)err.push(`only ${withImg}/39 records have images; expected at least 33`);
if(totalDocs<39)err.push(`document regression: ${totalDocs}/39 cached documents`);
console.log('CHEMNITZ V5.1 STRICT QA');
console.log('records',data.records.length,'exact locations',Object.keys(geo.locations||{}).length,'images',totalImg,'recordsWithImages',withImg,'documents',totalDocs);
console.log('Reitbahn images',reit?.imageCount||0,'Waldheim images',wald?.imageCount||0);
warn.slice(0,80).forEach(x=>console.log('[WARN]',x));
if(err.length){err.forEach(x=>console.log('[ERROR]',x));console.log(`[FAIL] ${err.length} hard QA error(s). DB import BLOCKED.`);process.exit(2)}
console.log('[OK] V5.1 QA passed: 39 exact geo, local PDFs, Reitbahn exact gallery, Waldheim exact object photo, occupancy UNKNOWN.');
