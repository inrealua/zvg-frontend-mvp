const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const root = process.cwd();
const dataPath = path.join(root, "data", "zvg-analysis-v3", "chemnitz_analysis_v3.json");

function normalizeAz(value) {
  const s = String(value || "").toUpperCase().replace(/\s+/g, " ").trim();
  const m = s.match(/0*(\d+)\s*K\s*0*(\d+)\s*\/\s*(\d{4})/i);
  if (m) return `${Number(m[1])}K${Number(m[2])}/${m[3]}`;
  return s.replace(/[^A-Z0-9/]/g, "");
}

async function findProperty(caseKey) {
  const rows = await prisma.property.findMany({
    select: { id: true, aktenzeichen: true, normalizedAktenzeichen: true, title: true },
  });
  return rows.find((row) => normalizeAz(row.aktenzeichen) === caseKey || normalizeAz(row.normalizedAktenzeichen) === caseKey) || null;
}

async function main() {
  if (!fs.existsSync(dataPath)) throw new Error(`Missing analysis data: ${dataPath}`);
  const records = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  if (!Array.isArray(records) || records.length === 0) throw new Error("Analysis data is empty");

  console.log(`Applying ZVG-DE analysis v3 to ${records.length} object(s)...`);

  for (const record of records) {
    const property = await findProperty(record.caseKey);
    if (!property) throw new Error(`Property not found for ${record.aktenzeichen} (${record.caseKey})`);

    const de = record.translations.DE;
    const base = record.base || {};

    await prisma.$transaction(async (tx) => {
      await tx.property.update({
        where: { id: property.id },
        data: {
          title: base.title || de.title,
          propertyType: base.propertyType || de.propertyType || undefined,
          livingArea: base.livingArea ?? undefined,
          plotArea: base.plotArea === null ? null : (base.plotArea ?? undefined),
          yearBuilt: base.yearBuilt ?? undefined,
          occupancyStatus: base.occupancyStatus || undefined,
          marketValue: base.marketValue ?? undefined,
          description: de.description,
          locationDescription: de.locationDescription || null,
          source: base.source || "ZVG-Portal / ZVG-DE Analyse",
          analysisJson: record.analysis,
          lastSourceUpdate: new Date(),
        },
      });

      for (const locale of ["DE", "RU", "EN"]) {
        const t = record.translations[locale];
        await tx.propertyTranslation.upsert({
          where: { propertyId_locale: { propertyId: property.id, locale } },
          update: {
            title: t.title,
            propertyType: t.propertyType || null,
            description: t.description,
            locationDescription: t.locationDescription || null,
          },
          create: {
            propertyId: property.id,
            locale,
            title: t.title,
            propertyType: t.propertyType || null,
            description: t.description,
            locationDescription: t.locationDescription || null,
          },
        });
      }
    });

    const check = await prisma.property.findUnique({
      where: { id: property.id },
      include: { translations: true, images: true, documents: true },
    });
    console.log(`[OK] ${record.aktenzeichen} -> ${property.id} | translations=${check.translations.length} images=${check.images.length} docs=${check.documents.length} analysis=${check.analysisJson ? "yes" : "no"}`);
  }
}

main()
  .catch((error) => {
    console.error("[ERROR]", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
