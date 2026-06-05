import fs from "node:fs";
import path from "node:path";

const filePath = path.join(process.cwd(), "components", "PublicPropertiesPage.tsx");

if (!fs.existsSync(filePath)) {
  console.error("components/PublicPropertiesPage.tsx not found");
  process.exit(1);
}

let source = fs.readFileSync(filePath, "utf8");
const original = source;

// The previous patch moved siteText into a helper function outside component scope.
// This fixes it by adding siteText as a helper argument and passing it from the component.

function addSiteTextParamToFunction(fnName) {
  const fnRe = new RegExp(`function\\s+${fnName}\\s*\\(([^)]*)\\)\\s*\\{`);
  source = source.replace(fnRe, (match, args) => {
    if (args.includes("siteText")) return match;
    const clean = args.trim();
    return `function ${fnName}(${clean ? clean + ", " : ""}siteText: ReturnType<typeof getSiteText>) {`;
  });
}

function addSiteTextToCalls(fnName) {
  // Add siteText to calls like: const copy = getHeroCopy(mode);
  // Avoid touching the function declaration.
  const callRe = new RegExp(`(?<!function\\s)${fnName}\\s*\\(([^)]*)\\)`, "g");
  source = source.replace(callRe, (match, args) => {
    if (args.includes("siteText")) return match;
    const clean = args.trim();
    return `${fnName}(${clean ? clean + ", " : ""}siteText)`;
  });

  // Repair declaration if the negative lookbehind was not supported/acted unexpectedly.
  source = source.replace(
    new RegExp(`function\\s+${fnName}\\s*\\(([^)]*),\\s*siteText\\)\\s*siteText:`, "g"),
    `function ${fnName}($1, siteText:`
  );
}

// Find helper functions that contain siteText but are declared outside the main component.
const candidates = [];
const functionRegex = /function\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)\s*\{/g;
let match;

while ((match = functionRegex.exec(source)) !== null) {
  const fnName = match[1];
  const start = match.index;
  const nextFunction = source.indexOf("\nfunction ", start + 1);
  const nextExport = source.indexOf("\nexport ", start + 1);
  const endCandidates = [nextFunction, nextExport].filter((n) => n > start);
  const end = endCandidates.length ? Math.min(...endCandidates) : source.length;
  const bodySlice = source.slice(start, end);

  if (bodySlice.includes("siteText.") && bodySlice.includes('mode === "map"')) {
    candidates.push(fnName);
  }
}

if (candidates.length === 0) {
  // Common names from previous generated versions.
  for (const fnName of ["getHeroCopy", "getPageCopy", "getCopy", "getPublicCopy"]) {
    const fnRe = new RegExp(`function\\s+${fnName}\\s*\\(`);
    if (fnRe.test(source) && source.includes("siteText.")) candidates.push(fnName);
  }
}

for (const fnName of [...new Set(candidates)]) {
  addSiteTextParamToFunction(fnName);
  addSiteTextToCalls(fnName);
  console.log("patched helper", fnName);
}

// If the helper was not found or still cannot see siteText, fall back to keeping map-copy values stable.
// This fallback only applies to the top helper return block at lines around the error.
if (source.includes("kicker: siteText.hero.kickerMap") && candidates.length === 0) {
  source = source.replaceAll("kicker: siteText.hero.kickerMap", 'kicker: "KARTE · DEUTSCHLANDWEIT SUCHEN"');
  source = source.replaceAll("title: siteText.hero.mapTitle", 'title: "Gerichtliche Versteigerungen auf der Karte finden"');
  source = source.replaceAll("text: siteText.hero.mapSubtitle", 'text: "Suchen Sie nach Regionen, Gerichten, Preisen und Objektarten. Die Karte unterstützt Gebietssuche und Polygon-Auswahl."');
  source = source.replaceAll("listTitle: siteText.map.title", 'listTitle: "Karte der Objekte"');
  source = source.replaceAll("listText: siteText.map.subtitle", 'listText: "Suchen Sie in der sichtbaren Kartenfläche oder zeichnen Sie eine eigene Suchregion."');
}

// Ensure import exists if ReturnType<typeof getSiteText> is used.
if (source.includes("ReturnType<typeof getSiteText>") && !source.includes('getSiteText } from "@/lib/i18n/site-text"')) {
  if (!source.includes('from "@/lib/i18n/site-text"')) {
    source = 'import { getSiteText } from "@/lib/i18n/site-text";\n' + source;
  }
}

// Avoid duplicated call argument, e.g. getHeroCopy(mode, siteText, siteText)
source = source.replaceAll(", siteText, siteText", ", siteText");

if (source !== original) {
  fs.writeFileSync(filePath, source, "utf8");
  console.log("Fixed siteText scope in PublicPropertiesPage.tsx.");
} else {
  console.log("No changes made. Please send components/PublicPropertiesPage.tsx for full-file replacement.");
}

console.log("Now run: npm run build");
