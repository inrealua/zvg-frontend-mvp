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

function selectedLabel(values: string[], totalLabel: string): string {
  if (values.length === 0) return totalLabel;
  if (values.length === 1) return values[0];
  return `${values.length} ausgewählt`;
}

function MultiCheckboxGroup({
  title,
  name,
  options,
  selected,
  emptyLabel,
  className = ""
}: {
  title: string;
  name: string;
  options: SelectOption[];
  selected: string[];
  emptyLabel: string;
  className?: string;
}) {
  const realOptions = options.filter((option) => option.value);
  const [values, setValues] = useState<string[]>(selected);
  const selectedSet = useMemo(() => new Set(values), [values]);
  const summary = values.length === 0
    ? emptyLabel
    : values.length === 1
      ? realOptions.find((option) => option.value === values[0])?.label ?? values[0]
      : `${values.length} ausgewählt`;

  function toggle(value: string, checked: boolean) {
    setValues((current) => checked ? [...current, value] : current.filter((item) => item !== value));
  }

  return (
    <fieldset className={`advanced-check-group ${className}`}>
      <legend>
        <span>{title}</span>
        <b>{summary}</b>
      </legend>
      <div className="advanced-check-options">
        {realOptions.map((option) => (
          <label key={option.value} className={selectedSet.has(option.value) ? "advanced-check is-selected" : "advanced-check"}>
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
    </fieldset>
  );
}

function StateCheckboxGroup({ states, selected, className = "" }: { states: string[]; selected: string[]; className?: string }) {
  const [values, setValues] = useState<string[]>(selected);
  const selectedSet = useMemo(() => new Set(values), [values]);

  function toggle(value: string, checked: boolean) {
    setValues((current) => checked ? [...current, value] : current.filter((item) => item !== value));
  }

  return (
    <fieldset className={`advanced-check-group ${className}`}>
      <legend>
        <span>Bundesland</span>
        <b>{selectedLabel(values, "Alle Bundesländer")}</b>
      </legend>
      <div className="advanced-check-options state-check-options">
        {states.map((state) => (
          <label key={state} className={selectedSet.has(state) ? "advanced-check is-selected" : "advanced-check"}>
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
    </fieldset>
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
    ? "nicht gesetzt"
    : `${formatNumber(safeMin)}${suffix} — ${formatNumber(safeMax)}${suffix}`;

  return (
    <div className="advanced-range-card">
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
          aria-label={`${label} von`}
        />
        <input
          type="range"
          min="0"
          max={max}
          step={step}
          value={safeMax}
          onChange={(event) => setMaxValue(Math.max(Number(event.target.value), safeMin))}
          aria-label={`${label} bis`}
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
    <form className={compact ? "filters advanced-filters filters-compact" : "filters advanced-filters"} onSubmit={onSubmit}>
      <div className="filter-topline clean-filter-head">
        <div>
          <h2>Erweiterte Suche</h2>
          <p>Alle Filter auf einer Seite. Der Filterbereich scrollt normal mit der Seite.</p>
        </div>
        <button type="button" onClick={clearFilters} className="btn btn-ghost">Zurücksetzen</button>
      </div>

      <div className="advanced-filter-grid">
        <div className="field span-6">
          <label htmlFor="q">Suche</label>
          <input id="q" name="q" placeholder="Ort, PLZ, Adresse, Aktenzeichen, Gericht" defaultValue={getInitialValue(searchParams, "q")} />
        </div>

        <div className="field span-3">
          <label htmlFor="city">Ort</label>
          <select id="city" name="city" defaultValue={getInitialValue(searchParams, "city")}>
            <option value="">Alle Orte</option>
            {cities.map((city) => <option key={city} value={city}>{city}</option>)}
          </select>
        </div>

        <div className="field span-3">
          <label htmlFor="postalCode">PLZ</label>
          <input id="postalCode" name="postalCode" placeholder="z. B. 091" defaultValue={getInitialValue(searchParams, "postalCode")} />
        </div>

        <div className="field span-3">
          <label htmlFor="radiusKm">Umkreis</label>
          <select id="radiusKm" name="radiusKm" defaultValue={getInitialValue(searchParams, "radiusKm")}>
            {RADIUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>

        <div className="field span-5">
          <label htmlFor="court">Amtsgericht</label>
          <select id="court" name="court" defaultValue={getInitialValue(searchParams, "court")}>
            <option value="">Alle Gerichte</option>
            {courts.map((court) => <option key={court} value={court}>{court}</option>)}
          </select>
        </div>

        <div className="field span-4">
          <label htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={getInitialValue(searchParams, "status")}>
            {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>

        <StateCheckboxGroup states={states} selected={getInitialValues(searchParams, "state")} className="span-12" />
        <MultiCheckboxGroup title="Objektart" name="typeGroup" options={PROPERTY_GROUP_OPTIONS} selected={getInitialValues(searchParams, "typeGroup")} emptyLabel="Alle Arten" className="span-12" />
        <MultiCheckboxGroup title="Nutzung" name="occupancy" options={OCCUPANCY_OPTIONS} selected={getInitialValues(searchParams, "occupancy")} emptyLabel="Jede Nutzung" className="span-12" />

        <div className="range-row span-12">
          <DualRange label="Verkehrswert" minName="minPrice" maxName="maxPrice" max={PRICE_MAX} step={5000} minDefault={getInitialValue(searchParams, "minPrice")} maxDefault={getInitialValue(searchParams, "maxPrice")} suffix=" €" />
          <DualRange label="Wohnfläche" minName="minLivingArea" maxName="maxLivingArea" max={AREA_MAX} step={5} minDefault={getInitialValue(searchParams, "minLivingArea")} maxDefault={getInitialValue(searchParams, "maxLivingArea")} suffix=" m²" />
          <DualRange label="Grundstück" minName="minPlotArea" maxName="maxPlotArea" max={PLOT_MAX} step={50} minDefault={getInitialValue(searchParams, "minPlotArea")} maxDefault={getInitialValue(searchParams, "maxPlotArea")} suffix=" m²" />
        </div>

        <div className="field span-3">
          <label htmlFor="dateFrom">Termin ab</label>
          <input id="dateFrom" name="dateFrom" type="date" defaultValue={getInitialValue(searchParams, "dateFrom")} />
        </div>

        <div className="field span-3">
          <label htmlFor="dateTo">Termin bis</label>
          <input id="dateTo" name="dateTo" type="date" defaultValue={getInitialValue(searchParams, "dateTo")} />
        </div>

        <div className="field span-3">
          <label htmlFor="denkmalschutz">Denkmalschutz</label>
          <select id="denkmalschutz" name="denkmalschutz" defaultValue={getInitialValue(searchParams, "denkmalschutz")}>
            {BOOLEAN_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>

        <div className="field span-3">
          <label htmlFor="wertgrenzen">Wertgrenzen</label>
          <select id="wertgrenzen" name="wertgrenzen" defaultValue={getInitialValue(searchParams, "wertgrenzen")}>
            {WERTGRENZEN_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>

        <div className="field span-3">
          <label htmlFor="auctionAttempt">Termin-Nr.</label>
          <select id="auctionAttempt" name="auctionAttempt" defaultValue={getInitialValue(searchParams, "auctionAttempt")}>
            {AUCTION_ATTEMPT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>

        <div className="field span-3">
          <label htmlFor="sort">Sortierung</label>
          <select id="sort" name="sort" defaultValue={getInitialValue(searchParams, "sort") || "auctionDateAsc"}>
            {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>

        <div className="field span-3">
          <label htmlFor="perPage">Anzeigen</label>
          <select id="perPage" name="perPage" defaultValue={getInitialValue(searchParams, "perPage") || "20"}>
            {PAGE_SIZE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
      </div>

      <div className="filter-actions">
        <button type="submit" className="btn btn-primary">Objekte finden</button>
        <button type="button" onClick={clearFilters} className="btn">Filter zurücksetzen</button>
      </div>
    </form>
  );
}
