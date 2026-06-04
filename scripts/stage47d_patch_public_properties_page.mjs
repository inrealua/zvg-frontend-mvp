import fs from "node:fs";
import path from "node:path";

const filePath = path.join(process.cwd(), "components", "PublicPropertiesPage.tsx");

if (!fs.existsSync(filePath)) {
  console.log("components/PublicPropertiesPage.tsx not found. Skipping.");
  process.exit(0);
}

let source = fs.readFileSync(filePath, "utf8");
let changed = false;

function addImport(statement) {
  if (!source.includes(statement)) {
    source = statement + "\n" + source;
    changed = true;
  }
}

addImport('import { getI18n } from "@/lib/i18n/server";');
addImport('import { getPublicUi } from "@/lib/i18n/property-labels";');
addImport('import { translationInclude } from "@/lib/i18n/property-translations";');

if (!source.includes("const { locale } = await getI18n();")) {
  const match =
    source.match(/export\s+async\s+function\s+PublicPropertiesPage\s*\([^)]*\)\s*\{/) ||
    source.match(/async\s+function\s+PublicPropertiesPage\s*\([^)]*\)\s*\{/);

  if (match) {
    const pos = match.index + match[0].length;
    source = source.slice(0, pos) + "\n  const { locale } = await getI18n();\n  const publicUi = getPublicUi(locale);" + source.slice(pos);
    changed = true;
  } else {
    console.warn("Could not find PublicPropertiesPage function.");
  }
} else if (!source.includes("const publicUi = getPublicUi(locale);")) {
  source = source.replace("const { locale } = await getI18n();", "const { locale } = await getI18n();\n  const publicUi = getPublicUi(locale);");
  changed = true;
}

if (!source.includes("...translationInclude(locale)")) {
  source = source.replace(/include:\s*\{\s*images:/g, "include: { ...translationInclude(locale), images:");
  source = source.replace(/include:\s*\{\s*\n\s*images:/g, "include: {\n        ...translationInclude(locale),\n        images:");
  changed = true;
}

if (!source.includes("locale={locale}")) {
  source = source.replace(/<PropertyCard\s+([^>]*?)\/>/g, (full) => {
    if (full.includes("locale={locale}")) return full;
    return full.replace(/\/>$/, " locale={locale} />");
  });
  changed = true;
}

const replacements = [
  ["Top 12 aktuelle Objekte", "{publicUi.topTitle}"],
  ["Kurze Auswahl für die Startseite. Die vollständige Recherche finden Sie in der erweiterten Kartensuche.", "{publicUi.topSubtitle}"],
  ["Kurze Auswahl für die Startseite. Die vollständige Recherche finden Sie in der erweiterten Suche.", "{publicUi.topSubtitle}"],
  ["Zur erweiterten Suche", "{publicUi.advancedSearch}"],
];

for (const [from, to] of replacements) {
  if (source.includes(from)) {
    source = source.replaceAll(from, to);
    changed = true;
  }
}

// Fix text nodes that became plain {publicUi...} inside JSX strings incorrectly in attributes is not expected.
// Common safe result: <h2>{publicUi.topTitle}</h2>, <p>{publicUi.topSubtitle}</p>, <Link>{publicUi.advancedSearch}</Link>.

if (changed) {
  fs.writeFileSync(filePath, source, "utf8");
  console.log("PublicPropertiesPage.tsx patched for Stage 47D.");
} else {
  console.log("No changes made.");
}
