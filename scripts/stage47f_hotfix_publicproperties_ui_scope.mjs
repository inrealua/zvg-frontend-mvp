import fs from "node:fs";
import path from "node:path";

const filePath = path.join(process.cwd(), "components", "PublicPropertiesPage.tsx");

if (!fs.existsSync(filePath)) {
  console.error("components/PublicPropertiesPage.tsx not found");
  process.exit(1);
}

let source = fs.readFileSync(filePath, "utf8");
const original = source;

// ui is not in scope in PublicPropertiesPage summary block.
// Replace ui.map.* with stable German labels to restore build.
// The full localized PublicPropertiesPage should be redone later as a clean full-file replacement.

const replacements = new Map([
  ["ui.map.page", '"Seite"'],
  ["ui.map.found", '"Gefunden"'],
  ["ui.map.active", '"Aktiv"'],
  ["ui.map.cancelled", '"Aufgehoben"'],
  ["ui.map.maxValue", '"Max. Wert"'],
  ["ui.map.title", '"Karte der Objekte"'],
  ["ui.map.subtitle", '"Suchen Sie in der sichtbaren Kartenfläche oder zeichnen Sie eine eigene Suchregion."'],
  ["ui.map.searchThisArea", '"In diesem Kartenausschnitt suchen"'],
  ["ui.map.drawRegion", '"Region zeichnen"'],

  ["ui.hero.title", '"Alle gerichtlichen Versteigerungen an einem Ort."'],
  ["ui.hero.subtitle", '"Transparent. Verlässlich. Übersichtlich."'],

  ["ui.common.advancedSearch", '"Erweiterte Suche"'],
  ["ui.common.moreDetails", '"Details ansehen"'],
]);

for (const [from, to] of replacements.entries()) {
  source = source.replaceAll(`{${from}}`, to.slice(1, -1));
  source = source.replaceAll(from, to);
}

// Fix JSX object cases if quotes were stripped by previous scripts.
source = source.replaceAll("<span>\"Seite\"</span>", "<span>Seite</span>");
source = source.replaceAll("<span>\"Gefunden\"</span>", "<span>Gefunden</span>");
source = source.replaceAll("<span>\"Aktiv\"</span>", "<span>Aktiv</span>");
source = source.replaceAll("<span>\"Aufgehoben\"</span>", "<span>Aufgehoben</span>");
source = source.replaceAll("<span>\"Max. Wert\"</span>", "<span>Max. Wert</span>");

// Remove unused ui-text imports/variables if ui no longer exists.
if (!source.includes("ui.")) {
  source = source.replace(/^import\s+\{\s*getUiText\s*\}\s+from\s+["']@\/lib\/i18n\/ui-texts["'];\s*\n/gm, "");
  source = source.replace(/\n\s*const\s+ui\s*=\s*getUiText\(locale\);\s*/g, "\n");
}

// If duplicate getI18n locale declarations remain, keep first only.
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

if (source !== original) {
  fs.writeFileSync(filePath, source, "utf8");
  console.log("Fixed out-of-scope ui references in PublicPropertiesPage.tsx.");
} else {
  console.log("No changes made.");
}

console.log("Now run: npm run build");
