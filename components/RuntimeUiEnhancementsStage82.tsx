"use client";

import { useEffect } from "react";

type Locale = "de" | "ru" | "en";

function getStage82Locale(): Locale {
  const first = window.location.pathname.split("/").filter(Boolean)[0];
  if (first === "ru" || first === "de" || first === "en") return first;
  const cookie = document.cookie.match(/(?:^|;\s*)zvg_locale=(ru|de|en)(?:;|$)/);
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
    params.city ? `${t.labels.city}: ${params.city}` :
    params.q ? `Search: ${params.q}` :
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
  const timePattern = /^\s*\d{1,2}:\d{2}\s*$/;

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
