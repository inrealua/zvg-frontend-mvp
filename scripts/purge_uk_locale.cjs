#!/usr/bin/env node
/* eslint-disable no-console */
require('./load_env.cjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const execute = process.argv.includes('--execute');
const confirmIndex = process.argv.indexOf('--confirm');
const confirm = confirmIndex >= 0 ? process.argv[confirmIndex + 1] : '';

async function scalar(sql) {
  const rows = await prisma.$queryRawUnsafe(sql);
  const value = rows?.[0] ? Object.values(rows[0])[0] : 0;
  return Number(value || 0);
}

async function main() {
  const ukBefore = await scalar("SELECT COUNT(*) AS c FROM `PropertyTranslation` WHERE `locale`='UK'");
  const usersBefore = await prisma.user.count();
  const savedBefore = await prisma.savedSearch.count();

  console.log('Legacy Ukrainian PropertyTranslation rows:', ukBefore);
  console.log('Users:', usersBefore, 'Saved searches:', savedBefore);

  if (!execute) {
    console.log('DRY RUN ONLY — nothing deleted.');
    console.log('To remove legacy UK rows:');
    console.log('npm run locale:purge-uk -- --execute --confirm REMOVE_UK');
    return;
  }

  if (confirm !== 'REMOVE_UK') {
    throw new Error('Refusing to delete. Required: --confirm REMOVE_UK');
  }

  await prisma.$executeRawUnsafe("DELETE FROM `PropertyTranslation` WHERE `locale`='UK'");

  const ukAfter = await scalar("SELECT COUNT(*) AS c FROM `PropertyTranslation` WHERE `locale`='UK'");
  const usersAfter = await prisma.user.count();
  const savedAfter = await prisma.savedSearch.count();

  if (ukAfter !== 0) throw new Error(`UK rows remain: ${ukAfter}`);
  if (usersAfter !== usersBefore) throw new Error(`User count changed: ${usersBefore} -> ${usersAfter}`);
  if (savedAfter !== savedBefore) throw new Error(`SavedSearch count changed: ${savedBefore} -> ${savedAfter}`);

  console.log('Removed legacy UK translations:', ukBefore);
  console.log('Legacy UK translations now: 0');
  console.log('Users unchanged:', usersAfter);
  console.log('Saved searches unchanged:', savedAfter);
  console.log('OK — database is ready for enum DE/RU/EN only.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
