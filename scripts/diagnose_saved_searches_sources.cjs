const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();

const targets = [
  "app/api/saved-searches/route.ts",
  "app/api/saved-searches/[id]/route.ts",
  "components/PublicPropertiesPage.tsx",
  "components/SavedSearches.tsx",
  "components/CabinetPage.tsx",
  "app/cabinet/page.tsx",
  "app/[locale]/cabinet/page.tsx",
  "prisma/schema.prisma",
];

for (const rel of targets) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) continue;

  console.log("\n\n===== " + rel + " =====\n");
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  const max = Math.min(lines.length, 220);
  for (let i = 0; i < max; i++) {
    console.log(String(i + 1).padStart(4, " ") + ": " + lines[i]);
  }
}
