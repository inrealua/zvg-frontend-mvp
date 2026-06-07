import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function patchFile(rel, updater) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) {
    console.log("skip missing", rel);
    return;
  }

  const before = fs.readFileSync(file, "utf8");
  const after = updater(before);

  if (after !== before) {
    fs.writeFileSync(file, after, "utf8");
    console.log("patched", rel);
  } else {
    console.log("unchanged", rel);
  }
}

/**
 * Stage 69:
 * - remove old Top-12 heading/subtitle above object list
 * - translate empty state
 * - translate Active Filter label / clear all where possible
 * - translate pagination fallback
 * - raise action buttons by 2px more
 * - restore commercial legend; hide only cancelled/aufgehoben, not the last legend item
 * - avoid hard-coded Russian/German date placeholders where possible
 *
 * Note: the native browser calendar popup language is controlled mostly by browser/OS locale.
 * We set lang={locale}, but Chrome may still show calendar months/weekdays in the browser language.
 */

/**
 * UI text: add pagination/empty/active filters if ui-texts file exists.
 */
for (const rel of ["lib/i18n/ui-texts.ts", "lib/i18n/uiTexts.ts", "lib/i18n/texts.ts"]) {
  patchFile(rel, (s) => {
    // This is intentionally conservative: it only replaces known old strings.
    s = s
      .replace(/Top 12 aktuelle Objekte/g, "Aktuelle Objekte")
      .replace(/Top-12 актуальных объектов/g, "Актуальные объекты")
      .replace(/Top 12 current objects/g, "Current objects")
      .replace(/Kurze Auswahl für die Startseite\. Die vollständige Recherche finden Sie in der erweiterten Suche\./g, "")
      .replace(/Короткая подборка для главной страницы\. Полный поиск доступен в расширенном поиске\./g, "")
      .replace(/Short selection for the home page\. Full search is available in advanced search\./g, "");
    return s;
  });
}

/**
 * PublicPropertiesPage:
 * 1) hide old list header text;
 * 2) translate "objects not found" state;
 * 3) remove perPage/sort from active chips if they came back;
 * 4) active filter title localization.
 */
patchFile("components/PublicPropertiesPage.tsx", (s) => {
  // Remove old Top 12 / subtitle block if rendered as section heading.
  s = s.replace(
    /\s*<div className="section-heading-row">\s*<div>\s*<h2>\{copy\.listTitle\}<\/h2>\s*<p>\{copy\.listText\}<\/p>\s*<\/div>\s*[\s\S]*?<\/div>\s*(?=<div className="properties-grid|<PropertyGrid|<div className="empty-state|<div className="properties-list)/g,
    "\n"
  );

  // If the title text is still injected from copy, make it empty for home/list mode.
  s = s.replace(/listTitle:\s*[^,\n]+,/g, 'listTitle: "",');
  s = s.replace(/listText:\s*[^,\n]+,/g, 'listText: "",');

  // Empty state hard-coded replacements.
  s = s.replace(/Объекты не найдены/g, "{stage69Text().emptyTitle}");
  s = s.replace(/Попробуй убрать часть фильтров, расширить диапазон цены или выбрать другой город\./g, "{stage69Text().emptyText}");
  s = s.replace(/Objekte nicht gefunden/g, "{stage69Text().emptyTitle}");
  s = s.replace(/Keine Objekte gefunden/g, "{stage69Text().emptyTitle}");
  s = s.replace(/Objects not found/g, "{stage69Text().emptyTitle}");
  s = s.replace(/Try removing some filters, expanding the price range, or choosing another city\./g, "{stage69Text().emptyText}");
  s = s.replace(/Versuchen Sie, einige Filter zu entfernen, den Preisbereich zu erweitern oder eine andere Stadt auszuwählen\./g, "{stage69Text().emptyText}");

  // Active filters label.
  s = s.replace(/Aktive Filter:/g, "{stage69Text().activeFilters}");
  s = s.replace(/Active Filter:/g, "{stage69Text().activeFilters}");
  s = s.replace(/Active Filters:/g, "{stage69Text().activeFilters}");
  s = s.replace(/Активные фильтры:/g, "{stage69Text().activeFilters}");

  // Clear all.
  s = s.replace(/Alles löschen/g, "{stage69Text().clearAll}");
  s = s.replace(/Очистить всё/g, "{stage69Text().clearAll}");
  s = s.replace(/Clear all/g, "{stage69Text().clearAll}");

  // Pagination fallback inside this file.
  s = s.replace(/←\s*Назад/g, "← {stage69Text().prev}");
  s = s.replace(/Вперёд\s*→/g, "{stage69Text().next} →");
  s = s.replace(/←\s*Zurück/g, "← {stage69Text().prev}");
  s = s.replace(/Weiter\s*→/g, "{stage69Text().next} →");
  s = s.replace(/←\s*Back/g, "← {stage69Text().prev}");
  s = s.replace(/Next\s*→/g, "{stage69Text().next} →");

  // Skip perPage/sort as active filters.
  s = s.replace(
    /if\s*\(\s*key\s*===\s*["']page["']\s*\)\s*return\s*null\s*;/g,
    'if (["page", "perPage", "sort"].includes(key)) return null;'
  );
  s = s.replace(
    /if\s*\(\s*key\s*===\s*["']page["']\s*\)\s*continue\s*;/g,
    'if (["page", "perPage", "sort"].includes(key)) continue;'
  );

  // Add helper dictionary if not present.
  if (!s.includes("stage69Text")) {
    const dict = `
type Stage69Locale = "de" | "ru" | "en";

function stage69ReadLocale(): Stage69Locale {
  if (typeof document === "undefined") return "de";
  const match = document.cookie.match(/(?:^|;\\s*)zvg_locale=(de|ru|en)(?:;|$)/);
  return (match?.[1] as Stage69Locale) || "de";
}

const stage69TextDict = {
  de: {
    activeFilters: "Aktive Filter:",
    clearAll: "Alles löschen",
    emptyTitle: "Keine Objekte gefunden",
    emptyText: "Entfernen Sie einige Filter, erweitern Sie den Preisbereich oder wählen Sie eine andere Stadt.",
    prev: "Zurück",
    next: "Weiter",
  },
  ru: {
    activeFilters: "Активные фильтры:",
    clearAll: "Очистить всё",
    emptyTitle: "Объекты не найдены",
    emptyText: "Попробуй убрать часть фильтров, расширить диапазон цены или выбрать другой город.",
    prev: "Назад",
    next: "Вперёд",
  },
  en: {
    activeFilters: "Active filters:",
    clearAll: "Clear all",
    emptyTitle: "No objects found",
    emptyText: "Try removing some filters, expanding the price range, or choosing another city.",
    prev: "Back",
    next: "Next",
  },
} as const;

function stage69Text() {
  return stage69TextDict[stage69ReadLocale()];
}
`;

    // PublicPropertiesPage is normally a server component, so using document there is not good.
    // If there is already locale variable, prefer it. The helper will be used only if rendered in a client subtree.
    // For TS safety in server component, we insert a server-safe variant if locale exists.
    const serverDict = `
type Stage69Locale = "de" | "ru" | "en";

const stage69TextDict = {
  de: {
    activeFilters: "Aktive Filter:",
    clearAll: "Alles löschen",
    emptyTitle: "Keine Objekte gefunden",
    emptyText: "Entfernen Sie einige Filter, erweitern Sie den Preisbereich oder wählen Sie eine andere Stadt.",
    prev: "Zurück",
    next: "Weiter",
  },
  ru: {
    activeFilters: "Активные фильтры:",
    clearAll: "Очистить всё",
    emptyTitle: "Объекты не найдены",
    emptyText: "Попробуй убрать часть фильтров, расширить диапазон цены или выбрать другой город.",
    prev: "Назад",
    next: "Вперёд",
  },
  en: {
    activeFilters: "Active filters:",
    clearAll: "Clear all",
    emptyTitle: "No objects found",
    emptyText: "Try removing some filters, expanding the price range, or choosing another city.",
    prev: "Back",
    next: "Next",
  },
} as const;

function stage69Text(locale: Stage69Locale = "de") {
  return stage69TextDict[locale] || stage69TextDict.de;
}
`;
    s = serverDict + "\n" + s;

    // Now fix calls stage69Text() to stage69Text(locale) where possible.
    s = s.replace(/stage69Text\(\)\./g, "stage69Text(locale as Stage69Locale).");
  }

  return s;
});

/**
 * Pagination components.
 */
for (const rel of ["components/Pagination.tsx", "app/components/Pagination.tsx"]) {
  patchFile(rel, (s) => {
    if (!s.includes("stage69Pg")) {
      const dict = `
type Stage69PaginationLocale = "de" | "ru" | "en";

function stage69ReadPaginationLocale(): Stage69PaginationLocale {
  if (typeof document === "undefined") return "de";
  const match = document.cookie.match(/(?:^|;\\s*)zvg_locale=(de|ru|en)(?:;|$)/);
  return (match?.[1] as Stage69PaginationLocale) || "de";
}

const stage69PaginationText = {
  de: { prev: "Zurück", next: "Weiter" },
  ru: { prev: "Назад", next: "Вперёд" },
  en: { prev: "Back", next: "Next" },
} as const;

function stage69Pg() {
  return stage69PaginationText[stage69ReadPaginationLocale()];
}
`;
      if (s.includes('"use client";')) s = s.replace('"use client";', `"use client";\n${dict}`);
      else if (s.includes("'use client';")) s = s.replace("'use client';", `'use client';\n${dict}`);
      else s = dict + "\n" + s;
    }

    s = s.replace(/>\s*←\s*(Назад|Zurück|Back)\s*</g, ">← {stage69Pg().prev}<");
    s = s.replace(/>\s*(Вперёд|Weiter|Next)\s*→\s*</g, ">{stage69Pg().next} →<");
    s = s.replace(/["']←\s*(Назад|Zurück|Back)["']/g, '`← ${stage69Pg().prev}`');
    s = s.replace(/["'](Вперёд|Weiter|Next)\s*→["']/g, '`${stage69Pg().next} →`');
    return s;
  });
}

/**
 * PropertyMap:
 * Restore commercial legend if Stage 68 CSS accidentally hid it as last item.
 * Remove only cancelled/aufgehoben item.
 */
for (const rel of ["components/PropertyMap.tsx", "app/components/PropertyMap.tsx"]) {
  patchFile(rel, (s) => {
    // Ensure commercial legend exists after land if it is missing but stage61MapT exists.
    if (s.includes("stage61MapT().commercial") === false && s.includes("stage61MapT().land")) {
      s = s.replace(
        /(<span><i className="legend-dot grundstueck" \/>[\s\S]*?<\/span>)/,
        `$1\n        <span><i className="legend-dot gewerbe" />{stage61MapT().commercial}</span>`
      );
    }

    // Remove only cancelled legend item, not commercial.
    s = s.replace(/\n\s*<span><i className=["']legend-dot\s+(?:cancelled|aufgehoben)["']\s*\/>\s*(?:\{stage61MapT\(\)\.cancelled\}|отменено|aufgehoben|cancelled)\s*<\/span>/gi, "");
    s = s.replace(/\n\s*<span>[\s\S]*?(?:stage61MapT\(\)\.cancelled|отменено|aufgehoben|cancelled)[\s\S]*?<\/span>/gi, "");

    // Fix broken empty span if any remained.
    s = s.replace(/\n\s*<span>\s*\n\s*<\/div>\s*\n\s*<\/aside>/g, "\n      </div>\n    </aside>");
    return s;
  });
}

/**
 * FilterBar:
 * - Buttons up by another 2px via CSS below.
 * - Native browser date popup cannot be fully translated by app code.
 *   But date inputs get lang={locale}; if not already present, add it.
 */
patchFile("components/FilterBar.tsx", (s) => {
  s = s.replace(
    /<input id="dateFrom" name="dateFrom" type="date" defaultValue=\{getInitialValue\(searchParams, "dateFrom"\)\} \/>/g,
    '<input id="dateFrom" name="dateFrom" type="date" lang={locale} defaultValue={getInitialValue(searchParams, "dateFrom")} />'
  );
  s = s.replace(
    /<input id="dateTo" name="dateTo" type="date" defaultValue=\{getInitialValue\(searchParams, "dateTo"\)\} \/>/g,
    '<input id="dateTo" name="dateTo" type="date" lang={locale} defaultValue={getInitialValue(searchParams, "dateTo")} />'
  );
  return s;
});

/**
 * CSS final fixes.
 */
patchFile("app/globals.css", (s) => {
  if (s.includes("/* Stage 69 i18n empty/map/button fixes */")) return s;

  return s + `

/* Stage 69 i18n empty/map/button fixes */

/* 5) Buttons: raise 2px more */
.search-filter-grid-v60 > .filter-action-button-v60,
.search-filter-grid-v59 > .filter-action-button-v59,
.search-filter-grid-v58 > .filter-action-button-v58 {
  margin-top: 18px !important;
}

/* 1) Hide old list heading/subtitle if still rendered */
.section-heading-row h2:empty,
.section-heading-row p:empty {
  display: none !important;
}

.section-heading-row:has(h2:empty):has(p:empty) {
  display: none !important;
}

/* Hide Top 12 heading block by common classes */
.properties-heading-v54,
.properties-heading-v55,
.list-heading-v54,
.list-heading-v55 {
  display: none !important;
}

/* 6) Do NOT hide last legend item anymore. Stage 68 accidentally hid commercial. */
.map-legend > *:last-child,
.property-map-legend > *:last-child,
.leaflet-container + .map-legend > *:last-child {
  display: inline-flex !important;
}

/* Hide only cancelled legend item by explicit signals */
.map-legend [data-type="cancelled"],
.map-legend [data-status="cancelled"],
.map-legend [data-key="cancelled"],
.property-map-legend [data-type="cancelled"],
.property-map-legend [data-status="cancelled"],
.property-map-legend [data-key="cancelled"],
.map-legend .legend-dot.cancelled,
.map-legend .legend-dot.aufgehoben,
.property-map-legend .legend-dot.cancelled,
.property-map-legend .legend-dot.aufgehoben {
  display: none !important;
}

/* If the dot itself is hidden, hide its parent legend text too in modern browsers. */
.map-legend span:has(.legend-dot.cancelled),
.map-legend span:has(.legend-dot.aufgehoben),
.property-map-legend span:has(.legend-dot.cancelled),
.property-map-legend span:has(.legend-dot.aufgehoben) {
  display: none !important;
}

/* Date input gets locale hint; native calendar popup language still depends on browser/OS */
.search-filter-v60 input[type="date"],
.search-filter-v59 input[type="date"],
.search-filter-v58 input[type="date"] {
  color-scheme: light !important;
}
`;
});

console.log("Stage 69 patch completed.");
