import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const clientFiles = [
  "components/FilterBar.tsx",
  "components/PropertyMap.tsx",
  "components/QuickSearchBar.tsx",
  "components/SaveSearchButton.tsx",
];

const fallback = {
  "ui.common.home": '"Startseite"',
  "ui.common.advancedSearch": '"Erweiterte Suche"',
  "ui.common.archive": '"Archiv"',
  "ui.common.account": '"Mein Konto"',
  "ui.common.logout": '"Abmelden"',
  "ui.common.reset": '"Zurücksetzen"',
  "ui.common.save": '"Speichern"',
  "ui.common.remove": '"Entfernen"',
  "ui.common.details": '"Details"',
  "ui.common.moreDetails": '"Details ansehen"',
  "ui.common.open": '"Öffnen"',
  "ui.common.notSet": '"nicht gesetzt"',

  "ui.hero.title": '"Alle gerichtlichen Versteigerungen an einem Ort."',
  "ui.hero.subtitle": '"Transparent. Verlässlich. Übersichtlich. Finden Sie Immobilien, Grundstücke und weitere Objekte aus gerichtlichen Versteigerungen mit Karte, Filtern und strukturierten Informationen."',
  "ui.hero.checkedSources": '"Geprüfte Quellen"',
  "ui.hero.dailyUpdated": '"Täglich aktualisiert"',
  "ui.hero.nationwide": '"Deutschlandweit"',
  "ui.hero.databaseObjects": '"Objekte in der Datenbank"',
  "ui.hero.federalStates": '"Bundesländer"',
  "ui.hero.freeSearch": '"kostenlos suchen"',

  "ui.quickSearch.title": '"Schnellsuche"',
  "ui.quickSearch.subtitle": '"Starten Sie mit den wichtigsten Kriterien. Die vollständige Suche finden Sie auf der Kartenseite."',
  "ui.quickSearch.queryLabel": '"Ort, PLZ, Adresse oder Gericht"',
  "ui.quickSearch.queryPlaceholder": '"z. B. Chemnitz, 09111, Amtsgericht Dresden"',
  "ui.quickSearch.federalState": '"Bundesland"',
  "ui.quickSearch.allFederalStates": '"Alle Bundesländer"',
  "ui.quickSearch.propertyType": '"Objektart"',
  "ui.quickSearch.allTypes": '"Alle Typen"',
  "ui.quickSearch.maxValue": '"Verkehrswert bis"',
  "ui.quickSearch.quickSearch": '"Schnell suchen"',
  "ui.quickSearch.advancedSearch": '"Erweiterte Suche"',

  "ui.search.title": '"Erweiterte Suche"',
  "ui.search.subtitle": '"Alle Filter auf einer Seite. Der Filterbereich scrollt normal mit der Seite."',
  "ui.search.query": '"Suche"',
  "ui.search.city": '"Ort"',
  "ui.search.postalCode": '"PLZ"',
  "ui.search.radius": '"Umkreis"',
  "ui.search.court": '"Amtsgericht"',
  "ui.search.status": '"Status"',
  "ui.search.federalState": '"Bundesland"',
  "ui.search.propertyType": '"Objektart"',
  "ui.search.usage": '"Nutzung"',
  "ui.search.marketValue": '"Verkehrswert"',
  "ui.search.livingArea": '"Wohnfläche"',
  "ui.search.plotArea": '"Grundstück"',
  "ui.search.dateFrom": '"Termin ab"',
  "ui.search.dateTo": '"Termin bis"',
  "ui.search.heritage": '"Denkmalschutz"',
  "ui.search.valueLimits": '"Wertgrenzen"',
  "ui.search.auctionNo": '"Termin-Nr."',
  "ui.search.sorting": '"Sortierung"',
  "ui.search.perPage": '"Anzeigen"',
  "ui.search.allCities": '"Alle Orte"',
  "ui.search.noRadius": '"Kein Radius"',
  "ui.search.allCourts": '"Alle Gerichte"',
  "ui.search.activeOnly": '"Alle aktuellen"',
  "ui.search.allStates": '"Alle Bundesländer"',
  "ui.search.allTypes": '"Alle Arten"',
  "ui.search.anyUsage": '"Jede Nutzung"',
  "ui.search.free": '"Frei"',
  "ui.search.rented": '"Vermietet"',
  "ui.search.ownerOccupied": '"Eigennutzung"',
  "ui.search.unknownUsage": '"Unbekannt"',
  "ui.search.findObjects": '"Objekte finden"',
  "ui.search.resetFilters": '"Filter zurücksetzen"',

  "ui.map.title": '"Karte der Objekte"',
  "ui.map.subtitle": '"Suchen Sie in der sichtbaren Kartenfläche oder zeichnen Sie eine eigene Suchregion."',
  "ui.map.searchThisArea": '"In diesem Kartenausschnitt suchen"',
  "ui.map.drawRegion": '"Region zeichnen"',
  "ui.map.found": '"Gefunden"',
  "ui.map.active": '"Aktiv"',
  "ui.map.cancelled": '"Aufgehoben"',
  "ui.map.maxValue": '"Max. Wert"',
  "ui.map.page": '"Seite"',

  "ui.cabinet.myNote": '"Meine Notiz"',
  "ui.cabinet.notePlaceholder": '"Ihre persönliche Notiz zu diesem Objekt..."',
  "ui.cabinet.saveNote": '"Notiz speichern"',
};

function fixFile(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) {
    console.log("skip missing", rel);
    return;
  }

  let source = fs.readFileSync(file, "utf8");
  const original = source;

  // Remove server-only imports from client files.
  source = source.replace(/^import\s+\{\s*getI18n\s*\}\s+from\s+["']@\/lib\/i18n\/server["'];\s*\n/gm, "");
  source = source.replace(/^import\s+\{\s*getUiText\s*\}\s+from\s+["']@\/lib\/i18n\/ui-texts["'];\s*\n/gm, "");

  // Remove accidental await calls.
  source = source.replace(/\n\s*const\s+\{\s*locale\s*\}\s*=\s*await\s+getI18n\(\);\s*/g, "\n");
  source = source.replace(/\n\s*const\s+ui\s*=\s*getUiText\(locale\);\s*/g, "\n");

  // Replace ui.* references with German fallback strings so build is restored.
  for (const [key, value] of Object.entries(fallback)) {
    source = source.replaceAll(`{${key}}`, value.slice(1, -1));
    source = source.replaceAll(key, value);
  }

  // Fix JSX attribute expressions accidentally broken after replacement.
  source = source.replace(/(\w[\w-]*)=\{(".*?")\}/g, "$1={$2}");
  source = source.replace(/(\w[\w-]*)=("[^"]*")/g, "$1=$2");

  // Ensure "use client" is the first statement.
  if (source.includes('"use client";') || source.includes("'use client';")) {
    source = source.replace(/["']use client["'];\s*/g, "");
    source = `"use client";\n\n` + source.trimStart();
  }

  // Clean leftover blank lines at top after directive.
  source = source.replace(/^"use client";\n\n\n+/g, '"use client";\n\n');

  if (source !== original) {
    fs.writeFileSync(file, source, "utf8");
    console.log("fixed", rel);
  } else {
    console.log("unchanged", rel);
  }
}

for (const rel of clientFiles) fixFile(rel);

console.log("Stage 47E hotfix v4 completed. Run: npm run build");
