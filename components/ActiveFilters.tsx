"use client";

import Link from "next/link";
import { useMemo } from "react";

type Locale = "de" | "ru" | "en";

type Chip = {
  key?: string;
  label?: string;
  value?: string;
  href?: string;
  removeHref?: string;
};

type ActiveFiltersProps = {
  chips?: Chip[];
  activeFilters?: Chip[];
  filters?: Chip[];
  clearHref?: string;
  resetHref?: string;
  locale?: Locale;
  className?: string;
};

const dict = {
  de: {
    activeFilters: "Aktive Filter:",
    clearAll: "Alles löschen",
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
    notRemoved: "gelten",
    removed: "weggefallen",
    limitsApply: "gelten",
    term1: "1. Termin",
    term2: "2. Termin",
    term3: "3. und weitere",
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
    notRemoved: "действуют",
    removed: "сняты",
    limitsApply: "действуют",
    term1: "1-й термин",
    term2: "2-й термин",
    term3: "3-й и больше",
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
    notRemoved: "apply",
    removed: "removed",
    limitsApply: "apply",
    term1: "1st auction",
    term2: "2nd auction",
    term3: "3rd and later",
    apartments: "Apartments",
    commercial: "Commercial",
    plots: "Plots",
    landForest: "Land / forest",
    houses: "Residential houses",
    rented: "Rented",
    ownUse: "Owner-occupied",
    free: "Vacant",
    unknown: "Unbekannt",
  },
} as const;

const labelKeyMap: Record<string, keyof typeof dict.de> = {
  bundesland: "state",
  state: "state",
  земля: "state",
  ort: "city",
  stadt: "city",
  city: "city",
  город: "city",
  plz: "postalCode",
  zip: "postalCode",
  индекс: "postalCode",
  umkreis: "radius",
  radius: "radius",
  радиус: "radius",
  amtsgericht: "court",
  gericht: "court",
  court: "court",
  суд: "court",
  objektart: "type",
  type: "type",
  тип: "type",
  status: "status",
  статус: "status",
  nutzung: "usage",
  usage: "usage",
  использование: "usage",
  denkmalschutz: "monument",
  monument: "monument",
  denkmal: "monument",
  wertgrenzen: "limits",
  limits: "limits",
  wertgrenze: "limits",
  "ценовые границы": "limits",
};

const paramByLabel: Record<string, string[]> = {
  state: ["state"],
  city: ["city"],
  postalCode: ["postalCode"],
  radius: ["radiusKm"],
  court: ["court"],
  type: ["typeGroup", "type"],
  status: ["status"],
  usage: ["occupancy"],
  priceFrom: ["minPrice"],
  priceTo: ["maxPrice"],
  livingFrom: ["minLivingArea"],
  livingTo: ["maxLivingArea"],
  plotFrom: ["minPlotArea"],
  plotTo: ["maxPlotArea"],
  dateFrom: ["dateFrom"],
  dateTo: ["dateTo"],
  monument: ["denkmalschutz"],
  limits: ["wertgrenzen"],
  termNo: ["auctionAttempt"],
};

function normalizeLocale(locale?: string): Locale {
  if (locale === "ru" || locale === "en" || locale === "de") return locale;
  if (typeof window !== "undefined") {
    const first = window.location.pathname.split("/").filter(Boolean)[0];
    if (first === "ru" || first === "en" || first === "de") return first;
  }
  return "de";
}

function normalizeText(value: string) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function translateValue(input: string, locale: Locale) {
  const d = dict[locale];
  let text = String(input || "").trim();

  const replacements: Array<[RegExp, string]> = [
    [/Ограничения\s+действуют/gi, d.limitsApply],
    [/Ограничения\s+сняты/gi, d.removed],
    [/Ограничения\s+не\s+сняты/gi, d.notRemoved],
    [/nicht\s+weggefallen\s*\/\s*unbekannt/gi, d.notRemoved],
    [/nicht\s+weggefallen/gi, d.notRemoved],
    [/weggefallen/gi, d.removed],
    [/Wertgrenzen\s+aufgehoben/gi, d.removed],
    [/Wertgrenzen\s+gelten/gi, d.limitsApply],
    [/UNKNOWN|Unbekannt|Неизвестно|Невідомо/gi, d.unknown],
    [/РќРµРёР·РІРµСЃС‚РЅРѕ|РќРµРё/gi, d.unknown],
    [/VACANT|Frei|Свободен/gi, d.free],
    [/RENTED|Vermietet|Сдан в аренду/gi, d.rented],
    [/OWNER_OCCUPIED|Eigennutzung|Используется собственником/gi, d.ownUse],
    [/ACTIVE|Aktiv|Активно|Активен/gi, d.active],
    [/true|Ja|Да/gi, d.yes],
    [/false|Nein|Нет/gi, d.no],
  ];

  for (const [from, to] of replacements) text = text.replace(from, to);
  return text;
}

function translateLabel(input: string, locale: Locale) {
  const raw = normalizeText(input.replace(/:$/, ""));
  const d = dict[locale];

  for (const [key, dictKey] of Object.entries(labelKeyMap)) {
    if (raw === key || raw.includes(key)) return d[dictKey];
  }

  return input;
}

function chipText(chip: Chip, locale: Locale) {
  const label = chip.label ? translateLabel(chip.label, locale) : "";
  const value = chip.value ? translateValue(chip.value, locale) : "";

  if (label && value) return `${label}: ${value}`;

  const raw = String(chip.label || chip.value || "");
  if (raw.includes(":")) {
    const [left, ...rest] = raw.split(":");
    return `${translateLabel(left, locale)}: ${translateValue(rest.join(":").trim(), locale)}`;
  }

  return translateValue(translateLabel(raw, locale), locale);
}

function inferParamKeys(chip: Chip) {
  const rawKey = normalizeText(chip.key || "");
  if (rawKey && paramByLabel[rawKey]) return paramByLabel[rawKey];
  if (rawKey) return [rawKey];

  const label = normalizeText(chip.label || "");
  const value = normalizeText(chip.value || "");
  const combined = `${label} ${value}`;

  for (const [needle, dictKey] of Object.entries(labelKeyMap)) {
    if (combined.includes(needle)) return paramByLabel[dictKey] || [];
  }

  return [];
}

function removeOneParamValue(params: URLSearchParams, key: string, chip: Chip) {
  const values = params.getAll(key);
  if (values.length === 0) return false;

  const chipValue = normalizeText(chip.value || "");
  const labelText = normalizeText(chip.label || "");

  if (values.length === 1) {
    params.delete(key);
    return true;
  }

  params.delete(key);

  let removed = false;
  for (const value of values) {
    const normalized = normalizeText(value);
    const shouldRemove =
      !removed &&
      (normalized === chipValue ||
        labelText.includes(normalized) ||
        chipValue.includes(normalized));

    if (shouldRemove) {
      removed = true;
      continue;
    }
    params.append(key, value);
  }

  if (!removed) {
    const [, ...rest] = values;
    params.delete(key);
    rest.forEach((value) => params.append(key, value));
  }

  return true;
}

function buildRemoveHref(chip: Chip, fallbackHref: string) {
  if (chip.removeHref) return chip.removeHref;
  if (chip.href && chip.href !== fallbackHref) return chip.href;
  if (typeof window === "undefined") return fallbackHref;

  const url = new URL(window.location.href);
  const params = url.searchParams;
  params.delete("page");

  const keys = inferParamKeys(chip);
  let changed = false;

  for (const key of keys) {
    changed = removeOneParamValue(params, key, chip) || changed;
  }

  if (!changed && chip.key) {
    changed = removeOneParamValue(params, chip.key, chip);
  }

  if (!changed) {
    const raw = normalizeText(`${chip.label || ""} ${chip.value || ""}`);
    for (const key of Array.from(params.keys())) {
      const values = params.getAll(key);
      const matched = values.some((value) => raw.includes(normalizeText(value)));
      if (matched) {
        changed = removeOneParamValue(params, key, chip);
        break;
      }
    }
  }

  const query = params.toString();
  return query ? `${url.pathname}?${query}` : url.pathname;
}

export function ActiveFilters(props: ActiveFiltersProps) {
  const locale = normalizeLocale(props.locale);
  const chips = props.chips || props.activeFilters || props.filters || [];
  const clearHref = props.clearHref || props.resetHref || (typeof window !== "undefined" ? window.location.pathname : "/");

  const visible = useMemo(() => chips.filter(Boolean), [chips]);

  if (visible.length === 0) return null;

  return (
    <div className={props.className || "active-filters"}>
      <span className="active-filters-label">{dict[locale].activeFilters}</span>
      {visible.map((chip, index) => {
        const href = buildRemoveHref(chip, clearHref);
        return (
          <Link className="filter-chip" href={href} key={chip.key || chip.label || chip.value || index}>
            {chipText(chip, locale)} ×
          </Link>
        );
      })}
      <Link className="filter-chip clear-chip" href={clearHref}>
        {dict[locale].clearAll}
      </Link>
    </div>
  );
}

export default ActiveFilters;
