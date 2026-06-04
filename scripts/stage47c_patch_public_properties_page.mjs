import fs from "node:fs";
import path from "node:path";

const filePath = path.join(process.cwd(), "components", "PublicPropertiesPage.tsx");

if (!fs.existsSync(filePath)) {
  console.log("components/PublicPropertiesPage.tsx not found. Skipping public page patch.");
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
addImport('import { translationInclude } from "@/lib/i18n/property-translations";');

if (!source.includes("const { locale } = await getI18n();")) {
  const functionPatterns = [
    /export\s+async\s+function\s+PublicPropertiesPage\s*\([^)]*\)\s*\{/,
    /export\s+default\s+async\s+function\s+PublicPropertiesPage\s*\([^)]*\)\s*\{/,
    /async\s+function\s+PublicPropertiesPage\s*\([^)]*\)\s*\{/,
  ];

  let patchedFunction = false;
  for (const pattern of functionPatterns) {
    const match = source.match(pattern);
    if (match) {
      const insertAt = match.index + match[0].length;
      source = source.slice(0, insertAt) + "\n  const { locale } = await getI18n();" + source.slice(insertAt);
      changed = true;
      patchedFunction = true;
      break;
    }
  }

  if (!patchedFunction) {
    console.warn("Could not find PublicPropertiesPage async function. You may need to add `const { locale } = await getI18n();` manually.");
  }
}

// Add translations include near common include blocks.
if (!source.includes("...translationInclude(locale)")) {
  source = source.replace(/include:\s*\{\s*images:/g, "include: { ...translationInclude(locale), images:");
  source = source.replace(/include:\s*\{\s*\n\s*images:/g, "include: {\n        ...translationInclude(locale),\n        images:");
  changed = true;
}

// Pass locale into PropertyCard.
if (!source.includes("locale={locale}")) {
  source = source.replace(/<PropertyCard\s+property=\{([^}]+)\}/g, "<PropertyCard property={$1} locale={locale}");
  source = source.replace(/<PropertyCard\s+([^>]*?)property=\{([^}]+)\}([^>]*?)\/>/g, (m, before, prop, after) => {
    if (m.includes("locale={locale}")) return m;
    return `<PropertyCard ${before}property={${prop}} locale={locale}${after}/>`;
  });
  changed = true;
}

if (changed) {
  fs.writeFileSync(filePath, source, "utf8");
  console.log("PublicPropertiesPage.tsx patched for localized PropertyCard.");
} else {
  console.log("PublicPropertiesPage.tsx already appears to be patched.");
}
