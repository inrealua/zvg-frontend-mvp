const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();

function full(rel) {
  return path.join(root, rel);
}

function patch(rel, fn) {
  const file = full(rel);
  if (!fs.existsSync(file)) {
    console.log("skip missing", rel);
    return;
  }
  const before = fs.readFileSync(file, "utf8");
  const after = fn(before);
  if (after !== before) {
    fs.writeFileSync(file, after, "utf8");
    console.log("patched", rel);
  } else {
    console.log("unchanged", rel);
  }
}

function write(rel, content) {
  const file = full(rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
  console.log("written", rel);
}

/**
 * Stage 82
 *
 * 1) Gallery arrows on main object cards:
 *    - cleaner design, smaller round arrows, centered nicely
 *    - fix mojibake arrows if present
 *
 * 2) Auction calendar:
 *    - normalize auction time badges (HH:MM) so they sit centered in day cells
 *
 * 3) Active filters:
 *    - translate Active Filter label + filter chips values for /de /ru /en
 *    - add "Save search" button in the active filters row
 *
 * This stage uses a small runtime enhancer because Active Filter chips and calendar day cells
 * are rendered dynamically and may not have stable class names.
 */

/* -------------------------------------------------------------------------- */
/* 1. Fix arrow glyphs in gallery components                                   */
/* -------------------------------------------------------------------------- */

for (const rel of [
  "components/MainCardGallery.tsx",
  "components/PropertyGalleryImage.tsx",
  "components/PropertyCard.tsx",
]) {
  patch(rel, (s) => {
    return s
      .replace(/вЂ№/g, "‹")
      .replace(/вЂє/g, "›")
      .replace(/&lsaquo;/g, "‹")
      .replace(/&rsaquo;/g, "›");
  });
}

/* -------------------------------------------------------------------------- */
/* 2. Runtime enhancements                                                     */
/* -------------------------------------------------------------------------- */

const runtime = `"use client";

import { useEffect } from "react";

type Locale = "de" | "ru" | "en";

function getStage82Locale(): Locale {
  const first = window.location.pathname.split("/").filter(Boolean)[0];
  if (first === "ru" || first === "de" || first === "en") return first;
  const cookie = document.cookie.match(/(?:^|;\\s*)zvg_locale=(ru|de|en)(?:;|$)/);
  return (cookie?.[1] as Locale) || "de";
}

const stage82Text = {
  de: {
    activeFilters: "Aktive Filter:",
    saveSearch: "Suche speichern",
    saved: "Suche wurde gespeichert.",
    saveError: "Suche konnte nicht gespeichert werden.",
    allClear: "Alles löschen",
    labels: {
      city: "Ort",
      radius: "Umkreis",
      type: "Objektart",
      usage: "Nutzung",
      priceFrom: "Verkehrswert ab",
      priceTo: "Verkehrswert bis",
      livingFrom: "Wohnfläche ab",
      livingTo: "Wohnfläche bis",
      plotFrom: "Grundstück ab",
      plotTo: "Grundstück bis",
    },
    values: {
      apartments: "Wohnungen",
      commercial: "Gewerbe",
      plots: "Grundstücke",
      houses: "Wohnhäuser",
      rented: "Vermietet",
      ownUse: "Eigennutzung",
      free: "Frei",
      unknown: "Unbekannt",
    },
  },
  ru: {
    activeFilters: "Активные фильтры:",
    saveSearch: "Сохранить поиск",
    saved: "Поиск сохранён.",
    saveError: "Не удалось сохранить поиск.",
    allClear: "Очистить всё",
    labels: {
      city: "Город",
      radius: "Радиус",
      type: "Тип",
      usage: "Использование",
      priceFrom: "Цена от",
      priceTo: "Цена до",
      livingFrom: "Жилая от",
      livingTo: "Жилая до",
      plotFrom: "Участок от",
      plotTo: "Участок до",
    },
    values: {
      apartments: "Квартиры",
      commercial: "Коммерция",
      plots: "Участки",
      houses: "Жилые дома",
      rented: "Сдан в аренду",
      ownUse: "Используется собственником",
      free: "Свободен",
      unknown: "Неизвестно",
    },
  },
  en: {
    activeFilters: "Active filters:",
    saveSearch: "Save search",
    saved: "Search saved.",
    saveError: "Could not save search.",
    allClear: "Clear all",
    labels: {
      city: "City",
      radius: "Radius",
      type: "Type",
      usage: "Usage",
      priceFrom: "Price from",
      priceTo: "Price to",
      livingFrom: "Living area from",
      livingTo: "Living area to",
      plotFrom: "Plot from",
      plotTo: "Plot to",
    },
    values: {
      apartments: "Apartments",
      commercial: "Commercial",
      plots: "Plots",
      houses: "Residential houses",
      rented: "Rented",
      ownUse: "Owner-occupied",
      free: "Vacant",
      unknown: "Unknown",
    },
  },
} as const;

function replaceFilterText(text: string, locale: Locale) {
  const t = stage82Text[locale];

  let next = text;

  next = next
    .replace(/Active Filter:|Active Filters:|Aktive Filter:|Активные фильтры:/g, t.activeFilters)
    .replace(/Alles löschen|Alle löschen|Очистить всё|Очистить все|Clear all|All clear/g, t.allClear);

  const labelPairs: Array<[RegExp, string]> = [
    [/^(Ort|Город|City):/i, t.labels.city + ":"],
    [/^(Radius|Радиус|Umkreis):/i, t.labels.radius + ":"],
    [/^(Тип|Type|Objektart):/i, t.labels.type + ":"],
    [/^(Использование|Usage|Nutzung):/i, t.labels.usage + ":"],
    [/^(Цена от|Price from|Verkehrswert ab):/i, t.labels.priceFrom + ":"],
    [/^(Цена до|Price to|Verkehrswert bis):/i, t.labels.priceTo + ":"],
    [/^(Жилая от|Living area from|Wohnfläche ab):/i, t.labels.livingFrom + ":"],
    [/^(Жилая до|Living area to|Wohnfläche bis):/i, t.labels.livingTo + ":"],
    [/^(Участок от|Plot from|Grundstück ab):/i, t.labels.plotFrom + ":"],
    [/^(Участок до|Plot to|Grundstück bis):/i, t.labels.plotTo + ":"],
  ];

  for (const [pattern, replacement] of labelPairs) {
    next = next.replace(pattern, replacement);
  }

  next = next
    .replace(/Квартиры|Wohnungen|Apartments/g, t.values.apartments)
    .replace(/Коммерция|Gewerbe|Commercial/g, t.values.commercial)
    .replace(/Участки|Grundstücke|Plots/g, t.values.plots)
    .replace(/Жилые дома|Wohnhäuser|Residential houses/g, t.values.houses)
    .replace(/Сдан в аренду|Vermietet|Rented/g, t.values.rented)
    .replace(/Используется собственником|Eigennutzung|Owner-occupied/g, t.values.ownUse)
    .replace(/Свободен|Frei|Vacant/g, t.values.free)
    .replace(/Неизвестно|Unbekannt|Unknown/g, t.values.unknown);

  return next;
}

function walkText(root: ParentNode, replace: (text: string) => string) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Node[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  for (const node of nodes) {
    const before = node.textContent || "";
    const after = replace(before);
    if (after !== before) node.textContent = after;
  }
}

function findActiveFilterRows() {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>("section, div, aside"));
  return candidates.filter((el) => {
    const text = el.innerText || "";
    const hasFilterLabel = /Active Filter|Active filters|Aktive Filter|Активные фильтры/.test(text);
    const hasClear = /Alles löschen|Alle löschen|Очистить|Clear all/.test(text);
    const hasChip = /Radius|Радиус|Umkreis|Тип|Objektart|Usage|Nutzung|Использование|Цена|Verkehrswert/.test(text);
    return hasFilterLabel && (hasClear || hasChip);
  });
}

async function trySaveSearch(locale: Locale) {
  const t = stage82Text[locale];

  // Prefer an existing real save button if the app already has one elsewhere.
  const existing = Array.from(document.querySelectorAll<HTMLButtonElement | HTMLAnchorElement>("button,a")).find((el) => {
    if (el.dataset.stage82Save === "1") return false;
    return /Suche speichern|Save search|Сохранить поиск/i.test(el.textContent || "");
  });

  if (existing) {
    existing.click();
    return;
  }

  const params = Object.fromEntries(new URLSearchParams(window.location.search).entries());
  const name =
    params.city ? \`\${t.labels.city}: \${params.city}\` :
    params.q ? \`Search: \${params.q}\` :
    t.saveSearch;

  const payload = {
    name,
    url: window.location.pathname + window.location.search,
    query: window.location.search,
    filters: params,
  };

  const endpoints = ["/api/saved-searches", "/api/user/saved-searches", "/api/account/saved-searches"];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        window.dispatchEvent(new CustomEvent("zvg:saved-search-created"));
        alert(t.saved);
        return;
      }
    } catch {
      // try next endpoint
    }
  }

  alert(t.saveError);
}

function addSaveSearchButton(row: HTMLElement, locale: Locale) {
  if (row.querySelector("[data-stage82-save='1']")) return;

  const button = document.createElement("button");
  button.type = "button";
  button.dataset.stage82Save = "1";
  button.className = "active-filter-save-search-v82";
  button.textContent = stage82Text[locale].saveSearch;
  button.addEventListener("click", () => trySaveSearch(locale));

  row.appendChild(button);
}

function fixActiveFilters(locale: Locale) {
  const rows = findActiveFilterRows();

  for (const row of rows) {
    row.classList.add("active-filter-row-v82");
    walkText(row, (text) => replaceFilterText(text, locale));
    addSaveSearchButton(row, locale);
  }
}

function fixAuctionCalendar() {
  const timePattern = /^\\s*\\d{1,2}:\\d{2}\\s*$/;

  document.querySelectorAll<HTMLElement>("span, small, b, strong, em, div").forEach((el) => {
    const text = el.textContent || "";
    if (timePattern.test(text) && el.children.length === 0) {
      el.classList.add("auction-time-badge-v82");

      const parent = el.parentElement;
      if (parent) parent.classList.add("auction-calendar-day-with-time-v82");
    }
  });
}

export function RuntimeUiEnhancementsStage82() {
  useEffect(() => {
    const apply = () => {
      const locale = getStage82Locale();
      fixActiveFilters(locale);
      fixAuctionCalendar();
    };

    apply();

    const observer = new MutationObserver(apply);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    const interval = window.setInterval(apply, 1000);

    return () => {
      observer.disconnect();
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
`;

write("components/RuntimeUiEnhancementsStage82.tsx", runtime);

/* -------------------------------------------------------------------------- */
/* 3. Mount runtime component                                                  */
/* -------------------------------------------------------------------------- */

function mountLayout(rel) {
  patch(rel, (s) => {
    if (!s.includes("RuntimeUiEnhancementsStage82")) {
      s = `import { RuntimeUiEnhancementsStage82 } from "@/components/RuntimeUiEnhancementsStage82";\n` + s;
    }

    if (!s.includes("<RuntimeUiEnhancementsStage82 />")) {
      s = s.replace(/<body([^>]*)>/, `<body$1>\n        <RuntimeUiEnhancementsStage82 />`);
      if (!s.includes("<RuntimeUiEnhancementsStage82 />")) {
        s = s.replace(/\{children\}/, `<RuntimeUiEnhancementsStage82 />\n        {children}`);
      }
    }

    return s;
  });
}

if (fs.existsSync(full("app/layout.tsx"))) mountLayout("app/layout.tsx");
if (fs.existsSync(full("app/[locale]/layout.tsx"))) mountLayout("app/[locale]/layout.tsx");

/* -------------------------------------------------------------------------- */
/* 4. CSS                                                                      */
/* -------------------------------------------------------------------------- */

patch("app/globals.css", (s) => {
  if (s.includes("/* Stage 82 gallery calendar filters save */")) return s;

  return s + `

/* Stage 82 gallery calendar filters save */

/* 1. Card gallery arrows — cleaner and more compact */
.main-card-gallery-v77,
.main-card-gallery-v76,
.main-card-gallery-v75b {
  position: relative !important;
}

.main-card-gallery-nav-v77,
.main-card-gallery-nav-v76,
.main-card-gallery-nav-v75b,
.gallery-nav-v74 {
  width: 32px !important;
  height: 32px !important;
  min-width: 32px !important;
  min-height: 32px !important;
  padding: 0 !important;
  border-radius: 999px !important;
  border: 1px solid rgba(255,255,255,0.82) !important;
  background: rgba(15, 41, 31, 0.72) !important;
  color: #fff !important;
  font-family: Arial, Helvetica, sans-serif !important;
  font-size: 24px !important;
  font-weight: 600 !important;
  line-height: 1 !important;
  text-align: center !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  box-shadow: 0 8px 18px rgba(0,0,0,0.20) !important;
  backdrop-filter: blur(5px) !important;
  transform: translateY(-50%) !important;
  opacity: 0.96 !important;
}

.main-card-gallery-prev-v77,
.main-card-gallery-prev-v76,
.main-card-gallery-prev-v75b,
.gallery-prev-v74 {
  left: 14px !important;
}

.main-card-gallery-next-v77,
.main-card-gallery-next-v76,
.main-card-gallery-next-v75b,
.gallery-next-v74 {
  right: 14px !important;
}

.main-card-gallery-nav-v77:hover,
.main-card-gallery-nav-v76:hover,
.main-card-gallery-nav-v75b:hover,
.gallery-nav-v74:hover {
  background: rgba(15, 41, 31, 0.88) !important;
  transform: translateY(-50%) scale(1.04) !important;
}

.main-card-gallery-count-v77,
.main-card-gallery-count-v76,
.main-card-gallery-count-v75b,
.gallery-count-v74 {
  right: 12px !important;
  bottom: 12px !important;
  padding: 4px 8px !important;
  border-radius: 999px !important;
  background: rgba(15, 41, 31, 0.78) !important;
  color: #fff !important;
  font-size: 12px !important;
  font-weight: 800 !important;
  line-height: 1 !important;
}

/* 2. Auction calendar time badges */
.auction-calendar-day-with-time-v82 {
  position: relative !important;
  overflow: hidden !important;
}

.auction-time-badge-v82 {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  height: 22px !important;
  min-width: 48px !important;
  padding: 0 8px !important;
  margin-left: 6px !important;
  border-radius: 999px !important;
  background: rgba(47, 97, 79, 0.14) !important;
  color: #24604d !important;
  font-size: 12px !important;
  font-weight: 800 !important;
  line-height: 22px !important;
  vertical-align: middle !important;
  white-space: nowrap !important;
  transform: translateY(-1px) !important;
}

/* If the date cell is flex-like, keep date and time centered together */
.auction-calendar-day-with-time-v82 {
  align-items: center !important;
  justify-content: center !important;
}

/* 3. Active filters row */
.active-filter-row-v82 {
  display: flex !important;
  align-items: center !important;
  flex-wrap: wrap !important;
  gap: 8px !important;
}

.active-filter-row-v82 [class*="chip"],
.active-filter-row-v82 span,
.active-filter-row-v82 button,
.active-filter-row-v82 a {
  line-height: 1.1 !important;
}

.active-filter-save-search-v82 {
  min-height: 34px !important;
  height: 34px !important;
  padding: 0 16px !important;
  border: 1px solid rgba(47, 97, 79, 0.28) !important;
  border-radius: 999px !important;
  background: #2f654f !important;
  color: #fff !important;
  font-weight: 800 !important;
  font-size: 13px !important;
  cursor: pointer !important;
  box-shadow: 0 8px 18px rgba(20, 55, 41, 0.14) !important;
}

.active-filter-save-search-v82:hover {
  background: #255640 !important;
}

/* Make active filters less tall when many chips are selected */
.active-filter-row-v82 {
  margin-top: 12px !important;
  margin-bottom: 12px !important;
}
`;
});

console.log("Stage 82 completed.");
