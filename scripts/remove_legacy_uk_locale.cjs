#!/usr/bin/env node
/* eslint-disable no-console */
require('./load_env.cjs');
const fs = require('node:fs');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function main() {
  const rows = await prisma.$queryRawUnsafe(
    "SELECT * FROM `PropertyTranslation` WHERE `locale` = 'UK' ORDER BY `propertyId`, `id`"
  );

  console.log(`Legacy UK translations found: ${rows.length}`);
  if (!rows.length) {
    console.log('[OK] Nothing to remove. Database already has no UK translation rows.');
    return;
  }

  const backupDir = path.join(process.cwd(), 'backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `legacy-uk-translations-${stamp()}.json`);
  fs.writeFileSync(
    backupPath,
    JSON.stringify({ createdAt: new Date().toISOString(), count: rows.length, rows }, null, 2),
    'utf8'
  );
  console.log(`[OK] Backup written: ${backupPath}`);

  const deleted = await prisma.$executeRawUnsafe(
    "DELETE FROM `PropertyTranslation` WHERE `locale` = 'UK'"
  );
  console.log(`[OK] Deleted legacy UK translations: ${deleted}`);

  const remaining = await prisma.$queryRawUnsafe(
    "SELECT COUNT(*) AS `count` FROM `PropertyTranslation` WHERE `locale` = 'UK'"
  );
  const count = Number(remaining?.[0]?.count || 0);
  if (count !== 0) throw new Error(`UK cleanup verification failed: ${count} rows remain.`);
  console.log('[OK] Verification passed: 0 UK rows remain.');
  console.log('[NEXT] Run: npm run db:push');
}

main()
  .catch((error) => {
    console.error('[ERROR]', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
