"use client";

import { useRouter } from "next/navigation";
import { FormEvent } from "react";
import { PROPERTY_GROUP_OPTIONS } from "@/lib/filter-options";

type QuickSearchBarProps = {
  states: string[];
};

export function QuickSearchBar({ states }: QuickSearchBarProps) {
  const router = useRouter();

  function buildQuery(form: HTMLFormElement) {
    const formData = new FormData(form);
    const params = new URLSearchParams();

    for (const [key, value] of formData.entries()) {
      const text = String(value).trim();
      if (text) params.set(key, text);
    }

    return params.toString();
  }

  function onQuickSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = buildQuery(event.currentTarget);
    router.push(query ? `/?${query}` : "/");
  }

  function goToAdvanced(form: HTMLFormElement) {
    const query = buildQuery(form);
    router.push(query ? `/map?${query}` : "/map");
  }

  return (
    <form className="quick-search-panel" onSubmit={onQuickSearch}>
      <div className="quick-search-head">
        <div>
          <h2>Schnellsuche</h2>
          <p>Starten Sie mit den wichtigsten Kriterien. Die vollständige Suche finden Sie auf der Kartenseite.</p>
        </div>
      </div>

      <div className="quick-search-grid">
        <div className="field quick-field-wide">
          <label htmlFor="quick-q">Ort, PLZ, Adresse oder Gericht</label>
          <input id="quick-q" name="q" placeholder="z. B. Chemnitz, 09111, Amtsgericht Dresden" />
        </div>

        <div className="field">
          <label htmlFor="quick-state">Bundesland</label>
          <select id="quick-state" name="state">
            <option value="">Alle Bundesländer</option>
            {states.map((state) => <option key={state} value={state}>{state}</option>)}
          </select>
        </div>

        <div className="field">
          <label htmlFor="quick-type">Objektart</label>
          <select id="quick-type" name="typeGroup">
            {PROPERTY_GROUP_OPTIONS.map((option) => <option key={option.value || "all"} value={option.value}>{option.label}</option>)}
          </select>
        </div>

        <div className="field">
          <label htmlFor="quick-max-price">Verkehrswert bis</label>
          <select id="quick-max-price" name="maxPrice">
            <option value="">Beliebig</option>
            <option value="50000">bis 50.000 €</option>
            <option value="100000">bis 100.000 €</option>
            <option value="250000">bis 250.000 €</option>
            <option value="500000">bis 500.000 €</option>
            <option value="1000000">bis 1.000.000 €</option>
          </select>
        </div>
      </div>

      <div className="quick-search-actions">
        <button type="submit" className="btn btn-primary">Schnell suchen</button>
        <button type="button" className="btn btn-soft" onClick={(event) => goToAdvanced(event.currentTarget.form!)}>Erweiterte Suche</button>
      </div>
    </form>
  );
}
