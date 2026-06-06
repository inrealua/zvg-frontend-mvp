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
 * 1) Date fields: restore browser calendar.
 * In previous stages we used type="text" to avoid browser locale placeholders.
 * Now we restore type="date".
 */
patchFile("components/FilterBar.tsx", (s) => {
  s = s.replace(
    /<input id="dateFrom" name="dateFrom" type="text" inputMode="numeric" placeholder=\{t\.datePlaceholder\} defaultValue=\{getInitialValue\(searchParams, "dateFrom"\)\} \/>/g,
    '<input id="dateFrom" name="dateFrom" type="date" defaultValue={getInitialValue(searchParams, "dateFrom")} />'
  );

  s = s.replace(
    /<input id="dateTo" name="dateTo" type="text" inputMode="numeric" placeholder=\{t\.datePlaceholder\} defaultValue=\{getInitialValue\(searchParams, "dateTo"\)\} \/>/g,
    '<input id="dateTo" name="dateTo" type="date" defaultValue={getInitialValue(searchParams, "dateTo")} />'
  );

  return s;
});

/**
 * 2) PropertyMap translations.
 * Adds a lightweight client-side dictionary inside PropertyMap if it is not already there.
 * This covers:
 * - legend: Häuser / Wohnungen / Grundstücke / Gewerbe / aufgehoben
 * - polygon drawing panel: title, text, apply, clear, cancel
 */
for (const rel of ["components/PropertyMap.tsx", "app/components/PropertyMap.tsx"]) {
  patchFile(rel, (s) => {
    if (!s.includes("stage61MapLocaleText")) {
      const insertAfterUseClient = s.includes('"use client";')
        ? '"use client";'
        : s.includes("'use client';")
          ? "'use client';"
          : "";

      const dict = `
type Stage61Locale = "de" | "ru" | "en";

function stage61ReadLocale(): Stage61Locale {
  if (typeof document === "undefined") return "de";
  const match = document.cookie.match(/(?:^|;\\s*)zvg_locale=(de|ru|en)(?:;|$)/);
  return (match?.[1] as Stage61Locale) || "de";
}

const stage61MapLocaleText = {
  de: {
    houses: "Häuser",
    apartments: "Wohnungen",
    land: "Grundstücke",
    commercial: "Gewerbe",
    cancelled: "aufgehoben",
    drawTitle: "Bereich zeichnen",
    drawHelp: "Klicken Sie auf die Karte, um Punkte zu setzen. Mindestens 3 Punkte.",
    applyPolygon: "Polygon anwenden",
    clearPoints: "Punkte löschen",
    cancel: "Abbrechen",
    searchVisible: "In diesem Kartenausschnitt suchen",
    drawRegion: "Region zeichnen",
  },
  ru: {
    houses: "Дома",
    apartments: "Квартиры",
    land: "Участки",
    commercial: "Коммерция",
    cancelled: "отменено",
    drawTitle: "Нарисовать область",
    drawHelp: "Кликните по карте, чтобы поставить точки. Минимум 3 точки.",
    applyPolygon: "Применить полигон",
    clearPoints: "Удалить точки",
    cancel: "Отмена",
    searchVisible: "Искать в этой области карты",
    drawRegion: "Нарисовать область",
  },
  en: {
    houses: "Houses",
    apartments: "Apartments",
    land: "Land plots",
    commercial: "Commercial",
    cancelled: "cancelled",
    drawTitle: "Draw area",
    drawHelp: "Click on the map to place points. At least 3 points.",
    applyPolygon: "Apply polygon",
    clearPoints: "Clear points",
    cancel: "Cancel",
    searchVisible: "Search this map area",
    drawRegion: "Draw region",
  },
} as const;

function stage61MapT() {
  return stage61MapLocaleText[stage61ReadLocale()];
}
`;

      if (insertAfterUseClient) {
        s = s.replace(insertAfterUseClient, `${insertAfterUseClient}\n${dict}`);
      } else {
        s = `${dict}\n${s}`;
      }
    }

    // Replace common hard-coded legend labels.
    s = s
      .replace(/>\s*Häuser\s*</g, ">{stage61MapT().houses}<")
      .replace(/>\s*Wohnungen\s*</g, ">{stage61MapT().apartments}<")
      .replace(/>\s*Grundstücke\s*</g, ">{stage61MapT().land}<")
      .replace(/>\s*Gewerbe\s*</g, ">{stage61MapT().commercial}<")
      .replace(/>\s*aufgehoben\s*</g, ">{stage61MapT().cancelled}<")
      .replace(/>\s*Нарисовать область\s*</g, ">{stage61MapT().drawTitle}<")
      .replace(/>\s*Klicken Sie auf die Karte, um Punkte zu setzen\. Mindestens 3 Punkte\.\s*</g, ">{stage61MapT().drawHelp}<")
      .replace(/>\s*Polygon anwenden\s*\((\{[^}]+\}|[^<]+)\)\s*</g, ">{stage61MapT().applyPolygon} ($1)<")
      .replace(/>\s*Punkte löschen\s*</g, ">{stage61MapT().clearPoints}<")
      .replace(/>\s*Abbrechen\s*</g, ">{stage61MapT().cancel}<")
      .replace(/>\s*In diesem Kartenausschnitt suchen\s*</g, ">{stage61MapT().searchVisible}<")
      .replace(/>\s*Region zeichnen\s*</g, ">{stage61MapT().drawRegion}<")
      .replace(/>\s*Искать в этой области карты\s*</g, ">{stage61MapT().searchVisible}<")
      .replace(/>\s*Нарисовать область\s*</g, ">{stage61MapT().drawRegion}<");

    // Some components store labels as strings in arrays/objects.
    s = s
      .replace(/label:\s*["']Häuser["']/g, "label: stage61MapT().houses")
      .replace(/label:\s*["']Wohnungen["']/g, "label: stage61MapT().apartments")
      .replace(/label:\s*["']Grundstücke["']/g, "label: stage61MapT().land")
      .replace(/label:\s*["']Gewerbe["']/g, "label: stage61MapT().commercial")
      .replace(/label:\s*["']aufgehoben["']/g, "label: stage61MapT().cancelled");

    return s;
  });
}

/**
 * 3) CSS alignment.
 * Problem: details/summary multiselect cells have a little different vertical baseline.
 * Fix: make all field/select/input/details/range/buttons the same height model.
 */
patchFile("app/globals.css", (s) => {
  if (s.includes("/* Stage 61 alignment and map translation cleanup */")) return s;

  return s + `

/* Stage 61 alignment and map translation cleanup */

.search-filter-grid-v60,
.search-filter-grid-v59,
.search-filter-grid-v58 {
  align-items: stretch !important;
}

.search-filter-v60 .field,
.search-filter-v60 .multi-filter-v60,
.search-filter-v60 .range-filter-v60,
.search-filter-v60 .filter-action-button-v60,
.search-filter-v59 .field,
.search-filter-v59 .multi-filter-v59,
.search-filter-v59 .range-filter-v59,
.search-filter-v59 .filter-action-button-v59,
.search-filter-v58 .field,
.search-filter-v58 .multi-filter-v58,
.search-filter-v58 .range-filter-v58,
.search-filter-v58 .filter-action-button-v58 {
  align-self: stretch !important;
  min-height: 58px !important;
  margin: 0 !important;
}

.search-filter-v60 .field,
.search-filter-v59 .field,
.search-filter-v58 .field {
  display: flex !important;
  flex-direction: column !important;
  justify-content: flex-end !important;
}

.search-filter-v60 label,
.search-filter-v59 label,
.search-filter-v58 label {
  line-height: 1.15 !important;
}

.search-filter-v60 input,
.search-filter-v60 select,
.search-filter-v59 input,
.search-filter-v59 select,
.search-filter-v58 input,
.search-filter-v58 select {
  height: 48px !important;
  min-height: 48px !important;
  box-sizing: border-box !important;
}

.multi-filter-v60 summary,
.multi-filter-v59 summary,
.multi-filter-v58 summary {
  height: 58px !important;
  min-height: 58px !important;
  box-sizing: border-box !important;
  margin: 0 !important;
}

.range-filter-v60,
.range-filter-v59,
.range-filter-v58 {
  height: 58px !important;
  min-height: 58px !important;
  box-sizing: border-box !important;
  padding-top: 8px !important;
  padding-bottom: 6px !important;
}

.range-title-v60,
.range-title-v59,
.range-title-v58 {
  margin-bottom: 4px !important;
}

.range-track-v60,
.range-track-v59,
.range-track-v58 {
  height: 20px !important;
}

.range-track-v60::before,
.range-track-v60::after,
.range-track-v59::before,
.range-track-v59::after,
.range-track-v58::before,
.range-track-v58::after {
  top: 8px !important;
}

.range-track-v60 input,
.range-track-v59 input,
.range-track-v58 input {
  height: 20px !important;
}

.range-track-v60 input::-webkit-slider-thumb,
.range-track-v59 input::-webkit-slider-thumb,
.range-track-v58 input::-webkit-slider-thumb {
  margin-top: -1px !important;
}

.range-scale {
  margin-top: 0 !important;
  line-height: 1 !important;
}

.filter-action-button-v60,
.filter-action-button-v59,
.filter-action-button-v58 {
  height: 58px !important;
  min-height: 58px !important;
  align-self: stretch !important;
}

/* Date inputs should show native calendar and align with other cells */
input[type="date"] {
  color-scheme: light;
}
`;
});

console.log("Stage 61 patch completed.");
