#!/usr/bin/env node
const fs=require('fs'), path=require('path');
const ROOT=process.cwd(), DATA=path.join(ROOT,'data','zvg-chemnitz-v5','chemnitz_39_v5.json'), GEO=path.join(ROOT,'var','chemnitz_v5_locations.json'), MEDIA=path.join(ROOT,'var','chemnitz_v5_media_manifest.json');
function envfile(f){if(!fs.existsSync(f))return;for(const line of fs.readFileSync(f,'utf8').split(/\r?\n/)){const t=line.trim();if(!t||t.startsWith('#'))continue;const m=t.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);if(!m||process.env[m[1]])continue;let v=m[2].trim();if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))v=v.slice(1,-1);process.env[m[1]]=v;}}
envfile(path.join(ROOT,'.env.local')); envfile(path.join(ROOT,'.env'));
if(!process.env.DATABASE_URL){console.error('[ERROR] DATABASE_URL missing');process.exit(2)}
const {PrismaClient,Prisma}=require('@prisma/client'); const prisma=new PrismaClient();
const dry=process.argv.includes('--dry-run'); const confirm=process.argv.includes('--confirm=CHEMNITZ_39');
function norm(s){return String(s||'').toUpperCase().replace(/\s+/g,'').replace(/[^A-Z0-9/]/g,'')}
function noon(s){return s?new Date(`${s}T12:00:00.000Z`):null}
function model(name){return Prisma.dmmf.datamodel.models.find(m=>m.name===name)}
function fields(name){return new Set((model(name)?.fields||[]).filter(f=>f.kind!=='object').map(f=>f.name))}
function only(o,set){return Object.fromEntries(Object.entries(o).filter(([k,v])=>set.has(k)&&v!==undefined))}
function reqMissing(name,d){const m=model(name);return (m?.fields||[]).filter(f=>f.kind!=='object'&&!f.isId&&!f.hasDefaultValue&&!f.isUpdatedAt&&f.isRequired&&(d[f.name]===undefined||d[f.name]===null||d[f.name]==='')).map(f=>f.name)}
function localized(r,loc){return r.translations?.[loc]||null}
async function main(){
 const data=JSON.parse(fs.readFileSync(DATA,'utf8')); if(data.records?.length!==39)throw new Error(`Expected 39 records, got ${data.records?.length}`);
 if(!fs.existsSync(GEO))throw new Error('Missing location report. Run prepare_locations.py'); if(!fs.existsSync(MEDIA))throw new Error('Missing media report. Run prepare_media_docs.py');
 const geo=JSON.parse(fs.readFileSync(GEO,'utf8')), media=JSON.parse(fs.readFileSync(MEDIA,'utf8'));
 if((geo.failures||[]).length)throw new Error(`Exact location unresolved for ${geo.failures.length} record(s). Import blocked.`);
 const pF=fields('Property'); if(!pF.has('analysisJson'))throw new Error('Property.analysisJson is missing. Apply V3/V4 site schema patch first.');
 const currentKeys=new Set(data.records.map(r=>r.caseKey)); const prepared=[];
 for(const r of data.records){ const g=geo.locations[r.caseKey]; if(!g||!['house_number','multi_address_centroid','parcel'].includes(g.precision))throw new Error(`${r.caseKey}: location is not exact enough (${g?.precision||'missing'})`); const mm=media.records?.[r.caseKey]||{images:[],documents:[]};
   const pd=only({aktenzeichen:r.aktenzeichen,normalizedAktenzeichen:norm(r.aktenzeichen),court:r.court,state:r.state,city:r.city,postalCode:r.postalCode,street:r.street,houseNumber:r.houseNumber||null,address:r.address,latitude:g.latitude,longitude:g.longitude,title:r.title,propertyType:r.propertyType,propertyTypeGroup:r.propertyTypeGroup,status:r.status,occupancyStatus:r.occupancyStatus,auctionDate:noon(r.auctionDate),auctionTime:r.auctionTime,auctionLocation:r.auctionLocation,marketValue:r.marketValue,livingArea:r.livingArea,usableArea:r.usableArea,totalArea:r.totalArea,plotArea:r.plotArea,yearBuilt:r.yearBuilt,hasDenkmalschutz:!!r.hasDenkmalschutz,wertgrenzenWeggefallen:!!r.wertgrenzenWeggefallen,auctionAttempt:r.auctionAttempt||1,description:localized(r,'DE').description,analysisJson:r.analysis,locationDescription:localized(r,'DE').locationDescription,cancellationText:null,source:r.source,sourceUrl:r.sourceUrl,lastSourceUpdate:noon(r.lastSourceUpdate)},pF);
   const miss=reqMissing('Property',pd);if(miss.length)throw new Error(`${r.caseKey}: missing required fields ${miss.join(',')}`); prepared.push({r,pd,g,mm}); }
 console.log('============================================================');console.log('ZVG-DE CHEMNITZ FULL V5');console.log('records:',prepared.length,'exact locations:',Object.keys(geo.locations||{}).length);console.log('images:',prepared.reduce((s,x)=>s+(x.mm.images?.length||0),0),'working documents:',prepared.reduce((s,x)=>s+(x.mm.documents?.length||0),0));
 for(const p of prepared)console.log(`${p.r.aktenzeichen} | ${p.r.address} | ${p.g.precision} | images=${p.mm.images?.length||0} docs=${p.mm.documents?.length||0} | occ=${p.r.occupancyStatus}`);
 if(dry){console.log('[DRY-RUN] preflight OK; DB not changed');return} if(!confirm)throw new Error('Confirmation missing. Use --confirm=CHEMNITZ_39');
 const where={OR:[{court:'Chemnitz'},{court:'Amtsgericht Chemnitz'}]}; const old=await prisma.property.findMany({where,include:{images:true,documents:true,favorites:true,translations:true}}); const stamp=new Date().toISOString().replace(/[:.]/g,'-'); const bd=path.join(ROOT,'var','backups');fs.mkdirSync(bd,{recursive:true});const bp=path.join(bd,`chemnitz_before_v5_${stamp}.json`);fs.writeFileSync(bp,JSON.stringify({createdAt:new Date().toISOString(),count:old.length,properties:old},null,2));console.log('[BACKUP]',bp);
 await prisma.$transaction(async tx=>{
   // remove only stale Chemnitz court objects, never other courts/users
   for(const o of old){if(!currentKeys.has(norm(o.aktenzeichen))){console.log('[STALE DELETE]',o.aktenzeichen,o.id);await tx.property.delete({where:{id:o.id}})}}
   for(const p of prepared){let prop=await tx.property.findFirst({where:{OR:[{normalizedAktenzeichen:p.pd.normalizedAktenzeichen},{AND:[{court:{in:['Chemnitz','Amtsgericht Chemnitz']}},{aktenzeichen:p.r.aktenzeichen}]}]}}); if(prop) prop=await tx.property.update({where:{id:prop.id},data:p.pd}); else prop=await tx.property.create({data:p.pd});
      await tx.propertyImage.deleteMany({where:{propertyId:prop.id}}); await tx.propertyDocument.deleteMany({where:{propertyId:prop.id}}); await tx.propertyTranslation.deleteMany({where:{propertyId:prop.id}});
      if(p.mm.images?.length)await tx.propertyImage.createMany({data:p.mm.images.map(x=>({propertyId:prop.id,url:x.url,alt:x.alt||null,isMain:!!x.isMain,sortOrder:x.sortOrder??0}))});
      if(p.mm.documents?.length)await tx.propertyDocument.createMany({data:p.mm.documents.map(d=>({propertyId:prop.id,url:d.url,filename:d.filename,documentType:['GUTACHTEN','BEKANNTMACHUNG','EXPOSE','FOTO'].includes(d.type)?d.type:'OTHER',sourceUrl:d.sourceUrl||d.url}))});
      const trs=['DE','RU','EN'].map(locale=>{const t=localized(p.r,locale);return {propertyId:prop.id,locale,title:t.title,propertyType:t.propertyType,description:t.description,locationDescription:t.locationDescription}}); await tx.propertyTranslation.createMany({data:trs});
   }
 },{maxWait:20000,timeout:180000});
 const count=await prisma.property.count({where}); const rows=await prisma.property.findMany({where,include:{images:true,documents:true,translations:true},orderBy:{auctionDate:'asc'}}); const report={finishedAt:new Date().toISOString(),count,backup:bp,records:rows.map(x=>({id:x.id,aktenzeichen:x.aktenzeichen,address:x.address,lat:x.latitude,lon:x.longitude,images:x.images.length,documents:x.documents.length,translations:x.translations.length,occupancyStatus:x.occupancyStatus,marketValue:x.marketValue}))}; const rp=path.join(ROOT,'var',`chemnitz_v5_import_${stamp}.json`);fs.writeFileSync(rp,JSON.stringify(report,null,2));console.log('[OK] court rows after import:',count,'report:',rp);if(count!==39)throw new Error(`Expected 39 Chemnitz rows, got ${count}`);
}
main().catch(e=>{console.error('[ERROR]',e.stack||e);process.exitCode=1}).finally(()=>prisma.$disconnect());
