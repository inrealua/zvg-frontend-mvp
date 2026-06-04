import fs from "node:fs";
import path from "node:path";

const filePath = path.join(process.cwd(), "components", "PublicPropertiesPage.tsx");

if (!fs.existsSync(filePath)) {
  console.error("components/PublicPropertiesPage.tsx not found");
  process.exit(1);
}

let source = fs.readFileSync(filePath, "utf8");
const original = source;

const replacements = new Map([
  ["ui.hero.title", '"Alle gerichtlichen Versteigerungen an einem Ort."'],
  ["ui.hero.subtitle", '"Transparent. Verlässlich. Übersichtlich. Finden Sie Immobilien, Grundstücke und weitere Objekte aus gerichtlichen Versteigerungen mit Karte, Filtern und strukturierten Informationen."'],
  ["ui.hero.checkedSources", '"Geprüfte Quellen"'],
  ["ui.hero.dailyUpdated", '"Täglich aktualisiert"'],
  ["ui.hero.nationwide", '"Deutschlandweit"'],
  ["ui.hero.databaseObjects", '"Objekte in der Datenbank"'],
  ["ui.hero.federalStates", '"Bundesländer"'],
  ["ui.hero.freeSearch", '"kostenlos suchen"'],

  ["ui.quickSearch.title", '"Schnellsuche"'],
  ["ui.quickSearch.subtitle", '"Starten Sie mit den wichtigsten Kriterien. Die vollständige Suche finden Sie auf der Kartenseite."'],
  ["ui.quickSearch.queryLabel", '"Ort, PLZ, Adresse oder Gericht"'],
  ["ui.quickSearch.queryPlaceholder", '"z. B. Chemnitz, 09111, Amtsgericht Dresden"'],
  ["ui.quickSearch.federalState", '"Bundesland"'],
  ["ui.quickSearch.allFederalStates", '"Alle Bundesländer"'],
  ["ui.quickSearch.propertyType", '"Objektart"'],
  ["ui.quickSearch.allTypes", '"Alle Typen"'],
  ["ui.quickSearch.maxValue", '"Verkehrswert bis"'],
  ["ui.quickSearch.quickSearch", '"Schnell suchen"'],
  ["ui.quickSearch.advancedSearch", '"Erweiterte Suche"'],

  ["ui.search.title", '"Erweiterte Suche"'],
  ["ui.search.subtitle", '"Alle Filter auf einer Seite. Der Filterbereich scrollt normal mit der Seite."'],
  ["ui.search.query", '"Suche"'],
  ["ui.search.city", '"Ort"'],
  ["ui.search.postalCode", '"PLZ"'],
  ["ui.search.radius", '"Umkreis"'],
  ["ui.search.court", '"Amtsgericht"'],
  ["ui.search.status", '"Status"'],
  ["ui.search.federalState", '"Bundesland"'],
  ["ui.search.propertyType", '"Objektart"'],
  ["ui.search.usage", '"Nutzung"'],
  ["ui.search.marketValue", '"Verkehrswert"'],
  ["ui.search.livingArea", '"Wohnfläche"'],
  ["ui.search.plotArea", '"Grundstück"'],
  ["ui.search.dateFrom", '"Termin ab"'],
  ["ui.search.dateTo", '"Termin bis"'],
  ["ui.search.heritage", '"Denkmalschutz"'],
  ["ui.search.valueLimits", '"Wertgrenzen"'],
  ["ui.search.auctionNo", '"Termin-Nr."'],
  ["ui.search.sorting", '"Sortierung"'],
  ["ui.search.perPage", '"Anzeigen"'],
  ["ui.search.allCities", '"Alle Orte"'],
  ["ui.search.noRadius", '"Kein Radius"'],
  ["ui.search.allCourts", '"Alle Gerichte"'],
  ["ui.search.activeOnly", '"Alle aktuellen"'],
  ["ui.search.allStates", '"Alle Bundesländer"'],
  ["ui.search.allTypes", '"Alle Arten"'],
  ["ui.search.anyUsage", '"Jede Nutzung"'],
  ["ui.search.free", '"Frei"'],
  ["ui.search.rented", '"Vermietet"'],
  ["ui.search.ownerOccupied", '"Eigennutzung"'],
  ["ui.search.unknownUsage", '"Unbekannt"'],
  ["ui.search.findObjects", '"Objekte finden"'],
  ["ui.search.resetFilters", '"Filter zurücksetzen"'],

  ["ui.map.title", '"Karte der Objekte"'],
  ["ui.map.subtitle", '"Suchen Sie in der sichtbaren Kartenfläche oder zeichnen Sie eine eigene Suchregion."'],
  ["ui.map.searchThisArea", '"In diesem Kartenausschnitt suchen"'],
  ["ui.map.drawRegion", '"Region zeichnen"'],
  ["ui.map.found", '"Gefunden"'],
  ["ui.map.active", '"Aktiv"'],
  ["ui.map.cancelled", '"Aufgehoben"'],
  ["ui.map.maxValue", '"Max. Wert"'],
  ["ui.map.page", '"Seite"'],

  ["ui.common.home", '"Startseite"'],
  ["ui.common.advancedSearch", '"Erweiterte Suche"'],
  ["ui.common.archive", '"Archiv"'],
  ["ui.common.account", '"Mein Konto"'],
  ["ui.common.logout", '"Abmelden"'],
  ["ui.common.reset", '"Zurücksetzen"'],
  ["ui.common.save", '"Speichern"'],
  ["ui.common.remove", '"Entfernen"'],
  ["ui.common.details", '"Details"'],
  ["ui.common.moreDetails", '"Details ansehen"'],
  ["ui.common.open", '"Öffnen"'],
  ["ui.common.notSet", '"nicht gesetzt"'],
]);

for (const [expr, text] of replacements.entries()) {
  // JSX expression: {ui.hero.checkedSources} -> Geprüfte Quellen
  source = source.replaceAll(`{${expr}}`, text.slice(1, -1));

  // TS expression/object value: title: ui.hero.title -> title: "..."
  source = source.replaceAll(expr, text);
}

// Clean import/variable if no ui.* remains.
if (!source.includes("ui.")) {
  source = source.replace(/^import\s+\{\s*getUiText\s*\}\s+from\s+["']@\/lib\/i18n\/ui-texts["'];\s*\n/gm, "");
  source = source.replace(/\n\s*const\s+ui\s*=\s*getUiText\(locale\);\s*/g, "\n");
}

// Also fix accidental quoted text inside JSX like <span>"Text"</span>
source = source.replace(/<span>"([^"]+)"<\/span>/g, "<span>$1</span>");
source = source.replace(/<h1>"([^"]+)"<\/h1>/g, "<h1>$1</h1>");
source = source.replace(/<h2>"([^"]+)"<\/h2>/g, "<h2>$1</h2>");
source = source.replace(/<p>"([^"]+)"<\/p>/g, "<p>$1</p>");

// Keep one getI18n locale declaration only.
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
  console.log("Removed all out-of-scope ui.* references from PublicPropertiesPage.tsx.");
} else {
  console.log("No changes made.");
}

console.log("Now run: npm run build");
