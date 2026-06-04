import fs from "node:fs";
import path from "node:path";

const filePath = path.join(process.cwd(), "app", "layout.tsx");

if (!fs.existsSync(filePath)) {
  console.error("app/layout.tsx not found");
  process.exit(1);
}

let source = fs.readFileSync(filePath, "utf8");
const original = source;

// Ensure getLocale import exists.
if (!source.includes('getLocale') || !source.includes('@/lib/i18n/server')) {
  source = 'import { getLocale } from "@/lib/i18n/server";\n' + source;
} else if (source.includes('@/lib/i18n/server') && !source.includes('import { getLocale }')) {
  // If there is an i18n/server import without getLocale, add it.
  source = source.replace(
    /import\s+\{([^}]+)\}\s+from\s+["']@\/lib\/i18n\/server["'];/,
    (m, imports) => {
      if (imports.includes("getLocale")) return m;
      return `import { ${imports.trim()}, getLocale } from "@/lib/i18n/server";`;
    }
  );
}

// Remove duplicate getLocale import if any.
const lines = source.split("\n");
let seen = false;
const filtered = [];
for (const line of lines) {
  if (line.trim() === 'import { getLocale } from "@/lib/i18n/server";') {
    if (seen) continue;
    seen = true;
  }
  filtered.push(line);
}
source = filtered.join("\n");

// If script accidentally removed Header/Footer imports, do nothing here.

// Normalize indentation around RootLayout.
source = source.replace(
  /export default async function RootLayout\(\{ children \}: \{ children: React\.ReactNode \}\) \{\s*const locale = await getLocale\(\);/,
  'export default async function RootLayout({ children }: { children: React.ReactNode }) {\n  const locale = await getLocale();'
);

if (source !== original) {
  fs.writeFileSync(filePath, source, "utf8");
  console.log("Fixed app/layout.tsx getLocale import.");
} else {
  console.log("No changes made to app/layout.tsx.");
}

console.log("Now run: npm run build");
