"use client";

import { useEffect } from "react";

type Locale = "de" | "ru" | "en";

function getLocale(): Locale {
  const first = window.location.pathname.split("/").filter(Boolean)[0];
  if (first === "ru" || first === "de" || first === "en") return first;
  const match = document.cookie.match(/(?:^|;\\s*)zvg_locale=(ru|de|en)(?:;|$)/);
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
  if (/^\/(de|ru|en)(\/|\?|$)/.test(path)) return path + search;
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
    [/№ термина|Termin-Nr\.|Auction no\./g, d.termNo],

    [/Активен|Aktiv|Active/g, d.active],
    [/\bДа\b|\bJa\b|\bYes\b/g, d.yes],
    [/\bНет\b|\bNein\b|\bNo\b/g, d.no],
    [/не сняты\s*\/\s*неизвестно|nicht weggefallen\s*\/\s*unbekannt|not removed\s*\/\s*unknown/gi, d.notRemoved],
    [/\bСняты\b|\bweggefallen\b|\bremoved\b/gi, d.removed],
    [/1-й термин|1\. Termin|1st auction/g, d.term1],
    [/2-й термин|2\. Termin|2nd auction/g, d.term2],
    [/3-й и больше|3\. und weitere|3rd and later/g, d.term3],

    [/Квартиры|Wohnungen|Apartments/g, d.apartments],
    [/Коммерция|Gewerbe|Commercial/g, d.commercial],
    [/Участки|Grundstücke|Plots/g, d.plots],
    [/Земля\s*\/\s*лес|Land\s*\/\s*Wald|Land\s*\/\s*forest/g, d.landForest],
    [/Гаражи\s*\/\s*парковки|Garagen\s*\/\s*Parken|Garages\s*\/\s*parking/g, d.garages],
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
      .replace(/\s+/g, " ")
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
