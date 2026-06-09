#!/usr/bin/env node
/* eslint-disable no-console */
const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");
const INCLUDE_KNOWN = process.argv.includes("--include-known-demo");
const models = Prisma.dmmf.datamodel.models;
const model = (name) => models.find(m => m.name === name) || null;
const delegate = (name) => name.charAt(0).toLowerCase()+name.slice(1);
const fset = (name) => new Set((model(name)?.fields||[]).map(f=>f.name));
const has = (name, field) => fset(name).has(field);
function add(or, field, value){ if(has("Property",field)) or.push({[field]:value}); }
function starts(or, field, value){ if(has("Property",field)) or.push({[field]:{startsWith:value}}); }
function selectFields(){ const s={id:true}; for(const f of ["title","city","externalId","sourceExternalId","sourcePortal","sourceUrl"]) if(has("Property",f)) s[f]=true; return s; }
async function safeDelete(modelName, propertyId){ if(!model(modelName) || !prisma[delegate(modelName)] || !has(modelName,"propertyId")) return; await prisma[delegate(modelName)].deleteMany({where:{propertyId}}).catch(()=>{}); }
async function main(){
  const or=[];
  add(or,"sourcePortal","seed"); add(or,"sourcePortal","demo");
  starts(or,"externalId","seed_"); starts(or,"externalId","demo_"); starts(or,"externalId","test_");
  starts(or,"sourceExternalId","seed_"); starts(or,"sourceExternalId","demo_"); starts(or,"sourceExternalId","test_");
  if(INCLUDE_KNOWN && has("Property","title")) or.push({title:{in:["Einfamilienhaus mit Grundstück in Chemnitz","Doppelhaushälfte in Wohnlage in Dresden","Mehrfamilienhaus mit Sanierungsbedarf in Leipzig","Eigentumswohnung im Mehrfamilienhaus in Zwickau","Garage / Stellplatz in Berlin","Einfamilienhaus mit Grundstück in Erfurt","Einfamilienhaus in Chemnitz","Doppelhaushälfte in Dresden"]}});
  if(!or.length){ console.log("No usable filters for this schema."); return; }
  const rows=await prisma.property.findMany({where:{OR:or},select:selectFields()});
  console.log("matches:", rows.length);
  for(const r of rows.slice(0,100)) console.log("-", r.id, r.title||"", r.city||"", r.externalId||r.sourceExternalId||"");
  if(DRY_RUN) return;
  for(const r of rows){ for(const m of ["Favorite","PropertyImage","Image","PropertyPhoto","Photo","PropertyDocument","Document","PropertyFile","File"]) await safeDelete(m,r.id); await prisma.property.delete({where:{id:r.id}}).catch(()=>prisma.property.deleteMany({where:{id:r.id}})); }
  console.log("deleted:", rows.length);
}
main().finally(()=>prisma.$disconnect());
