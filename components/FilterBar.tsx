"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent } from "react";
import { OCCUPANCY_OPTIONS, PROPERTY_GROUP_OPTIONS, STATUS_OPTIONS } from "@/lib/filter-options";

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

    router.push(`/?${next.toString()}`);
  }

  function clearFilters() {
    router.push("/");
  }

  return (
    <form className="filters" onSubmit={onSubmit}>
      <div className="filters-grid">
        <div className="field">
          <label htmlFor="q">Поиск</label>
          <input id="q" name="q" placeholder="Адрес, город, Aktenzeichen" defaultValue={getInitialValue(searchParams, "q")} />
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
          <label htmlFor="court">Суд</label>
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
          <label htmlFor="minArea">Жилая площадь от</label>
          <input id="minArea" name="minArea" type="number" min="0" placeholder="50" defaultValue={getInitialValue(searchParams, "minArea")} />
        </div>

        <div className="field">
          <label htmlFor="denkmalschutz">Denkmalschutz</label>
          <select id="denkmalschutz" name="denkmalschutz" defaultValue={getInitialValue(searchParams, "denkmalschutz")}>
            <option value="">Не важно</option>
            <option value="yes">Да</option>
            <option value="no">Нет</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="wertgrenzen">Wertgrenzen</label>
          <select id="wertgrenzen" name="wertgrenzen" defaultValue={getInitialValue(searchParams, "wertgrenzen")}>
            <option value="">Не важно</option>
            <option value="yes">Сняты</option>
            <option value="no">Не сняты</option>
          </select>
        </div>
      </div>

      <div className="filter-actions">
        <button type="submit" className="btn btn-primary">Применить фильтры</button>
        <button type="button" onClick={clearFilters} className="btn">Очистить</button>
      </div>
    </form>
  );
}
