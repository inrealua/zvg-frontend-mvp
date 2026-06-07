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
 * Stage 84
 *
 * Fixes what Stage 83 still did not fix:
 *
 * 1) Browser alert still appears:
 *    - old Stage82 component still had its own save logic.
 *    - we fully disable Stage82 runtime component.
 *    - Stage84 uses its own button and toast only.
 *
 * 2) Search is not really saved:
 *    - Stage84 saves to localStorage.
 *    - Stage84 injects saved searches into cabinet section if backend does not render them.
 *    - "Open search" uses the stored URL with parameters.
 *
 * 3) Filter/statistics shrink after apply:
 *    - add CSS forcing filter panel and stats to full available width.
 *    - avoid converting wrong stats container into a narrow grid.
 *
 * 4) Active filters still mixed:
 *    - translate active filters again in a single scoped component.
 */

/* -------------------------------------------------------------------------- */
/* 1. Disable Stage82 runtime completely                                       */
/* -------------------------------------------------------------------------- */

const noop82 = `"use client";

export function RuntimeUiEnhancementsStage82() {
  return null;
}
`;

if (fs.existsSync(full("components/RuntimeUiEnhancementsStage82.tsx"))) {
  write("components/RuntimeUiEnhancementsStage82.tsx", noop82);
}

/* -------------------------------------------------------------------------- */
/* 2. Stage84 runtime                                                          */
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

const STORAGE_KEY = "zvg_saved_searches_v84";
const OLD_KEYS = ["zvg_saved_searches_v83", "zvg_saved_searches_v82", "zvg_saved_searches"];

function getLocale(): Locale {
  const first = window.location.pathname.split("/").filter(Boolean)[0];
  if (first === "ru" || first === "de" || first === "en") return first;
  const cookie = document.cookie.match(/(?:^|;\\s*)zvg_locale=(ru|de|en)(?:;|$)/);
  return (cookie?.[1] as Locale) || "de";
}

const dict = {
  de: {
    activeFilters: "Aktive Filter:",
    clearAll: "Alles löschen",
    saveSearch: "Suche speichern",
    savedToast: "Suche gespeichert",
    savedSearches: "Gespeicherte Suchen",
    hint: "Benennen Sie Ihre Suchaufträge, damit spätere Benachrichtigungen verständliche Namen haben.",
    searchName: "Suchname",
    save: "Speichern",
    open: "Suche öffnen",
    delete: "Löschen",
    city: "Ort",
    state: "Bundesland",
    status: "Status",
    type: "Objektart",
    usage: "Nutzung",
    radius: "Umkreis",
    priceFrom: "Verkehrswert ab",
    priceTo: "Verkehrswert bis",
    livingFrom: "Wohnfläche ab",
    livingTo: "Wohnfläche bis",
    plotFrom: "Grundstück ab",
    plotTo: "Grundstück bis",
    dateFrom: "Termin ab",
    dateTo: "Termin bis",
    limits: "Wertgrenzen",
    monument: "Denkmalschutz",
    termNo: "Termin-Nr.",
    active: "Aktiv",
    apartments: "Wohnungen",
    commercial: "Gewerbe",
    plots: "Grundstücke",
    landForest: "Land / Wald",
    rented: "Vermietet",
    ownUse: "Eigennutzung",
    free: "Frei",
    unknown: "Unbekannt",
    unknownLimits: "nicht weggefallen / unbekannt",
    removedLimits: "weggefallen",
  },
  ru: {
    activeFilters: "Активные фильтры:",
    clearAll: "Очистить всё",
    saveSearch: "Сохранить поиск",
    savedToast: "Поиск сохранён",
    savedSearches: "Сохранённые поиски",
    hint: "Переименуйте поиски, чтобы позже получать уведомления с понятными названиями.",
    searchName: "Название поиска",
    save: "Сохранить",
    open: "Открыть поиск",
    delete: "Удалить",
    city: "Город",
    state: "Земля",
    status: "Статус",
    type: "Тип",
    usage: "Использование",
    radius: "Радиус",
    priceFrom: "Цена от",
    priceTo: "Цена до",
    livingFrom: "Жилая от",
    livingTo: "Жилая до",
    plotFrom: "Участок от",
    plotTo: "Участок до",
    dateFrom: "Торги от",
    dateTo: "Торги до",
    limits: "Ценовые границы",
    monument: "Памятник архитектуры",
    termNo: "№ термина",
    active: "Активен",
    apartments: "Квартиры",
    commercial: "Коммерция",
    plots: "Участки",
    landForest: "Земля / лес",
    rented: "Сдан в аренду",
    ownUse: "Используется собственником",
    free: "Свободен",
    unknown: "Неизвестно",
    unknownLimits: "не сняты / неизвестно",
    removedLimits: "сняты",
  },
  en: {
    activeFilters: "Active filters:",
    clearAll: "Clear all",
    saveSearch: "Save search",
    savedToast: "Search saved",
    savedSearches: "Saved searches",
    hint: "Name your searches so future notifications have clear names.",
    searchName: "Search name",
    save: "Save",
    open: "Open search",
    delete: "Delete",
    city: "City",
    state: "State",
    status: "Status",
    type: "Type",
    usage: "Usage",
    radius: "Radius",
    priceFrom: "Price from",
    priceTo: "Price to",
    livingFrom: "Living area from",
    livingTo: "Living area to",
    plotFrom: "Plot from",
    plotTo: "Plot to",
    dateFrom: "Auction from",
    dateTo: "Auction to",
    limits: "Price limits",
    monument: "Listed building",
    termNo: "Auction no.",
    active: "Active",
    apartments: "Apartments",
    commercial: "Commercial",
    plots: "Plots",
    landForest: "Land / forest",
    rented: "Rented",
    ownUse: "Owner-occupied",
    free: "Vacant",
    unknown: "Unknown",
    unknownLimits: "not removed / unknown",
    removedLimits: "removed",
  },
} as const;

function readJson(key: string): SavedSearch[] {
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readSaved(): SavedSearch[] {
  const merged = [...readJson(STORAGE_KEY), ...OLD_KEYS.flatMap(readJson)];
  const byUrl = new Map<string, SavedSearch>();
  for (const item of merged) {
    if (!item?.url) continue;
    byUrl.set(item.url, item);
  }
  return Array.from(byUrl.values()).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

function writeSaved(list: SavedSearch[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 80)));
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

function toast(text: string) {
  let el = document.querySelector<HTMLElement>(".zvg-toast-v84");
  if (!el) {
    el = document.createElement("div");
    el.className = "zvg-toast-v84";
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.classList.add("show");
  window.setTimeout(() => el?.classList.remove("show"), 2200);
}

function translateText(text: string, loc: Locale) {
  const d = dict[loc];
  let x = text;

  x = x
    .replace(/Active Filter:|Active Filters:|Aktive Filter:|Активные фильтры:/g, d.activeFilters)
    .replace(/Alles löschen|Alle löschen|Очистить всё|Очистить все|Clear all|All clear/g, d.clearAll)
    .replace(/Suche speichern|Save search|Сохранить поиск/g, d.saveSearch)
    .replace(/Saved Searches|Saved searches|Gespeicherte Suchen|Сохранённые поиски|Сохраненные поиски/g, d.savedSearches)
    .replace(/Name your searches so future email notifications are easy to understand\\.|Name your searches so future notifications have clear names\\.|Переименуйте поиски, чтобы позже получать уведомления с понятными названиями\\.|Benennen Sie Ihre Suchaufträge[^.]*\\./g, d.hint)
    .replace(/Suchname|Search name|Название поиска/g, d.searchName)
    .replace(/Speichern|Save|Сохранить/g, d.save)
    .replace(/Suche öffnen|Open search|Открыть поиск/g, d.open)
    .replace(/Löschen|Delete|Удалить/g, d.delete);

  const labelPairs: Array<[RegExp, string]> = [
    [/^(Земля|Bundesland|State|Federal state):/i, d.state + ":"],
    [/^(Ort|Город|City):/i, d.city + ":"],
    [/^(Статус|Status):/i, d.status + ":"],
    [/^(Тип|Objektart|Type):/i, d.type + ":"],
    [/^(Использование|Nutzung|Usage):/i, d.usage + ":"],
    [/^(Radius|Радиус|Umkreis):/i, d.radius + ":"],
    [/^(Цена от|Verkehrswert ab|Price from):/i, d.priceFrom + ":"],
    [/^(Цена до|Verkehrswert bis|Price to):/i, d.priceTo + ":"],
    [/^(Жилая от|Wohnfläche ab|Living area from):/i, d.livingFrom + ":"],
    [/^(Жилая до|Wohnfläche bis|Living area to):/i, d.livingTo + ":"],
    [/^(Участок от|Grundstück ab|Plot from):/i, d.plotFrom + ":"],
    [/^(Участок до|Grundstück bis|Plot to):/i, d.plotTo + ":"],
    [/^(Торги от|Termin ab|Auction from):/i, d.dateFrom + ":"],
    [/^(Торги до|Termin bis|Auction to):/i, d.dateTo + ":"],
    [/^(Wertgrenzen|Ценовые границы|Price limits):/i, d.limits + ":"],
    [/^(Denkmalschutz|Памятник архитектуры|Listed building):/i, d.monument + ":"],
    [/^(Termin-Nr\\.|№ термина|Auction no\\.):/i, d.termNo + ":"],
  ];
  for (const [re, val] of labelPairs) x = x.replace(re, val);

  x = x
    .replace(/Активен|Aktiv|Active/g, d.active)
    .replace(/Квартиры|Wohnungen|Apartments/g, d.apartments)
    .replace(/Коммерция|Gewerbe|Commercial/g, d.commercial)
    .replace(/Участки|Grundstücke|Plots/g, d.plots)
    .replace(/Земля\\s*\\/\\s*лес|Land\\s*\\/\\s*Wald|Land\\s*\\/\\s*forest/g, d.landForest)
    .replace(/Сдан в аренду|Vermietet|Rented/g, d.rented)
    .replace(/Используется собственником|Eigennutzung|Owner-occupied/g, d.ownUse)
    .replace(/Свободен|Frei|Vacant/g, d.free)
    .replace(/Неизвестно|Unbekannt|Unknown/g, d.unknown)
    .replace(/Не сняты\\s*\\/\\s*неизвестно|nicht weggefallen\\s*\\/\\s*unbekannt|not removed\\s*\\/\\s*unknown/gi, d.unknownLimits)
    .replace(/Сняты|weggefallen|removed/gi, d.removedLimits);

  return x;
}

function findActiveFilterRows() {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>("section, div, aside"));
  return candidates.filter((el) => {
    const text = el.innerText || "";
    if (!/Active Filter|Active filters|Aktive Filter|Активные фильтры/.test(text)) return false;
    if (!/Radius|Радиус|Umkreis|Тип|Objektart|Usage|Nutzung|Использование|Цена|Verkehrswert|Wohnfläche|Жилая|Grundstück|Участок|Bundesland|Земля/.test(text)) return false;

    // Avoid selecting the whole page.
    const rect = el.getBoundingClientRect();
    return rect.height < 220;
  });
}

function filterText(loc: Locale) {
  const row = findActiveFilterRows()[0];
  if (!row) return "";

  return row.innerText
    .replace(dict[loc].activeFilters, "")
    .replace(dict[loc].clearAll, "")
    .replace(dict[loc].saveSearch, "")
    .replace(/\\s+/g, " ")
    .trim();
}

function currentSearchUrl() {
  const loc = getLocale();
  const path = window.location.pathname;
  if (path === "/" || path === "") return `/${loc}${window.location.search}`;
  if (!/^\\/(de|ru|en)(\\/|$)/.test(path)) return `/${loc}${window.location.search}`;
  return path + window.location.search;
}

async function saveCurrentSearch(loc: Locale) {
  const text = filterText(loc);
  const url = currentSearchUrl();

  const item: SavedSearch = {
    id: String(Date.now()),
    name: text || dict[loc].saveSearch,
    url,
    filtersText: text,
    createdAt: new Date().toISOString(),
  };

  const list = readSaved();
  const next = [item, ...list.filter((x) => x.url !== url)];
  writeSaved(next);
  toast(dict[loc].savedToast);
  injectSavedSearches(loc);

  // Backend attempt only, no alert/no confirm.
  try {
    await fetch("/api/saved-searches", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: item.name,
        url: item.url,
        filtersText: item.filtersText,
        query: window.location.search,
        filters: Object.fromEntries(new URLSearchParams(window.location.search).entries()),
      }),
    });
  } catch {
    // localStorage already saved
  }
}

function ensureSaveButton(loc: Locale) {
  for (const row of findActiveFilterRows()) {
    row.classList.add("active-filter-row-v84");
    walk(row, (text) => translateText(text, loc));

    // Hide old Stage82/83 buttons, keep only v84.
    row.querySelectorAll<HTMLElement>("[data-stage82-save], [data-stage83-save]").forEach((el) => {
      el.style.display = "none";
    });

    let btn = row.querySelector<HTMLButtonElement>("[data-stage84-save='1']");
    if (!btn) {
      btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.stage84Save = "1";
      btn.className = "active-filter-save-search-v84";
      row.appendChild(btn);
    }

    btn.textContent = dict[loc].saveSearch;
    btn.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      saveCurrentSearch(loc);
    };
  }
}

function findSavedSection(loc: Locale) {
  const all = Array.from(document.querySelectorAll<HTMLElement>("section, article, div"));
  const labels = [
    dict[loc].savedSearches,
    "Saved searches",
    "Saved Searches",
    "Gespeicherte Suchen",
    "Сохранённые поиски",
  ];

  return all.find((el) => {
    const text = el.innerText || "";
    if (!labels.some((label) => text.includes(label))) return false;
    const rect = el.getBoundingClientRect();
    return rect.height > 80;
  }) || null;
}

function formatDate(iso: string, loc: Locale) {
  try {
    const date = new Date(iso);
    if (loc === "en") return date.toLocaleDateString("en-US");
    return date.toLocaleDateString("de-DE");
  } catch {
    return iso;
  }
}

function injectSavedSearches(loc: Locale) {
  // Translate existing cabinet texts.
  walk(document.body, (text) => translateText(text, loc));

  const section = findSavedSection(loc);
  if (!section) return;

  section.classList.add("saved-search-section-v84");

  let injected = section.querySelector<HTMLElement>("[data-stage84-saved-list='1']");
  if (!injected) {
    injected = document.createElement("div");
    injected.dataset.stage84SavedList = "1";
    injected.className = "saved-search-list-v84";
    section.appendChild(injected);
  }

  const saved = readSaved();

  if (!saved.length) {
    injected.innerHTML = "";
    return;
  }

  injected.innerHTML = saved.map((item) => {
    const safeName = escapeHtml(item.name || dict[loc].saveSearch);
    const safeUrl = escapeHtml(item.url || `/${loc}`);
    const safeDate = escapeHtml(formatDate(item.createdAt, loc));
    const safeFilters = escapeHtml(item.filtersText || "");

    return `
      <article class="saved-search-row-real-v84">
        <div class="saved-search-main-v84">
          <strong>${safeName}</strong>
          ${safeFilters ? `<p>${safeFilters}</p>` : ""}
          <small>${safeDate}</small>
        </div>
        <div class="saved-search-actions-v84">
          <a href="${safeUrl}">${escapeHtml(dict[loc].open)}</a>
          <button type="button" data-delete-saved="${escapeHtml(item.id)}">${escapeHtml(dict[loc].delete)}</button>
        </div>
      </article>
    `;
  }).join("");

  injected.querySelectorAll<HTMLButtonElement>("[data-delete-saved]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.deleteSaved;
      writeSaved(readSaved().filter((x) => x.id !== id));
      injectSavedSearches(loc);
    });
  });

  // Fix old rendered rows: open button should use URL if we can match.
  section.querySelectorAll<HTMLAnchorElement | HTMLButtonElement>("a,button").forEach((el) => {
    const label = el.textContent || "";
    if (!/Suche öffnen|Open search|Открыть поиск/.test(label)) return;
    if (el.closest("[data-stage84-saved-list='1']")) return;

    const row = el.closest<HTMLElement>("article, div, section");
    const text = row?.innerText || "";
    const found = saved.find((item) => text.includes(item.name) || (item.filtersText && text.includes(item.filtersText.slice(0, 35))));

    if (found?.url) {
      if (el instanceof HTMLAnchorElement) el.href = found.url;
      else el.onclick = (event) => {
        event.preventDefault();
        window.location.href = found.url;
      };
    }
  });
}

function escapeHtml(value: string) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function fixStatsAndFilterWidths() {
  document.querySelectorAll<HTMLElement>("section, div, form").forEach((el) => {
    const text = el.innerText || "";

    if (/Suche|Поиск|Search/.test(text) && /Ergebnisse anzeigen|Показать результаты|Show results/.test(text)) {
      const rect = el.getBoundingClientRect();
      if (rect.height < 650) el.classList.add("filter-panel-fullwidth-v84");
    }

    if (/Gefunden|Найдено|Found/.test(text) && /Max\\. Wert|Макс|Max/.test(text) && /Archiv|Archive|Архив/.test(text)) {
      const rect = el.getBoundingClientRect();
      if (rect.height < 200) el.classList.add("stats-fullwidth-v84");
    }
  });
}

function fixAccountLayout() {
  document.querySelectorAll<HTMLElement>("section, div").forEach((el) => {
    const text = el.innerText || "";
    if (/Favoriten/.test(text) && /Gespeicherte Suchen/.test(text) && /Kalendertermine/.test(text)) {
      const rect = el.getBoundingClientRect();
      if (rect.height < 260) el.classList.add("account-card-v84");
    }
  });
}

function fixCalendarTime() {
  const pattern = /^\\s*\\d{1,2}:\\d{2}\\s*$/;

  document.querySelectorAll<HTMLElement>("span, small, b, strong, em").forEach((el) => {
    if (!pattern.test(el.textContent || "")) return;
    el.classList.add("auction-time-v84");
    el.parentElement?.classList.add("auction-day-v84");
  });
}

export function RuntimeStage84() {
  useEffect(() => {
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
      const loc = getLocale();
      ensureSaveButton(loc);
      injectSavedSearches(loc);
      fixStatsAndFilterWidths();
      fixAccountLayout();
      fixCalendarTime();
    };

    apply();

    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    const timer = window.setInterval(apply, 900);

    return () => {
      window.alert = originalAlert;
      observer.disconnect();
      window.clearInterval(timer);
    };
  }, []);

  return null;
}
`;

write("components/RuntimeStage84.tsx", runtime);

/* Mount Stage84 and remove old Stage83 duplicate render if possible. */
function mountLayout(rel) {
  patch(rel, (s) => {
    if (!s.includes("RuntimeStage84")) {
      s = `import { RuntimeStage84 } from "@/components/RuntimeStage84";\n` + s;
    }

    if (!s.includes("<RuntimeStage84 />")) {
      s = s.replace(/<body([^>]*)>/, `<body$1>\n        <RuntimeStage84 />`);
      if (!s.includes("<RuntimeStage84 />")) {
        s = s.replace(/\{children\}/, `<RuntimeStage84 />\n        {children}`);
      }
    }

    return s;
  });
}

if (fs.existsSync(full("app/layout.tsx"))) mountLayout("app/layout.tsx");
if (fs.existsSync(full("app/[locale]/layout.tsx"))) mountLayout("app/[locale]/layout.tsx");

/* Disable Stage83 old save button behavior to avoid duplicates. */
if (fs.existsSync(full("components/RuntimeStage83.tsx"))) {
  write("components/RuntimeStage83.tsx", `"use client";

export function RuntimeStage83() {
  return null;
}
`);
}

/* -------------------------------------------------------------------------- */
/* CSS                                                                         */
/* -------------------------------------------------------------------------- */

patch("app/globals.css", (s) => {
  if (s.includes("/* Stage 84 real save no alert fullwidth */")) return s;

  return s + `

/* Stage 84 real save no alert fullwidth */

.zvg-toast-v84 {
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
.zvg-toast-v84.show {
  opacity: 1 !important;
  transform: translateY(0) !important;
}

/* Hide old save buttons from Stage82/83 */
[data-stage82-save],
[data-stage83-save] {
  display: none !important;
}

/* Active filters */
.active-filter-row-v84 {
  display: flex !important;
  align-items: center !important;
  flex-wrap: wrap !important;
  gap: 8px !important;
  width: 100% !important;
  max-width: none !important;
}
.active-filter-save-search-v84 {
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

/* Keep search/filter panel full width after apply */
.filter-panel-fullwidth-v84 {
  width: 100% !important;
  max-width: none !important;
  margin-left: auto !important;
  margin-right: auto !important;
}

/* Statistics: full width, same visual as before */
.stats-fullwidth-v84 {
  width: 100% !important;
  max-width: none !important;
  display: grid !important;
  grid-template-columns: repeat(6, minmax(0, 1fr)) !important;
  align-items: stretch !important;
}
.stats-fullwidth-v84 > * {
  min-width: 0 !important;
}
@media (max-width: 900px) {
  .stats-fullwidth-v84 {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }
}

/* Account top card alignment */
.account-card-v84 {
  width: 100% !important;
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) auto !important;
  align-items: center !important;
  gap: 18px !important;
}
.account-card-v84 a,
.account-card-v84 button,
.account-card-v84 [class*="pill"],
.account-card-v84 [class*="badge"] {
  min-height: 38px !important;
  height: 38px !important;
  padding: 0 18px !important;
  border-radius: 14px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  white-space: nowrap !important;
}

/* Saved searches injected list */
.saved-search-section-v84 {
  padding-top: 18px !important;
  padding-bottom: 18px !important;
}
.saved-search-list-v84 {
  margin-top: 14px !important;
  display: grid !important;
  gap: 10px !important;
}
.saved-search-row-real-v84 {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) auto !important;
  align-items: center !important;
  gap: 14px !important;
  padding: 12px 14px !important;
  border: 1px solid rgba(47,97,79,.16) !important;
  border-radius: 16px !important;
  background: rgba(255,255,255,.68) !important;
}
.saved-search-main-v84 {
  min-width: 0 !important;
}
.saved-search-main-v84 p {
  margin: 4px 0 !important;
  color: #526381 !important;
}
.saved-search-main-v84 small {
  color: #526381 !important;
}
.saved-search-actions-v84 {
  display: flex !important;
  gap: 8px !important;
  align-items: center !important;
}
.saved-search-actions-v84 a,
.saved-search-actions-v84 button {
  height: 38px !important;
  min-height: 38px !important;
  padding: 0 14px !important;
  border-radius: 13px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-weight: 800 !important;
}
.saved-search-actions-v84 a {
  background: #2f654f !important;
  color: #fff !important;
  text-decoration: none !important;
}
.saved-search-actions-v84 button {
  background: rgba(255, 240, 240, .85) !important;
  border: 1px solid rgba(220, 60, 60, .25) !important;
  color: #b91818 !important;
}

/* Calendar time badge */
.auction-day-v84 {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 6px !important;
}
.auction-time-v84 {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  height: 19px !important;
  min-width: 44px !important;
  padding: 0 7px !important;
  border-radius: 999px !important;
  background: rgba(47, 97, 79, .14) !important;
  color: #24604d !important;
  font-size: 11px !important;
  font-weight: 800 !important;
  line-height: 19px !important;
  white-space: nowrap !important;
  margin-left: 4px !important;
}
`;
});

console.log("Stage 84 completed.");
