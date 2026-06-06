"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  PROPERTY_GROUP_OPTIONS,
  STATUS_OPTIONS,
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
  },
};

const priceOptions = [50_000, 100_000, 150_000, 250_000, 400_000, PRICE_MAX];
const areaOptions = [50, 75, 100, 150, 200, 300, AREA_MAX];

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
    <div className="field search-field-v54 radius-field-v54">
      <label htmlFor="radiusKmSlider">{t.radius}</label>
      <div className="radius-compact-v54">
        <div className="radius-compact-top-v54">
          <span>{value > 0 ? `${value} km` : t.noRadius}</span>
          <b>0–1000 km</b>
        </div>
        <div className="radius-track-v54" style={{ ["--radius-end" as string]: `${percent}%` }}>
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

    // Keep sort/perPage when the user filters.
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
    <form key={searchParams.toString()} className="filters search-filter-v54" onSubmit={onSubmit}>
      <div className="search-filter-head-v54">
        <div>
          <h2>{t.title}</h2>
          <p>{t.subtitle}</p>
        </div>
        <div className="search-filter-actions-v54">
          <button type="submit" className="btn btn-primary">{t.submit}</button>
          <button type="button" onClick={clearFilters} className="btn btn-ghost">{t.reset}</button>
        </div>
      </div>

      <div className="search-filter-grid-v54">
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

        <div className="field search-field-v54">
          <label htmlFor="typeGroup">{t.propertyType}</label>
          <select id="typeGroup" name="typeGroup" defaultValue={getInitialValues(searchParams, "typeGroup")[0] ?? ""}>
            <option value="">{t.allTypes}</option>
            {PROPERTY_GROUP_OPTIONS.filter((option) => option.value).map((option) => {
              const localized = localizeOption(option, locale);
              return <option key={localized.value} value={localized.value}>{localized.label}</option>;
            })}
          </select>
        </div>

        <div className="field search-field-v54">
          <label htmlFor="maxPrice">{t.price}</label>
          <select id="maxPrice" name="maxPrice" defaultValue={getInitialValue(searchParams, "maxPrice")}>
            <option value="">{t.anyPrice}</option>
            {priceOptions.map((price) => <option key={price} value={price}>{formatNumber(price)} €</option>)}
          </select>
        </div>

        <div className="field search-field-v54">
          <label htmlFor="minLivingArea">{t.livingArea}</label>
          <select id="minLivingArea" name="minLivingArea" defaultValue={getInitialValue(searchParams, "minLivingArea")}>
            <option value="">{t.anyArea}</option>
            {areaOptions.map((area) => <option key={area} value={area}>{area} m²</option>)}
          </select>
        </div>

        <div className="field search-field-v54">
          <label htmlFor="dateFrom">{t.dateFrom}</label>
          <input id="dateFrom" name="dateFrom" type="text" inputMode="numeric" placeholder={t.datePlaceholder} defaultValue={getInitialValue(searchParams, "dateFrom")} />
        </div>

        <div className="field search-field-v54">
          <label htmlFor="dateTo">{t.dateTo}</label>
          <input id="dateTo" name="dateTo" type="text" inputMode="numeric" placeholder={t.datePlaceholder} defaultValue={getInitialValue(searchParams, "dateTo")} />
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
      </div>
    </form>
  );
}
