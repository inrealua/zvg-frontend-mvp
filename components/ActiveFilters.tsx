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
    notRemoved: "nicht weggefallen / unbekannt",
    removed: "weggefallen",
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
    notRemoved: "не сняты / неизвестно",
    removed: "сняты",
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
    notRemoved: "not removed / unknown",
    removed: "removed",
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
    unknown: "Unknown",
  },
} as const;

function normalizeLocale(locale?: string): Locale {
  if (locale === "ru" || locale === "en" || locale === "de") return locale;
  if (typeof window !== "undefined") {
    const first = window.location.pathname.split("/").filter(Boolean)[0];
    if (first === "ru" || first === "en" || first === "de") return first;
  }
  return "de";
}

function translateText(input: string, locale: Locale) {
  const d = dict[locale];
  let text = String(input || "");

  const replacements: Array<[RegExp, string]> = [
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
    [/Жилые дома|Wohnhäuser|Residential houses/g, d.houses],
    [/Сдан в аренду|Vermietet|Rented/g, d.rented],
    [/Используется собственником|Eigennutzung|Owner-occupied/g, d.ownUse],
    [/Свободен|Frei|Vacant/g, d.free],
    [/Неизвестно|Unbekannt|Unknown/g, d.unknown],
  ];

  for (const [from, to] of replacements) text = text.replace(from, to);
  return text;
}

function chipText(chip: Chip, locale: Locale) {
  const raw = chip.label && chip.value ? `${chip.label}: ${chip.value}` : chip.label || chip.value || "";
  return translateText(raw, locale);
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
        const href = chip.removeHref || chip.href || clearHref;
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
