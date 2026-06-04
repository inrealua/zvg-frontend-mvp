import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const uiFallback = {
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
  "ui.cabinet.saveNote": '"Notiz speichern"'
};

function file(p) {
  return path.join(root, p);
}

function exists(p) {
  return fs.existsSync(p);
}

function read(p) {
  return exists(p) ? fs.readFileSync(p, "utf8") : null;
}

function write(p, s, original) {
  if (s !== original) {
    fs.writeFileSync(p, s, "utf8");
    console.log("fixed", path.relative(root, p));
  }
}

function removeImportLine(source, moduleName) {
  const escaped = moduleName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return source.replace(new RegExp(`^import\\s+.*?from\\s+["']${escaped}["'];\\n`, "gm"), "");
}

function stripServerI18n(source) {
  source = removeImportLine(source, "@/lib/i18n/server");
  source = removeImportLine(source, "@/lib/i18n/ui-texts");
  source = source.replace(/\n\s*const\s+\{\s*locale\s*\}\s*=\s*await\s+getI18n\(\);\s*/g, "\n");
  source = source.replace(/\n\s*const\s+ui\s*=\s*getUiText\(locale\);\s*/g, "\n");
  return source;
}

function replaceUiWithGerman(source) {
  for (const [key, value] of Object.entries(uiFallback)) {
    source = source.replaceAll(`{${key}}`, value.slice(1, -1));
    source = source.replaceAll(key, value);
  }
  return source;
}

function fixBadBraces(source) {
  // selectedLabel(values, {ui.search.allStates}) -> selectedLabel(values, ui.search.allStates)
  source = source.replace(/\{\s*(ui\.[a-zA-Z0-9_.]+)\s*\}/g, (m, expr, offset, str) => {
    // Keep normal JSX text braces if directly after > or before <
    const prev = str[offset - 1];
    const next = str[offset + m.length];
    if (prev === ">" || next === "<") return m;
    return expr;
  });

  // ternary: : {ui.common.save}} -> : ui.common.save}
  source = source.replace(/:\s*\{\s*(ui\.[a-zA-Z0-9_.]+)\s*\}\s*\}/g, ": $1}");
  return source;
}

function ensureUseClientFirst(p) {
  let source = read(p);
  if (!source) return;
  const original = source;

  const hasDirective = source.includes('"use client";') || source.includes("'use client';");
  if (hasDirective) {
    source = source.replace(/["']use client["'];\s*/g, "");
    source = `"use client";\n\n` + source.trimStart();
  }

  source = stripServerI18n(source);
  source = fixBadBraces(source);
  source = replaceUiWithGerman(source);

  write(p, source, original);
}

function fixFilterBar() {
  const p = file("components/FilterBar.tsx");
  let source = read(p);
  if (!source) return;
  const original = source;
  source = fixBadBraces(source);
  write(p, source, original);
}

function fixCabinet() {
  const p = file("app/cabinet/page.tsx");
  let source = read(p);
  if (!source) return;
  const original = source;

  source = removeImportLine(source, "@/lib/i18n/ui-texts");

  // Remove accidental pair before real getI18n + getPropertyUi.
  source = source.replace(/\n\s*const\s+\{\s*locale\s*\}\s*=\s*await\s+getI18n\(\);\s*\n\s*const\s+ui\s*=\s*getUiText\(locale\);\s*/g, "\n");

  // If duplicate const { locale, t } exists, keep first.
  let seenLocaleT = false;
  source = source.split("\n").filter(line => {
    if (/const\s+\{\s*locale\s*,\s*t\s*\}\s*=\s*await\s+getI18n\(\);/.test(line)) {
      if (seenLocaleT) return false;
      seenLocaleT = true;
    }
    return true;
  }).join("\n");

  // If duplicate const ui = getPropertyUi(locale), keep first.
  let seenUi = false;
  source = source.split("\n").filter(line => {
    if (/const\s+ui\s*=\s*getPropertyUi\(locale\);/.test(line)) {
      if (seenUi) return false;
      seenUi = true;
    }
    return true;
  }).join("\n");

  write(p, source, original);
}

function fixPublicPropertiesPage() {
  const p = file("components/PublicPropertiesPage.tsx");
  let source = read(p);
  if (!source) return;
  const original = source;

  source = fixBadBraces(source);

  // Prefer one pair only: const { locale } = await getI18n(); const publicUi = getPublicUi(locale);
  // Remove getUiText import and variable if getPublicUi is present.
  if (source.includes("getPublicUi")) {
    source = removeImportLine(source, "@/lib/i18n/ui-texts");
    source = source.replace(/\n\s*const\s+ui\s*=\s*getUiText\(locale\);\s*/g, "\n");

    // If there are two identical locale declarations, keep one.
    let seenLocale = false;
    source = source.split("\n").filter(line => {
      if (/const\s+\{\s*locale\s*\}\s*=\s*await\s+getI18n\(\);/.test(line)) {
        if (seenLocale) return false;
        seenLocale = true;
      }
      return true;
    }).join("\n");

    // convert accidental ui.* in this component to publicUi where possible
    source = source.replaceAll("ui.hero.title", "publicUi.topTitle ?? publicUi.hero?.title");
    source = source.replaceAll("ui.hero.subtitle", "publicUi.topSubtitle ?? publicUi.hero?.subtitle");
    source = source.replaceAll("ui.quickSearch.title", "publicUi.topTitle");
    source = source.replaceAll("ui.quickSearch.subtitle", "publicUi.topSubtitle");
    // Better object literal:
    source = source.replaceAll("publicUi.topTitle ?? publicUi.hero?.title", "publicUi.topTitle");
    source = source.replaceAll("publicUi.topSubtitle ?? publicUi.hero?.subtitle", "publicUi.topSubtitle");
  }

  // Object literal issues.
  source = source.replaceAll("title: {publicUi.topTitle}", "title: publicUi.topTitle");
  source = source.replaceAll("text: {publicUi.topSubtitle}", "text: publicUi.topSubtitle");
  source = source.replaceAll('listTitle: "{publicUi.topTitle}"', "listTitle: publicUi.topTitle");
  source = source.replaceAll('listText: "{publicUi.topSubtitle}"', "listText: publicUi.topSubtitle");

  write(p, source, original);
}

function fixLayout() {
  const p = file("app/layout.tsx");
  let source = read(p);
  if (!source) return;
  const original = source;
  source = removeImportLine(source, "@/lib/i18n/ui-texts");
  // Keep getLocale import; remove getI18n if only accidental.
  source = source.replace(/\n\s*const\s+\{\s*locale\s*\}\s*=\s*await\s+getI18n\(\);\s*\n\s*const\s+ui\s*=\s*getUiText\(locale\);\s*/g, "\n");
  source = removeImportLine(source, "@/lib/i18n/server").replace(
    'import { getLocale } from "@/lib/i18n/server";',
    'import { getLocale } from "@/lib/i18n/server";'
  );
  // If removeImportLine removed getLocale too, add back when used.
  if (source.includes("await getLocale()") && !source.includes("getLocale")) {
    source = 'import { getLocale } from "@/lib/i18n/server";\n' + source;
  }
  write(p, source, original);
}

function fixPropertyDetail() {
  const p = file("app/properties/[id]/page.tsx");
  let source = read(p);
  if (!source) return;
  const original = source;
  source = removeImportLine(source, "@/lib/i18n/ui-texts");
  source = source.replace(/\n\s*const\s+\{\s*locale\s*\}\s*=\s*await\s+getI18n\(\);\s*\n\s*const\s+ui\s*=\s*getUiText\(locale\);\s*/g, "\n");
  write(p, source, original);
}

for (const rel of [
  "components/PropertyMap.tsx",
  "components/QuickSearchBar.tsx",
  "components/SaveSearchButton.tsx",
  "components/DeleteFavoriteButton.tsx",
  "components/FavoriteNoteForm.tsx",
  "components/SavedSearchNameForm.tsx"
]) {
  ensureUseClientFirst(file(rel));
}

fixFilterBar();
fixPublicPropertiesPage();
fixCabinet();
fixLayout();
fixPropertyDetail();

console.log("Stage 47E hotfix v2 completed. Run: npm run build");
