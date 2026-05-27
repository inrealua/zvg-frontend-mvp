"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent } from "react";
import {
  AUCTION_ATTEMPT_OPTIONS,
  BOOLEAN_OPTIONS,
  OCCUPANCY_OPTIONS,
  PAGE_SIZE_OPTIONS,
  PROPERTY_GROUP_OPTIONS,
  SORT_OPTIONS,
  STATUS_OPTIONS,
  WERTGRENZEN_OPTIONS
} from "@/lib/filter-options";
import { RADIUS_OPTIONS } from "@/lib/geo";

type FilterBarProps = {
  states: string[];
  courts: string[];
  cities: string[];
};

function getInitialValue(params: URLSearchParams, key: string): string {
  return params.get(key) ?? "";
}

export function FilterBar({ states, courts, cities }: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const next = new URLSearchParams();

    for (const [key, value] of formData.entries()) {
      const text = String(value).trim();
      if (text.length > 0) next.set(key, text);
    }

    const query = next.toString();
    router.push(query ? `/?${query}` : "/");
  }

  function clearFilters() {
    router.push("/");
  }

  return (
    <form className="filters" onSubmit={onSubmit}>
      <div className="filter-topline">
        <div>
          <h2>Фильтр объектов</h2>
          <p>Данные берутся напрямую из MySQL. Импорт позже будет писать сразу в эту же базу.</p>
        </div>
        <button type="button" onClick={clearFilters} className="btn btn-ghost">Сбросить</button>
      </div>

      <div className="filters-grid">
        <div className="field field-wide">
          <label htmlFor="q">Поиск</label>
          <input id="q" name="q" placeholder="Адрес, город, Aktenzeichen, суд" defaultValue={getInitialValue(searchParams, "q")} />
        </div>

        <div className="field">
          <label htmlFor="state">Bundesland</label>
          <select id="state" name="state" defaultValue={getInitialValue(searchParams, "state")}>
            <option value="">Все земли</option>
            {states.map((state) => <option key={state} value={state}>{state}</option>)}
          </select>
        </div>

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
          <label htmlFor="location">Ort/PLZ für Radius</label>
          <input id="location" name="location" placeholder="Chemnitz или 09111" defaultValue={getInitialValue(searchParams, "location")} />
        </div>

        <div className="field">
          <label htmlFor="radiusKm">Umkreis</label>
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

        <div className="field">
          <label htmlFor="typeGroup">Тип объекта</label>
          <select id="typeGroup" name="typeGroup" defaultValue={getInitialValue(searchParams, "typeGroup")}>
            {PROPERTY_GROUP_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>

        <div className="field">
          <label htmlFor="status">Статус</label>
          <select id="status" name="status" defaultValue={getInitialValue(searchParams, "status")}>
            {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>

        <div className="field">
          <label htmlFor="occupancy">Использование</label>
          <select id="occupancy" name="occupancy" defaultValue={getInitialValue(searchParams, "occupancy")}>
            {OCCUPANCY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>

        <div className="field">
          <label htmlFor="minPrice">Цена от</label>
          <input id="minPrice" name="minPrice" type="number" min="0" placeholder="0" defaultValue={getInitialValue(searchParams, "minPrice")} />
        </div>

        <div className="field">
          <label htmlFor="maxPrice">Цена до</label>
          <input id="maxPrice" name="maxPrice" type="number" min="0" placeholder="100000" defaultValue={getInitialValue(searchParams, "maxPrice")} />
        </div>

        <div className="field">
          <label htmlFor="minLivingArea">Wohnfläche от</label>
          <input id="minLivingArea" name="minLivingArea" type="number" min="0" placeholder="50" defaultValue={getInitialValue(searchParams, "minLivingArea")} />
        </div>

        <div className="field">
          <label htmlFor="maxLivingArea">Wohnfläche до</label>
          <input id="maxLivingArea" name="maxLivingArea" type="number" min="0" placeholder="200" defaultValue={getInitialValue(searchParams, "maxLivingArea")} />
        </div>

        <div className="field">
          <label htmlFor="minPlotArea">Grundstück от</label>
          <input id="minPlotArea" name="minPlotArea" type="number" min="0" placeholder="300" defaultValue={getInitialValue(searchParams, "minPlotArea")} />
        </div>

        <div className="field">
          <label htmlFor="maxPlotArea">Grundstück до</label>
          <input id="maxPlotArea" name="maxPlotArea" type="number" min="0" placeholder="1500" defaultValue={getInitialValue(searchParams, "maxPlotArea")} />
        </div>

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
