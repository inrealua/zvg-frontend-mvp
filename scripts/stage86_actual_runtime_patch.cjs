const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const file = (rel) => path.join(root, rel);

function write(rel, content) {
  const target = file(rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
  console.log("written", rel);
}

function patch(rel, fn) {
  const target = file(rel);
  if (!fs.existsSync(target)) {
    console.log("skip missing", rel);
    return;
  }
  const before = fs.readFileSync(target, "utf8");
  const after = fn(before);
  if (after !== before) {
    fs.writeFileSync(target, after, "utf8");
    console.log("patched", rel);
  } else {
    console.log("unchanged", rel);
  }
}

/*
  Stage 86.

  Previous Stage85 did not run at all because the patch script itself had a
  SyntaxError. Therefore the build was successful, but the application files
  were unchanged. This script avoids nested template literals and writes the
  runtime component from plain string arrays.

  It does four practical things:
  1. Disables old Stage82/83/84/85 runtime components so old alert/save logic
     cannot keep working.
  2. Adds RuntimeStage86 with capture-phase click handling for every save-search
     button. It stores the full URL with query parameters in localStorage and
     tries the real API silently.
  3. Renders saved searches in cabinet from localStorage if backend-rendered
     list is missing/broken. Open button uses the saved URL.
  4. Adds robust DOM translation for active filters and full-width CSS for
     filters/statistics.
*/

const noopFiles = [
  ["components/RuntimeUiEnhancementsStage82.tsx", "RuntimeUiEnhancementsStage82"],
  ["components/RuntimeStage83.tsx", "RuntimeStage83"],
  ["components/RuntimeStage84.tsx", "RuntimeStage84"],
  ["components/RuntimeStage85.tsx", "RuntimeStage85"],
];

for (const [rel, name] of noopFiles) {
  if (fs.existsSync(file(rel))) {
    write(rel, '"use client";\n\nexport function ' + name + '() {\n  return null;\n}\n');
  }
}

const runtimeLines = [
'"use client";',
'',
'import { useEffect } from "react";',
'',
'type Locale = "de" | "ru" | "en";',
'type SavedSearch = { id: string; name: string; url: string; filtersText: string; createdAt: string };',
'',
'const STORAGE_KEY = "zvg_saved_searches_v86";',
'const OLD_KEYS = ["zvg_saved_searches_v85", "zvg_saved_searches_v84", "zvg_saved_searches_v83", "zvg_saved_searches_v82", "zvg_saved_searches"];',
'',
'function getLocale(): Locale {',
'  const first = window.location.pathname.split("/").filter(Boolean)[0];',
'  if (first === "ru" || first === "de" || first === "en") return first;',
'  const match = document.cookie.match(/(?:^|;\\\\s*)zvg_locale=(ru|de|en)(?:;|$)/);',
'  return (match?.[1] as Locale) || "de";',
'}',
'',
'const tr = {',
'  de: { activeFilters: "Aktive Filter:", clearAll: "Alles löschen", saveSearch: "Suche speichern", savedToast: "Suche gespeichert", savedSearches: "Gespeicherte Suchen", hint: "Benennen Sie Ihre Suchaufträge, damit spätere Benachrichtigungen verständliche Namen haben.", searchName: "Suchname", save: "Speichern", open: "Suche öffnen", del: "Löschen", city: "Ort", state: "Bundesland", zip: "PLZ", court: "Amtsgericht", radius: "Umkreis", type: "Objektart", status: "Status", usage: "Nutzung", priceTo: "Verkehrswert bis", priceFrom: "Verkehrswert ab", livingTo: "Wohnfläche bis", livingFrom: "Wohnfläche ab", plotTo: "Grundstück bis", plotFrom: "Grundstück ab", dateFrom: "Termin ab", dateTo: "Termin bis", monument: "Denkmalschutz", limits: "Wertgrenzen", termNo: "Termin-Nr.", active: "Aktiv", yes: "Ja", no: "Nein", any: "Beliebig", apartments: "Wohnungen", commercial: "Gewerbe", plots: "Grundstücke", landForest: "Land / Wald", rented: "Vermietet", ownUse: "Eigennutzung", free: "Frei", unknown: "Unbekannt", removed: "weggefallen", notRemoved: "nicht weggefallen / unbekannt", term2: "2. Termin" },',
'  ru: { activeFilters: "Активные фильтры:", clearAll: "Очистить всё", saveSearch: "Сохранить поиск", savedToast: "Поиск сохранён", savedSearches: "Сохранённые поиски", hint: "Переименуйте поиски, чтобы позже получать уведомления с понятными названиями.", searchName: "Название поиска", save: "Сохранить", open: "Открыть поиск", del: "Удалить", city: "Город", state: "Земля", zip: "Индекс", court: "Суд", radius: "Радиус", type: "Тип", status: "Статус", usage: "Использование", priceTo: "Цена до", priceFrom: "Цена от", livingTo: "Жилая до", livingFrom: "Жилая от", plotTo: "Участок до", plotFrom: "Участок от", dateFrom: "Торги от", dateTo: "Торги до", monument: "Памятник архитектуры", limits: "Ценовые границы", termNo: "№ термина", active: "Активен", yes: "Да", no: "Нет", any: "Любая", apartments: "Квартиры", commercial: "Коммерция", plots: "Участки", landForest: "Земля / лес", rented: "Сдан в аренду", ownUse: "Используется собственником", free: "Свободен", unknown: "Неизвестно", removed: "сняты", notRemoved: "не сняты / неизвестно", term2: "2-й термин" },',
'  en: { activeFilters: "Active filters:", clearAll: "Clear all", saveSearch: "Save search", savedToast: "Search saved", savedSearches: "Saved searches", hint: "Name your searches so future notifications have clear names.", searchName: "Search name", save: "Save", open: "Open search", del: "Delete", city: "City", state: "State", zip: "ZIP", court: "Court", radius: "Radius", type: "Type", status: "Status", usage: "Usage", priceTo: "Price to", priceFrom: "Price from", livingTo: "Living area to", livingFrom: "Living area from", plotTo: "Plot to", plotFrom: "Plot from", dateFrom: "Auction from", dateTo: "Auction to", monument: "Listed building", limits: "Price limits", termNo: "Auction no.", active: "Active", yes: "Yes", no: "No", any: "Any", apartments: "Apartments", commercial: "Commercial", plots: "Plots", landForest: "Land / forest", rented: "Rented", ownUse: "Owner-occupied", free: "Vacant", unknown: "Unknown", removed: "removed", notRemoved: "not removed / unknown", term2: "2nd auction" }',
'} as const;',
'',
'function readKey(key: string): SavedSearch[] {',
'  try { const raw = window.localStorage.getItem(key); const parsed = raw ? JSON.parse(raw) : []; return Array.isArray(parsed) ? parsed : []; } catch { return []; }',
'}',
'function readSaved(): SavedSearch[] {',
'  const all = [STORAGE_KEY, ...OLD_KEYS].flatMap(readKey);',
'  const map = new Map<string, SavedSearch>();',
'  for (const item of all) if (item?.url) map.set(item.url, item);',
'  return Array.from(map.values()).sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt)));',
'}',
'function writeSaved(list: SavedSearch[]) { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 100))); }',
'',
'function escapeHtml(value: string) {',
'  return String(value).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll("\\"","&quot;");',
'}',
'function toast(message: string) {',
'  let el = document.querySelector<HTMLElement>(".zvg-toast-v86");',
'  if (!el) { el = document.createElement("div"); el.className = "zvg-toast-v86"; document.body.appendChild(el); }',
'  el.textContent = message; el.classList.add("show"); window.setTimeout(() => el?.classList.remove("show"), 2200);',
'}',
'',
'function walkText(root: ParentNode, replace: (text: string) => string) {',
'  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);',
'  const nodes: Node[] = [];',
'  while (walker.nextNode()) nodes.push(walker.currentNode);',
'  for (const node of nodes) { const before = node.textContent || ""; const after = replace(before); if (after !== before) node.textContent = after; }',
'}',
'',
'function translate(text: string, locale: Locale) {',
'  const d = tr[locale];',
'  let s = text;',
'  const pairs: Array<[RegExp,string]> = [',
'    [/Active Filter:|Active Filters:|Aktive Filter:|Активные фильтры:/g, d.activeFilters],',
'    [/Alles löschen|Alle löschen|Очистить всё|Очистить все|Clear all|All clear/g, d.clearAll],',
'    [/Suche speichern|Save search|Сохранить поиск/g, d.saveSearch],',
'    [/Saved Searches|Saved searches|Gespeicherte Suchen|Сохранённые поиски|Сохраненные поиски/g, d.savedSearches],',
'    [/Name your searches so future email notifications are easy to understand\\.|Name your searches so future notifications have clear names\\.|Переименуйте поиски, чтобы позже получать уведомления с понятными названиями\\.|Benennen Sie Ihre Suchaufträge[^.]*\\./g, d.hint],',
'    [/Suchname|Search name|Название поиска/g, d.searchName],',
'    [/Suche öffnen|Open search|Открыть поиск/g, d.open],',
'    [/Löschen|Delete|Удалить/g, d.del],',
'    [/Земля:|Bundesland:|State:|Federal state:/g, d.state + ":"],',
'    [/Ort:|Город:|City:/g, d.city + ":"],',
'    [/PLZ:|Индекс:|ZIP:/g, d.zip + ":"],',
'    [/Суд:|Amtsgericht:|Court:/g, d.court + ":"],',
'    [/Radius:|Радиус:|Umkreis:/g, d.radius + ":"],',
'    [/Тип:|Objektart:|Type:/g, d.type + ":"],',
'    [/Статус:|Status:/g, d.status + ":"],',
'    [/Использование:|Nutzung:|Usage:/g, d.usage + ":"],',
'    [/Цена до:|Verkehrswert bis:|Price to:/g, d.priceTo + ":"],',
'    [/Цена от:|Verkehrswert ab:|Price from:/g, d.priceFrom + ":"],',
'    [/Жилая до:|Wohnfläche bis:|Living area to:/g, d.livingTo + ":"],',
'    [/Жилая от:|Wohnfläche ab:|Living area from:/g, d.livingFrom + ":"],',
'    [/Участок до:|Grundstück bis:|Plot to:/g, d.plotTo + ":"],',
'    [/Участок от:|Grundstück ab:|Plot from:/g, d.plotFrom + ":"],',
'    [/Торги от:|Termin ab:|Auction from:/g, d.dateFrom + ":"],',
'    [/Торги до:|Termin bis:|Auction to:/g, d.dateTo + ":"],',
'    [/Denkmalschutz:|Памятник архитектуры:|Listed building:/g, d.monument + ":"],',
'    [/Wertgrenzen:|Ценовые границы:|Price limits:/g, d.limits + ":"],',
'    [/Termin-Nr\\.:|№ термина:|Auction no\\.:/g, d.termNo + ":"],',
'    [/Активен|Aktiv|Active/g, d.active],',
'    [/\\bДа\\b|\\bJa\\b|\\bYes\\b/g, d.yes],',
'    [/\\bНет\\b|\\bNein\\b|\\bNo\\b/g, d.no],',
'    [/\\bЛюбая\\b|\\bBeliebig\\b|\\bAny\\b/g, d.any],',
'    [/Квартиры|Wohnungen|Apartments/g, d.apartments],',
'    [/Коммерция|Gewerbe|Commercial/g, d.commercial],',
'    [/Участки|Grundstücke|Plots/g, d.plots],',
'    [/Земля\\s*\\/\\s*лес|Land\\s*\\/\\s*Wald|Land\\s*\\/\\s*forest/g, d.landForest],',
'    [/Сдан в аренду|Vermietet|Rented/g, d.rented],',
'    [/Используется собственником|Eigennutzung|Owner-occupied/g, d.ownUse],',
'    [/Свободен|Frei|Vacant/g, d.free],',
'    [/Неизвестно|Unbekannt|Unknown/g, d.unknown],',
'    [/Не сняты\\s*\\/\\s*неизвестно|nicht weggefallen\\s*\\/\\s*unbekannt|not removed\\s*\\/\\s*unknown/gi, d.notRemoved],',
'    [/\\bСняты\\b|\\bweggefallen\\b|\\bremoved\\b/gi, d.removed],',
'    [/2-й термин|2\\. Termin|2nd auction/g, d.term2]',
'  ];',
'  for (const [from,to] of pairs) s = s.replace(from, to);',
'  return s;',
'}',
'',
'function findActiveRows() {',
'  return Array.from(document.querySelectorAll<HTMLElement>("section, div, aside")).filter((el) => {',
'    const text = el.innerText || "";',
'    if (!/Active Filter|Active filters|Aktive Filter|Активные фильтры/.test(text)) return false;',
'    if (!/Radius|Радиус|Umkreis|Тип|Objektart|Usage|Nutzung|Использование|Цена|Verkehrswert|Wohnfläche|Жилая|Grundstück|Участок|Bundesland|Земля|PLZ|Индекс/.test(text)) return false;',
'    return el.getBoundingClientRect().height < 260;',
'  });',
'}',
'',
'function currentUrl() {',
'  const locale = getLocale();',
'  const pathname = window.location.pathname || "/";',
'  const search = window.location.search || "";',
'  if (/^\\/(de|ru|en)(\\/|$)/.test(pathname)) return pathname + search;',
'  return "/" + locale + search;',
'}',
'',
'function filterSummary(locale: Locale) {',
'  const row = findActiveRows()[0];',
'  if (!row) return "";',
'  return row.innerText.replace(tr[locale].activeFilters,"").replace(tr[locale].clearAll,"").replace(tr[locale].saveSearch,"").replace(/\\s+/g," ").trim();',
'}',
'',
'function saveSearch(locale: Locale) {',
'  const url = currentUrl();',
'  const summary = filterSummary(locale);',
'  const item: SavedSearch = { id: String(Date.now()), name: summary || tr[locale].saveSearch, url, filtersText: summary, createdAt: new Date().toISOString() };',
'  writeSaved([item, ...readSaved().filter((x) => x.url !== url)]);',
'  toast(tr[locale].savedToast);',
'  renderSaved(locale);',
'  fetch("/api/saved-searches", { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: item.name, url: item.url, filtersText: item.filtersText, query: window.location.search, filters: Object.fromEntries(new URLSearchParams(window.location.search).entries()) }) }).catch(() => {});',
'}',
'',
'function ensureSaveButton(locale: Locale) {',
'  for (const row of findActiveRows()) {',
'    row.classList.add("active-filters-v86");',
'    row.querySelectorAll<HTMLElement>("[data-stage82-save], [data-stage83-save], [data-stage84-save], [data-stage85-save]").forEach((el) => { el.style.display = "none"; el.setAttribute("aria-hidden","true"); });',
'    let btn = row.querySelector<HTMLButtonElement>("[data-stage86-save=\\"1\\"]");',
'    if (!btn) { btn = document.createElement("button"); btn.type = "button"; btn.dataset.stage86Save = "1"; btn.className = "save-search-v86"; row.appendChild(btn); }',
'    btn.textContent = tr[locale].saveSearch;',
'    btn.onclick = (event) => { event.preventDefault(); event.stopPropagation(); saveSearch(locale); };',
'  }',
'}',
'',
'function installCapture() {',
'  if ((window as any).__stage86CaptureInstalled) return;',
'  (window as any).__stage86CaptureInstalled = true;',
'  document.addEventListener("click", (event) => {',
'    const target = event.target as HTMLElement | null;',
'    const control = target?.closest("button,a") as HTMLElement | null;',
'    if (!control) return;',
'    if (!/Suche speichern|Save search|Сохранить поиск/i.test(control.textContent || "")) return;',
'    event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();',
'    saveSearch(getLocale());',
'  }, true);',
'}',
'',
'function findSavedSection(locale: Locale) {',
'  const labels = [tr[locale].savedSearches, "Saved searches", "Saved Searches", "Gespeicherte Suchen", "Сохранённые поиски"];',
'  return Array.from(document.querySelectorAll<HTMLElement>("section, article, div")).find((el) => {',
'    const text = el.innerText || "";',
'    if (!labels.some((label) => text.includes(label))) return false;',
'    return el.getBoundingClientRect().height > 60;',
'  }) || null;',
'}',
'',
'function fmtDate(value: string, locale: Locale) {',
'  try { const d = new Date(value); return locale === "en" ? d.toLocaleDateString("en-US") : d.toLocaleDateString("de-DE"); } catch { return value; }',
'}',
'',
'function renderSaved(locale: Locale) {',
'  walkText(document.body, (text) => translate(text, locale));',
'  const section = findSavedSection(locale);',
'  if (!section) return;',
'  section.classList.add("saved-search-section-v86");',
'  section.querySelectorAll<HTMLElement>("article, .saved-search-row-v83, .saved-search-row-v84, .saved-search-row-real-v84, .saved-search-item-v85").forEach((el) => { if (!el.closest("[data-stage86-list]")) el.style.display = "none"; });',
'  let list = section.querySelector<HTMLElement>("[data-stage86-list=\\"1\\"]");',
'  if (!list) { list = document.createElement("div"); list.dataset.stage86List = "1"; list.className = "saved-search-list-v86"; section.appendChild(list); }',
'  const saved = readSaved();',
'  list.innerHTML = saved.map((item) => {',
'    const name = escapeHtml(item.name || tr[locale].saveSearch);',
'    const url = escapeHtml(item.url || ("/" + locale));',
'    const date = escapeHtml(fmtDate(item.createdAt, locale));',
'    const filters = item.filtersText ? "<p>" + escapeHtml(item.filtersText) + "</p>" : "";',
'    return "<article class=\\"saved-search-item-v86\\"><div class=\\"saved-search-text-v86\\"><strong>" + name + "</strong>" + filters + "<small>" + date + "</small></div><div class=\\"saved-search-actions-v86\\"><a href=\\"" + url + "\\">" + escapeHtml(tr[locale].open) + "</a><button type=\\"button\\" data-stage86-delete=\\"" + escapeHtml(item.id) + "\\">" + escapeHtml(tr[locale].del) + "</button></div></article>";',
'  }).join("");',
'  list.querySelectorAll<HTMLButtonElement>("[data-stage86-delete]").forEach((btn) => { btn.onclick = () => { writeSaved(readSaved().filter((x) => x.id !== btn.dataset.stage86Delete)); renderSaved(locale); }; });',
'}',
'',
'function forceWidths() {',
'  document.querySelectorAll<HTMLElement>("section, div, form").forEach((el) => {',
'    const text = el.innerText || "";',
'    const r = el.getBoundingClientRect();',
'    if (/Suche|Поиск|Search/.test(text) && /Ergebnisse anzeigen|Показать результаты|Show results/.test(text) && r.height < 700) { el.classList.add("filter-full-v86"); el.parentElement?.classList.add("filter-parent-full-v86"); }',
'    if (/Gefunden|Найдено|Found/.test(text) && /Max\\. Wert|Макс|Max/.test(text) && /Archiv|Archive|Архив/.test(text) && r.height < 220) { el.classList.add("stats-full-v86"); el.parentElement?.classList.add("stats-parent-full-v86"); }',
'  });',
'}',
'',
'function fixCalendar() {',
'  const re = /^\\s*\\d{1,2}:\\d{2}\\s*$/;',
'  document.querySelectorAll<HTMLElement>("span, small, b, strong, em").forEach((el) => {',
'    if (!re.test(el.textContent || "")) return;',
'    el.classList.add("auction-time-v86");',
'    el.parentElement?.classList.add("auction-day-v86");',
'  });',
'}',
'',
'function applyAll() {',
'  const locale = getLocale();',
'  walkText(document.body, (text) => translate(text, locale));',
'  ensureSaveButton(locale);',
'  renderSaved(locale);',
'  forceWidths();',
'  fixCalendar();',
'  installCapture();',
'}',
'',
'export function RuntimeStage86() {',
'  useEffect(() => {',
'    const originalAlert = window.alert;',
'    window.alert = (message?: any) => {',
'      const msg = String(message || "");',
'      if (/Suche wurde gespeichert|Search saved|Поиск сохран|Suche konnte nicht|Could not save|saved/i.test(msg)) { toast(translate(msg, getLocale())); return; }',
'      originalAlert(message);',
'    };',
'    applyAll();',
'    const observer = new MutationObserver(applyAll);',
'    observer.observe(document.body, { childList: true, subtree: true, characterData: true });',
'    const timer = window.setInterval(applyAll, 750);',
'    return () => { window.alert = originalAlert; observer.disconnect(); window.clearInterval(timer); };',
'  }, []);',
'  return null;',
'}',
];

write("components/RuntimeStage86.tsx", runtimeLines.join("\n"));

function mountLayout(rel) {
  patch(rel, (content) => {
    let s = content;
    if (!s.includes("RuntimeStage86")) {
      s = 'import { RuntimeStage86 } from "@/components/RuntimeStage86";\n' + s;
    }
    if (!s.includes("<RuntimeStage86 />")) {
      s = s.replace(/<body([^>]*)>/, "<body$1>\n        <RuntimeStage86 />");
      if (!s.includes("<RuntimeStage86 />")) {
        s = s.replace(/\{children\}/, "<RuntimeStage86 />\n        {children}");
      }
    }
    return s;
  });
}

if (fs.existsSync(file("app/layout.tsx"))) mountLayout("app/layout.tsx");
if (fs.existsSync(file("app/[locale]/layout.tsx"))) mountLayout("app/[locale]/layout.tsx");

patch("app/globals.css", (s) => {
  if (s.includes("/* Stage 86 actual runtime patch */")) return s;
  return s + `
/* Stage 86 actual runtime patch */

.zvg-toast-v86 {
  position: fixed !important;
  right: 28px !important;
  bottom: 28px !important;
  z-index: 2147483647 !important;
  padding: 13px 18px !important;
  border-radius: 16px !important;
  background: #173d2f !important;
  color: #fff !important;
  font-weight: 800 !important;
  font-size: 14px !important;
  box-shadow: 0 14px 32px rgba(0,0,0,.22) !important;
  opacity: 0 !important;
  transform: translateY(10px) !important;
  pointer-events: none !important;
  transition: opacity .18s ease, transform .18s ease !important;
}
.zvg-toast-v86.show {
  opacity: 1 !important;
  transform: translateY(0) !important;
}

[data-stage82-save],
[data-stage83-save],
[data-stage84-save],
[data-stage85-save] {
  display: none !important;
}

.active-filters-v86 {
  width: 100% !important;
  max-width: none !important;
  display: flex !important;
  align-items: center !important;
  flex-wrap: wrap !important;
  gap: 8px !important;
}
.save-search-v86 {
  height: 34px !important;
  min-height: 34px !important;
  padding: 0 16px !important;
  border: 1px solid rgba(47,97,79,.24) !important;
  border-radius: 999px !important;
  background: #2f654f !important;
  color: #fff !important;
  font-weight: 800 !important;
  font-size: 13px !important;
  cursor: pointer !important;
  box-shadow: 0 8px 18px rgba(20,55,41,.14) !important;
}
.save-search-v86:hover {
  background: #255640 !important;
}

.filter-parent-full-v86,
.stats-parent-full-v86 {
  width: 100% !important;
  max-width: none !important;
}
.filter-full-v86 {
  width: 100% !important;
  max-width: 1280px !important;
  margin-left: auto !important;
  margin-right: auto !important;
}
.stats-full-v86 {
  width: 100% !important;
  max-width: 1280px !important;
  margin-left: auto !important;
  margin-right: auto !important;
  display: grid !important;
  grid-template-columns: repeat(6, minmax(0, 1fr)) !important;
  align-items: stretch !important;
}
.stats-full-v86 > * {
  min-width: 0 !important;
}
@media (max-width: 900px) {
  .stats-full-v86 {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }
}

.saved-search-section-v86 {
  padding-top: 18px !important;
  padding-bottom: 18px !important;
}
.saved-search-list-v86 {
  margin-top: 14px !important;
  display: grid !important;
  gap: 10px !important;
}
.saved-search-item-v86 {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) auto !important;
  gap: 14px !important;
  align-items: center !important;
  padding: 12px 14px !important;
  border: 1px solid rgba(47,97,79,.16) !important;
  border-radius: 16px !important;
  background: rgba(255,255,255,.76) !important;
}
.saved-search-text-v86 {
  min-width: 0 !important;
}
.saved-search-text-v86 strong {
  display: block !important;
  font-weight: 900 !important;
}
.saved-search-text-v86 p {
  margin: 4px 0 !important;
  color: #526381 !important;
}
.saved-search-text-v86 small {
  color: #526381 !important;
}
.saved-search-actions-v86 {
  display: flex !important;
  gap: 8px !important;
  align-items: center !important;
}
.saved-search-actions-v86 a,
.saved-search-actions-v86 button {
  height: 38px !important;
  min-height: 38px !important;
  padding: 0 14px !important;
  border-radius: 13px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-weight: 800 !important;
}
.saved-search-actions-v86 a {
  background: #2f654f !important;
  color: #fff !important;
  text-decoration: none !important;
}
.saved-search-actions-v86 button {
  background: rgba(255,240,240,.85) !important;
  border: 1px solid rgba(220,60,60,.25) !important;
  color: #b91818 !important;
}

.auction-day-v86 {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 6px !important;
}
.auction-time-v86 {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  height: 19px !important;
  min-width: 44px !important;
  padding: 0 7px !important;
  border-radius: 999px !important;
  background: rgba(47,97,79,.14) !important;
  color: #24604d !important;
  font-size: 11px !important;
  font-weight: 800 !important;
  line-height: 19px !important;
  white-space: nowrap !important;
  margin-left: 4px !important;
}
`;
});

console.log("Stage 86 completed successfully.");
