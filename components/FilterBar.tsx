"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AUCTION_ATTEMPT_OPTIONS, BOOLEAN_OPTIONS, OCCUPANCY_OPTIONS, PAGE_SIZE_OPTIONS,
  PROPERTY_GROUP_OPTIONS, SORT_OPTIONS, STATUS_OPTIONS, WERTGRENZEN_OPTIONS, type SelectOption,
} from "@/lib/filter-options";
import { RADIUS_OPTIONS } from "@/lib/geo";

const PRICE_MAX = 600_000;
const AREA_MAX = 500;
const PLOT_MAX = 5000;

type Locale = "de" | "ru" | "en";

type FilterBarProps = {
  states: string[];
  courts: string[];
  cities: string[];
  compact?: boolean;
};

const labels = {
  de: { selected:"ausgewählt", notSet:"nicht gesetzt", from:"von", to:"bis", title:"Erweiterte Suche", subtitle:"Alle Filter auf einer Seite. Der Filterbereich scrollt normal mit der Seite.", reset:"Zurücksetzen", search:"Suche", searchPlaceholder:"Ort, PLZ, Adresse, Aktenzeichen, Gericht", city:"Ort", allCities:"Alle Orte", postalCode:"PLZ", postalPlaceholder:"z. B. 091", radius:"Umkreis", noRadius:"Kein Radius", court:"Amtsgericht", allCourts:"Alle Gerichte", status:"Status", state:"Bundesland", allStates:"Alle Bundesländer", propertyType:"Objektart", allTypes:"Alle Arten", usage:"Nutzung", anyUsage:"Jede Nutzung", marketValue:"Verkehrswert", livingArea:"Wohnfläche", plotArea:"Grundstück", dateFrom:"Termin ab", dateTo:"Termin bis", heritage:"Denkmalschutz", valueLimits:"Wertgrenzen", attempt:"Termin-Nr.", sorting:"Sortierung", perPage:"Anzeigen", submit:"Objekte finden", resetFilters:"Filter zurücksetzen" },
  ru: { selected:"выбрано", notSet:"не задано", from:"от", to:"до", title:"Расширенный поиск", subtitle:"Все фильтры на одной странице. Блок фильтров прокручивается вместе со страницей.", reset:"Сбросить", search:"Поиск", searchPlaceholder:"Город, индекс, адрес, номер дела, суд", city:"Город", allCities:"Все города", postalCode:"Индекс", postalPlaceholder:"например: 091", radius:"Радиус", noRadius:"Без радиуса", court:"Суд", allCourts:"Все суды", status:"Статус", state:"Федеральная земля", allStates:"Все земли", propertyType:"Тип объекта", allTypes:"Все типы", usage:"Использование", anyUsage:"Любое использование", marketValue:"Оценочная стоимость", livingArea:"Жилая площадь", plotArea:"Участок", dateFrom:"Торги от", dateTo:"Торги до", heritage:"Памятник архитектуры", valueLimits:"Ценовые границы", attempt:"№ термина", sorting:"Сортировка", perPage:"Показывать", submit:"Найти объекты", resetFilters:"Сбросить фильтр" },
  en: { selected:"selected", notSet:"not set", from:"from", to:"to", title:"Advanced Search", subtitle:"All filters on one page. The filter area scrolls normally with the page.", reset:"Reset", search:"Search", searchPlaceholder:"City, ZIP, address, case number, court", city:"City", allCities:"All cities", postalCode:"ZIP", postalPlaceholder:"e.g. 091", radius:"Radius", noRadius:"No radius", court:"Court", allCourts:"All courts", status:"Status", state:"Federal state", allStates:"All states", propertyType:"Property type", allTypes:"All types", usage:"Use", anyUsage:"Any use", marketValue:"Market value", livingArea:"Living area", plotArea:"Plot size", dateFrom:"Auction from", dateTo:"Auction to", heritage:"Listed monument", valueLimits:"Value limits", attempt:"Auction no.", sorting:"Sorting", perPage:"Show", submit:"Find properties", resetFilters:"Reset filters" },
} as const;

const optionLabels: Record<Locale, Record<string, string>> = {
  de: { ACTIVE:"Aktiv", CANCELLED:"Aufgehoben", ARCHIVED:"Archiv", SOLD:"Verkauft", WOHNHAEUSER:"Wohnhäuser", WOHNUNGEN:"Wohnungen", GEWERBE:"Gewerbe", GRUNDSTUECKE:"Grundstücke", LAND_WALD:"Land / Wald", GARAGEN:"Garagen / Parken", SONSTIGE:"Sonstige", VACANT:"Frei", RENTED:"Vermietet", OWNER_OCCUPIED:"Eigennutzung", UNKNOWN:"Unbekannt", true:"Ja", false:"Nein", weggefallen:"Weggefallen", nicht_weggefallen:"Nicht weggefallen", auctionDateAsc:"Termin aufsteigend", auctionDateDesc:"Termin absteigend", priceAsc:"Preis aufsteigend", priceDesc:"Preis absteigend" },
  ru: { ACTIVE:"Активно", CANCELLED:"Отменено", ARCHIVED:"Архив", SOLD:"Продано", WOHNHAEUSER:"Жилые дома", WOHNUNGEN:"Квартиры", GEWERBE:"Коммерция", GRUNDSTUECKE:"Участки", LAND_WALD:"Земля / лес", GARAGEN:"Гаражи / парковки", SONSTIGE:"Прочее", VACANT:"Свободен", RENTED:"Сдан в аренду", OWNER_OCCUPIED:"Используется собственником", UNKNOWN:"Неизвестно", true:"Да", false:"Нет", weggefallen:"Сняты", nicht_weggefallen:"Не сняты", auctionDateAsc:"Дата торгов по возрастанию", auctionDateDesc:"Дата торгов по убыванию", priceAsc:"Цена по возрастанию", priceDesc:"Цена по убыванию" },
  en: { ACTIVE:"Active", CANCELLED:"Cancelled", ARCHIVED:"Archive", SOLD:"Sold", WOHNHAEUSER:"Residential houses", WOHNUNGEN:"Apartments", GEWERBE:"Commercial", GRUNDSTUECKE:"Land plots", LAND_WALD:"Land / forest", GARAGEN:"Garages / parking", SONSTIGE:"Other", VACANT:"Vacant", RENTED:"Rented", OWNER_OCCUPIED:"Owner-occupied", UNKNOWN:"Unknown", true:"Yes", false:"No", weggefallen:"Removed", nicht_weggefallen:"Not removed", auctionDateAsc:"Auction date ascending", auctionDateDesc:"Auction date descending", priceAsc:"Price ascending", priceDesc:"Price descending" },
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
    const onFocus = () => setLocale(readLocaleFromCookie());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);
  return locale;
}

function localizeOption(option: SelectOption, locale: Locale): SelectOption {
  if (!option.value) return { ...option, label: option.label || labels[locale].noRadius };
  return { ...option, label: optionLabels[locale][option.value] || option.label };
}

function localizeRadiusOption(option: SelectOption, locale: Locale): SelectOption {
  if (!option.value) return { ...option, label: labels[locale].noRadius };
  if (/^\d+$/.test(option.value)) return { ...option, label: `${option.value} km` };
  return localizeOption(option, locale);
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

function selectedLabel(values: string[], totalLabel: string, locale: Locale): string {
  if (values.length === 0) return totalLabel;
  if (values.length === 1) return optionLabels[locale][values[0]] || values[0];
  return `${values.length} ${labels[locale].selected}`;
}

function MultiCheckboxGroup({ title, name, options, selected, emptyLabel, className = "", locale }: { title: string; name: string; options: SelectOption[]; selected: string[]; emptyLabel: string; className?: string; locale: Locale; }) {
  const realOptions = options.filter((option) => option.value).map((option) => localizeOption(option, locale));
  const [values, setValues] = useState<string[]>(selected);
  const selectedSet = useMemo(() => new Set(values), [values]);
  const summary = values.length === 0 ? emptyLabel : values.length === 1 ? realOptions.find((option) => option.value === values[0])?.label ?? values[0] : `${values.length} ${labels[locale].selected}`;

  function toggle(value: string, checked: boolean) {
    setValues((current) => (checked ? [...current, value] : current.filter((item) => item !== value)));
  }

  return (
    <fieldset className={`advanced-check-group ${className}`}>
      <legend><span>{title}</span><b>{summary}</b></legend>
      <div className="advanced-check-options">
        {realOptions.map((option) => (
          <label key={option.value} className={selectedSet.has(option.value) ? "advanced-check is-selected" : "advanced-check"}>
            <input name={name} type="checkbox" value={option.value} checked={selectedSet.has(option.value)} onChange={(event) => toggle(option.value, event.target.checked)} />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function StateCheckboxGroup({ states, selected, className = "", locale }: { states: string[]; selected: string[]; className?: string; locale: Locale; }) {
  const [values, setValues] = useState<string[]>(selected);
  const selectedSet = useMemo(() => new Set(values), [values]);

  function toggle(value: string, checked: boolean) {
    setValues((current) => (checked ? [...current, value] : current.filter((item) => item !== value)));
  }

  return (
    <fieldset className={`advanced-check-group ${className}`}>
      <legend><span>{labels[locale].state}</span><b>{selectedLabel(values, labels[locale].allStates, locale)}</b></legend>
      <div className="advanced-check-options state-check-options">
        {states.map((state) => (
          <label key={state} className={selectedSet.has(state) ? "advanced-check is-selected" : "advanced-check"}>
            <input name="state" type="checkbox" value={state} checked={selectedSet.has(state)} onChange={(event) => toggle(state, event.target.checked)} />
            <span>{state}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
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
  const display = isDefault ? labels[locale].notSet : `${formatNumber(safeMin)}${suffix} — ${formatNumber(safeMax)}${suffix}`;

  return (
    <div className="advanced-range-card">
      <div className="range-title"><span>{label}</span><b>{display}</b></div>
      <div className="dual-range" style={{ ["--range-start" as string]: `${minPercent}%`, ["--range-end" as string]: `${maxPercent}%` }}>
        <input type="range" min="0" max={max} step={step} value={safeMin} onChange={(event) => setMinValue(Math.min(Number(event.target.value), safeMax))} aria-label={`${label} ${labels[locale].from}`} />
        <input type="range" min="0" max={max} step={step} value={safeMax} onChange={(event) => setMaxValue(Math.max(Number(event.target.value), safeMin))} aria-label={`${label} ${labels[locale].to}`} />
      </div>
      <div className="range-scale"><span>0{suffix}</span><span>{formatNumber(max)}{suffix}</span></div>
      <input type="hidden" name={minName} value={safeMin > 0 ? String(safeMin) : ""} />
      <input type="hidden" name={maxName} value={safeMax < max ? String(safeMax) : ""} />
    </div>
  );
}

export function FilterBar({ states, courts, cities, compact = false }: FilterBarProps) {
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
    next.delete("page");
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function clearFilters() {
    router.push(pathname);
  }

  return (
    <form className={compact ? "filters advanced-filters filters-compact" : "filters advanced-filters"} onSubmit={onSubmit}>
      <div className="filter-topline clean-filter-head">
        <div><h2>{t.title}</h2><p>{t.subtitle}</p></div>
        <button type="button" onClick={clearFilters} className="btn btn-ghost">{t.reset}</button>
      </div>
      <div className="advanced-filter-grid">
        <div className="field span-6"><label htmlFor="q">{t.search}</label><input id="q" name="q" placeholder={t.searchPlaceholder} defaultValue={getInitialValue(searchParams, "q")} /></div>
        <div className="field span-3"><label htmlFor="city">{t.city}</label><select id="city" name="city" defaultValue={getInitialValue(searchParams, "city")}><option value="">{t.allCities}</option>{cities.map((city) => <option key={city} value={city}>{city}</option>)}</select></div>
        <div className="field span-3"><label htmlFor="postalCode">{t.postalCode}</label><input id="postalCode" name="postalCode" placeholder={t.postalPlaceholder} defaultValue={getInitialValue(searchParams, "postalCode")} /></div>
        <div className="field span-3"><label htmlFor="radiusKm">{t.radius}</label><select id="radiusKm" name="radiusKm" defaultValue={getInitialValue(searchParams, "radiusKm")}>{RADIUS_OPTIONS.map((option) => { const localized = localizeRadiusOption(option, locale); return <option key={localized.value} value={localized.value}>{localized.label}</option>; })}</select></div>
        <div className="field span-5"><label htmlFor="court">{t.court}</label><select id="court" name="court" defaultValue={getInitialValue(searchParams, "court")}><option value="">{t.allCourts}</option>{courts.map((court) => <option key={court} value={court}>{court}</option>)}</select></div>
        <div className="field span-4"><label htmlFor="status">{t.status}</label><select id="status" name="status" defaultValue={getInitialValue(searchParams, "status")}>{STATUS_OPTIONS.map((option) => { const localized = localizeOption(option, locale); return <option key={localized.value} value={localized.value}>{localized.label}</option>; })}</select></div>
        <StateCheckboxGroup states={states} selected={getInitialValues(searchParams, "state")} className="span-12" locale={locale} />
        <MultiCheckboxGroup title={t.propertyType} name="typeGroup" options={PROPERTY_GROUP_OPTIONS} selected={getInitialValues(searchParams, "typeGroup")} emptyLabel={t.allTypes} className="span-12" locale={locale} />
        <MultiCheckboxGroup title={t.usage} name="occupancy" options={OCCUPANCY_OPTIONS} selected={getInitialValues(searchParams, "occupancy")} emptyLabel={t.anyUsage} className="span-12" locale={locale} />
        <div className="range-row span-12">
          <DualRange label={t.marketValue} minName="minPrice" maxName="maxPrice" max={PRICE_MAX} step={5000} minDefault={getInitialValue(searchParams, "minPrice")} maxDefault={getInitialValue(searchParams, "maxPrice")} suffix=" €" locale={locale} />
          <DualRange label={t.livingArea} minName="minLivingArea" maxName="maxLivingArea" max={AREA_MAX} step={5} minDefault={getInitialValue(searchParams, "minLivingArea")} maxDefault={getInitialValue(searchParams, "maxLivingArea")} suffix=" m²" locale={locale} />
          <DualRange label={t.plotArea} minName="minPlotArea" maxName="maxPlotArea" max={PLOT_MAX} step={50} minDefault={getInitialValue(searchParams, "minPlotArea")} maxDefault={getInitialValue(searchParams, "maxPlotArea")} suffix=" m²" locale={locale} />
        </div>
        <div className="field span-3"><label htmlFor="dateFrom">{t.dateFrom}</label><input id="dateFrom" name="dateFrom" type="date" defaultValue={getInitialValue(searchParams, "dateFrom")} /></div>
        <div className="field span-3"><label htmlFor="dateTo">{t.dateTo}</label><input id="dateTo" name="dateTo" type="date" defaultValue={getInitialValue(searchParams, "dateTo")} /></div>
        <div className="field span-3"><label htmlFor="denkmalschutz">{t.heritage}</label><select id="denkmalschutz" name="denkmalschutz" defaultValue={getInitialValue(searchParams, "denkmalschutz")}>{BOOLEAN_OPTIONS.map((option) => { const localized = localizeOption(option, locale); return <option key={localized.value} value={localized.value}>{localized.label}</option>; })}</select></div>
        <div className="field span-3"><label htmlFor="wertgrenzen">{t.valueLimits}</label><select id="wertgrenzen" name="wertgrenzen" defaultValue={getInitialValue(searchParams, "wertgrenzen")}>{WERTGRENZEN_OPTIONS.map((option) => { const localized = localizeOption(option, locale); return <option key={localized.value} value={localized.value}>{localized.label}</option>; })}</select></div>
        <div className="field span-3"><label htmlFor="auctionAttempt">{t.attempt}</label><select id="auctionAttempt" name="auctionAttempt" defaultValue={getInitialValue(searchParams, "auctionAttempt")}>{AUCTION_ATTEMPT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
        <div className="field span-3"><label htmlFor="sort">{t.sorting}</label><select id="sort" name="sort" defaultValue={getInitialValue(searchParams, "sort") || "auctionDateAsc"}>{SORT_OPTIONS.map((option) => { const localized = localizeOption(option, locale); return <option key={localized.value} value={localized.value}>{localized.label}</option>; })}</select></div>
        <div className="field span-3"><label htmlFor="perPage">{t.perPage}</label><select id="perPage" name="perPage" defaultValue={getInitialValue(searchParams, "perPage") || "20"}>{PAGE_SIZE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
      </div>
      <div className="filter-actions"><button type="submit" className="btn btn-primary">{t.submit}</button><button type="button" onClick={clearFilters} className="btn">{t.resetFilters}</button></div>
    </form>
  );
}
