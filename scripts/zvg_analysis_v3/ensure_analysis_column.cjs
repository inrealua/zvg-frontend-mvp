const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) AS cnt
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'Property'
      AND COLUMN_NAME = 'analysisJson'
  `);
  const cnt = Number(rows?.[0]?.cnt ?? 0);
  if (cnt > 0) {
    console.log('[SKIP] Property.analysisJson already exists in MySQL.');
    return;
  }
  console.log('[DB] Adding exactly one nullable JSON column: Property.analysisJson');
  await prisma.$executeRawUnsafe('ALTER TABLE `Property` ADD COLUMN `analysisJson` JSON NULL');
  console.log('[OK] Property.analysisJson added.');
}

main()
  .catch((error) => {
    console.error('[ERROR]', error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
