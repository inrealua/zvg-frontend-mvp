"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  AUCTION_ATTEMPT_OPTIONS,
  BOOLEAN_OPTIONS,
  OCCUPANCY_OPTIONS,
  PAGE_SIZE_OPTIONS,
  PROPERTY_GROUP_OPTIONS,
  SORT_OPTIONS,
  STATUS_OPTIONS,
  WERTGRENZEN_OPTIONS,
  type SelectOption
} from "@/lib/filter-options";
import { RADIUS_OPTIONS } from "@/lib/geo";

const PRICE_MAX = 600_000;
const AREA_MAX = 500;
const PLOT_MAX = 5000;

type FilterBarProps = {
  states: string[];
  courts: string[];
  cities: string[];
  compact?: boolean;
};

function getInitialValue(params: URLSearchParams, key: string): string {
  return params.get(key) ?? "";
}

function getInitialValues(params: URLSearchParams, key: string): string[] {
  return params.getAll(key);
}

function MultiCheckboxGroup({ title, name, options, selected }: { title: string; name: string; options: SelectOption[]; selected: string[] }) {
  const values = new Set(selected);
  const realOptions = options.filter((option) => option.value);

  return (
    <fieldset className="field multi-field">
      <legend>{title}</legend>
      <div className="multi-options">
        {realOptions.map((option) => (
          <label key={option.value} className="multi-option">
            <input name={name} type="checkbox" value={option.value} defaultChecked={values.has(option.value)} />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function StateCheckboxGroup({ states, selected }: { states: string[]; selected: string[] }) {
  const values = new Set(selected);

  return (
    <fieldset className="field multi-field field-wide">
      <legend>Bundesland</legend>
      <div className="multi-options compact-options">
        {states.map((state) => (
          <label key={state} className="multi-option">
            <input name="state" type="checkbox" value={state} defaultChecked={values.has(state)} />
            <span>{state}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function RangeInput({ label, name, max, step, defaultValue, suffix = "" }: { label: string; name: string; max: number; step: number; defaultValue: string; suffix?: string }) {
  const [value, setValue] = useState(defaultValue || "");
  const display = value ? `${Number(value).toLocaleString("de-DE")}${suffix}` : "не задано";

  return (
    <div className="field range-field">
      <label htmlFor={name}>{label}: <b>{display}</b></label>
      <input
        id={name}
        type="range"
        min="0"
        max={max}
        step={step}
        value={value || "0"}
        onChange={(event) => setValue(event.target.value === "0" ? "" : event.target.value)}
      />
      <input type="hidden" name={name} value={value} />
    </div>
  );
}

export function FilterBar({ states, courts, cities, compact = false }: FilterBarProps) {
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
    <form className={compact ? "filters filters-compact" : "filters"} onSubmit={onSubmit}>
      <div className="filter-topline">
        <div>
          <h2>Фильтр объектов</h2>
          <p>Радиус теперь строится от выбранного города или PLZ. Отдельное поле Ort/PLZ für Radius убрано.</p>
        </div>
        <button type="button" onClick={clearFilters} className="btn btn-ghost">Сбросить</button>
      </div>

      <div className="filters-grid">
        <div className="field field-wide">
          <label htmlFor="q">Поиск</label>
          <input id="q" name="q" placeholder="Адрес, город, Aktenzeichen, суд" defaultValue={getInitialValue(searchParams, "q")} />
        </div>

        <StateCheckboxGroup states={states} selected={getInitialValues(searchParams, "state")} />

        <div className="field">
          <label htmlFor="city">Город</label>
          <select id="city" name="city" defaultValue={getInitialValue(searchParams, "city")}>
            <option value="">Все города</option>
            {cities.map((city) => <option key={city} value={city}>{city}</option>)}
          </select>
        </div>

        <div className="field">
          <label htmlFor="postalCode">PLZ</label>
          <input id="postalCode" name="postalCode" placeholder="например 091" defaultValue={getInitialValue(searchParams, "postalCode")} />
        </div>

        <div className="field">
          <label htmlFor="radiusKm">Umkreis от города/PLZ</label>
          <select id="radiusKm" name="radiusKm" defaultValue={getInitialValue(searchParams, "radiusKm")}>
            {RADIUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>

        <div className="field field-wide">
          <label htmlFor="court">Amtsgericht</label>
          <select id="court" name="court" defaultValue={getInitialValue(searchParams, "court")}>
            <option value="">Все суды</option>
            {courts.map((court) => <option key={court} value={court}>{court}</option>)}
          </select>
        </div>

        <MultiCheckboxGroup title="Тип объекта" name="typeGroup" options={PROPERTY_GROUP_OPTIONS} selected={getInitialValues(searchParams, "typeGroup")} />
        <MultiCheckboxGroup title="Использование" name="occupancy" options={OCCUPANCY_OPTIONS} selected={getInitialValues(searchParams, "occupancy")} />

        <div className="field">
          <label htmlFor="status">Статус</label>
          <select id="status" name="status" defaultValue={getInitialValue(searchParams, "status")}>
            {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>

        <RangeInput label="Цена от" name="minPrice" max={PRICE_MAX} step={5000} defaultValue={getInitialValue(searchParams, "minPrice")} suffix=" €" />
        <RangeInput label="Цена до" name="maxPrice" max={PRICE_MAX} step={5000} defaultValue={getInitialValue(searchParams, "maxPrice")} suffix=" €" />
        <RangeInput label="Wohnfläche от" name="minLivingArea" max={AREA_MAX} step={5} defaultValue={getInitialValue(searchParams, "minLivingArea")} suffix=" m²" />
        <RangeInput label="Wohnfläche до" name="maxLivingArea" max={AREA_MAX} step={5} defaultValue={getInitialValue(searchParams, "maxLivingArea")} suffix=" m²" />
        <RangeInput label="Grundstück от" name="minPlotArea" max={PLOT_MAX} step={50} defaultValue={getInitialValue(searchParams, "minPlotArea")} suffix=" m²" />
        <RangeInput label="Grundstück до" name="maxPlotArea" max={PLOT_MAX} step={50} defaultValue={getInitialValue(searchParams, "maxPlotArea")} suffix=" m²" />

        <div className="field">
          <label htmlFor="dateFrom">Торги от</label>
          <input id="dateFrom" name="dateFrom" type="date" defaultValue={getInitialValue(searchParams, "dateFrom")} />
        </div>

        <div className="field">
          <label htmlFor="dateTo">Торги до</label>
          <input id="dateTo" name="dateTo" type="date" defaultValue={getInitialValue(searchParams, "dateTo")} />
        </div>

        <div className="field">
          <label htmlFor="denkmalschutz">Denkmalschutz</label>
          <select id="denkmalschutz" name="denkmalschutz" defaultValue={getInitialValue(searchParams, "denkmalschutz")}>
            {BOOLEAN_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>

        <div className="field">
          <label htmlFor="wertgrenzen">Wertgrenzen</label>
          <select id="wertgrenzen" name="wertgrenzen" defaultValue={getInitialValue(searchParams, "wertgrenzen")}>
            {WERTGRENZEN_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>

        <div className="field">
          <label htmlFor="auctionAttempt">Количество терминов</label>
          <select id="auctionAttempt" name="auctionAttempt" defaultValue={getInitialValue(searchParams, "auctionAttempt")}>
            {AUCTION_ATTEMPT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>

        <div className="field">
          <label htmlFor="sort">Сортировка</label>
          <select id="sort" name="sort" defaultValue={getInitialValue(searchParams, "sort") || "auctionDateAsc"}>
            {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>

        <div className="field">
          <label htmlFor="perPage">Показывать</label>
          <select id="perPage" name="perPage" defaultValue={getInitialValue(searchParams, "perPage") || "20"}>
            {PAGE_SIZE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
      </div>

      <div className="filter-actions">
        <button type="submit" className="btn btn-primary">Показать объекты</button>
        <button type="button" onClick={clearFilters} className="btn">Очистить фильтры</button>
      </div>
    </form>
  );
}
