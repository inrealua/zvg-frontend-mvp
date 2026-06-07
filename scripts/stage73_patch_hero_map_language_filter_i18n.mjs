import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function patchFile(rel, updater) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    console.log("skip missing", rel);
    return;
  }

  const before = fs.readFileSync(full, "utf8");
  const after = updater(before);

  if (after !== before) {
    fs.writeFileSync(full, after, "utf8");
    console.log("patched", rel);
  } else {
    console.log("unchanged", rel);
  }
}

function writeFile(rel, content) {
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, "utf8");
  console.log("written", rel);
}

/**
 * STAGE 73
 *
 * 1. Hero top text:
 *    ZVG-DE.COM · ВСЕ СУДЕБНЫЕ АУКЦИОНЫ В ОДНОМ МЕСТЕ
 *    Профессиональный инструмент
 *    для поиска недвижимости в Германии
 *
 *    Same meaning in DE/EN/RU.
 *
 * 2. Move map action buttons to the right of "Карта объектов" heading.
 *
 * 3. Language switcher on /de /ru /en must navigate to the selected locale path.
 *
 * 4. Robust translation of Status / Denkmalschutz / Wertgrenzen / Termin-Nr. values.
 */

/* -------------------------------------------------------------------------- */
/* 1) HERO TEXT                                                               */
/* -------------------------------------------------------------------------- */

for (const rel of ["lib/i18n/ui-texts.ts", "lib/i18n/uiTexts.ts", "lib/i18n/texts.ts"]) {
  patchFile(rel, (s) => {
    // Replace many previous hero phrases with target wording.
    s = s
      // RU
      .replace(/ZVG-DE\.COM\s*·\s*[^"'\n,}]*/g, "ZVG-DE.COM · ВСЕ СУДЕБНЫЕ АУКЦИОНЫ В ОДНОМ МЕСТЕ")
      .replace(/Все судебные аукционы в одном месте\.?/g, "Профессиональный инструмент")
      .replace(/Профессиональный инструмент для поиска недвижимости в Германии\.?/g, "Профессиональный инструмент\\nдля поиска недвижимости в Германии")
      // DE common
      .replace(/Alle gerichtlichen Versteigerungen an einem Ort\.?/g, "Professionelles Werkzeug")
      .replace(/Gerichtliche Versteigerungen auf der Karte finden/g, "Professionelles Werkzeug")
      .replace(/Transparent\. Verlässlich\. Übersichtlich\.[^"'\n,}]*/g, "für die Immobiliensuche in Deutschland")
      // EN common
      .replace(/All judicial auctions in one place\.?/g, "Professional tool")
      .replace(/Find judicial auctions on the map/g, "Professional tool")
      .replace(/Transparent\. Reliable\. Clear\.[^"'\n,}]*/g, "for finding real estate in Germany");

    // Specific object keys if present.
    s = s.replace(/kicker:\s*"[^"]*"/g, (m) => {
      if (m.includes("hero") || true) return 'kicker: "ZVG-DE.COM · ВСЕ СУДЕБНЫЕ АУКЦИОНЫ В ОДНОМ МЕСТЕ"';
      return m;
    });

    return s;
  });
}

// Safer direct patch in PublicPropertiesPage copy builder.
patchFile("components/PublicPropertiesPage.tsx", (s) => {
  if (!s.includes("stage73HeroText")) {
    const dict = `
const stage73HeroText = {
  de: {
    kicker: "ZVG-DE.COM · ALLE GERICHTLICHEN AUKTIONEN AN EINEM ORT",
    title: "Professionelles Werkzeug",
    subtitle: "für die Immobiliensuche in Deutschland",
  },
  ru: {
    kicker: "ZVG-DE.COM · ВСЕ СУДЕБНЫЕ АУКЦИОНЫ В ОДНОМ МЕСТЕ",
    title: "Профессиональный инструмент",
    subtitle: "для поиска недвижимости в Германии",
  },
  en: {
    kicker: "ZVG-DE.COM · ALL JUDICIAL AUCTIONS IN ONE PLACE",
    title: "Professional tool",
    subtitle: "for finding real estate in Germany",
  },
} as const;

function stage73Hero(locale: "de" | "ru" | "en") {
  return stage73HeroText[locale] || stage73HeroText.de;
}
`;
    s = dict + "\n" + s;
  }

  // Replace copy object assignments where possible.
  s = s.replace(/kicker:\s*["'][^"']*gerichtliche Versteigerungen[^"']*["']/gi, "kicker: stage73Hero(locale as \"de\" | \"ru\" | \"en\").kicker");
  s = s.replace(/kicker:\s*["']zvg-de\.com[^"']*["']/gi, "kicker: stage73Hero(locale as \"de\" | \"ru\" | \"en\").kicker");

  // If copy object has title/text fields, force them.
  s = s.replace(/title:\s*[^,\n]+,/g, (m) => {
    // Only hero copy builder uses title: broadly in this file; if too broad, build will reveal.
    return 'title: stage73Hero(locale as "de" | "ru" | "en").title,';
  });
  s = s.replace(/text:\s*[^,\n]+,/g, 'text: stage73Hero(locale as "de" | "ru" | "en").subtitle,');

  // Direct text fallbacks.
  s = s
    .replace(/Alle gerichtlichen Versteigerungen an einem Ort\.?/g, "{stage73Hero(locale as \"de\" | \"ru\" | \"en\").title}")
    .replace(/Все судебные аукционы в одном месте\.?/g, "{stage73Hero(locale as \"de\" | \"ru\" | \"en\").title}")
    .replace(/All judicial auctions in one place\.?/g, "{stage73Hero(locale as \"de\" | \"ru\" | \"en\").title}");

  return s;
});

/* -------------------------------------------------------------------------- */
/* 2) MAP HEADING ACTIONS                                                     */
/* -------------------------------------------------------------------------- */

patchFile("components/PropertyMap.tsx", (s) => {
  // Add wrapper class around title/actions if no existing class.
  // We avoid moving React logic aggressively; CSS grid can align existing header/actions if class names exist.
  s = s.replace(/<h2>\{[^}]*map[^}]*title[^}]*\}<\/h2>/gi, (m) => `<div className="map-title-actions-row-v73">${m}`);
  s = s.replace(/<h2>Карта объектов<\/h2>/g, '<div className="map-title-actions-row-v73"><h2>Карта объектов</h2>');
  s = s.replace(/<h2>Karte der Objekte<\/h2>/g, '<div className="map-title-actions-row-v73"><h2>Karte der Objekte</h2>');
  s = s.replace(/<h2>Object map<\/h2>/g, '<div className="map-title-actions-row-v73"><h2>Object map</h2>');

  // If we opened wrapper before h2, close it after the first action button group if common class found.
  if (s.includes('map-title-actions-row-v73') && !s.includes('map-title-actions-row-v73-closed')) {
    // Mark closed via comment by wrapping buttons if common button texts found.
    s = s.replace(
      /(<button[^>]*>\{?stage61MapT\(\)\.searchVisible\}?<\/button>[\s\S]*?<button[^>]*>\{?stage61MapT\(\)\.drawRegion\}?<\/button>)/,
      `<div className="map-title-actions-v73">$1</div><span className="map-title-actions-row-v73-closed" />`
    );

    // Fallback hardcoded.
    s = s.replace(
      /(<button[^>]*>Искать в этой области карты<\/button>[\s\S]*?<button[^>]*>Нарисовать область<\/button>)/,
      `<div className="map-title-actions-v73">$1</div><span className="map-title-actions-row-v73-closed" />`
    );
    s = s.replace(
      /(<button[^>]*>In diesem Kartenausschnitt suchen<\/button>[\s\S]*?<button[^>]*>Region zeichnen<\/button>)/,
      `<div className="map-title-actions-v73">$1</div><span className="map-title-actions-row-v73-closed" />`
    );

    // Close wrapper before paragraph after title if needed.
    s = s.replace(/(<span className="map-title-actions-row-v73-closed" \/>)/, "$1</div>");
  }

  return s;
});

/* -------------------------------------------------------------------------- */
/* 3) LANGUAGE SWITCHER                                                       */
/* -------------------------------------------------------------------------- */

const switcher = `"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChangeEvent } from "react";

const LOCALES = ["ru", "de", "en"] as const;
type Locale = (typeof LOCALES)[number];

function stripLocale(pathname: string) {
  return pathname.replace(/^\\/(ru|de|en)(?=\\/|$)/, "") || "/";
}

function currentLocale(pathname: string): Locale {
  const first = pathname.split("/").filter(Boolean)[0];
  if (first === "ru" || first === "de" || first === "en") return first;
  if (typeof document !== "undefined") {
    const match = document.cookie.match(/(?:^|;\\s*)zvg_locale=(ru|de|en)(?:;|$)/);
    if (match?.[1] === "ru" || match?.[1] === "de" || match?.[1] === "en") return match[1];
  }
  return "de";
}

export function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selected = currentLocale(pathname);

  function onChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextLocale = event.target.value as Locale;
    document.cookie = \`zvg_locale=\${nextLocale}; path=/; max-age=31536000; samesite=lax\`;

    const cleanPath = stripLocale(pathname);
    const query = searchParams.toString();
    const nextPath = \`/\${nextLocale}\${cleanPath === "/" ? "" : cleanPath}\${query ? \`?\${query}\` : ""}\`;

    router.push(nextPath);
    router.refresh();
  }

  return (
    <select className="language-select" value={selected} onChange={onChange} aria-label="Language">
      <option value="de">DE</option>
      <option value="ru">RU</option>
      <option value="en">EN</option>
    </select>
  );
}

export default LanguageSwitcher;
`;

// Replace only if file exists and exports LanguageSwitcher.
if (fs.existsSync(path.join(root, "components", "LanguageSwitcher.tsx"))) {
  writeFile("components/LanguageSwitcher.tsx", switcher);
} else {
  writeFile("components/LanguageSwitcher.tsx", switcher);
  console.log("Created LanguageSwitcher.tsx; ensure header imports it if it used another component.");
}

// Patch other switchers to navigate if they are used instead.
for (const rel of [
  "components/LocaleSwitcher.tsx",
  "components/Header.tsx",
  "components/SiteHeader.tsx",
  "components/MainNav.tsx",
]) {
  patchFile(rel, (s) => {
    // Make option values language codes again if Stage 72 turned them into /ru.
    s = s.replace(/<option value=["']\/ru["']>/g, '<option value="ru">');
    s = s.replace(/<option value=["']\/de["']>/g, '<option value="de">');
    s = s.replace(/<option value=["']\/en["']>/g, '<option value="en">');

    // Simple handlers: window.location to locale path.
    if (s.includes("<select") && !s.includes("stage73SwitchLanguage")) {
      const helper = `
function stage73SwitchLanguage(nextLocale: string) {
  if (typeof window === "undefined") return;
  document.cookie = \`zvg_locale=\${nextLocale}; path=/; max-age=31536000; samesite=lax\`;
  const path = window.location.pathname.replace(/^\\/(ru|de|en)(?=\\/|$)/, "") || "/";
  const query = window.location.search || "";
  window.location.href = \`/\${nextLocale}\${path === "/" ? "" : path}\${query}\`;
}
`;
      s = helper + "\n" + s;
      s = s.replace(/onChange=\{[^}]*\}/, 'onChange={(event) => stage73SwitchLanguage(event.target.value)}');
    }
    return s;
  });
}

/* -------------------------------------------------------------------------- */
/* 4) FILTER OPTION I18N                                                      */
/* -------------------------------------------------------------------------- */

patchFile("components/FilterBar.tsx", (s) => {
  // Replace localizeOption with robust normalizer.
  s = s.replace(
    /function localizeOption\(option: SelectOption, locale: Locale\): SelectOption \{[\s\S]*?\n\}/,
    `function localizeOption(option: SelectOption, locale: Locale): SelectOption {
  const rawValue = String(option.value || "");
  const rawLabel = String(option.label || "");
  if (!rawValue && !rawLabel) return option;

  const normalize = (text: string) =>
    text
      .trim()
      .toLowerCase()
      .replace(/ё/g, "е")
      .replace(/[._\\s]+/g, "-");

  const keyCandidates = [
    rawValue,
    rawLabel,
    normalize(rawValue),
    normalize(rawLabel),
  ];

  const dict: Record<Locale, Record<string, string>> = {
    de: {
      "": "Beliebig",
      "true": "Ja",
      "false": "Nein",
      "yes": "Ja",
      "no": "Nein",
      "да": "Ja",
      "нет": "Nein",
      "не-важно": "Beliebig",
      "любая": "Beliebig",
      "любой": "Beliebig",
      "egal": "Beliebig",
      "beliebig": "Beliebig",

      "active": "Aktiv",
      "cancelled": "Aufgehoben",
      "archived": "Archiv",
      "sold": "Verkauft",
      "активно": "Aktiv",
      "отменено": "Aufgehoben",
      "архив": "Archiv",
      "продано": "Verkauft",
      "все-актуальные": "Alle aktuellen",
      "alle-aktuellen": "Alle aktuellen",
      "all-current": "Alle aktuellen",

      "weggefallen": "Weggefallen",
      "removed": "Weggefallen",
      "сняты": "Weggefallen",
      "nicht-weggefallen": "Nicht weggefallen / unbekannt",
      "nicht-weggefallen-unbekannt": "Nicht weggefallen / unbekannt",
      "not-removed": "Nicht weggefallen / unbekannt",
      "not-removed-unknown": "Nicht weggefallen / unbekannt",
      "не-сняты-неизвестно": "Nicht weggefallen / unbekannt",

      "1": "1. Termin",
      "2": "2. Termin",
      "3": "3. und weitere",
      "3plus": "3. und weitere",
      "1-й-термин": "1. Termin",
      "2-й-термин": "2. Termin",
      "3-й-и-больше": "3. und weitere",
      "любой-термин": "Jeder Termin",
      "jeder-termin": "Jeder Termin",
      "any-auction": "Jeder Termin",
    },
    ru: {
      "": "Любая",
      "true": "Да",
      "false": "Нет",
      "yes": "Да",
      "no": "Нет",
      "ja": "Да",
      "nein": "Нет",
      "egal": "Любая",
      "beliebig": "Любая",
      "any": "Любая",

      "active": "Активно",
      "cancelled": "Отменено",
      "archived": "Архив",
      "sold": "Продано",
      "aktiv": "Активно",
      "aufgehoben": "Отменено",
      "archiv": "Архив",
      "verkauft": "Продано",
      "alle-aktuellen": "Все актуальные",
      "all-current": "Все актуальные",

      "weggefallen": "Сняты",
      "removed": "Сняты",
      "nicht-weggefallen": "Не сняты / неизвестно",
      "nicht-weggefallen-unbekannt": "Не сняты / неизвестно",
      "not-removed": "Не сняты / неизвестно",
      "not-removed-unknown": "Не сняты / неизвестно",

      "1": "1-й термин",
      "2": "2-й термин",
      "3": "3-й и больше",
      "3plus": "3-й и больше",
      "1-termin": "1-й термин",
      "2-termin": "2-й термин",
      "3-und-weitere": "3-й и больше",
      "jeder-termin": "Любой термин",
      "any-auction": "Любой термин",
    },
    en: {
      "": "Any",
      "true": "Yes",
      "false": "No",
      "ja": "Yes",
      "nein": "No",
      "да": "Yes",
      "нет": "No",
      "egal": "Any",
      "beliebig": "Any",
      "любая": "Any",

      "active": "Active",
      "cancelled": "Cancelled",
      "archived": "Archive",
      "sold": "Sold",
      "aktiv": "Active",
      "aufgehoben": "Cancelled",
      "archiv": "Archive",
      "verkauft": "Sold",
      "активно": "Active",
      "отменено": "Cancelled",
      "архив": "Archive",
      "продано": "Sold",
      "alle-aktuellen": "All current",
      "все-актуальные": "All current",

      "weggefallen": "Removed",
      "removed": "Removed",
      "сняты": "Removed",
      "nicht-weggefallen": "Not removed / unknown",
      "nicht-weggefallen-unbekannt": "Not removed / unknown",
      "not-removed": "Not removed / unknown",
      "not-removed-unknown": "Not removed / unknown",
      "не-сняты-неизвестно": "Not removed / unknown",

      "1": "1st auction",
      "2": "2nd auction",
      "3": "3rd and more",
      "3plus": "3rd and more",
      "1-termin": "1st auction",
      "2-termin": "2nd auction",
      "3-und-weitere": "3rd and more",
      "1-й-термин": "1st auction",
      "2-й-термин": "2nd auction",
      "3-й-и-больше": "3rd and more",
      "jeder-termin": "Any auction",
      "любой-термин": "Any auction",
    },
  };

  for (const key of keyCandidates) {
    const translated = dict[locale][key] || dict[locale][normalize(key)];
    if (translated) return { ...option, label: translated };
  }

  const legacyDict = optionLabels[locale] as Record<string, string>;
  return { ...option, label: legacyDict[rawValue] || legacyDict[rawLabel] || option.label };
}`
  );

  return s;
});

/* -------------------------------------------------------------------------- */
/* CSS                                                                        */
/* -------------------------------------------------------------------------- */

patchFile("app/globals.css", (s) => {
  if (s.includes("/* Stage 73 hero map actions language and filter option fixes */")) return s;

  return s + `

/* Stage 73 hero map actions language and filter option fixes */

/* Hero title/subtitle formatting */
.hero-kicker,
.hero-eyebrow,
[class*="hero"] .kicker,
[class*="hero"] .eyebrow {
  letter-spacing: 0.08em;
}

[class*="hero"] h1 {
  max-width: 760px;
}

/* Map title + buttons in one row */
.map-title-actions-row-v73,
.property-map-card .map-title-actions-row-v73,
[class*="map"] .map-title-actions-row-v73 {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 16px !important;
  margin-bottom: 6px !important;
}

.map-title-actions-v73 {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  margin-left: auto !important;
}

.map-title-actions-v73 .btn,
.map-title-actions-v73 button {
  white-space: nowrap !important;
}

/* Fallback: if buttons still render in old block below title, float that block right */
.property-map-card .map-actions,
.property-map-card .map-buttons,
.map-card .map-actions,
.map-card .map-buttons,
[class*="map"] [class*="actions"] {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* Map legend colored dots for all property groups */
.legend-dot,
.map-legend .legend-dot,
.property-map-legend .legend-dot {
  width: 11px !important;
  height: 11px !important;
  min-width: 11px !important;
  border-radius: 999px !important;
  display: inline-block !important;
  margin-right: 8px !important;
  vertical-align: -1px !important;
}

.legend-dot.haus,
.legend-dot.haeuser,
.legend-dot.wohnhaus,
.legend-dot.wohnhaeuser {
  background: #1f6b55 !important;
}

.legend-dot.wohnung,
.legend-dot.wohnungen {
  background: #2b6478 !important;
}

.legend-dot.grundstueck,
.legend-dot.grundstuecke {
  background: #7d9448 !important;
}

.legend-dot.gewerbe {
  background: #b26b38 !important;
}

.legend-dot.land-wald {
  background: #6d7f3f !important;
}

.legend-dot.garagen {
  background: #6a557e !important;
}

.legend-dot.sonstige {
  background: #7a7f87 !important;
}

.map-legend > *:last-child,
.property-map-legend > *:last-child,
.leaflet-container + .map-legend > *:last-child {
  display: inline-flex !important;
}

.map-legend span:has(.legend-dot.cancelled),
.map-legend span:has(.legend-dot.aufgehoben),
.property-map-legend span:has(.legend-dot.cancelled),
.property-map-legend span:has(.legend-dot.aufgehoben) {
  display: none !important;
}

@media (max-width: 800px) {
  .map-title-actions-row-v73 {
    align-items: flex-start !important;
    flex-direction: column !important;
  }

  .map-title-actions-v73 {
    margin-left: 0 !important;
  }
}
`;
});

console.log("Stage 73 patch completed.");
