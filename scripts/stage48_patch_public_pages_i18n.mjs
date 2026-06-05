import fs from "node:fs";
import path from "node:path";
const root = process.cwd();

function patch(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) return;
  let s = fs.readFileSync(p, "utf8");
  const o = s;

  if (!s.includes('import { getSiteText } from "@/lib/i18n/site-text";')) {
    s = 'import { getSiteText } from "@/lib/i18n/site-text";\n' + s;
  }
  if (!s.includes('import { getI18n } from "@/lib/i18n/server";')) {
    s = 'import { getI18n } from "@/lib/i18n/server";\n' + s;
  }
  if (!s.includes("const siteText = getSiteText(locale);")) {
    const m = s.match(/export\s+(?:default\s+)?async\s+function\s+\w+\s*\([^)]*\)\s*\{/);
    if (m) {
      const pos = m.index + m[0].length;
      const addLocale = !s.includes("const { locale } = await getI18n();");
      s = s.slice(0, pos) + (addLocale ? "\n  const { locale } = await getI18n();" : "") + "\n  const siteText = getSiteText(locale);" + s.slice(pos);
    }
  }

  const r = new Map([
    ["ZVG-DE.COM · GERICHTLICHE VERSTEIGERUNGEN", "{siteText.hero.kickerHome}"],
    ["KARTE · DEUTSCHLANDWEIT SUCHEN", "{siteText.hero.kickerMap}"],
    ["Alle gerichtlichen Versteigerungen an einem Ort.", "{siteText.hero.homeTitle}"],
    ["Gerichtliche Versteigerungen auf der Karte finden", "{siteText.hero.mapTitle}"],
    ["Suchen Sie nach Regionen, Gerichten, Preisen und Objektarten. Die Karte unterstützt Gebietssuche und Polygon-Auswahl.", "{siteText.hero.mapSubtitle}"],
    ["Top 12 aktuelle Objekte", "{siteText.list.title}"],
    ["Kurze Auswahl für die Startseite. Die vollständige Recherche finden Sie in der erweiterten Suche.", "{siteText.list.subtitle}"],
    ["Kurze Auswahl für die Startseite. Die vollständige Recherche finden Sie in der erweiterten Kartensuche.", "{siteText.list.subtitle}"],
    ["Geprüfte Quellen", "{siteText.hero.checkedSources}"],
    ["Täglich aktualisiert", "{siteText.hero.dailyUpdated}"],
    ["Deutschlandweit", "{siteText.hero.nationwide}"],
    ["Objekte in der Datenbank", "{siteText.hero.objectsInDatabase}"],
    ["Immobilien in der Datenbank", "{siteText.hero.objectsInDatabase}"],
    ["Bundesländer", "{siteText.hero.federalStates}"],
    ["kostenlos suchen", "{siteText.hero.freeSearch}"],
    ["auf der Karte", "{siteText.hero.objectsOnMap}"],
    ["Ø Verkehrswert", "{siteText.hero.averageMarketValue}"],
    ["Schnellsuche", "{siteText.quickSearch.title}"],
    ["Starten Sie mit den wichtigsten Kriterien. Die vollständige Suche finden Sie auf der Kartenseite.", "{siteText.quickSearch.subtitle}"],
    ["Ort, PLZ, Adresse oder Gericht", "{siteText.quickSearch.queryLabel}"],
    ["z. B. Chemnitz, 09111, Amtsgericht Dresden", "{siteText.quickSearch.queryPlaceholder}"],
    ["Bundesland", "{siteText.quickSearch.federalState}"],
    ["Alle Bundesländer", "{siteText.quickSearch.allStates}"],
    ["Objektart", "{siteText.quickSearch.propertyType}"],
    ["Alle Typen", "{siteText.quickSearch.allTypes}"],
    ["Все типы", "{siteText.quickSearch.allTypes}"],
    ["Verkehrswert bis", "{siteText.quickSearch.maxValue}"],
    ["Beliebig", "{siteText.quickSearch.any}"],
    ["Schnell suchen", "{siteText.quickSearch.quickButton}"],
    ["Versteigerungen auf der Karte", "{siteText.map.sectionTitle}"],
    ["Ein schneller Überblick. Die große Karte mit allen Filtern finden Sie im Bereich Karte.", "{siteText.map.sectionText}"],
    ["Große Karte öffnen", "{siteText.map.openLargeMap}"],
    ["Karte der Objekte", "{siteText.map.title}"],
    ["Suchen Sie in der sichtbaren Kartenfläche oder zeichnen Sie eine eigene Suchregion.", "{siteText.map.subtitle}"],
    ["In diesem Kartenausschnitt suchen", "{siteText.map.searchArea}"],
    ["Region zeichnen", "{siteText.map.drawRegion}"],
    ["Seite", "{siteText.map.page}"],
    ["Gefunden", "{siteText.map.found}"],
    ["Aktiv", "{siteText.map.active}"],
    ["Aufgehoben", "{siteText.map.cancelled}"],
    ["Archiv", "{siteText.map.archive}"],
    ["Max. Wert", "{siteText.map.maxValue}"],
    ["Go to advanced search", "{siteText.list.advancedLink}"],
    ["Zur erweiterten Suche", "{siteText.list.advancedLink}"],
    ["Показано", "{siteText.list.shown}"],
    ["Zurück", "{siteText.list.previous}"],
    ["Назад", "{siteText.list.previous}"],
    ["Weiter", "{siteText.list.next}"],
    ["Вперёд", "{siteText.list.next}"]
  ]);
  for (const [from, to] of r) {
    s = s.replaceAll(`>${from}<`, `>${to}<`);
    s = s.replaceAll(`"${from}"`, to);
    s = s.replaceAll(`: "${from}"`, `: ${to}`);
  }
  s = s.replaceAll('"{siteText.', "{siteText.").replaceAll('}"', "}");
  s = s.replaceAll('title: "Top 12 aktuelle Objekte"', "title: siteText.list.title");
  s = s.replaceAll('text: "Kurze Auswahl für die Startseite. Die vollständige Recherche finden Sie in der erweiterten Suche."', "text: siteText.list.subtitle");
  s = s.replaceAll('listTitle: "Top 12 aktuelle Objekte"', "listTitle: siteText.list.title");
  s = s.replaceAll('listText: "Kurze Auswahl für die Startseite. Die vollständige Recherche finden Sie in der erweiterten Suche."', "listText: siteText.list.subtitle");

  if (s !== o) { fs.writeFileSync(p, s, "utf8"); console.log("patched", rel); }
}
patch("components/PublicPropertiesPage.tsx");

for (const rel of ["components/Footer.tsx", "app/components/Footer.tsx"]) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) continue;
  let s = fs.readFileSync(p, "utf8");
  const o = s;
  s = s.replaceAll(">About us<", ">{t.footer.about}<").replaceAll(">Privacy Policy<", ">{t.footer.privacy}<").replaceAll(">Über uns<", ">{t.footer.about}<").replaceAll(">Datenschutz<", ">{t.footer.privacy}<");
  if (s !== o) { fs.writeFileSync(p, s, "utf8"); console.log("patched", rel); }
}
console.log("Stage 48 patch completed. Run: npm run build");
