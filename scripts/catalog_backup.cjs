#!/usr/bin/env node
/* eslint-disable no-console */
require('./load_env.cjs');
const fs=require('node:fs');const path=require('node:path');const{PrismaClient}=require('@prisma/client');const prisma=new PrismaClient();
function jsonSafe(v){return JSON.parse(JSON.stringify(v,(_,x)=>typeof x==='bigint'?x.toString():x));}
async function tableExists(name){const r=await prisma.$queryRawUnsafe(`SHOW TABLES LIKE '${name.replace(/'/g,"''")}'`);return Array.isArray(r)&&r.length>0;}
async function rows(name){if(!await tableExists(name))return[];return prisma.$queryRawUnsafe(`SELECT * FROM \`${name}\``);}
async function main(){const stamp=new Date().toISOString().replace(/[:.]/g,'-');const outDir=path.join(process.cwd(),'backups');fs.mkdirSync(outDir,{recursive:true});const out=path.join(outDir,`catalog-backup-${stamp}.json`);const catalog=['Property','PropertyImage','PropertyDocument','PropertyTranslation','Favorite'];const preserved=['User','Session','SavedSearch','PostalCode','ImportLog'];const data={createdAt:new Date().toISOString(),catalogTables:{},preservedCounts:{}};for(const n of catalog){data.catalogTables[n]=jsonSafe(await rows(n));console.log(n,data.catalogTables[n].length);}for(const n of preserved){const rr=await rows(n);data.preservedCounts[n]=rr.length;console.log(`${n} preserved`,rr.length);}fs.writeFileSync(out,JSON.stringify(data,null,2),'utf8');console.log('Backup:',out);}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>prisma.$disconnect());
