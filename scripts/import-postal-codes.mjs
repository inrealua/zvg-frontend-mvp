import { PrismaClient } from "@prisma/client";
import fs from "node:fs";

const prisma = new PrismaClient();
const csvPath = process.argv[2];

if (!csvPath) {
  console.error("Usage: node ./scripts/import-postal-codes.mjs ./path/to/postal_codes.csv");
  process.exit(1);
}

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === "," && !quoted) {
      result.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current);
  return result.map((value) => value.trim());
}

const content = fs.readFileSync(csvPath, "utf8").replace(/^\uFEFF/, "");
const lines = content.split(/\r?\n/).filter(Boolean);
const header = parseCsvLine(lines.shift() || "").map((item) => item.toLowerCase());

const index = {
  code: header.indexOf("code"),
  city: header.indexOf("city"),
  state: header.indexOf("state"),
  latitude: header.indexOf("latitude"),
  longitude: header.indexOf("longitude"),
};

for (const [key, value] of Object.entries(index)) {
  if (value === -1) {
    console.error(`Missing CSV column: ${key}`);
    process.exit(1);
  }
}

const rowsByCode = new Map();

for (const line of lines) {
  const row = parseCsvLine(line);

  const code = row[index.code];
  const city = row[index.city];
  const state = row[index.state] || null;
  const latitude = Number(row[index.latitude]);
  const longitude = Number(row[index.longitude]);

  if (!/^\d{5}$/.test(code) || !city || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    continue;
  }

  // Оставляем одну запись на один PLZ. Для радиус-поиска этого достаточно.
  if (!rowsByCode.has(code)) {
    rowsByCode.set(code, {
      code,
      city,
      state,
      latitude,
      longitude,
    });
  }
}

const rows = Array.from(rowsByCode.values());

console.log(`Prepared ${rows.length} unique postal codes.`);

console.log("Clearing PostalCode table...");
await prisma.postalCode.deleteMany();

const batchSize = 1000;
let imported = 0;

for (let i = 0; i < rows.length; i += batchSize) {
  const batch = rows.slice(i, i + batchSize);

  await prisma.postalCode.createMany({
    data: batch,
    skipDuplicates: true,
  });

  imported += batch.length;
  console.log(`Imported ${imported}/${rows.length}`);
}

console.log(`Done. Imported ${imported} postal codes.`);
await prisma.$disconnect();