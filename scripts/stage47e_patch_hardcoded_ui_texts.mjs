import fs from "node:fs";
import path from "node:path";

const roots = ["components", "app"];
const extensions = new Set([".tsx", ".ts"]);

const map = new Map(Object.entries({
  "Alle gerichtlichen Versteigerungen an einem Ort.": "ui.hero.title",
  "Transparent. Verlässlich. Übersichtlich. Finden Sie Immobilien, Grundstücke und weitere Objekte aus gerichtlichen Versteigerungen mit Karte, Filtern und strukturierten Informationen.": "ui.hero.subtitle",
  "Geprüfte Quellen": "ui.hero.checkedSources",
  "Täglich aktualisiert": "ui.hero.dailyUpdated",
  "Deutschlandweit": "ui.hero.nationwide",
  "Objekte in der Datenbank": "ui.hero.databaseObjects",
  "Bundesländer": "ui.hero.federalStates",
  "kostenlos suchen": "ui.hero.freeSearch",
  "Schnellsuche": "ui.quickSearch.title",
  "Starten Sie mit den wichtigsten Kriterien. Die vollständige Suche finden Sie auf der Kartenseite.": "ui.quickSearch.subtitle",
  "Ort, PLZ, Adresse oder Gericht": "ui.quickSearch.queryLabel",
  "z. B. Chemnitz, 09111, Amtsgericht Dresden": "ui.quickSearch.queryPlaceholder",
  "Bundesland": "ui.search.federalState",
  "Alle Bundesländer": "ui.search.allStates",
  "Objektart": "ui.search.propertyType",
  "Alle Typen": "ui.quickSearch.allTypes",
  "Verkehrswert bis": "ui.quickSearch.maxValue",
  "Schnell suchen": "ui.quickSearch.quickSearch",
  "Erweiterte Suche": "ui.common.advancedSearch",
  "Alle Filter auf einer Seite. Der Filterbereich scrollt normal mit der Seite.": "ui.search.subtitle",
  "Suche": "ui.search.query",
  "Ort": "ui.search.city",
  "PLZ": "ui.search.postalCode",
  "Umkreis": "ui.search.radius",
  "Amtsgericht": "ui.search.court",
  "Status": "ui.search.status",
  "Nutzung": "ui.search.usage",
  "Verkehrswert": "ui.search.marketValue",
  "Wohnfläche": "ui.search.livingArea",
  "Grundstück": "ui.search.plotArea",
  "Termin ab": "ui.search.dateFrom",
  "Termin bis": "ui.search.dateTo",
  "Denkmalschutz": "ui.search.heritage",
  "Wertgrenzen": "ui.search.valueLimits",
  "Termin-Nr.": "ui.search.auctionNo",
  "Sortierung": "ui.search.sorting",
  "Anzeigen": "ui.search.perPage",
  "Alle Orte": "ui.search.allCities",
  "Kein Radius": "ui.search.noRadius",
  "Alle Gerichte": "ui.search.allCourts",
  "Alle aktuellen": "ui.search.activeOnly",
  "Alle Arten": "ui.search.allTypes",
  "Jede Nutzung": "ui.search.anyUsage",
  "Objekte finden": "ui.search.findObjects",
  "Filter zurücksetzen": "ui.search.resetFilters",
  "Zurücksetzen": "ui.common.reset",
  "Karte der Objekte": "ui.map.title",
  "Suchen Sie in der sichtbaren Kartenfläche oder zeichnen Sie eine eigene Suchregion.": "ui.map.subtitle",
  "In diesem Kartenausschnitt suchen": "ui.map.searchThisArea",
  "Region zeichnen": "ui.map.drawRegion",
  "Gefunden": "ui.map.found",
  "Aktiv": "ui.map.active",
  "Aufgehoben": "ui.map.cancelled",
  "Max. Wert": "ui.map.maxValue",
  "Seite": "ui.map.page",
  "Meine Notiz": "ui.cabinet.myNote",
  "Ihre persönliche Notiz zu diesem Objekt...": "ui.cabinet.notePlaceholder",
  "Notiz speichern": "ui.cabinet.saveNote",
  "Speichern": "ui.common.save",
  "Entfernen": "ui.common.remove"
}));

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const result = [];
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, item.name);
    if (item.isDirectory()) result.push(...walk(p));
    else if (extensions.has(path.extname(item.name))) result.push(p);
  }
  return result;
}

function hasAny(s) {
  for (const key of map.keys()) if (s.includes(key)) return true;
  return false;
}

function ensureImports(source) {
  if (!source.includes('@/lib/i18n/ui-texts')) {
    source = 'import { getUiText } from "@/lib/i18n/ui-texts";\n' + source;
  }
  if (!source.includes('@/lib/i18n/server')) {
    source = 'import { getI18n } from "@/lib/i18n/server";\n' + source;
  }
  return source;
}

function ensureUi(source) {
  if (source.includes("const ui = getUiText(locale);")) return source;
  const patterns = [
    /export\s+default\s+async\s+function\s+\w+\s*\([^)]*\)\s*\{/,
    /export\s+async\s+function\s+\w+\s*\([^)]*\)\s*\{/,
    /async\s+function\s+\w+\s*\([^)]*\)\s*\{/
  ];
  for (const pattern of patterns) {
    const m = source.match(pattern);
    if (m) {
      const pos = m.index + m[0].length;
      return source.slice(0, pos) + '\n  const { locale } = await getI18n();\n  const ui = getUiText(locale);' + source.slice(pos);
    }
  }
  return source;
}

function replaceInJsx(source) {
  for (const [text, expr] of map.entries()) {
    source = source.replaceAll(`>${text}<`, `>{${expr}}<`);
    source = source.replaceAll(`"${text}"`, `{${expr}}`);
    source = source.replaceAll(`'${text}'`, `{${expr}}`);
  }
  return source;
}

let count = 0;
for (const file of roots.flatMap(walk)) {
  let source = fs.readFileSync(file, "utf8");
  if (!hasAny(source)) continue;
  const original = source;
  source = ensureImports(source);
  source = ensureUi(source);
  source = replaceInJsx(source);
  if (source !== original) {
    fs.writeFileSync(file, source, "utf8");
    console.log("patched", file);
    count++;
  }
}
console.log(`Stage 47E patched ${count} files.`);
