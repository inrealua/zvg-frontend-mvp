import fs from "node:fs";
import path from "node:path";

const filePath = path.join(process.cwd(), "components", "PublicPropertiesPage.tsx");

if (!fs.existsSync(filePath)) {
  console.error("components/PublicPropertiesPage.tsx not found");
  process.exit(1);
}

let source = fs.readFileSync(filePath, "utf8");
const original = source;

// Fix object literals broken by previous patch.
// In TS objects it must be: title: siteText.hero.mapTitle
// Not: title: {siteText.hero.mapTitle}
source = source.replace(/:\s*\{\s*(siteText\.[A-Za-z0-9_.]+)\s*\}/g, ": $1");

// Also fix array/object values if they became quoted JSX-like placeholders.
source = source.replace(/:\s*"\{(siteText\.[A-Za-z0-9_.]+)\}"/g, ": $1");

// Fix JSX text that should keep braces.
// If the previous regex changed JSX incorrectly, this keeps common valid form.
source = source.replace(/>\s*siteText\.([A-Za-z0-9_.]+)\s*</g, (m) => {
  const expr = m.slice(1, -1).trim();
  return `>{${expr}}<`;
});

// Fix common map copy leftovers to use siteText too.
source = source.replace('kicker: "Karte · Deutschlandweit suchen"', "kicker: siteText.hero.kickerMap");
source = source.replace('listTitle: "Objekte auf der Karte"', "listTitle: siteText.map.title");
source = source.replace('listText: "Die Liste entspricht denselben Filtern wie die Kartenansicht."', "listText: siteText.map.subtitle");

// If siteText is used in helper function outside component scope, build may fail next.
// The safe way is to pass siteText into helper. This script handles common function names.
source = source.replace(
  /function\s+getHeroCopy\s*\(([^)]*)\)\s*\{/,
  (match, args) => {
    if (args.includes("siteText")) return match;
    return `function getHeroCopy(${args ? args + ", " : ""}siteText: ReturnType<typeof getSiteText>) {`;
  }
);

source = source.replace(
  /const\s+getHeroCopy\s*=\s*\(([^)]*)\)\s*=>\s*\{/,
  (match, args) => {
    if (args.includes("siteText")) return match;
    return `const getHeroCopy = (${args ? args + ", " : ""}siteText: ReturnType<typeof getSiteText>) => {`;
  }
);

// If calls exist without siteText, add it.
source = source.replace(/getHeroCopy\(([^)]*)\)/g, (match, args) => {
  if (args.includes("siteText")) return match;
  const clean = args.trim();
  return `getHeroCopy(${clean ? clean + ", " : ""}siteText)`;
});

// Avoid changing function declaration that got touched by call replacement.
source = source.replace(/function getHeroCopy\((.*?)siteText\)\s*siteText:/g, "function getHeroCopy($1siteText:");
source = source.replace(/function getHeroCopy\((.*?)siteText,\s*siteText:/g, "function getHeroCopy($1siteText:");

if (source !== original) {
  fs.writeFileSync(filePath, source, "utf8");
  console.log("Fixed PublicPropertiesPage object literal i18n expressions.");
} else {
  console.log("No changes made.");
}

console.log("Now run: npm run build");
