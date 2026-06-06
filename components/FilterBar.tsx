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

const labels = {
  de: { selected: "ausgewählt", any: "Beliebig", search: "Suche", searchPlaceholder: "Ort, PLZ, Adresse, Aktenzeichen, Gericht", city: "Ort", allCities: "Alle Orte", postalCode: "PLZ", postalPlaceholder: "z. B. 09111", radius: "Umkreis", noRadius: "Kein Radius", court: "Amtsgericht", allCourts: "Alle Gerichte", status: "Status", allCurrent: "Alle aktuellen", state: "Bundesland", allStates: "Alle Bundesländer", propertyType: "Objektart", allTypes: "Alle Typen", usage: "Nutzung", anyUsage: "Jede Nutzung", marketValue: "Verkehrswert", livingArea: "Wohnfläche", plotArea: "Grundstück", dateFrom: "Termin ab", dateTo: "Termin bis", datePlaceholder: "JJJJ-MM-TT", heritage: "Denkmalschutz", valueLimits: "Wertgrenzen", attempt: "Termin-Nr.", submit: "Ergebnisse anzeigen", resetFilters: "Filter zurücksetzen" },
  ru: { selected: "выбрано", any: "Любая", search: "Поиск", searchPlaceholder: "Город, индекс, адрес, номер дела, суд", city: "Город", allCities: "Все города", postalCode: "Индекс", postalPlaceholder: "например: 09111", radius: "Радиус", noRadius: "Без радиуса", court: "Суд", allCourts: "Все суды", status: "Статус", allCurrent: "Все актуальные", state: "Федеральная земля", allStates: "Все земли", propertyType: "Тип объекта", allTypes: "Все типы", usage: "Использование", anyUsage: "Любое использование", marketValue: "Оценочная стоимость", livingArea: "Жилая площадь", plotArea: "Участок", dateFrom: "Торги от", dateTo: "Торги до", datePlaceholder: "ГГГГ-ММ-ДД", heritage: "Памятник архитектуры", valueLimits: "Ценовые границы", attempt: "№ термина", submit: "Показать результаты", resetFilters: "Сбросить фильтр" },
  en: { selected: "selected", any: "Any", search: "Search", searchPlaceholder: "City, ZIP, address, case number, court", city: "City", allCities: "All cities", postalCode: "ZIP", postalPlaceholder: "e.g. 09111", radius: "Radius", noRadius: "No radius", court: "Court", allCourts: "All courts", status: "Status", allCurrent: "All current", state: "Federal state", allStates: "All states", propertyType: "Property type", allTypes: "All types", usage: "Use", anyUsage: "Any use", marketValue: "Market value", livingArea: "Living area", plotArea: "Plot size", dateFrom: "Auction from", dateTo: "Auction to", datePlaceholder: "YYYY-MM-DD", heritage: "Listed monument", valueLimits: "Value limits", attempt: "Auction no.", submit: "Show results", resetFilters: "Reset filters" },
} as const;

const optionLabels: Record<Locale, Record<string, string>> = {
  de: { ACTIVE: "Aktiv", CANCELLED: "Aufgehoben", ARCHIVED: "Archiv", SOLD: "Verkauft", WOHNHAEUSER: "Wohnhäuser", WOHNUNGEN: "Wohnungen", GEWERBE: "Gewerbe", GRUNDSTUECKE: "Grundstücke", LAND_WALD: "Land / Wald", GARAGEN: "Garagen / Parken", SONSTIGE: "Sonstige", VACANT: "Frei", RENTED: "Vermietet", OWNER_OCCUPIED: "Eigennutzung", UNKNOWN: "Unbekannt", true: "Ja", false: "Nein", weggefallen: "Weggefallen", nicht_weggefallen: "Nicht weggefallen / unbekannt" },
  ru: { ACTIVE: "Активно", CANCELLED: "Отменено", ARCHIVED: "Архив", SOLD: "Продано", WOHNHAEUSER: "Жилые дома", WOHNUNGEN: "Квартиры", GEWERBE: "Коммерция", GRUNDSTUECKE: "Участки", LAND_WALD: "Земля / лес", GARAGEN: "Гаражи / парковки", SONSTIGE: "Прочее", VACANT: "Свободен", RENTED: "Сдан в аренду", OWNER_OCCUPIED: "Используется собственником", UNKNOWN: "Неизвестно", true: "Да", false: "Нет", weggefallen: "Сняты", nicht_weggefallen: "Не сняты / неизвестно" },
  en: { ACTIVE: "Active", CANCELLED: "Cancelled", ARCHIVED: "Archive", SOLD: "Sold", WOHNHAEUSER: "Residential houses", WOHNUNGEN: "Apartments", GEWERBE: "Commercial", GRUNDSTUECKE: "Land plots", LAND_WALD: "Land / forest", GARAGEN: "Garages / parking", SONSTIGE: "Other", VACANT: "Vacant", RENTED: "Rented", OWNER_OCCUPIED: "Owner-occupied", UNKNOWN: "Unknown", true: "Yes", false: "No", weggefallen: "Removed", nicht_weggefallen: "Not removed / unknown" },
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
    const update = () => setLocale(readLocaleFromCookie());
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return locale;
}

function localizeOption(option: SelectOption, locale: Locale): SelectOption {
  if (!option.value) return option;
  return { ...option, label: optionLabels[locale][option.value] || option.label };
}

function getInitialValue(params: URLSearchParams, key: string): string { return params.get(key) ?? ""; }
function getInitialValues(params: URLSearchParams, key: string): string[] { return params.getAll(key); }
function formatNumber(value: number): string { return value.toLocaleString("de-DE"); }
function summaryLabel(values: string[], allLabel: string, locale: Locale): string {
  if (values.length === 0) return allLabel;
  if (values.length === 1) return optionLabels[locale][values[0]] || values[0];
  return `${values.length} ${labels[locale].selected}`;
}

function MultiSelectDropdown({ title, name, options, selected, emptyLabel, locale }: { title: string; name: string; options: SelectOption[]; selected: string[]; emptyLabel: string; locale: Locale; }) {
  const realOptions = options.filter((option) => option.value).map((option) => localizeOption(option, locale));
  const [values, setValues] = useState<string[]>(selected);
  const selectedSet = useMemo(() => new Set(values), [values]);
  function toggle(value: string, checked: boolean) { setValues((current) => (checked ? [...current, value] : current.filter((item) => item !== value))); }
  return (
    <details className="multi-filter-v60">
      <summary><span>{title}</span><b>{summaryLabel(values, emptyLabel, locale)}</b></summary>
      <div className="multi-filter-panel-v60">
        {realOptions.map((option) => (
          <label key={option.value} className={selectedSet.has(option.value) ? "multi-option-v60 is-selected" : "multi-option-v60"}>
            <input name={name} type="checkbox" value={option.value} checked={selectedSet.has(option.value)} onChange={(event) => toggle(option.value, event.target.checked)} />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </details>
  );
}

function StateMultiSelect({ states, selected, locale }: { states: string[]; selected: string[]; locale: Locale }) {
  const [values, setValues] = useState<string[]>(selected);
  const selectedSet = useMemo(() => new Set(values), [values]);
  function toggle(value: string, checked: boolean) { setValues((current) => (checked ? [...current, value] : current.filter((item) => item !== value))); }
  return (
    <details className="multi-filter-v60">
      <summary><span>{labels[locale].state}</span><b>{summaryLabel(values, labels[locale].allStates, locale)}</b></summary>
      <div className="multi-filter-panel-v60">
        {states.map((state) => (
          <label key={state} className={selectedSet.has(state) ? "multi-option-v60 is-selected" : "multi-option-v60"}>
            <input name="state" type="checkbox" value={state} checked={selectedSet.has(state)} onChange={(event) => toggle(state, event.target.checked)} />
            <span>{state}</span>
          </label>
        ))}
      </div>
    </details>
  );
}

function CityMultiSelect({ cities, selected, locale }: { cities: string[]; selected: string[]; locale: Locale }) {
  const [values, setValues] = useState<string[]>(selected);
  const selectedSet = useMemo(() => new Set(values), [values]);
  function toggle(value: string, checked: boolean) { setValues((current) => (checked ? [...current, value] : current.filter((item) => item !== value))); }
  return (
    <details className="multi-filter-v60">
      <summary><span>{labels[locale].city}</span><b>{values.length === 0 ? labels[locale].allCities : values.length === 1 ? values[0] : `${values.length} ${labels[locale].selected}`}</b></summary>
      <div className="multi-filter-panel-v60 multi-filter-panel-scroll-v60">
        {cities.map((city) => (
          <label key={city} className={selectedSet.has(city) ? "multi-option-v60 is-selected" : "multi-option-v60"}>
            <input name="city" type="checkbox" value={city} checked={selectedSet.has(city)} onChange={(event) => toggle(city, event.target.checked)} />
            <span>{city}</span>
          </label>
        ))}
      </div>
    </details>
  );
}

function RangeTrack({ children, start, end, single = false }: { children: React.ReactNode; start: number; end: number; single?: boolean }) {
  return <div className={single ? "range-track-v60 range-track-single-v60" : "range-track-v60"} style={{ ["--range-start" as string]: `${start}%`, ["--range-end" as string]: `${end}%` }}>{children}</div>;
}

function DualRange({ label, minName, maxName, max, step, minDefault, maxDefault, suffix = "", locale }: { label: string; minName: string; maxName: string; max: number; step: number; minDefault: string; maxDefault: string; suffix?: string; locale: Locale; }) {
  const initialMin = Number(minDefault || "0");
  const initialMax = Number(maxDefault || String(max));
  const [minValue, setMinValue] = useState(Number.isFinite(initialMin) ? Math.max(0, Math.min(initialMin, max)) : 0);
  const [maxValue, setMaxValue] = useState(Number.isFinite(initialMax) ? Math.max(0, Math.min(initialMax, max)) : max);
  const safeMin = Math.min(minValue, maxValue);
  const safeMax = Math.max(minValue, maxValue);
  const minPercent = (safeMin / max) * 100;
  const maxPercent = (safeMax / max) * 100;
  const isDefault = safeMin === 0 && safeMax === max;
  const display = isDefault ? labels[locale].any : `${formatNumber(safeMin)}${suffix} — ${formatNumber(safeMax)}${suffix}`;
  return (
    <div className="range-filter-v60">
      <div className="range-title-v60"><span>{label}</span><b>{display}</b></div>
      <RangeTrack start={minPercent} end={maxPercent}>
        <input type="range" min="0" max={max} step={step} value={safeMin} onChange={(event) => setMinValue(Math.min(Number(event.target.value), safeMax))} aria-label={`${label} min`} />
        <input type="range" min="0" max={max} step={step} value={safeMax} onChange={(event) => setMaxValue(Math.max(Number(event.target.value), safeMin))} aria-label={`${label} max`} />
      </RangeTrack>
      <div className="range-scale"><span>0{suffix}</span><span>{formatNumber(max)}{suffix}</span></div>
      <input type="hidden" name={minName} value={safeMin > 0 ? String(safeMin) : ""} />
      <input type="hidden" name={maxName} value={safeMax < max ? String(safeMax) : ""} />
    </div>
  );
}

function SingleRange({ label, name, max, step, defaultValue, suffix = "", locale }: { label: string; name: string; max: number; step: number; defaultValue: string; suffix?: string; locale: Locale }) {
  const initial = Number(defaultValue || "0");
  const [value, setValue] = useState(Number.isFinite(initial) ? Math.max(0, Math.min(initial, max)) : 0);
  const percent = (value / max) * 100;
  const display = value > 0 ? `${formatNumber(value)}${suffix}` : labels[locale].noRadius;
  return (
    <div className="range-filter-v60">
      <div className="range-title-v60"><span>{label}</span><b>0–{formatNumber(max)}{suffix}</b></div>
      <RangeTrack start={0} end={percent} single>
        <input type="range" min="0" max={max} step={step} value={value} onChange={(event) => setValue(Math.max(0, Math.min(Number(event.target.value), max)))} aria-label={label} />
      </RangeTrack>
      <div className="range-scale"><span>{display}</span><span>{formatNumber(max)}{suffix}</span></div>
      <input type="hidden" name={name} value={value > 0 ? String(value) : ""} />
    </div>
  );
}

export function FilterBar({ states, courts, cities, compact = false }: FilterBarProps) {
  const locale = useClientLocale();
  const t = labels[locale];
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function buildNextParams(form: HTMLFormElement): URLSearchParams {
    const formData = new FormData(form);
    const next = new URLSearchParams();
    for (const [key, value] of formData.entries()) {
      const text = String(value).trim();
      if (text.length > 0) next.append(key, text);
    }
    next.delete("page");
    return next;
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = buildNextParams(event.currentTarget).toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function clearFilters() { router.push(pathname, { scroll: false }); }

  return (
    <form key={searchParams.toString()} className={compact ? "filters search-filter-v60 filters-compact" : "filters search-filter-v60"} onSubmit={onSubmit}>
      <div className="search-filter-grid-v60">
        <div className="field span-6"><label htmlFor="q">{t.search}</label><input id="q" name="q" placeholder={t.searchPlaceholder} defaultValue={getInitialValue(searchParams, "q")} /></div>
        <StateMultiSelect states={states} selected={getInitialValues(searchParams, "state")} locale={locale} />
        <CityMultiSelect cities={cities} selected={getInitialValues(searchParams, "city")} locale={locale} />

        <div className="field span-3"><label htmlFor="postalCode">{t.postalCode}</label><input id="postalCode" name="postalCode" placeholder={t.postalPlaceholder} defaultValue={getInitialValue(searchParams, "postalCode")} /></div>
        <div className="field span-3"><label htmlFor="court">{t.court}</label><select id="court" name="court" defaultValue={getInitialValue(searchParams, "court")}><option value="">{t.allCourts}</option>{courts.map((court) => <option key={court} value={court}>{court}</option>)}</select></div>
        <MultiSelectDropdown title={t.propertyType} name="typeGroup" options={PROPERTY_GROUP_OPTIONS} selected={getInitialValues(searchParams, "typeGroup")} emptyLabel={t.allTypes} locale={locale} />
        <MultiSelectDropdown title={t.usage} name="occupancy" options={OCCUPANCY_OPTIONS} selected={getInitialValues(searchParams, "occupancy")} emptyLabel={t.anyUsage} locale={locale} />

        <SingleRange label={t.radius} name="radiusKm" max={RADIUS_MAX} step={10} defaultValue={getInitialValue(searchParams, "radiusKm")} suffix=" km" locale={locale} />
        <DualRange label={t.marketValue} minName="minPrice" maxName="maxPrice" max={PRICE_MAX} step={5000} minDefault={getInitialValue(searchParams, "minPrice")} maxDefault={getInitialValue(searchParams, "maxPrice")} suffix=" €" locale={locale} />
        <DualRange label={t.livingArea} minName="minLivingArea" maxName="maxLivingArea" max={AREA_MAX} step={5} minDefault={getInitialValue(searchParams, "minLivingArea")} maxDefault={getInitialValue(searchParams, "maxLivingArea")} suffix=" m²" locale={locale} />
        <DualRange label={t.plotArea} minName="minPlotArea" maxName="maxPlotArea" max={PLOT_MAX} step={50} minDefault={getInitialValue(searchParams, "minPlotArea")} maxDefault={getInitialValue(searchParams, "maxPlotArea")} suffix=" m²" locale={locale} />

        <div className="field span-3"><label htmlFor="dateFrom">{t.dateFrom}</label><input id="dateFrom" name="dateFrom" type="date" defaultValue={getInitialValue(searchParams, "dateFrom")} /></div>
        <div className="field span-3"><label htmlFor="dateTo">{t.dateTo}</label><input id="dateTo" name="dateTo" type="date" defaultValue={getInitialValue(searchParams, "dateTo")} /></div>
        <div className="field span-3"><label htmlFor="status">{t.status}</label><select id="status" name="status" defaultValue={getInitialValue(searchParams, "status")}>{STATUS_OPTIONS.map((option) => { const localized = localizeOption(option, locale); const label = localized.value ? localized.label : t.allCurrent; return <option key={localized.value} value={localized.value}>{label}</option>; })}</select></div>
        <div className="field span-3"><label htmlFor="denkmalschutz">{t.heritage}</label><select id="denkmalschutz" name="denkmalschutz" defaultValue={getInitialValue(searchParams, "denkmalschutz")}>{BOOLEAN_OPTIONS.map((option) => { const localized = localizeOption(option, locale); const label = localized.value ? localized.label : t.any; return <option key={localized.value} value={localized.value}>{label}</option>; })}</select></div>

        <div className="field span-3"><label htmlFor="wertgrenzen">{t.valueLimits}</label><select id="wertgrenzen" name="wertgrenzen" defaultValue={getInitialValue(searchParams, "wertgrenzen")}>{WERTGRENZEN_OPTIONS.map((option) => { const localized = localizeOption(option, locale); const label = localized.value ? localized.label : t.any; return <option key={localized.value} value={localized.value}>{label}</option>; })}</select></div>
        <div className="field span-3"><label htmlFor="auctionAttempt">{t.attempt}</label><select id="auctionAttempt" name="auctionAttempt" defaultValue={getInitialValue(searchParams, "auctionAttempt")}>{AUCTION_ATTEMPT_OPTIONS.map((option) => { const localized = localizeOption(option, locale); const label = localized.value ? localized.label : t.any; return <option key={localized.value} value={localized.value}>{label}</option>; })}</select></div>
        <button type="submit" className="btn btn-primary filter-action-button-v60">{t.submit}</button>
        <button type="button" onClick={clearFilters} className="btn btn-ghost filter-action-button-v60">{t.resetFilters}</button>
      </div>
    </form>
  );
}
