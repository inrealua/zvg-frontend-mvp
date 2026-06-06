"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  AUCTION_ATTEMPT_OPTIONS,
  BOOLEAN_OPTIONS,
  PROPERTY_GROUP_OPTIONS,
  STATUS_OPTIONS,
  WERTGRENZEN_OPTIONS,
  type SelectOption,
} from "@/lib/filter-options";

const PRICE_MAX = 600_000;
const AREA_MAX = 500;
const RADIUS_MAX = 1000;

type Locale = "de" | "ru" | "en";

type FilterBarProps = {
  states: string[];
  courts: string[];
  cities: string[];
  compact?: boolean;
};

const labels = {
  de: {
    title: "Suche",
    subtitle: "Filtern Sie Immobilien nach Region, Preis, Fläche und Termin.",
    q: "Suche",
    qPlaceholder: "Ort, PLZ, Adresse, Aktenzeichen, Gericht",
    state: "Bundesland",
    allStates: "Alle Bundesländer",
    city: "Ort",
    allCities: "Alle Orte",
    court: "Amtsgericht",
    allCourts: "Alle Gerichte",
    postalCode: "PLZ",
    postalPlaceholder: "z. B. 09111",
    radius: "Umkreis",
    noRadius: "Kein Radius",
    propertyType: "Objektart",
    allTypes: "Alle Typen",
    price: "Verkehrswert bis",
    anyPrice: "Beliebig",
    livingArea: "Wohnfläche ab",
    anyArea: "Beliebig",
    dateFrom: "Termin ab",
    dateTo: "Termin bis",
    datePlaceholder: "JJJJ-MM-TT",
    status: "Status",
    heritage: "Denkmalschutz",
    valueLimits: "Wertgrenzen",
    attempt: "Termin-Nr.",
    any: "Egal",
    anyAttempt: "Jeder Termin",
    submit: "Ergebnisse anzeigen",
    reset: "Zurücksetzen",
  },
  ru: {
    title: "Поиск",
    subtitle: "Фильтруйте объекты по региону, цене, площади и дате торгов.",
    q: "Поиск",
    qPlaceholder: "Город, индекс, адрес, номер дела, суд",
    state: "Федеральная земля",
    allStates: "Все земли",
    city: "Город",
    allCities: "Все города",
    court: "Суд",
    allCourts: "Все суды",
    postalCode: "Индекс",
    postalPlaceholder: "например: 09111",
    radius: "Радиус",
    noRadius: "Без радиуса",
    propertyType: "Тип объекта",
    allTypes: "Все типы",
    price: "Оценочная стоимость до",
    anyPrice: "Любая",
    livingArea: "Жилая площадь от",
    anyArea: "Любая",
    dateFrom: "Торги от",
    dateTo: "Торги до",
    datePlaceholder: "ГГГГ-ММ-ДД",
    status: "Статус",
    heritage: "Памятник архитектуры",
    valueLimits: "Ценовые границы",
    attempt: "№ термина",
    any: "Не важно",
    anyAttempt: "Любой термин",
    submit: "Показать результаты",
    reset: "Сбросить",
  },
  en: {
    title: "Search",
    subtitle: "Filter properties by region, price, area and auction date.",
    q: "Search",
    qPlaceholder: "City, ZIP, address, case number, court",
    state: "Federal state",
    allStates: "All states",
    city: "City",
    allCities: "All cities",
    court: "Court",
    allCourts: "All courts",
    postalCode: "ZIP",
    postalPlaceholder: "e.g. 09111",
    radius: "Radius",
    noRadius: "No radius",
    propertyType: "Property type",
    allTypes: "All types",
    price: "Market value up to",
    anyPrice: "Any",
    livingArea: "Living area from",
    anyArea: "Any",
    dateFrom: "Auction from",
    dateTo: "Auction to",
    datePlaceholder: "YYYY-MM-DD",
    status: "Status",
    heritage: "Listed monument",
    valueLimits: "Value limits",
    attempt: "Auction no.",
    any: "Any",
    anyAttempt: "Any auction",
    submit: "Show results",
    reset: "Reset",
  },
} as const;

const optionLabels: Record<Locale, Record<string, string>> = {
  de: {
    ACTIVE: "Aktiv",
    CANCELLED: "Aufgehoben",
    ARCHIVED: "Archiv",
    SOLD: "Verkauft",
    WOHNHAEUSER: "Wohnhäuser",
    WOHNUNGEN: "Wohnungen",
    GEWERBE: "Gewerbe",
    GRUNDSTUECKE: "Grundstücke",
    LAND_WALD: "Land / Wald",
    GARAGEN: "Garagen / Parken",
    SONSTIGE: "Sonstige",
    true: "Ja",
    false: "Nein",
    weggefallen: "Weggefallen",
    nicht_weggefallen: "Nicht weggefallen / unbekannt",
    "1": "1. Termin",
    "2": "2. Termin",
    "3": "3. und weitere",
    "3plus": "3. und weitere",
  },
  ru: {
    ACTIVE: "Активно",
    CANCELLED: "Отменено",
    ARCHIVED: "Архив",
    SOLD: "Продано",
    WOHNHAEUSER: "Жилые дома",
    WOHNUNGEN: "Квартиры",
    GEWERBE: "Коммерция",
    GRUNDSTUECKE: "Участки",
    LAND_WALD: "Земля / лес",
    GARAGEN: "Гаражи / парковки",
    SONSTIGE: "Прочее",
    true: "Да",
    false: "Нет",
    weggefallen: "Сняты",
    nicht_weggefallen: "Не сняты / неизвестно",
    "1": "1-й термин",
    "2": "2-й термин",
    "3": "3-й и далее",
    "3plus": "3-й и далее",
  },
  en: {
    ACTIVE: "Active",
    CANCELLED: "Cancelled",
    ARCHIVED: "Archive",
    SOLD: "Sold",
    WOHNHAEUSER: "Residential houses",
    WOHNUNGEN: "Apartments",
    GEWERBE: "Commercial",
    GRUNDSTUECKE: "Land plots",
    LAND_WALD: "Land / forest",
    GARAGEN: "Garages / parking",
    SONSTIGE: "Other",
    true: "Yes",
    false: "No",
    weggefallen: "Removed",
    nicht_weggefallen: "Not removed / unknown",
    "1": "1st auction",
    "2": "2nd auction",
    "3": "3rd and later",
    "3plus": "3rd and later",
  },
};

function readLocaleFromCookie(): Locale {
  if (typeof document === "undefined") return "de";
  const match = document.cookie.match(/(?:^|;\s*)zvg_locale=(de|ru|en)(?:;|$)/);
  return (match?.[1] as Locale) || "de";
}

function useClientLocale(): Locale {
  const [locale, setLocale] = useState<Locale>("de");

  useEffect(() => {
    setLocale(readLocaleFromCookie());

    function update() {
      setLocale(readLocaleFromCookie());
    }

    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);

    return () => {
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  return locale;
}

function getInitialValue(params: URLSearchParams, key: string): string {
  return params.get(key) ?? "";
}

function getInitialValues(params: URLSearchParams, key: string): string[] {
  return params.getAll(key);
}

function localizeOption(option: SelectOption, locale: Locale): SelectOption {
  if (!option.value) return option;
  return { ...option, label: optionLabels[locale][option.value] || option.label };
}

function formatNumber(value: number): string {
  return value.toLocaleString("de-DE");
}

function RadiusSlider({ initialValue, locale }: { initialValue: string; locale: Locale }) {
  const t = labels[locale];
  const initial = Number(initialValue || "0");
  const [value, setValue] = useState(Number.isFinite(initial) ? Math.max(0, Math.min(initial, RADIUS_MAX)) : 0);
  const percent = (value / RADIUS_MAX) * 100;

  return (
    <div className="field search-field-v54 filter-range-field-v55 radius-field-v54">
      <label htmlFor="radiusKmSlider">{t.radius}</label>
      <div className="filter-range-compact-v55">
        <div className="filter-range-top-v55">
          <span>{value > 0 ? `${value} km` : t.noRadius}</span>
          <b>0–1000 km</b>
        </div>
        <div className="filter-range-track-v55" style={{ ["--range-end" as string]: `${percent}%` }}>
          <input
            id="radiusKmSlider"
            type="range"
            min="0"
            max={RADIUS_MAX}
            step="10"
            value={value}
            onChange={(event) => setValue(Math.max(0, Math.min(Number(event.target.value), RADIUS_MAX)))}
          />
        </div>
      </div>
      <input type="hidden" name="radiusKm" value={value > 0 ? String(value) : ""} />
    </div>
  );
}

function SingleRange({
  label,
  name,
  initialValue,
  max,
  step,
  suffix,
  emptyLabel,
  mode,
}: {
  label: string;
  name: string;
  initialValue: string;
  max: number;
  step: number;
  suffix: string;
  emptyLabel: string;
  mode: "max" | "min";
}) {
  const fallback = mode === "max" ? max : 0;
  const initial = Number(initialValue || String(fallback));
  const [value, setValue] = useState(Number.isFinite(initial) ? Math.max(0, Math.min(initial, max)) : fallback);
  const percent = (value / max) * 100;
  const isEmpty = mode === "max" ? value >= max : value <= 0;

  return (
    <div className="field search-field-v54 filter-range-field-v55">
      <label htmlFor={`${name}Slider`}>{label}</label>
      <div className="filter-range-compact-v55">
        <div className="filter-range-top-v55">
          <span>{isEmpty ? emptyLabel : `${formatNumber(value)}${suffix}`}</span>
          <b>{mode === "max" ? `0–${formatNumber(max)}${suffix}` : `0+ ${suffix.trim()}`}</b>
        </div>
        <div className="filter-range-track-v55" style={{ ["--range-end" as string]: `${percent}%` }}>
          <input
            id={`${name}Slider`}
            type="range"
            min="0"
            max={max}
            step={step}
            value={value}
            onChange={(event) => setValue(Math.max(0, Math.min(Number(event.target.value), max)))}
          />
        </div>
      </div>
      <input type="hidden" name={name} value={isEmpty ? "" : String(value)} />
    </div>
  );
}

function OptionSelect({
  id,
  label,
  name,
  defaultValue,
  emptyLabel,
  options,
  locale,
}: {
  id: string;
  label: string;
  name: string;
  defaultValue: string;
  emptyLabel: string;
  options: SelectOption[];
  locale: Locale;
}) {
  return (
    <div className="field search-field-v54">
      <label htmlFor={id}>{label}</label>
      <select id={id} name={name} defaultValue={defaultValue}>
        <option value="">{emptyLabel}</option>
        {options.filter((option) => option.value).map((option) => {
          const localized = localizeOption(option, locale);
          return <option key={localized.value} value={localized.value}>{localized.label}</option>;
        })}
      </select>
    </div>
  );
}

export function FilterBar({ states, courts, cities }: FilterBarProps) {
  const locale = useClientLocale();
  const t = labels[locale];
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const next = new URLSearchParams();

    for (const [key, value] of formData.entries()) {
      const text = String(value).trim();
      if (text.length > 0) next.append(key, text);
    }

    const currentSort = searchParams.get("sort");
    const currentPerPage = searchParams.get("perPage");
    if (currentSort && !next.has("sort")) next.set("sort", currentSort);
    if (currentPerPage && !next.has("perPage")) next.set("perPage", currentPerPage);

    next.delete("page");

    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function clearFilters() {
    const next = new URLSearchParams();
    const currentSort = searchParams.get("sort");
    const currentPerPage = searchParams.get("perPage");
    if (currentSort) next.set("sort", currentSort);
    if (currentPerPage) next.set("perPage", currentPerPage);
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <form key={searchParams.toString()} className="filters search-filter-v54 search-filter-v55" onSubmit={onSubmit}>
      <div className="search-filter-head-v54 search-filter-head-v55">
        <div>
          <h2>{t.title}</h2>
          <p>{t.subtitle}</p>
        </div>
        <div className="search-filter-actions-v54 search-filter-actions-v55">
          <button type="submit" className="btn btn-primary">{t.submit}</button>
          <button type="button" onClick={clearFilters} className="btn btn-ghost">{t.reset}</button>
        </div>
      </div>

      <div className="search-filter-grid-v54 search-filter-grid-v55">
        <div className="field search-field-v54 span-3-v54">
          <label htmlFor="q">{t.q}</label>
          <input id="q" name="q" placeholder={t.qPlaceholder} defaultValue={getInitialValue(searchParams, "q")} />
        </div>

        <div className="field search-field-v54">
          <label htmlFor="state">{t.state}</label>
          <select id="state" name="state" defaultValue={getInitialValues(searchParams, "state")[0] ?? ""}>
            <option value="">{t.allStates}</option>
            {states.map((state) => <option key={state} value={state}>{state}</option>)}
          </select>
        </div>

        <div className="field search-field-v54">
          <label htmlFor="city">{t.city}</label>
          <select id="city" name="city" defaultValue={getInitialValue(searchParams, "city")}>
            <option value="">{t.allCities}</option>
            {cities.map((city) => <option key={city} value={city}>{city}</option>)}
          </select>
        </div>

        <div className="field search-field-v54">
          <label htmlFor="postalCode">{t.postalCode}</label>
          <input id="postalCode" name="postalCode" placeholder={t.postalPlaceholder} defaultValue={getInitialValue(searchParams, "postalCode")} />
        </div>

        <RadiusSlider initialValue={getInitialValue(searchParams, "radiusKm")} locale={locale} />

        <OptionSelect
          id="typeGroup"
          label={t.propertyType}
          name="typeGroup"
          defaultValue={getInitialValues(searchParams, "typeGroup")[0] ?? ""}
          emptyLabel={t.allTypes}
          options={PROPERTY_GROUP_OPTIONS}
          locale={locale}
        />

        <SingleRange
          label={t.price}
          name="maxPrice"
          initialValue={getInitialValue(searchParams, "maxPrice")}
          max={PRICE_MAX}
          step={5000}
          suffix=" €"
          emptyLabel={t.anyPrice}
          mode="max"
        />

        <SingleRange
          label={t.livingArea}
          name="minLivingArea"
          initialValue={getInitialValue(searchParams, "minLivingArea")}
          max={AREA_MAX}
          step={5}
          suffix=" m²"
          emptyLabel={t.anyArea}
          mode="min"
        />

        <div className="field search-field-v54">
          <label htmlFor="dateFrom">{t.dateFrom}</label>
          <input id="dateFrom" name="dateFrom" type="text" inputMode="numeric" placeholder={t.datePlaceholder} defaultValue={getInitialValue(searchParams, "dateFrom")} />
        </div>

        <div className="field search-field-v54">
          <label htmlFor="dateTo">{t.dateTo}</label>
          <input id="dateTo" name="dateTo" type="text" inputMode="numeric" placeholder={t.datePlaceholder} defaultValue={getInitialValue(searchParams, "dateTo")} />
        </div>

        <div className="field search-field-v54">
          <label htmlFor="court">{t.court}</label>
          <select id="court" name="court" defaultValue={getInitialValue(searchParams, "court")}>
            <option value="">{t.allCourts}</option>
            {courts.map((court) => <option key={court} value={court}>{court}</option>)}
          </select>
        </div>

        <div className="field search-field-v54">
          <label htmlFor="status">{t.status}</label>
          <select id="status" name="status" defaultValue={getInitialValue(searchParams, "status")}>
            {STATUS_OPTIONS.map((option) => {
              const localized = localizeOption(option, locale);
              const label = localized.value ? localized.label : locale === "ru" ? "Все актуальные" : locale === "en" ? "All current" : "Alle aktuellen";
              return <option key={localized.value} value={localized.value}>{label}</option>;
            })}
          </select>
        </div>

        <OptionSelect
          id="denkmalschutz"
          label={t.heritage}
          name="denkmalschutz"
          defaultValue={getInitialValue(searchParams, "denkmalschutz")}
          emptyLabel={t.any}
          options={BOOLEAN_OPTIONS}
          locale={locale}
        />

        <OptionSelect
          id="wertgrenzen"
          label={t.valueLimits}
          name="wertgrenzen"
          defaultValue={getInitialValue(searchParams, "wertgrenzen")}
          emptyLabel={t.any}
          options={WERTGRENZEN_OPTIONS}
          locale={locale}
        />

        <OptionSelect
          id="auctionAttempt"
          label={t.attempt}
          name="auctionAttempt"
          defaultValue={getInitialValue(searchParams, "auctionAttempt")}
          emptyLabel={t.anyAttempt}
          options={AUCTION_ATTEMPT_OPTIONS}
          locale={locale}
        />
      </div>
    </form>
  );
}
