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
 * Stage 83
 *
 * Fixes:
 * 1) Save search: no ugly browser alert. Use inline toast.
 *    Save current URL/filters into localStorage as a guaranteed fallback.
 *    Try backend endpoints silently, but do not rely on them.
 *
 * 2) Saved searches in cabinet:
 *    Open button uses saved URL from localStorage when possible.
 *    If old saved row has "City: Berlin", rebuild a search URL with city=Berlin.
 *    Compact cards and account stats.
 *
 * 3) Active filters:
 *    translate more labels/values in /de /ru /en.
 *
 * 4) Stats strip:
 *    restore full-width layout.
 *
 * 5) Auction calendar:
 *    time badges aligned inside date cells.
 */

/* -------------------------------------------------------------------------- */
/* Runtime component                                                           */
/* -------------------------------------------------------------------------- */

const runtime = `"use client";

import { useEffect } from "react";

type Locale = "de" | "ru" | "en";

type SavedSearch = {
  id: string;
  name: string;
  url: string;
  filtersText: string;
  createdAt: string;
};

const STORAGE_KEY = "zvg_saved_searches_v83";

function localeV83(): Locale {
  const first = window.location.pathname.split("/").filter(Boolean)[0];
  if (first === "ru" || first === "de" || first === "en") return first;
  const cookie = document.cookie.match(/(?:^|;\\\\s*)zvg_locale=(ru|de|en)(?:;|$)/);
  return (cookie?.[1] as Locale) || "de";
}

const t83 = {
  de: {
    activeFilters: "Aktive Filter:",
    clearAll: "Alles löschen",
    saveSearch: "Suche speichern",
    savedToast: "Suche gespeichert",
    saved: "Gespeicherte Suchen",
    hint: "Benennen Sie Ihre Suchaufträge, damit spätere Benachrichtigungen verständliche Namen haben.",
    name: "Suchname",
    save: "Speichern",
    open: "Suche öffnen",
    delete: "Löschen",
    city: "Ort",
    state: "Bundesland",
    court: "Amtsgericht",
    radius: "Umkreis",
    type: "Objektart",
    status: "Status",
    usage: "Nutzung",
    dateFrom: "Termin ab",
    dateTo: "Termin bis",
    monument: "Denkmalschutz",
    limits: "Wertgrenzen",
    termNo: "Termin-Nr.",
    priceFrom: "Verkehrswert ab",
    priceTo: "Verkehrswert bis",
    livingTo: "Wohnfläche bis",
    livingFrom: "Wohnfläche ab",
    plotFrom: "Grundstück ab",
    plotTo: "Grundstück bis",
    active: "Aktiv",
    cancelled: "Aufgehoben",
    unknownLimits: "nicht weggefallen / unbekannt",
    removedLimits: "weggefallen",
    firstTerm: "1. Termin",
    apartments: "Wohnungen",
    commercial: "Gewerbe",
    plots: "Grundstücke",
    landForest: "Land / Wald",
    houses: "Wohnhäuser",
    rented: "Vermietet",
    ownUse: "Eigennutzung",
    free: "Frei",
    unknown: "Unbekannt",
  },
  ru: {
    activeFilters: "Активные фильтры:",
    clearAll: "Очистить всё",
    saveSearch: "Сохранить поиск",
    savedToast: "Поиск сохранён",
    saved: "Сохранённые поиски",
    hint: "Переименуйте поиски, чтобы позже получать уведомления с понятными названиями.",
    name: "Название поиска",
    save: "Сохранить",
    open: "Открыть поиск",
    delete: "Удалить",
    city: "Город",
    state: "Земля",
    court: "Суд",
    radius: "Радиус",
    type: "Тип",
    status: "Статус",
    usage: "Использование",
    dateFrom: "Торги от",
    dateTo: "Торги до",
    monument: "Памятник архитектуры",
    limits: "Ценовые границы",
    termNo: "№ термина",
    priceFrom: "Цена от",
    priceTo: "Цена до",
    livingTo: "Жилая до",
    livingFrom: "Жилая от",
    plotFrom: "Участок от",
    plotTo: "Участок до",
    active: "Активен",
    cancelled: "Отменён",
    unknownLimits: "не сняты / неизвестно",
    removedLimits: "сняты",
    firstTerm: "1-й термин",
    apartments: "Квартиры",
    commercial: "Коммерция",
    plots: "Участки",
    landForest: "Земля / лес",
    houses: "Жилые дома",
    rented: "Сдан в аренду",
    ownUse: "Используется собственником",
    free: "Свободен",
    unknown: "Неизвестно",
  },
  en: {
    activeFilters: "Active filters:",
    clearAll: "Clear all",
    saveSearch: "Save search",
    savedToast: "Search saved",
    saved: "Saved searches",
    hint: "Name your searches so future notifications have clear names.",
    name: "Search name",
    save: "Save",
    open: "Open search",
    delete: "Delete",
    city: "City",
    state: "State",
    court: "Court",
    radius: "Radius",
    type: "Type",
    status: "Status",
    usage: "Usage",
    dateFrom: "Auction from",
    dateTo: "Auction to",
    monument: "Listed building",
    limits: "Price limits",
    termNo: "Auction no.",
    priceFrom: "Price from",
    priceTo: "Price to",
    livingTo: "Living area to",
    livingFrom: "Living area from",
    plotFrom: "Plot from",
    plotTo: "Plot to",
    active: "Active",
    cancelled: "Cancelled",
    unknownLimits: "not removed / unknown",
    removedLimits: "removed",
    firstTerm: "1st auction",
    apartments: "Apartments",
    commercial: "Commercial",
    plots: "Plots",
    landForest: "Land / forest",
    houses: "Residential houses",
    rented: "Rented",
    ownUse: "Owner-occupied",
    free: "Vacant",
    unknown: "Unknown",
  },
} as const;

function readSaved(): SavedSearch[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeSaved(list: SavedSearch[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function currentFiltersText(locale: Locale) {
  const rows = findActiveFilterRows();
  const text = rows[0]?.innerText || "";
  return text
    .replace(t83[locale].saveSearch, "")
    .replace(t83[locale].clearAll, "")
    .replace(t83[locale].activeFilters, "")
    .trim();
}

function toast(message: string) {
  let el = document.querySelector<HTMLElement>(".zvg-toast-v83");

  if (!el) {
    el = document.createElement("div");
    el.className = "zvg-toast-v83";
    document.body.appendChild(el);
  }

  el.textContent = message;
  el.classList.add("show");

  window.setTimeout(() => el?.classList.remove("show"), 2200);
}

async function saveSearchV83(locale: Locale) {
  const text = currentFiltersText(locale);
  const params = new URLSearchParams(window.location.search);

  const city = params.get("city") || params.get("ort") || params.get("q") || "";
  const state = params.get("state") || params.get("bundesland") || "";

  const name = text
    ? text.split("\\n").join(" ").replace(/\\s+/g, " ").slice(0, 120)
    : city
      ? \`\${t83[locale].city}: \${city}\`
      : state
        ? \`\${t83[locale].state}: \${state}\`
        : t83[locale].saveSearch;

  const item: SavedSearch = {
    id: String(Date.now()),
    name,
    url: window.location.pathname + window.location.search,
    filtersText: text,
    createdAt: new Date().toISOString(),
  };

  const list = readSaved();
  const exists = list.some((x) => x.url === item.url);
  const next = exists ? list.map((x) => (x.url === item.url ? { ...x, name: item.name, filtersText: item.filtersText } : x)) : [item, ...list];

  writeSaved(next.slice(0, 50));
  toast(t83[locale].savedToast);

  // Try real backend in background, but never show browser alert/confirm.
  const endpoints = ["/api/saved-searches", "/api/user/saved-searches", "/api/account/saved-searches"];
  for (const endpoint of endpoints) {
    try {
      await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: item.name,
          url: item.url,
          query: window.location.search,
          filters: Object.fromEntries(params.entries()),
        }),
      });
      break;
    } catch {
      // ignore
    }
  }

  fixCabinetSavedRows(locale);
}

function translateFilterText(text: string, locale: Locale) {
  const d = t83[locale];
  let x = text;

  x = x
    .replace(/Active Filter:|Active Filters:|Aktive Filter:|Активные фильтры:/g, d.activeFilters)
    .replace(/Alles löschen|Alle löschen|Очистить всё|Очистить все|Clear all|All clear/g, d.clearAll);

  const pairs: Array<[RegExp, string]> = [
    [/^(Земля|Bundesland|State|Federal state):/i, d.state + ":"],
    [/^(Ort|Город|City):/i, d.city + ":"],
    [/^(Суд|Amtsgericht|Court):/i, d.court + ":"],
    [/^(Radius|Радиус|Umkreis):/i, d.radius + ":"],
    [/^(Тип|Objektart|Type):/i, d.type + ":"],
    [/^(Статус|Status):/i, d.status + ":"],
    [/^(Использование|Nutzung|Usage):/i, d.usage + ":"],
    [/^(Торги от|Termin ab|Auction from):/i, d.dateFrom + ":"],
    [/^(Торги до|Termin bis|Auction to):/i, d.dateTo + ":"],
    [/^(Памятник архитектуры|Denkmalschutz|Listed building):/i, d.monument + ":"],
    [/^(Ценовые границы|Wertgrenzen|Price limits):/i, d.limits + ":"],
    [/^(№ термина|Termin-Nr\\.|Auction no\\.|1-й термин|1\\. Termin|1st auction):/i, d.termNo + ":"],
    [/^(Цена от|Verkehrswert ab|Price from):/i, d.priceFrom + ":"],
    [/^(Цена до|Verkehrswert bis|Price to):/i, d.priceTo + ":"],
    [/^(Жилая от|Wohnfläche ab|Living area from):/i, d.livingFrom + ":"],
    [/^(Жилая до|Wohnfläche bis|Living area to):/i, d.livingTo + ":"],
    [/^(Участок от|Grundstück ab|Plot from):/i, d.plotFrom + ":"],
    [/^(Участок до|Grundstück bis|Plot to):/i, d.plotTo + ":"],
  ];

  for (const [pattern, replacement] of pairs) x = x.replace(pattern, replacement);

  x = x
    .replace(/Активен|Aktiv|Active/g, d.active)
    .replace(/Отменён|Отменен|Aufgehoben|Cancelled/g, d.cancelled)
    .replace(/Квартиры|Wohnungen|Apartments/g, d.apartments)
    .replace(/Коммерция|Gewerbe|Commercial/g, d.commercial)
    .replace(/Участки|Grundstücke|Plots/g, d.plots)
    .replace(/Земля\\s*\\/\\s*лес|Land\\s*\\/\\s*Wald|Land\\s*\\/\\s*forest/g, d.landForest)
    .replace(/Жилые дома|Wohnhäuser|Residential houses/g, d.houses)
    .replace(/Сдан в аренду|Vermietet|Rented/g, d.rented)
    .replace(/Используется собственником|Eigennutzung|Owner-occupied/g, d.ownUse)
    .replace(/Свободен|Frei|Vacant/g, d.free)
    .replace(/Неизвестно|Unbekannt|Unknown/g, d.unknown)
    .replace(/Не сняты\\s*\\/\\s*неизвестно|nicht weggefallen\\s*\\/\\s*unbekannt|not removed\\s*\\/\\s*unknown/gi, d.unknownLimits)
    .replace(/Сняты|weggefallen|removed/gi, d.removedLimits)
    .replace(/1-й термин|1\\. Termin|1st auction/g, d.firstTerm);

  return x;
}

function walk(root: ParentNode, replacer: (text: string) => string) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Node[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  for (const node of nodes) {
    const before = node.textContent || "";
    const after = replacer(before);
    if (after !== before) node.textContent = after;
  }
}

function findActiveFilterRows() {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>("section, div, aside"));
  return candidates.filter((el) => {
    const text = el.innerText || "";
    const hasLabel = /Active Filter|Active filters|Aktive Filter|Активные фильтры/.test(text);
    const hasChip = /Radius|Радиус|Umkreis|Тип|Objektart|Usage|Nutzung|Использование|Цена|Verkehrswert|Wohnfläche|Жилая|Grundstück|Участок|Bundesland|Земля/.test(text);
    return hasLabel && hasChip;
  });
}

function addSaveButton(row: HTMLElement, locale: Locale) {
  let button = row.querySelector<HTMLButtonElement>("[data-stage83-save='1']");

  if (!button) {
    button = document.createElement("button");
    button.type = "button";
    button.dataset.stage83Save = "1";
    button.className = "active-filter-save-search-v83";
    row.appendChild(button);
  }

  button.textContent = t83[locale].saveSearch;
  button.onclick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    saveSearchV83(locale);
  };
}

function fixActiveFilters(locale: Locale) {
  const rows = findActiveFilterRows();

  for (const row of rows) {
    row.classList.add("active-filter-row-v83");
    walk(row, (text) => translateFilterText(text, locale));
    addSaveButton(row, locale);
  }
}

function dateForLocale(iso: string, locale: Locale) {
  try {
    const d = new Date(iso);
    if (locale === "en") return d.toLocaleDateString("en-US");
    return d.toLocaleDateString("de-DE");
  } catch {
    return iso;
  }
}

function urlFromSavedRow(row: HTMLElement, saved: SavedSearch[]) {
  const text = row.innerText || "";

  for (const item of saved) {
    if (text.includes(item.name) || (item.filtersText && text.includes(item.filtersText.slice(0, 30)))) return item.url;
  }

  const cityMatch = text.match(/(?:Город|City|Ort):\\s*([^\\n]+)/i);
  if (cityMatch?.[1]) {
    const city = cityMatch[1].trim();
    const locale = localeV83();
    return `/${locale}?city=${encodeURIComponent(city)}`;
  }

  return null;
}

function fixCabinetSavedRows(locale: Locale) {
  const d = t83[locale];
  const saved = readSaved();

  // Translate cabinet text.
  walk(document.body, (text) => {
    return text
      .replace(/Saved Searches|Saved searches|Gespeicherte Suchen|Сохранённые поиски|Сохраненные поиски/g, d.saved)
      .replace(/Name your searches so future email notifications are easy to understand\\.|Name your searches so future notifications have clear names\\.|Переименуйте поиски, чтобы позже получать уведомления с понятными названиями\\.|Benennen Sie Ihre Suchaufträge[^.]*\\./g, d.hint)
      .replace(/Suchname|Search name|Название поиска/g, d.name)
      .replace(/Speichern|Save|Сохранить/g, d.save)
      .replace(/Suche öffnen|Open search|Открыть поиск/g, d.open)
      .replace(/Löschen|Delete|Удалить/g, d.delete)
      .replace(/Город:|City:|Ort:/g, d.city + ":");
  });

  const candidates = Array.from(document.querySelectorAll<HTMLElement>("section, article, div"));
  for (const el of candidates) {
    const text = el.innerText || "";
    const isSavedBlock =
      text.includes(d.saved) ||
      text.includes("Saved searches") ||
      text.includes("Gespeicherte Suchen") ||
      text.includes("Сохранённые поиски");

    if (isSavedBlock) el.classList.add("saved-search-compact-v83");

    const hasOpen = /Suche öffnen|Open search|Открыть поиск/.test(text);
    const hasCity = /Город:|City:|Ort:/.test(text);

    if (hasOpen || hasCity) {
      el.classList.add("saved-search-row-v83");

      const targetUrl = urlFromSavedRow(el, saved);

      el.querySelectorAll<HTMLAnchorElement | HTMLButtonElement>("a,button").forEach((btn) => {
        const label = btn.textContent || "";
        if (/Suche öffnen|Open search|Открыть поиск/.test(label)) {
          btn.textContent = d.open;

          if (targetUrl) {
            if (btn instanceof HTMLAnchorElement) {
              btn.href = targetUrl;
            } else {
              btn.onclick = (event) => {
                event.preventDefault();
                window.location.href = targetUrl;
              };
            }
          }
        }
      });
    }
  }
}

function fixAccountHero() {
  document.querySelectorAll<HTMLElement>("section, div").forEach((el) => {
    const txt = el.innerText || "";
    if (/Mein Konto|Мой кабинет|My Account|Favoriten|Gespeicherte Suchen|Kalendertermine/.test(txt)) {
      if (/Favoriten|Gespeicherte Suchen|Kalendertermine/.test(txt)) {
        el.classList.add("account-hero-v83");
      }
    }
  });
}

function fixStatsStrip() {
  document.querySelectorAll<HTMLElement>("section, div").forEach((el) => {
    const txt = el.innerText || "";
    if (/Gefunden|Найдено|Found/.test(txt) && /Max\\. Wert|Макс|Max/.test(txt) && /Aktiv|Active|Актив/.test(txt)) {
      el.classList.add("stats-strip-v83");
    }
  });
}

function fixAuctionCalendar() {
  const timePattern = /^\\s*\\d{1,2}:\\d{2}\\s*$/;

  document.querySelectorAll<HTMLElement>("span, small, b, strong, em, div").forEach((el) => {
    const text = el.textContent || "";
    if (timePattern.test(text) && el.children.length === 0) {
      el.classList.add("auction-time-badge-v83");

      const parent = el.parentElement;
      if (parent) parent.classList.add("auction-calendar-day-v83");
    }
  });
}

export function RuntimeStage83() {
  useEffect(() => {
    // Block ugly browser alert from old Stage82 only for save-search success/error messages.
    const originalAlert = window.alert;
    window.alert = (message?: any) => {
      const msg = String(message || "");
      if (/Suche wurde gespeichert|Search saved|Поиск сохран|Suche konnte nicht|Could not save/i.test(msg)) {
        toast(msg);
        return;
      }
      originalAlert(message);
    };

    const apply = () => {
      const locale = localeV83();
      fixActiveFilters(locale);
      fixCabinetSavedRows(locale);
      fixAccountHero();
      fixStatsStrip();
      fixAuctionCalendar();
    };

    apply();

    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    const interval = window.setInterval(apply, 900);

    return () => {
      observer.disconnect();
      window.clearInterval(interval);
      window.alert = originalAlert;
    };
  }, []);

  return null;
}
`;

write("components/RuntimeStage83.tsx", runtime);

/* -------------------------------------------------------------------------- */
/* Mount RuntimeStage83                                                        */
/* -------------------------------------------------------------------------- */

function mountLayout(rel) {
  patch(rel, (s) => {
    if (!s.includes("RuntimeStage83")) {
      s = `import { RuntimeStage83 } from "@/components/RuntimeStage83";\n` + s;
    }

    if (!s.includes("<RuntimeStage83 />")) {
      s = s.replace(/<body([^>]*)>/, `<body$1>\n        <RuntimeStage83 />`);
      if (!s.includes("<RuntimeStage83 />")) {
        s = s.replace(/\{children\}/, `<RuntimeStage83 />\n        {children}`);
      }
    }

    return s;
  });
}

if (fs.existsSync(full("app/layout.tsx"))) mountLayout("app/layout.tsx");
if (fs.existsSync(full("app/[locale]/layout.tsx"))) mountLayout("app/[locale]/layout.tsx");

/* -------------------------------------------------------------------------- */
/* Disable old Stage82 browser alert/save behavior if present                  */
/* -------------------------------------------------------------------------- */

patch("components/RuntimeUiEnhancementsStage82.tsx", (s) => {
  // Neutralize alert calls. Stage83 handles toasts/saving.
  s = s.replace(/alert\\(t\\.saved\\);/g, "void 0;");
  s = s.replace(/alert\\(t\\.saveError\\);/g, "void 0;");

  // Hide old stage82 save button if duplicate, Stage83 adds its own.
  s = s.replace(/button\\.dataset\\.stage82Save = "1";/g, 'button.dataset.stage82Save = "disabled"; button.style.display = "none";');

  return s;
});

/* -------------------------------------------------------------------------- */
/* CSS                                                                         */
/* -------------------------------------------------------------------------- */

patch("app/globals.css", (s) => {
  if (s.includes("/* Stage 83 save search filters stats calendar account */")) return s;

  return s + `

/* Stage 83 save search filters stats calendar account */

/* Replace ugly browser alert with toast for save search */
.zvg-toast-v83 {
  position: fixed !important;
  right: 28px !important;
  bottom: 28px !important;
  z-index: 999999 !important;
  padding: 13px 18px !important;
  border-radius: 16px !important;
  background: #173d2f !important;
  color: #fff !important;
  font-weight: 800 !important;
  font-size: 14px !important;
  box-shadow: 0 14px 32px rgba(0,0,0,.20) !important;
  opacity: 0 !important;
  transform: translateY(10px) !important;
  pointer-events: none !important;
  transition: opacity .18s ease, transform .18s ease !important;
}

.zvg-toast-v83.show {
  opacity: 1 !important;
  transform: translateY(0) !important;
}

/* Active filter row + save button */
.active-filter-row-v83 {
  display: flex !important;
  align-items: center !important;
  flex-wrap: wrap !important;
  gap: 8px !important;
  margin-top: 12px !important;
  margin-bottom: 14px !important;
}

.active-filter-save-search-v83 {
  min-height: 34px !important;
  height: 34px !important;
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

.active-filter-save-search-v83:hover {
  background: #255640 !important;
}

/* Statistics strip should be full row, not short/narrow */
.stats-strip-v83 {
  width: 100% !important;
  max-width: none !important;
  display: grid !important;
  grid-template-columns: repeat(6, minmax(0, 1fr)) !important;
  align-items: stretch !important;
  gap: 0 !important;
}

@media (max-width: 900px) {
  .stats-strip-v83 {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }
}

/* Cabinet account hero counters: align and stop crooked layout */
.account-hero-v83 {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) auto !important;
  gap: 18px !important;
  align-items: center !important;
}

.account-hero-v83 > * {
  min-width: 0 !important;
}

.account-hero-v83 a,
.account-hero-v83 button,
.account-hero-v83 [class*="pill"],
.account-hero-v83 [class*="badge"] {
  min-height: 38px !important;
  height: 38px !important;
  padding: 0 18px !important;
  border-radius: 14px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  white-space: nowrap !important;
}

/* Saved searches compact and real open links */
.saved-search-compact-v83,
.saved-search-row-v83 {
  padding-top: 10px !important;
  padding-bottom: 10px !important;
  margin-top: 8px !important;
  margin-bottom: 8px !important;
  min-height: 0 !important;
}

.saved-search-compact-v83 input,
.saved-search-row-v83 input {
  min-height: 40px !important;
  height: 40px !important;
}

.saved-search-compact-v83 button,
.saved-search-compact-v83 a,
.saved-search-row-v83 button,
.saved-search-row-v83 a {
  min-height: 38px !important;
  height: 38px !important;
  padding: 0 14px !important;
  border-radius: 13px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.saved-search-row-v83 [class*="actions"],
.saved-search-compact-v83 [class*="actions"] {
  gap: 8px !important;
  align-items: center !important;
}

/* Auction calendar: consistent date/time placement */
.auction-calendar-day-v83 {
  position: relative !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 6px !important;
  overflow: hidden !important;
}

.auction-time-badge-v83 {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  height: 20px !important;
  min-width: 46px !important;
  padding: 0 7px !important;
  margin-left: 4px !important;
  border-radius: 999px !important;
  background: rgba(47, 97, 79, .14) !important;
  color: #24604d !important;
  font-size: 11px !important;
  font-weight: 800 !important;
  line-height: 20px !important;
  white-space: nowrap !important;
  vertical-align: middle !important;
  transform: translateY(0) !important;
}

/* Hide old Stage82 hidden save button if it remains */
[data-stage82-save="disabled"] {
  display: none !important;
}
`;
});

console.log("Stage 83 completed.");
