import fs from "node:fs";
import path from "node:path";

const filePath = path.join(process.cwd(), "components", "FilterBar.tsx");

if (!fs.existsSync(filePath)) {
  console.error("components/FilterBar.tsx not found");
  process.exit(1);
}

let source = fs.readFileSync(filePath, "utf8");
const original = source;

// Fix JSX attributes broken by previous patch:
// title=ui.search.propertyType  -> title={ui.search.propertyType}
// title=ui.search.usage         -> title={ui.search.usage}
// title=ui.search.federalState  -> title={ui.search.federalState}
// Also handles label= / placeholder= / aria-label= / valueLabel= if broken.
const attrs = [
  "title",
  "label",
  "placeholder",
  "aria-label",
  "valueLabel",
  "emptyLabel",
  "resetLabel",
  "buttonLabel",
];

for (const attr of attrs) {
  const escaped = attr.replace("-", "\\-");
  const re = new RegExp(`\\b${escaped}=((?:ui|publicUi)\\.[A-Za-z0-9_.]+)`, "g");
  source = source.replace(re, `${attr}={$1}`);
}

// Fix object/function arguments broken as {ui.x} inside non-JSX calls.
source = source.replace(/selectedLabel\(([^,]+),\s*\{(ui\.[A-Za-z0-9_.]+)\}\)/g, "selectedLabel($1, $2)");
source = source.replace(/formatRangeLabel\(([^,]+),\s*\{(ui\.[A-Za-z0-9_.]+)\}\)/g, "formatRangeLabel($1, $2)");

// Fix remaining invalid attribute style cases with quotes accidentally removed.
source = source.replace(/=\{(ui\.[A-Za-z0-9_.]+)\}\}/g, "={$1}");

// If the patch inserted server i18n into a client file, keep only if this is not a client component.
// FilterBar is normally a server component, so getI18n/getUiText can remain.

// Remove duplicate locale/ui declarations if present.
let seenLocale = false;
source = source
  .split("\n")
  .filter((line) => {
    if (/const\s+\{\s*locale\s*\}\s*=\s*await\s+getI18n\(\);/.test(line)) {
      if (seenLocale) return false;
      seenLocale = true;
    }
    return true;
  })
  .join("\n");

let seenUi = false;
source = source
  .split("\n")
  .filter((line) => {
    if (/const\s+ui\s*=\s*getUiText\(locale\);/.test(line)) {
      if (seenUi) return false;
      seenUi = true;
    }
    return true;
  })
  .join("\n");

if (source !== original) {
  fs.writeFileSync(filePath, source, "utf8");
  console.log("Fixed components/FilterBar.tsx JSX attribute expressions.");
} else {
  console.log("No changes made to components/FilterBar.tsx.");
}

console.log("Now run: npm run build");
