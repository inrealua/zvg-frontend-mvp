const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();

function full(rel) {
  return path.join(root, rel);
}

function exists(rel) {
  return fs.existsSync(full(rel));
}

function read(rel) {
  return fs.readFileSync(full(rel), "utf8");
}

function write(rel, content) {
  const target = full(rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
  console.log("written", rel);
}

function patch(rel, fn) {
  if (!exists(rel)) {
    console.log("skip missing", rel);
    return;
  }

  const before = read(rel);
  const after = fn(before);

  if (after !== before) {
    write(rel, after);
    console.log("patched", rel);
  } else {
    console.log("unchanged", rel);
  }
}

/**
 * Stage 89 — targeted fix only.
 *
 * Previous global DOM scanners caused layout problems. This stage adds one small
 * client component that only touches the active-filter row and only injects a
 * save button there. It does not resize map/cards and does not scan the whole
 * page repeatedly forever.
 *
 * Also fixes the broken map legend literal `${escapeHtml(groupText)}` directly
 * in PropertyMap.tsx and adds safe CSS for cabinet favorite thumbnails and
 * calendar time badges.
 */

/* -------------------------------------------------------------------------- */
/* 0. Make sure old unstable runtime stages stay disabled                       */
/* -------------------------------------------------------------------------- */

const noops = [
  ["components/RuntimeUiEnhancementsStage82.tsx", "RuntimeUiEnhancementsStage82"],
  ["components/RuntimeStage83.tsx", "RuntimeStage83"],
  ["components/RuntimeStage84.tsx", "RuntimeStage84"],
  ["components/RuntimeStage85.tsx", "RuntimeStage85"],
  ["components/RuntimeStage86.tsx", "RuntimeStage86"],
];

for (const [rel, name] of noops) {
  if (exists(rel)) {
    write(rel, '"use client";\n\nexport function ' + name + '() {\n  return null;\n}\n');
  }
}

for (const rel of ["app/layout.tsx", "app/[locale]/layout.tsx"]) {
  patch(rel, (s) => {
    for (const [name] of noops) {
      s = s.replace(new RegExp(String.raw`import\s+\{\s*${name}\s*\}\s+from\s+["'][^"']+["'];?\s*\n`, "g"), "");
      s = s.replace(new RegExp(String.raw`\s*<${name}\s*/>\s*`, "g"), "\n");
    }
    return s.replace(/\n{3,}/g, "\n\n");
  });
}

/* -------------------------------------------------------------------------- */
/* 1. Targeted Active Filter enhancer + Save search button                      */
/* -------------------------------------------------------------------------- */

const targetedClient = `"use client";

import { useEffect } from "react";

type Locale = "de" | "ru" | "en";

function getLocale(): Locale {
  const first = window.location.pathname.split("/").filter(Boolean)[0];
  if (first === "ru" || first === "de" || first === "en") return first;
  const match = document.cookie.match(/(?:^|;\\\\s*)zvg_locale=(ru|de|en)(?:;|$)/);
  return (match?.[1] as Locale) || "de";
}

const t = {
  de: {
    activeFilters: "Aktive Filter:",
    clearAll: "Alles löschen",
    save: "Suche speichern",
    saved: "Gespeichert",
    already: "Bereits gespeichert",
    login: "Bitte anmelden",
    error: "Fehler beim Speichern",
    state: "Bundesland",
    city: "Ort",
    postalCode: "PLZ",
    radius: "Umkreis",
    court: "Amtsgericht",
    type: "Objektart",
    status: "Status",
    usage: "Nutzung",
    priceFrom: "Verkehrswert ab",
    priceTo: "Verkehrswert bis",
    livingFrom: "Wohnfläche ab",
    livingTo: "Wohnfläche bis",
    plotFrom: "Grundstück ab",
    plotTo: "Grundstück bis",
    dateFrom: "Termin ab",
    dateTo: "Termin bis",
    monument: "Denkmalschutz",
    limits: "Wertgrenzen",
    termNo: "Termin-Nr.",
    active: "Aktiv",
    yes: "Ja",
    no: "Nein",
    removed: "weggefallen",
    notRemoved: "nicht weggefallen / unbekannt",
    term1: "1. Termin",
    term2: "2. Termin",
    term3: "3. und weitere",
    apartments: "Wohnungen",
    commercial: "Gewerbe",
    plots: "Grundstücke",
    landForest: "Land / Wald",
    garages: "Garagen / Parken",
    other: "Sonstige",
    rented: "Vermietet",
    ownUse: "Eigennutzung",
    free: "Frei",
    unknown: "Unbekannt",
  },
  ru: {
    activeFilters: "Активные фильтры:",
    clearAll: "Очистить всё",
    save: "Сохранить поиск",
    saved: "Сохранено",
    already: "Уже сохранено",
    login: "Войдите в аккаунт",
    error: "Ошибка сохранения",
    state: "Земля",
    city: "Город",
    postalCode: "Индекс",
    radius: "Радиус",
    court: "Суд",
    type: "Тип",
    status: "Статус",
    usage: "Использование",
    priceFrom: "Цена от",
    priceTo: "Цена до",
    livingFrom: "Жилая от",
    livingTo: "Жилая до",
    plotFrom: "Участок от",
    plotTo: "Участок до",
    dateFrom: "Торги от",
    dateTo: "Торги до",
    monument: "Памятник архитектуры",
    limits: "Ценовые границы",
    termNo: "№ термина",
    active: "Активен",
    yes: "Да",
    no: "Нет",
    removed: "сняты",
    notRemoved: "не сняты / неизвестно",
    term1: "1-й термин",
    term2: "2-й термин",
    term3: "3-й и больше",
    apartments: "Квартиры",
    commercial: "Коммерция",
    plots: "Участки",
    landForest: "Земля / лес",
    garages: "Гаражи / парковки",
    other: "Прочее",
    rented: "Сдан в аренду",
    ownUse: "Используется собственником",
    free: "Свободен",
    unknown: "Неизвестно",
  },
  en: {
    activeFilters: "Active filters:",
    clearAll: "Clear all",
    save: "Save search",
    saved: "Saved",
    already: "Already saved",
    login: "Please sign in",
    error: "Save error",
    state: "State",
    city: "City",
    postalCode: "ZIP",
    radius: "Radius",
    court: "Court",
    type: "Type",
    status: "Status",
    usage: "Usage",
    priceFrom: "Price from",
    priceTo: "Price to",
    livingFrom: "Living area from",
    livingTo: "Living area to",
    plotFrom: "Plot from",
    plotTo: "Plot to",
    dateFrom: "Auction from",
    dateTo: "Auction to",
    monument: "Listed building",
    limits: "Price limits",
    termNo: "Auction no.",
    active: "Active",
    yes: "Yes",
    no: "No",
    removed: "removed",
    notRemoved: "not removed / unknown",
    term1: "1st auction",
    term2: "2nd auction",
    term3: "3rd and later",
    apartments: "Apartments",
    commercial: "Commercial",
    plots: "Plots",
    landForest: "Land / forest",
    garages: "Garages / parking",
    other: "Other",
    rented: "Rented",
    ownUse: "Owner-occupied",
    free: "Vacant",
    unknown: "Unknown",
  },
} as const;

function currentUrl() {
  const locale = getLocale();
  const path = window.location.pathname || "/";
  const search = window.location.search || "";
  if (/^\\/(de|ru|en)(\\/|\\?|$)/.test(path)) return path + search;
  return "/" + locale + search;
}

function translateText(input: string, locale: Locale) {
  const d = t[locale];
  let text = input;

  const pairs: Array<[RegExp, string]> = [
    [/Active Filter:|Active Filters:|Aktive Filter:|Активные фильтры:/g, d.activeFilters],
    [/Alles löschen|Alle löschen|Очистить всё|Очистить все|Clear all|All clear/g, d.clearAll],

    [/Область карты|Kartenbereich|Map area/g, locale === "de" ? "Kartenbereich" : locale === "en" ? "Map area" : "Область карты"],
    [/Земля|Bundesland|Federal state|State/g, d.state],
    [/Город|Ort|City/g, d.city],
    [/Индекс|PLZ|ZIP/g, d.postalCode],
    [/Суд|Amtsgericht|Court/g, d.court],
    [/Радиус|Umkreis|Radius/g, d.radius],
    [/Тип|Objektart|Type/g, d.type],
    [/Статус|Status/g, d.status],
    [/Использование|Nutzung|Usage/g, d.usage],
    [/Цена от|Verkehrswert ab|Price from/g, d.priceFrom],
    [/Цена до|Verkehrswert bis|Price to/g, d.priceTo],
    [/Жилая от|Wohnfläche ab|Living area from/g, d.livingFrom],
    [/Жилая до|Wohnfläche bis|Living area to/g, d.livingTo],
    [/Участок от|Grundstück ab|Plot from/g, d.plotFrom],
    [/Участок до|Grundstück bis|Plot to/g, d.plotTo],
    [/Торги от|Termin ab|Auction from/g, d.dateFrom],
    [/Торги до|Termin bis|Auction to/g, d.dateTo],
    [/Памятник архитектуры|Denkmalschutz|Listed building/g, d.monument],
    [/Ценовые границы|Wertgrenzen|Price limits/g, d.limits],
    [/№ термина|Termin-Nr\\.|Auction no\\./g, d.termNo],

    [/Активен|Aktiv|Active/g, d.active],
    [/\\bДа\\b|\\bJa\\b|\\bYes\\b/g, d.yes],
    [/\\bНет\\b|\\bNein\\b|\\bNo\\b/g, d.no],
    [/не сняты\\s*\\/\\s*неизвестно|nicht weggefallen\\s*\\/\\s*unbekannt|not removed\\s*\\/\\s*unknown/gi, d.notRemoved],
    [/\\bСняты\\b|\\bweggefallen\\b|\\bremoved\\b/gi, d.removed],
    [/1-й термин|1\\. Termin|1st auction/g, d.term1],
    [/2-й термин|2\\. Termin|2nd auction/g, d.term2],
    [/3-й и больше|3\\. und weitere|3rd and later/g, d.term3],

    [/Квартиры|Wohnungen|Apartments/g, d.apartments],
    [/Коммерция|Gewerbe|Commercial/g, d.commercial],
    [/Участки|Grundstücke|Plots/g, d.plots],
    [/Земля\\s*\\/\\s*лес|Land\\s*\\/\\s*Wald|Land\\s*\\/\\s*forest/g, d.landForest],
    [/Гаражи\\s*\\/\\s*парковки|Garagen\\s*\\/\\s*Parken|Garages\\s*\\/\\s*parking/g, d.garages],
    [/Прочее|Sonstige|Other/g, d.other],
    [/Жилые дома|Wohnhäuser|Residential houses/g, d.apartments === "Apartments" ? "Residential houses" : d.other === "Sonstige" ? "Wohnhäuser" : "Жилые дома"],
    [/Сдан в аренду|Vermietet|Rented/g, d.rented],
    [/Используется собственником|Eigennutzung|Owner-occupied/g, d.ownUse],
    [/Свободен|Frei|Vacant/g, d.free],
    [/Неизвестно|Unbekannt|Unknown/g, d.unknown],
  ];

  for (const [from, to] of pairs) text = text.replace(from, to);
  return text;
}

function findActiveFilterRow() {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>("section, div, aside"));

  let best: HTMLElement | null = null;

  for (const node of nodes) {
    const text = node.innerText || "";
    if (!/Active Filter|Active filters|Aktive Filter|Активные фильтры/.test(text)) continue;
    if (!/Alles löschen|Очистить|Clear all|Filter|Фильтр|Radius|Umkreis|PLZ|Область карты/.test(text)) continue;

    const rect = node.getBoundingClientRect();
    if (rect.height > 180) continue;

    if (!best || rect.height < best.getBoundingClientRect().height) best = node;
  }

  return best;
}

async function saveSearch(row: HTMLElement, button: HTMLButtonElement) {
  const locale = getLocale();
  const d = t[locale];

  const oldLabel = button.textContent || d.save;
  button.disabled = true;
  button.textContent = "...";

  const summary = translateText(
    row.innerText
      .replace(d.activeFilters, "")
      .replace(d.clearAll, "")
      .replace(d.save, "")
      .replace(/\\s+/g, " ")
      .trim() || "Alle Objekte",
    locale,
  );

  try {
    const response = await fetch("/api/saved-searches", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        filtersUrl: currentUrl(),
        summary,
        name: summary.slice(0, 120),
      }),
    });

    if (response.status === 401) button.textContent = d.login;
    else if (response.status === 409) button.textContent = d.already;
    else if (response.ok) button.textContent = d.saved;
    else button.textContent = d.error;
  } catch {
    button.textContent = d.error;
  }

  window.setTimeout(() => {
    button.disabled = false;
    button.textContent = oldLabel;
  }, 2200);
}

function processActiveFilters() {
  const locale = getLocale();
  const row = findActiveFilterRow();
  if (!row) return;

  row.classList.add("active-filters-targeted-v89");

  const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT);
  const nodes: Node[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  for (const node of nodes) {
    const before = node.textContent || "";
    const after = translateText(before, locale);
    if (after !== before) node.textContent = after;
  }

  let button = row.querySelector<HTMLButtonElement>("[data-save-search-v89='1']");

  if (!button) {
    button = document.createElement("button");
    button.type = "button";
    button.dataset.saveSearchV89 = "1";
    button.className = "save-search-v89";
    row.appendChild(button);
  }

  button.textContent = t[locale].save;
  button.onclick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    saveSearch(row, button);
  };
}

export function TargetedSearchEnhancerStage89() {
  useEffect(() => {
    let runs = 0;

    const run = () => {
      runs += 1;
      processActiveFilters();
      if (runs > 30) window.clearInterval(timer);
    };

    run();
    const timer = window.setInterval(run, 500);

    const onFocus = () => processActiveFilters();
    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return null;
}
`;

write("components/TargetedSearchEnhancerStage89.tsx", targetedClient);

/* Mount only this targeted component. */
for (const rel of ["app/layout.tsx", "app/[locale]/layout.tsx"]) {
  patch(rel, (s) => {
    if (!s.includes("TargetedSearchEnhancerStage89")) {
      s = 'import { TargetedSearchEnhancerStage89 } from "@/components/TargetedSearchEnhancerStage89";\n' + s;
    }

    if (!s.includes("<TargetedSearchEnhancerStage89 />")) {
      s = s.replace(/<body([^>]*)>/, "<body$1>\n        <TargetedSearchEnhancerStage89 />");
      if (!s.includes("<TargetedSearchEnhancerStage89 />")) {
        s = s.replace(/\{children\}/, "<TargetedSearchEnhancerStage89 />\n        {children}");
      }
    }

    return s.replace(/\n{3,}/g, "\n\n");
  });
}

/* -------------------------------------------------------------------------- */
/* 2. Fix map legend broken literal                                            */
/* -------------------------------------------------------------------------- */

patch("components/PropertyMap.tsx", (s) => {
  if (!s.includes("function stage89LegendLabel")) {
    const helper = `
function stage89LegendLabel(key: "houses" | "apartments" | "plots" | "commercial" | "landForest" | "garages" | "other") {
  const locale = typeof window !== "undefined"
    ? window.location.pathname.split("/").filter(Boolean)[0]
    : "de";

  const dict = {
    de: {
      houses: "Häuser",
      apartments: "Wohnungen",
      plots: "Grundstücke",
      commercial: "Gewerbe",
      landForest: "Land / Wald",
      garages: "Garagen / Parken",
      other: "Sonstige",
    },
    ru: {
      houses: "Дома",
      apartments: "Квартиры",
      plots: "Участки",
      commercial: "Коммерция",
      landForest: "Земля / лес",
      garages: "Гаражи / парковки",
      other: "Прочее",
    },
    en: {
      houses: "Houses",
      apartments: "Apartments",
      plots: "Plots",
      commercial: "Commercial",
      landForest: "Land / forest",
      garages: "Garages / parking",
      other: "Other",
    },
  } as const;

  const lang = locale === "ru" || locale === "en" || locale === "de" ? locale : "de";
  return dict[lang][key];
}
`;

    const imports = [...s.matchAll(/^import[\s\S]*?;\s*$/gm)];
    if (imports.length) {
      const last = imports[imports.length - 1];
      const idx = last.index + last[0].length;
      s = s.slice(0, idx) + "\n" + helper + s.slice(idx);
    } else {
      s = helper + "\n" + s;
    }
  }

  // Exact literal bug from screenshot.
  s = s.replace(/\$\{escapeHtml\(groupText\)\}/g, "{stage89LegendLabel(\"apartments\")}");
  s = s.replace(/\{`\\\$\\\{escapeHtml\(groupText\)\\\}`\}/g, "{stage89LegendLabel(\"apartments\")}");

  // If there is a span containing the literal string in JSX, fix it.
  s = s.replace(/>\s*\{\s*["'`]\$\{escapeHtml\(groupText\)\}["'`]\s*\}\s*</g, '>{stage89LegendLabel("apartments")}<');

  return s;
});

/* -------------------------------------------------------------------------- */
/* 3. CSS fixes: cabinet thumbnails, calendar time, active row button          */
/* -------------------------------------------------------------------------- */

patch("app/globals.css", (s) => {
  // Remove unstable stage blocks if still present.
  const markers = [
    "/* Stage 82 gallery calendar filters save */",
    "/* Stage 83 save search filters stats calendar account */",
    "/* Stage 84 real save no alert fullwidth */",
    "/* Stage 85 hard override save i18n layout */",
    "/* Stage 86 actual runtime patch */",
  ];

  for (const marker of markers) {
    let start = s.indexOf(marker);
    while (start !== -1) {
      let end = s.length;
      for (const other of markers) {
        if (other === marker) continue;
        const idx = s.indexOf(other, start + marker.length);
        if (idx !== -1 && idx < end) end = idx;
      }
      s = s.slice(0, start).trimEnd() + "\n\n" + s.slice(end).trimStart();
      start = s.indexOf(marker);
    }
  }

  if (!s.includes("/* Stage 89 targeted fixes */")) {
    s += `

/* Stage 89 targeted fixes */

.active-filters-targeted-v89 {
  display: flex !important;
  align-items: center !important;
  flex-wrap: wrap !important;
  gap: 8px !important;
}

.save-search-v89 {
  height: 34px !important;
  min-height: 34px !important;
  padding: 0 16px !important;
  border: 1px solid rgba(47, 97, 79, .24) !important;
  border-radius: 999px !important;
  background: #2f654f !important;
  color: #fff !important;
  font-weight: 800 !important;
  font-size: 13px !important;
  cursor: pointer !important;
  box-shadow: 0 8px 18px rgba(20,55,41,.14) !important;
}

.save-search-v89:disabled {
  opacity: .72 !important;
  cursor: default !important;
}

/* Cabinet favorite thumbnails: larger but scoped to account/favorites-like blocks */
[class*="favorite" i] img,
[class*="favorit" i] img,
[class*="cabinet" i] img,
[href*="/properties/"] img {
  object-fit: cover;
}

/* Only images in compact horizontal account cards */
[class*="favorite" i] img,
[class*="favorit" i] img {
  width: 160px !important;
  min-width: 160px !important;
  height: 90px !important;
  border-radius: 14px !important;
}

@media (max-width: 760px) {
  [class*="favorite" i] img,
  [class*="favorit" i] img {
    width: 120px !important;
    min-width: 120px !important;
    height: 72px !important;
  }
}

/* Auction calendar time: align inside the same cell without expanding the whole calendar */
.auction-time-badge,
.auction-time,
[class*="auction-time"],
[class*="calendar"] span[class*="time"],
[class*="calendar"] small[class*="time"] {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  height: 20px !important;
  min-width: 44px !important;
  padding: 0 7px !important;
  margin-left: 6px !important;
  border-radius: 999px !important;
  background: rgba(47, 97, 79, .14) !important;
  color: #24604d !important;
  font-size: 11px !important;
  font-weight: 800 !important;
  line-height: 20px !important;
  white-space: nowrap !important;
  vertical-align: middle !important;
}

/* Common day cell layouts */
[class*="calendar"] [class*="day"] {
  align-items: center;
}
`;
  }

  return s;
});

console.log("Stage 89 completed.");
