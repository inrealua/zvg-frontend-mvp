"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
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

function formatNumber(value: number): string {
  return value.toLocaleString("de-DE");
}

function buildSummary(selected: string[], options: SelectOption[], emptyLabel: string): string {
  if (selected.length === 0) return emptyLabel;
  const labels = selected.map((value) => options.find((option) => option.value === value)?.label ?? value);
  if (labels.length === 1) return labels[0];
  return `Выбрано: ${labels.length}`;
}

function buildStateSummary(selected: string[]): string {
  if (selected.length === 0) return "Все земли";
  if (selected.length === 1) return selected[0];
  return `Выбрано: ${selected.length}`;
}

function MultiSelectDropdown({
  title,
  name,
  options,
  selected,
  emptyLabel
}: {
  title: string;
  name: string;
  options: SelectOption[];
  selected: string[];
  emptyLabel: string;
}) {
  const realOptions = options.filter((option) => option.value);
  const [values, setValues] = useState<string[]>(selected);
  const selectedSet = useMemo(() => new Set(values), [values]);
  const summary = buildSummary(values, realOptions, emptyLabel);

  function toggle(value: string, checked: boolean) {
    setValues((current) => checked ? [...current, value] : current.filter((item) => item !== value));
  }

  return (
    <details className="field dropdown-multi">
      <summary>
        <span>
          <small>{title}</small>
          <b>{summary}</b>
        </span>
        {values.length > 0 ? <em className="multi-count">{values.length}</em> : null}
      </summary>
      <div className="dropdown-panel">
        <div className="dropdown-panel-head">
          <b>{title}</b>
          <span>{values.length > 0 ? `Выбрано: ${values.length}` : "Можно выбрать несколько"}</span>
        </div>
        <div className="dropdown-options">
          {realOptions.map((option) => (
            <label key={option.value} className="check-card">
              <input
                name={name}
                type="checkbox"
                value={option.value}
                checked={selectedSet.has(option.value)}
                onChange={(event) => toggle(option.value, event.target.checked)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </div>
    </details>
  );
}

function StateMultiSelect({ states, selected }: { states: string[]; selected: string[] }) {
  const [values, setValues] = useState<string[]>(selected);
  const selectedSet = useMemo(() => new Set(values), [values]);

  function toggle(value: string, checked: boolean) {
    setValues((current) => checked ? [...current, value] : current.filter((item) => item !== value));
  }

  return (
    <details className="field dropdown-multi">
      <summary>
        <span>
          <small>Bundesland</small>
          <b>{buildStateSummary(values)}</b>
        </span>
        {values.length > 0 ? <em className="multi-count">{values.length}</em> : null}
      </summary>
      <div className="dropdown-panel dropdown-panel-wide">
        <div className="dropdown-panel-head">
          <b>Bundesland</b>
          <span>{values.length > 0 ? `Выбрано: ${values.length}` : "Можно выбрать несколько земель"}</span>
        </div>
        <div className="dropdown-options state-options">
          {states.map((state) => (
            <label key={state} className="check-card">
              <input
                name="state"
                type="checkbox"
                value={state}
                checked={selectedSet.has(state)}
                onChange={(event) => toggle(state, event.target.checked)}
              />
              <span>{state}</span>
            </label>
          ))}
        </div>
      </div>
    </details>
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
  suffix = ""
}: {
  label: string;
  minName: string;
  maxName: string;
  max: number;
  step: number;
  minDefault: string;
  maxDefault: string;
  suffix?: string;
}) {
  const initialMin = Number(minDefault || "0");
  const initialMax = Number(maxDefault || String(max));
  const [minValue, setMinValue] = useState(Number.isFinite(initialMin) ? Math.max(0, Math.min(initialMin, max)) : 0);
  const [maxValue, setMaxValue] = useState(Number.isFinite(initialMax) ? Math.max(0, Math.min(initialMax, max)) : max);

  const safeMin = Math.min(minValue, maxValue);
  const safeMax = Math.max(minValue, maxValue);
  const minPercent = (safeMin / max) * 100;
  const maxPercent = (safeMax / max) * 100;
  const isDefault = safeMin === 0 && safeMax === max;

  const display = isDefault
    ? "не задано"
    : `${formatNumber(safeMin)}${suffix} — ${formatNumber(safeMax)}${suffix}`;

  return (
    <div className="field dual-range-field">
      <div className="range-title">
        <span>{label}</span>
        <b>{display}</b>
      </div>

      <div
        className="dual-range"
        style={{
          ["--range-start" as string]: `${minPercent}%`,
          ["--range-end" as string]: `${maxPercent}%`
        }}
      >
        <input
          type="range"
          min="0"
          max={max}
          step={step}
          value={safeMin}
          onChange={(event) => setMinValue(Math.min(Number(event.target.value), safeMax))}
          aria-label={`${label} от`}
        />
        <input
          type="range"
          min="0"
          max={max}
          step={step}
          value={safeMax}
          onChange={(event) => setMaxValue(Math.max(Number(event.target.value), safeMin))}
          aria-label={`${label} до`}
        />
      </div>

      <div className="range-scale">
        <span>0{suffix}</span>
        <span>{formatNumber(max)}{suffix}</span>
      </div>

      <input type="hidden" name={minName} value={safeMin > 0 ? String(safeMin) : ""} />
      <input type="hidden" name={maxName} value={safeMax < max ? String(safeMax) : ""} />
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
    <form className={compact ? "filters filters-compact filters-redesigned" : "filters filters-redesigned"} onSubmit={onSubmit}>
      <div className="filter-topline clean-filter-head">
        <div>
          <h2>Immobilien suchen</h2>
          <p>Filtern Sie nach Ort, Bundesland, Objektart, Termin und Verkehrswert.</p>
        </div>
        <button type="button" onClick={clearFilters} className="btn btn-ghost">Zurücksetzen</button>
      </div>

      <div className="filters-grid filters-grid-redesigned">
        <div className="field field-search">
          <label htmlFor="q">Suche</label>
          <input id="q" name="q" placeholder="Ort, PLZ, Adresse, Aktenzeichen, Gericht" defaultValue={getInitialValue(searchParams, "q")} />
        </div>

        <StateMultiSelect states={states} selected={getInitialValues(searchParams, "state")} />

        <div className="field">
          <label htmlFor="city">Ort</label>
          <select id="city" name="city" defaultValue={getInitialValue(searchParams, "city")}>
            <option value="">Alle Orte</option>
            {cities.map((city) => <option key={city} value={city}>{city}</option>)}
          </select>
        </div>

        <div className="field">
          <label htmlFor="postalCode">PLZ</label>
          <input id="postalCode" name="postalCode" placeholder="например 091" defaultValue={getInitialValue(searchParams, "postalCode")} />
        </div>

        <div className="field">
          <label htmlFor="radiusKm">Umkreis</label>
          <select id="radiusKm" name="radiusKm" defaultValue={getInitialValue(searchParams, "radiusKm")}>
            {RADIUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>

        <div className="field field-court">
          <label htmlFor="court">Gericht</label>
          <select id="court" name="court" defaultValue={getInitialValue(searchParams, "court")}>
            <option value="">Alle Gerichte</option>
            {courts.map((court) => <option key={court} value={court}>{court}</option>)}
          </select>
        </div>

        <MultiSelectDropdown title="Тип объекта" name="typeGroup" options={PROPERTY_GROUP_OPTIONS} selected={getInitialValues(searchParams, "typeGroup")} emptyLabel="Alle Arten" />
        <MultiSelectDropdown title="Использование" name="occupancy" options={OCCUPANCY_OPTIONS} selected={getInitialValues(searchParams, "occupancy")} emptyLabel="Alle Nutzungen" />

        <div className="field">
          <label htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={getInitialValue(searchParams, "status")}>
            {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>

        <DualRange label="Цена" minName="minPrice" maxName="maxPrice" max={PRICE_MAX} step={5000} minDefault={getInitialValue(searchParams, "minPrice")} maxDefault={getInitialValue(searchParams, "maxPrice")} suffix=" €" />
        <DualRange label="Wohnfläche" minName="minLivingArea" maxName="maxLivingArea" max={AREA_MAX} step={5} minDefault={getInitialValue(searchParams, "minLivingArea")} maxDefault={getInitialValue(searchParams, "maxLivingArea")} suffix=" m²" />
        <DualRange label="Grundstück" minName="minPlotArea" maxName="maxPlotArea" max={PLOT_MAX} step={50} minDefault={getInitialValue(searchParams, "minPlotArea")} maxDefault={getInitialValue(searchParams, "maxPlotArea")} suffix=" m²" />

        <div className="field">
          <label htmlFor="dateFrom">Termin ab</label>
          <input id="dateFrom" name="dateFrom" type="date" defaultValue={getInitialValue(searchParams, "dateFrom")} />
        </div>

        <div className="field">
          <label htmlFor="dateTo">Termin bis</label>
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
          <label htmlFor="auctionAttempt">Termin-Nr.</label>
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
          <label htmlFor="perPage">Anzeigen</label>
          <select id="perPage" name="perPage" defaultValue={getInitialValue(searchParams, "perPage") || "20"}>
            {PAGE_SIZE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
      </div>

      <div className="filter-actions">
        <button type="submit" className="btn btn-primary">Immobilien finden</button>
        <button type="button" onClick={clearFilters} className="btn">Filter zurücksetzen</button>
      </div>
    </form>
  );
}
