#!/usr/bin/env node
/* eslint-disable no-console */
require('./load_env.cjs');
const { PrismaClient }=require('@prisma/client'); const prisma=new PrismaClient();
const args=process.argv.slice(2); const dry=args.includes('--dry-run');
function arg(name){ const i=args.indexOf(name); if(i>=0)return args[i+1]; const e=args.find(x=>x.startsWith(name+'=')); return e?e.slice(name.length+1):null; }
const canonicalId=arg('--canonical-id'); const status=String(arg('--status')||'PUBLISHED').toUpperCase();
const allowed=['IMPORTED','REVIEW','READY','PUBLISHED','ARCHIVED'];
async function main(){ if(!canonicalId) throw new Error('--canonical-id is required'); if(!allowed.includes(status)) throw new Error('Invalid --status'); const p=await prisma.property.findUnique({where:{canonicalId},select:{id:true,canonicalId:true,title:true,publicationStatus:true}}); if(!p)throw new Error('Property not found'); console.log(p.canonicalId,p.title,p.publicationStatus,'=>',status); if(!dry) await prisma.property.update({where:{canonicalId},data:{publicationStatus:status}}); else console.log('DRY RUN'); }
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>prisma.$disconnect());
