"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AUCTION_ATTEMPT_OPTIONS,
  BOOLEAN_OPTIONS,
  OCCUPANCY_OPTIONS,
  PROPERTY_GROUP_OPTIONS,
  STATUS_OPTIONS,
  WERTGRENZEN_OPTIONS,
  type SelectOption,
} from "@/lib/filter-options";

const PRICE_MAX = 600_000;
const AREA_MAX = 500;
const PLOT_MAX = 5000;
const RADIUS_MAX = 1000;

type Locale = "de" | "ru" | "en";

type FilterBarProps = {
  states: string[];
  courts: string[];
  cities: string[];
  compact?: boolean;
};

const text = {
  de: {
    selected: "ausgewählt",
    any: "Beliebig",
    search: "Suche",
    searchPlaceholder: "Ort, PLZ, Adresse, Aktenzeichen, Gericht",
    state: "Bundesland",
    allStates: "Alle Bundesländer",
    city: "Ort",
    allCities: "Alle Orte",
    postalCode: "PLZ",
    postalPlaceholder: "z. B. 09111",
    propertyType: "Objektart",
    allTypes: "Alle Typen",
    usage: "Nutzung",
    anyUsage: "Jede Nutzung",
    status: "Status",
    allCurrent: "Alle aktuellen",
    radius: "Umkreis",
    noRadius: "Kein Radius",
    marketValue: "Verkehrswert",
    livingArea: "Wohnfläche",
    plotArea: "Grundstück",
    dateFrom: "Termin ab",
    dateTo: "Termin bis",
    datePlaceholder: "JJJJ-MM-TT",
    court: "Amtsgericht",
    allCourts: "Alle Gerichte",
    heritage: "Denkmalschutz",
    valueLimits: "Wertgrenzen",
    attempt: "Termin-Nr.",
    submit: "Ergebnisse anzeigen",
    resetFilters: "Filter zurücksetzen",
  },
  ru: {
    selected: "выбрано",
    any: "Любая",
    search: "Поиск",
    searchPlaceholder: "Город, индекс, адрес, номер дела, суд",
    state: "Федеральная земля",
    allStates: "Все земли",
    city: "Город",
    allCities: "Все города",
    postalCode: "Индекс",
    postalPlaceholder: "например: 09111",
    propertyType: "Тип объекта",
    allTypes: "Все типы",
    usage: "Использование",
    anyUsage: "Любое использование",
    status: "Статус",
    allCurrent: "Все актуальные",
    radius: "Радиус",
    noRadius: "Без радиуса",
    marketValue: "Оценочная стоимость",
    livingArea: "Жилая площадь",
    plotArea: "Участок",
    dateFrom: "Торги от",
    dateTo: "Торги до",
    datePlaceholder: "ГГГГ-ММ-ДД",
    court: "Суд",
    allCourts: "Все суды",
    heritage: "Памятник архитектуры",
    valueLimits: "Ценовые границы",
    attempt: "№ термина",
    submit: "Показать результаты",
    resetFilters: "Сбросить фильтр",
  },
  en: {
    selected: "selected",
    any: "Any",
    search: "Search",
    searchPlaceholder: "City, ZIP, address, case number, court",
    state: "Federal state",
    allStates: "All states",
    city: "City",
    allCities: "All cities",
    postalCode: "ZIP",
    postalPlaceholder: "e.g. 09111",
    propertyType: "Property type",
    allTypes: "All types",
    usage: "Use",
    anyUsage: "Any use",
    status: "Status",
    allCurrent: "All current",
    radius: "Radius",
    noRadius: "No radius",
    marketValue: "Market value",
    livingArea: "Living area",
    plotArea: "Plot size",
    dateFrom: "Auction from",
    dateTo: "Auction to",
    datePlaceholder: "YYYY-MM-DD",
    court: "Court",
    allCourts: "All courts",
    heritage: "Listed monument",
    valueLimits: "Value limits",
    attempt: "Auction no.",
    submit: "Show results",
    resetFilters: "Reset filters",
  },
} as const;

const optionText: Record<Locale, Record<string, string>> = {
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
    VACANT: "Frei",
    RENTED: "Vermietet",
    OWNER_OCCUPIED: "Eigennutzung",
    UNKNOWN: "Unbekannt",
    true: "Ja",
    false: "Nein",
    weggefallen: "Weggefallen",
    nicht_weggefallen: "Nicht weggefallen / unbekannt",
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
    VACANT: "Свободен",
    RENTED: "Сдан в аренду",
    OWNER_OCCUPIED: "Используется собственником",
    UNKNOWN: "Неизвестно",
    true: "Да",
    false: "Нет",
    weggefallen: "Сняты",
    nicht_weggefallen: "Не сняты / неизвестно",
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
    VACANT: "Vacant",
    RENTED: "Rented",
    OWNER_OCCUPIED: "Owner-occupied",
    UNKNOWN: "Unknown",
    true: "Yes",
    false: "No",
    weggefallen: "Removed",
    nicht_weggefallen: "Not removed / unknown",
  },
};

function readLocale(): Locale {
  if (typeof document === "undefined") return "de";
  const match = document.cookie.match(/(?:^|;\s*)zvg_locale=(de|ru|en)(?:;|$)/);
  return (match?.[1] as Locale) || "de";
}

function useLocale(): Locale {
  const [locale, setLocale] = useState<Locale>("de");

  useEffect(() => {
    setLocale(readLocale());
    const update = () => setLocale(readLocale());
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

function formatNumber(value: number): string {
  return value.toLocaleString("de-DE");
}

function localizeOption(option: SelectOption, locale: Locale): SelectOption {
  if (!option.value) return option;
  return { ...option, label: optionText[locale][option.value] || option.label };
}

function summary(values: string[], emptyLabel: string, locale: Locale): string {
  if (values.length === 0) return emptyLabel;
  if (values.length === 1) return optionText[locale][values[0]] || values[0];
  return `${values.length} ${text[locale].selected}`;
}

function MultiSelect({
  title,
  name,
  emptyLabel,
  options,
  selected,
  locale,
}: {
  title: string;
  name: string;
  emptyLabel: string;
  options: SelectOption[];
  selected: string[];
  locale: Locale;
}) {
  const [values, setValues] = useState<string[]>(selected);
  const selectedSet = useMemo(() => new Set(values), [values]);
  const localizedOptions = options.filter((option) => option.value).map((option) => localizeOption(option, locale));

  return (
    <details className="multi-filter-v59">
      <summary>
        <span>{title}</span>
        <b>{summary(values, emptyLabel, locale)}</b>
      </summary>
      <div className="multi-filter-panel-v59">
        {localizedOptions.map((option) => (
          <label key={option.value} className={selectedSet.has(option.value) ? "multi-option-v59 is-selected" : "multi-option-v59"}>
            <input
              name={name}
              type="checkbox"
              value={option.value}
              checked={selectedSet.has(option.value)}
              onChange={(event) => {
                const checked = event.target.checked;
                setValues((current) => checked ? [...current, option.value] : current.filter((item) => item !== option.value));
              }}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </details>
  );
}

function MultiTextSelect({
  title,
  name,
  emptyLabel,
  options,
  selected,
  locale,
  scroll,
}: {
  title: string;
  name: string;
  emptyLabel: string;
  options: string[];
  selected: string[];
  locale: Locale;
  scroll?: boolean;
}) {
  const [values, setValues] = useState<string[]>(selected);
  const selectedSet = useMemo(() => new Set(values), [values]);

  return (
    <details className="multi-filter-v59">
      <summary>
        <span>{title}</span>
        <b>{values.length === 0 ? emptyLabel : values.length === 1 ? values[0] : `${values.length} ${text[locale].selected}`}</b>
      </summary>
      <div className={scroll ? "multi-filter-panel-v59 multi-filter-panel-scroll-v59" : "multi-filter-panel-v59"}>
        {options.map((option) => (
          <label key={option} className={selectedSet.has(option) ? "multi-option-v59 is-selected" : "multi-option-v59"}>
            <input
              name={name}
              type="checkbox"
              value={option}
              checked={selectedSet.has(option)}
              onChange={(event) => {
                const checked = event.target.checked;
                setValues((current) => checked ? [...current, option] : current.filter((item) => item !== option));
              }}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </details>
  );
}

function SelectField({
  id,
  label,
  value,
  children,
}: {
  id: string;
  label: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field filter-cell-v59">
      <label htmlFor={id}>{label}</label>
      <select id={id} name={id} defaultValue={value}>
        {children}
      </select>
    </div>
  );
}

function RangeTrack({ children, start, end, single = false }: { children: React.ReactNode; start: number; end: number; single?: boolean }) {
  return (
    <div
      className={single ? "range-track-v59 range-track-single-v59" : "range-track-v59"}
      style={{
        ["--range-start" as string]: `${start}%`,
        ["--range-end" as string]: `${end}%`,
      }}
    >
      {children}
    </div>
  );
}

function DualRange({
  label,
  minName,
  maxName,
  max,
  step,
  minDefault,
  maxDefault,
  suffix,
  locale,
}: {
  label: string;
  minName: string;
  maxName: string;
  max: number;
  step: number;
  minDefault: string;
  maxDefault: string;
  suffix: string;
  locale: Locale;
}) {
  const initialMin = Number(minDefault || "0");
  const initialMax = Number(maxDefault || String(max));
  const [minValue, setMinValue] = useState(Number.isFinite(initialMin) ? Math.max(0, Math.min(initialMin, max)) : 0);
  const [maxValue, setMaxValue] = useState(Number.isFinite(initialMax) ? Math.max(0, Math.min(initialMax, max)) : max);

  const safeMin = Math.min(minValue, maxValue);
  const safeMax = Math.max(minValue, maxValue);
  const isDefault = safeMin === 0 && safeMax === max;
  const start = (safeMin / max) * 100;
  const end = (safeMax / max) * 100;

  return (
    <div className="range-filter-v59">
      <div className="range-title-v59">
        <span>{label}</span>
        <b>{isDefault ? text[locale].any : `${formatNumber(safeMin)}${suffix} — ${formatNumber(safeMax)}${suffix}`}</b>
      </div>
      <RangeTrack start={start} end={end}>
        <input type="range" min="0" max={max} step={step} value={safeMin} onChange={(event) => setMinValue(Math.min(Number(event.target.value), safeMax))} aria-label={`${label} min`} />
        <input type="range" min="0" max={max} step={step} value={safeMax} onChange={(event) => setMaxValue(Math.max(Number(event.target.value), safeMin))} aria-label={`${label} max`} />
      </RangeTrack>
      <div className="range-scale">
        <span>0{suffix}</span>
        <span>{formatNumber(max)}{suffix}</span>
      </div>
      <input type="hidden" name={minName} value={safeMin > 0 ? String(safeMin) : ""} />
      <input type="hidden" name={maxName} value={safeMax < max ? String(safeMax) : ""} />
    </div>
  );
}

function RadiusRange({ defaultValue, locale }: { defaultValue: string; locale: Locale }) {
  const initial = Number(defaultValue || "0");
  const [value, setValue] = useState(Number.isFinite(initial) ? Math.max(0, Math.min(initial, RADIUS_MAX)) : 0);
  const end = (value / RADIUS_MAX) * 100;

  return (
    <div className="range-filter-v59">
      <div className="range-title-v59">
        <span>{text[locale].radius}</span>
        <b>0–1.000 km</b>
      </div>
      <RangeTrack start={0} end={end} single>
        <input type="range" min="0" max={RADIUS_MAX} step="10" value={value} onChange={(event) => setValue(Number(event.target.value))} aria-label={text[locale].radius} />
      </RangeTrack>
      <div className="range-scale">
        <span>{value > 0 ? `${formatNumber(value)} km` : text[locale].noRadius}</span>
        <span>1.000 km</span>
      </div>
      <input type="hidden" name="radiusKm" value={value > 0 ? String(value) : ""} />
    </div>
  );
}

export function FilterBar({ states, courts, cities, compact = false }: FilterBarProps) {
  const locale = useLocale();
  const t = text[locale];
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const next = new URLSearchParams();

    for (const [key, value] of formData.entries()) {
      const cleanValue = String(value).trim();
      if (cleanValue) next.append(key, cleanValue);
    }

    next.delete("page");
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function clearFilters() {
    router.push(pathname, { scroll: false });
  }

  return (
    <form key={searchParams.toString()} className={compact ? "search-filter-v59 filters-compact" : "search-filter-v59"} onSubmit={onSubmit}>
      <div className="search-filter-grid-v59">
        <div className="field filter-cell-v59 filter-span-2-v59">
          <label htmlFor="q">{t.search}</label>
          <input id="q" name="q" placeholder={t.searchPlaceholder} defaultValue={getInitialValue(searchParams, "q")} />
        </div>

        <MultiTextSelect title={t.state} name="state" emptyLabel={t.allStates} options={states} selected={getInitialValues(searchParams, "state")} locale={locale} />
        <MultiTextSelect title={t.city} name="city" emptyLabel={t.allCities} options={cities} selected={getInitialValues(searchParams, "city")} locale={locale} scroll />

        <div className="field filter-cell-v59">
          <label htmlFor="postalCode">{t.postalCode}</label>
          <input id="postalCode" name="postalCode" placeholder={t.postalPlaceholder} defaultValue={getInitialValue(searchParams, "postalCode")} />
        </div>

        <MultiSelect title={t.propertyType} name="typeGroup" emptyLabel={t.allTypes} options={PROPERTY_GROUP_OPTIONS} selected={getInitialValues(searchParams, "typeGroup")} locale={locale} />
        <MultiSelect title={t.usage} name="occupancy" emptyLabel={t.anyUsage} options={OCCUPANCY_OPTIONS} selected={getInitialValues(searchParams, "occupancy")} locale={locale} />

        <SelectField id="status" label={t.status} value={getInitialValue(searchParams, "status")}>
          {STATUS_OPTIONS.map((option) => {
            const localized = localizeOption(option, locale);
            return <option key={localized.value} value={localized.value}>{localized.value ? localized.label : t.allCurrent}</option>;
          })}
        </SelectField>

        <RadiusRange defaultValue={getInitialValue(searchParams, "radiusKm")} locale={locale} />
        <DualRange label={t.marketValue} minName="minPrice" maxName="maxPrice" max={PRICE_MAX} step={5000} minDefault={getInitialValue(searchParams, "minPrice")} maxDefault={getInitialValue(searchParams, "maxPrice")} suffix=" €" locale={locale} />
        <DualRange label={t.livingArea} minName="minLivingArea" maxName="maxLivingArea" max={AREA_MAX} step={5} minDefault={getInitialValue(searchParams, "minLivingArea")} maxDefault={getInitialValue(searchParams, "maxLivingArea")} suffix=" m²" locale={locale} />
        <DualRange label={t.plotArea} minName="minPlotArea" maxName="maxPlotArea" max={PLOT_MAX} step={50} minDefault={getInitialValue(searchParams, "minPlotArea")} maxDefault={getInitialValue(searchParams, "maxPlotArea")} suffix=" m²" locale={locale} />

        <div className="field filter-cell-v59">
          <label htmlFor="dateFrom">{t.dateFrom}</label>
          <input id="dateFrom" name="dateFrom" type="text" inputMode="numeric" placeholder={t.datePlaceholder} defaultValue={getInitialValue(searchParams, "dateFrom")} />
        </div>

        <div className="field filter-cell-v59">
          <label htmlFor="dateTo">{t.dateTo}</label>
          <input id="dateTo" name="dateTo" type="text" inputMode="numeric" placeholder={t.datePlaceholder} defaultValue={getInitialValue(searchParams, "dateTo")} />
        </div>

        <SelectField id="court" label={t.court} value={getInitialValue(searchParams, "court")}>
          <option value="">{t.allCourts}</option>
          {courts.map((court) => <option key={court} value={court}>{court}</option>)}
        </SelectField>

        <SelectField id="denkmalschutz" label={t.heritage} value={getInitialValue(searchParams, "denkmalschutz")}>
          {BOOLEAN_OPTIONS.map((option) => {
            const localized = localizeOption(option, locale);
            return <option key={localized.value} value={localized.value}>{localized.value ? localized.label : t.any}</option>;
          })}
        </SelectField>

        <SelectField id="wertgrenzen" label={t.valueLimits} value={getInitialValue(searchParams, "wertgrenzen")}>
          {WERTGRENZEN_OPTIONS.map((option) => {
            const localized = localizeOption(option, locale);
            return <option key={localized.value} value={localized.value}>{localized.value ? localized.label : t.any}</option>;
          })}
        </SelectField>

        <SelectField id="auctionAttempt" label={t.attempt} value={getInitialValue(searchParams, "auctionAttempt")}>
          {AUCTION_ATTEMPT_OPTIONS.map((option) => {
            const localized = localizeOption(option, locale);
            return <option key={localized.value} value={localized.value}>{localized.value ? localized.label : t.any}</option>;
          })}
        </SelectField>

        <button type="submit" className="btn btn-primary filter-action-button-v59">{t.submit}</button>
        <button type="button" onClick={clearFilters} className="btn btn-ghost filter-action-button-v59">{t.resetFilters}</button>
      </div>
    </form>
  );
}
