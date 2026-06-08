"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type Locale = "de" | "ru" | "en";

function getLocale(): Locale {
  const first = window.location.pathname.split("/").filter(Boolean)[0];
  if (first === "ru" || first === "de" || first === "en") return first;
  const match = document.cookie.match(/(?:^|;\\s*)zvg_locale=(ru|de|en)(?:;|$)/);
  return (match?.[1] as Locale) || "de";
}

const tx = {
  de: {
    activeFilters: "Aktive Filter:",
    clearAll: "Alles löschen",
    save: "Suche speichern",
    saved: "Gespeichert",
    already: "Bereits gespeichert",
    login: "Bitte anmelden",
    error: "Fehler",
    mapArea: "Kartenbereich",
    emptyTitle: "Keine Objekte gefunden",
    emptyText: "Entfernen Sie einige Filter, erweitern Sie die Preisspanne oder wählen Sie einen anderen Ort.",
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
    houses: "Wohnhäuser",
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
    error: "Ошибка",
    mapArea: "Область карты",
    emptyTitle: "Объекты не найдены",
    emptyText: "Попробуй убрать часть фильтров, расширить диапазон цены или выбрать другой город.",
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
    houses: "Жилые дома",
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
    error: "Error",
    mapArea: "Map area",
    emptyTitle: "No objects found",
    emptyText: "Try removing some filters, expanding the price range, or choosing another city.",
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
    houses: "Residential houses",
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
  if (/^\/(de|ru|en)(\/|\?|$)/.test(path)) return path + search;
  return "/" + locale + search;
}

function translateText(input: string, locale: Locale) {
  const d = tx[locale];
  let text = String(input || "");

  const pairs: Array<[RegExp, string]> = [
    [/Active Filter:|Active Filters:|Aktive Filter:|Активные фильтры:/g, d.activeFilters],
    [/Alles löschen|Alle löschen|Очистить всё|Очистить все|Clear all|All clear/g, d.clearAll],
    [/Область карты|Kartenbereich|Map area/g, d.mapArea],

    [/Bundesland|Federal state|State|Земля/g, d.state],
    [/Ort|City|Город/g, d.city],
    [/PLZ|ZIP|Индекс/g, d.postalCode],
    [/Amtsgericht|Court|Суд/g, d.court],
    [/Umkreis|Radius|Радиус/g, d.radius],
    [/Objektart|Type|Тип/g, d.type],
    [/Status|Статус/g, d.status],
    [/Nutzung|Usage|Использование/g, d.usage],
    [/Verkehrswert ab|Price from|Цена от/g, d.priceFrom],
    [/Verkehrswert bis|Price to|Цена до/g, d.priceTo],
    [/Wohnfläche ab|Living area from|Жилая от/g, d.livingFrom],
    [/Wohnfläche bis|Living area to|Жилая до/g, d.livingTo],
    [/Grundstück ab|Plot from|Участок от/g, d.plotFrom],
    [/Grundstück bis|Plot to|Участок до/g, d.plotTo],
    [/Termin ab|Auction from|Торги от/g, d.dateFrom],
    [/Termin bis|Auction to|Торги до/g, d.dateTo],
    [/Denkmalschutz|Listed building|Памятник архитектуры/g, d.monument],
    [/Wertgrenzen|Price limits|Ценовые границы/g, d.limits],
    [/Termin-Nr\\.|Auction no\\.|№ термина/g, d.termNo],

    [/WOHNUNGEN|Квартиры|Wohnungen|Apartments/g, d.apartments],
    [/GEWERBE|Коммерция|Gewerbe|Commercial/g, d.commercial],
    [/GRUNDSTUECKE|Участки|Grundstücke|Plots/g, d.plots],
    [/LAND_WALD|Земля\\s*\/\s*лес|Land\\s*\/\s*Wald|Land\\s*\/\s*forest/g, d.landForest],
    [/GARAGEN|Гаражи\\s*\/\s*парковки|Garagen\\s*\/\s*Parken|Garages\\s*\/\s*parking/g, d.garages],
    [/SONSTIGE|Прочее|Sonstige|Other/g, d.other],
    [/WOHNHAEUSER|Жилые дома|Wohnhäuser|Residential houses/g, d.houses],

    [/VACANT|Свободен|Frei|Vacant/g, d.free],
    [/RENTED|Сдан в аренду|Vermietet|Rented/g, d.rented],
    [/OWNER_OCCUPIED|Используется собственником|Eigennutzung|Owner-occupied/g, d.ownUse],
    [/UNKNOWN|Неизвестно|Unbekannt|Unknown/g, d.unknown],
    [/ACTIVE|Активен|Aktiv|Active/g, d.active],

    [/\\bДа\\b|\\bJa\\b|\\bYes\\b/g, d.yes],
    [/\\bНет\\b|\\bNein\\b|\\bNo\\b/g, d.no],
    [/не сняты\\s*\/\s*неизвестно|nicht weggefallen\\s*\/\s*unbekannt|not removed\\s*\/\s*unknown/gi, d.notRemoved],
    [/\\bСняты\\b|\\bweggefallen\\b|\\bremoved\\b/gi, d.removed],
    [/1-й термин|1\\. Termin|1st auction/g, d.term1],
    [/2-й термин|2\\. Termin|2nd auction/g, d.term2],
    [/3-й и больше|3\\. und weitere|3rd and later/g, d.term3],
  ];

  for (const [from, to] of pairs) text = text.replace(from, to);

  // Collapse duplicated chips like "Objektart: Wohnungen: Wohnungen".
  text = text.replace(/^([^:]+):\\s*([^:×]+):\\s*\\2(\\s*×?)$/i, "$1: $2$3");
  text = text.replace(/^([^:]+):\\s*([^:×]+):\\s*([^:×]+)(\\s*×?)$/i, (match, label, a, b, tail) => {
    return String(a).trim().toLowerCase() === String(b).trim().toLowerCase()
      ? label + ": " + a.trim() + tail
      : match;
  });

  return text;
}

function findActiveFilterRow() {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>("section, div, aside"));
  let best: HTMLElement | null = null;

  for (const node of nodes) {
    const text = node.innerText || "";
    if (!/Active Filter|Active filters|Aktive Filter|Активные фильтры/.test(text)) continue;
    if (!/Alles löschen|Очистить|Clear all|Область карты|Kartenbereich|Map area|Radius|Umkreis|PLZ|WOHNUNGEN|VACANT|Verkehrswert/.test(text)) continue;

    const rect = node.getBoundingClientRect();
    if (rect.height > 220) continue;
    if (!best || rect.height < best.getBoundingClientRect().height) best = node;
  }

  return best;
}

function translateActiveRow(row: HTMLElement, locale: Locale) {
  row.classList.add("active-filters-stage90");

  const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT);
  const nodes: Node[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  for (const node of nodes) {
    const before = node.textContent || "";
    const after = translateText(before, locale);
    if (after !== before) node.textContent = after;
  }
}

async function saveSearch(row: HTMLElement, button: HTMLButtonElement) {
  const locale = getLocale();
  const d = tx[locale];
  const old = button.textContent || d.save;

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
    button.textContent = old;
  }, 2200);
}

function ensureSaveButton(row: HTMLElement, locale: Locale) {
  let button = row.querySelector<HTMLButtonElement>("[data-save-search-stage90='1']");

  if (!button) {
    button = document.createElement("button");
    button.type = "button";
    button.dataset.saveSearchStage90 = "1";
    button.className = "save-search-stage90";
    row.appendChild(button);
  }

  button.textContent = tx[locale].save;
  button.onclick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    saveSearch(row, button);
  };
}

function translateEmptyState(locale: Locale) {
  const d = tx[locale];

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes: Node[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  for (const node of nodes) {
    const text = node.textContent || "";
    if (/Объекты не найдены|Keine Objekte gefunden|No objects found/.test(text)) node.textContent = d.emptyTitle;
    if (/Попробуй убрать часть фильтров|Entfernen Sie einige Filter|Try removing some filters/.test(text)) node.textContent = d.emptyText;
  }
}

function fixCalendar() {
  const re = /^\\s*\\d{1,2}:\\d{2}\\s*$/;

  document.querySelectorAll<HTMLElement>("span, small, b, strong, em").forEach((el) => {
    if (!re.test(el.textContent || "")) return;

    el.classList.add("auction-time-stage90");

    const parent = el.parentElement;
    if (parent) parent.classList.add("auction-day-stage90");
  });
}

function markCabinetFavorites() {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>("section, div"));

  for (const el of candidates) {
    const text = el.innerText || "";
    if (/Meine Favoriten|Мои избранные|My favorites/.test(text)) {
      el.classList.add("cabinet-favorites-stage90");
    }
  }
}

function processPage() {
  const locale = getLocale();
  const row = findActiveFilterRow();

  if (row) {
    translateActiveRow(row, locale);
    ensureSaveButton(row, locale);
  }

  translateEmptyState(locale);
  fixCalendar();
  markCabinetFavorites();
}

export function TargetedPolishStage90() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    let stopped = false;
    let timer: number | null = null;

    const run = () => {
      if (stopped) return;
      processPage();
    };

    run();

    const timeouts = [80, 250, 600, 1200, 2200].map((ms) => window.setTimeout(run, ms));

    const observer = new MutationObserver(() => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(run, 120);
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      stopped = true;
      observer.disconnect();
      if (timer) window.clearTimeout(timer);
      for (const timeout of timeouts) window.clearTimeout(timeout);
    };
  }, [pathname, searchParams?.toString()]);

  return null;
}
