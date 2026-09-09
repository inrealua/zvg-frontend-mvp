#!/usr/bin/env node
/* eslint-disable no-console */
require('./load_env.cjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cols = await prisma.$queryRawUnsafe('SHOW COLUMNS FROM `Property`');
  const names = new Set(cols.map((x) => x.Field));
  const required = [
    'canonicalId','publicationStatus','analysisVersion','primarySourcePortal','investmentScore',
    'bidMaximumEur','marketJson','enrichmentJson','qualityGateJson','constructionRisksJson','legalRisksJson'
  ];
  const tcols = await prisma.$queryRawUnsafe('SHOW COLUMNS FROM `PropertyTranslation`');
  const tn = new Set(tcols.map((x) => x.Field));
  const tr = ['shortDescription','longDescription','buildingAndLayout','localizedFieldsJson','marketSummary','riskSummary'];

  const ukRows = await prisma.$queryRawUnsafe(
    "SELECT COUNT(*) AS `count` FROM `PropertyTranslation` WHERE `locale` = 'UK'"
  ).catch(() => [{ count: 0 }]);
  const ukCount = Number(ukRows?.[0]?.count || 0);

  const schemaReady = required.every((x) => names.has(x)) && tr.every((x) => tn.has(x));
  console.log('DB schema:', schemaReady ? 'READY' : 'NOT READY');
  for (const x of required) console.log(names.has(x) ? '[ok]' : '[missing]', `Property.${x}`);
  for (const x of tr) console.log(tn.has(x) ? '[ok]' : '[missing]', `PropertyTranslation.${x}`);
  console.log(ukCount === 0 ? '[ok]' : '[legacy]', `PropertyTranslation locale UK rows: ${ukCount}`);

  if (required.every((x) => names.has(x))) {
    const counts = await prisma.property.groupBy({ by: ['publicationStatus'], _count: { _all: true } }).catch(() => []);
    console.log('Publication status counts:', counts);
  }
  console.log('Users:', await prisma.user.count(), 'Saved searches:', await prisma.savedSearch.count());
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
