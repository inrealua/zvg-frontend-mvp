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
  de: {
    "3plus": "3. und weitere",
    "notRemoved": "Nicht weggefallen / unbekannt",
    "not_removed": "Nicht weggefallen / unbekannt",
    "removed": "Weggefallen",
    "РќРµ СЃРЅСЏС‚С‹ / РЅРµРёР·РІРµСЃС‚РЅРѕ": "Nicht weggefallen / unbekannt",
    "РЎРЅСЏС‚С‹": "Weggefallen",
    "3-Р№ Рё Р±РѕР»СЊС€Рµ": "3. und weitere",
    "2-Р№ С‚РµСЂРјРёРЅ": "2. Termin",
    "1-Р№ С‚РµСЂРјРёРЅ": "1. Termin",
    "Р›СЋР±РѕР№ С‚РµСЂРјРёРЅ": "Jeder Termin",
    "Р›СЋР±Р°СЏ": "Beliebig",
    "РќРµ РІР°Р¶РЅРѕ": "Beliebig",
    "РќРµС‚": "Nein",
    "Р”Р°": "Ja",
    "nein": "Nein",
    "ja": "Ja",
    "no": "Nein",
    "yes": "Ja",
    "2": "2. Termin",
    "1": "1. Termin", selected: "ausgewГ¤hlt", any: "Beliebig", search: "Suche", searchPlaceholder: "Ort, PLZ, Adresse, Aktenzeichen, Gericht", city: "Ort", allCities: "Alle Orte", postalCode: "PLZ", postalPlaceholder: "z. B. 09111", radius: "Umkreis", noRadius: "Kein Radius", court: "Amtsgericht", allCourts: "Alle Gerichte", status: "Status", allCurrent: "Alle aktuellen", state: "Bundesland", allStates: "Alle BundeslГ¤nder", propertyType: "Objektart", allTypes: "Alle Typen", usage: "Nutzung", anyUsage: "Jede Nutzung", marketValue: "Verkehrswert", livingArea: "WohnflГ¤che", plotArea: "GrundstГјck", dateFrom: "Termin ab", dateTo: "Termin bis", datePlaceholder: "JJJJ-MM-TT", heritage: "Denkmalschutz", valueLimits: "Wertgrenzen", attempt: "Termin-Nr.", submit: "Ergebnisse anzeigen", resetFilters: "Filter zurГјcksetzen" },
  ru: {
    "Nicht weggefallen / unbekannt": "РќРµ СЃРЅСЏС‚С‹ / РЅРµРёР·РІРµСЃС‚РЅРѕ",
    "Weggefallen": "РЎРЅСЏС‚С‹",
    "3. und weitere": "3-Р№ Рё Р±РѕР»СЊС€Рµ",
    "2. Termin": "2-Р№ С‚РµСЂРјРёРЅ",
    "1. Termin": "1-Р№ С‚РµСЂРјРёРЅ",
    "Jeder Termin": "Р›СЋР±РѕР№ С‚РµСЂРјРёРЅ",
    "Beliebig": "Р›СЋР±Р°СЏ",
    "Nein": "РќРµС‚",
    "Ja": "Р”Р°", selected: "РІС‹Р±СЂР°РЅРѕ", any: "Р›СЋР±Р°СЏ", search: "РџРѕРёСЃРє", searchPlaceholder: "Р“РѕСЂРѕРґ, РёРЅРґРµРєСЃ, Р°РґСЂРµСЃ, РЅРѕРјРµСЂ РґРµР»Р°, СЃСѓРґ", city: "Р“РѕСЂРѕРґ", allCities: "Р’СЃРµ РіРѕСЂРѕРґР°", postalCode: "РРЅРґРµРєСЃ", postalPlaceholder: "РЅР°РїСЂРёРјРµСЂ: 09111", radius: "Р Р°РґРёСѓСЃ", noRadius: "Р‘РµР· СЂР°РґРёСѓСЃР°", court: "РЎСѓРґ", allCourts: "Р’СЃРµ СЃСѓРґС‹", status: "РЎС‚Р°С‚СѓСЃ", allCurrent: "Р’СЃРµ Р°РєС‚СѓР°Р»СЊРЅС‹Рµ", state: "Р¤РµРґРµСЂР°Р»СЊРЅР°СЏ Р·РµРјР»СЏ", allStates: "Р’СЃРµ Р·РµРјР»Рё", propertyType: "РўРёРї РѕР±СЉРµРєС‚Р°", allTypes: "Р’СЃРµ С‚РёРїС‹", usage: "РСЃРїРѕР»СЊР·РѕРІР°РЅРёРµ", anyUsage: "Р›СЋР±РѕРµ РёСЃРїРѕР»СЊР·РѕРІР°РЅРёРµ", marketValue: "РћС†РµРЅРѕС‡РЅР°СЏ СЃС‚РѕРёРјРѕСЃС‚СЊ", livingArea: "Р–РёР»Р°СЏ РїР»РѕС‰Р°РґСЊ", plotArea: "РЈС‡Р°СЃС‚РѕРє", dateFrom: "РўРѕСЂРіРё РѕС‚", dateTo: "РўРѕСЂРіРё РґРѕ", datePlaceholder: "Р“Р“Р“Р“-РњРњ-Р”Р”", heritage: "РџР°РјСЏС‚РЅРёРє Р°СЂС…РёС‚РµРєС‚СѓСЂС‹", valueLimits: "РћРіСЂР°РЅРёС‡РµРЅРёСЏ СЃС‚РѕРёРјРѕСЃС‚Рё", attempt: "в„– С‚РµСЂРјРёРЅР°", submit: "РџРѕРєР°Р·Р°С‚СЊ СЂРµР·СѓР»СЊС‚Р°С‚С‹", resetFilters: "РЎР±СЂРѕСЃРёС‚СЊ С„РёР»СЊС‚СЂ" },
  en: { selected: "selected", any: "Any", search: "Search", searchPlaceholder: "City, ZIP, address, case number, court", city: "City", allCities: "All cities", postalCode: "ZIP", postalPlaceholder: "e.g. 09111", radius: "Radius", noRadius: "No radius", court: "Court", allCourts: "All courts", status: "Status", allCurrent: "All current", state: "Federal state", allStates: "All states", propertyType: "Property type", allTypes: "All types", usage: "Use", anyUsage: "Any use", marketValue: "Market value", livingArea: "Living area", plotArea: "Plot size", dateFrom: "Auction from", dateTo: "Auction to", datePlaceholder: "YYYY-MM-DD", heritage: "Listed monument", valueLimits: "Value limits", attempt: "Auction no.", submit: "Show results", resetFilters: "Reset filters" },
} as const;

const optionLabels: Record<Locale, Record<string, string>> = {
  de: { ACTIVE: "Aktiv", CANCELLED: "Aufgehoben", ARCHIVED: "Archiv", SOLD: "Verkauft", WOHNHAEUSER: "WohnhГ¤user", WOHNUNGEN: "Wohnungen", GEWERBE: "Gewerbe", GRUNDSTUECKE: "GrundstГјcke", LAND_WALD: "Land / Wald", GARAGEN: "Garagen / Parken", SONSTIGE: "Sonstige", VACANT: "Frei", RENTED: "Vermietet", OWNER_OCCUPIED: "Eigennutzung", UNKNOWN: "Unbekannt", true: "Ja", false: "Nein", weggefallen: "Weggefallen", nicht_weggefallen: "Nicht weggefallen / unbekannt" },
  ru: { ACTIVE: "РђРєС‚РёРІРЅРѕ", CANCELLED: "РћС‚РјРµРЅРµРЅРѕ", ARCHIVED: "РђСЂС…РёРІ", SOLD: "РџСЂРѕРґР°РЅРѕ", WOHNHAEUSER: "Р–РёР»С‹Рµ РґРѕРјР°", WOHNUNGEN: "РљРІР°СЂС‚РёСЂС‹", GEWERBE: "РљРѕРјРјРµСЂС†РёСЏ", GRUNDSTUECKE: "РЈС‡Р°СЃС‚РєРё", LAND_WALD: "Р—РµРјР»СЏ / Р»РµСЃ", GARAGEN: "Р“Р°СЂР°Р¶Рё / РїР°СЂРєРѕРІРєРё", SONSTIGE: "РџСЂРѕС‡РµРµ", VACANT: "РЎРІРѕР±РѕРґРµРЅ", RENTED: "РЎРґР°РЅ РІ Р°СЂРµРЅРґСѓ", OWNER_OCCUPIED: "РСЃРїРѕР»СЊР·СѓРµС‚СЃСЏ СЃРѕР±СЃС‚РІРµРЅРЅРёРєРѕРј", UNKNOWN: "РќРµРёР·РІРµСЃС‚РЅРѕ", true: "Р”Р°", false: "РќРµС‚", weggefallen: "РЎРЅСЏС‚С‹", nicht_weggefallen: "РќРµ СЃРЅСЏС‚С‹ / РЅРµРёР·РІРµСЃС‚РЅРѕ" },
  en: { ACTIVE: "Active", CANCELLED: "Cancelled", ARCHIVED: "Archive", SOLD: "Sold", WOHNHAEUSER: "Residential houses", WOHNUNGEN: "Apartments", GEWERBE: "Commercial", GRUNDSTUECKE: "Land plots", LAND_WALD: "Land / forest", GARAGEN: "Garages / parking", SONSTIGE: "Other", VACANT: "Vacant", RENTED: "Rented", OWNER_OCCUPIED: "Owner-occupied", UNKNOWN: "Unknown", true: "Yes", false: "No", weggefallen: "Removed", nicht_weggefallen: "Not removed / unknown" },
};


function getWertgrenzenOptions(locale: Locale): SelectOption[] {
  const text = {
    de: {
      any: "Beliebig",
      active: "Wertgrenzen gelten",
      removed: "Wertgrenzen aufgehoben",
    },
    ru: {
      any: "Р›СЋР±Р°СЏ",
      active: "РћРіСЂР°РЅРёС‡РµРЅРёСЏ РґРµР№СЃС‚РІСѓСЋС‚",
      removed: "РћРіСЂР°РЅРёС‡РµРЅРёСЏ СЃРЅСЏС‚С‹",
    },
    en: {
      any: "Any",
      active: "Limits apply",
      removed: "Limits removed",
    },
  } as const;

  return [
    { value: "", label: text[locale].any },
    { value: "nicht_weggefallen", label: text[locale].active },
    { value: "weggefallen", label: text[locale].removed },
  ];
}

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
  const rawValue = String(option.value || "");
  const rawLabel = String(option.label || "");
  if (!rawValue && !rawLabel) return option;

  const normalize = (text: string) =>
    text
      .trim()
      .toLowerCase()
      .replace(/С‘/g, "Рµ")
      .replace(/[._\s]+/g, "-");

  const keyCandidates = [
    rawValue,
    rawLabel,
    normalize(rawValue),
    normalize(rawLabel),
  ];

  const dict: Record<Locale, Record<string, string>> = {
    de: {
      "": "Beliebig",
      "true": "Ja",
      "false": "Nein",
      "yes": "Ja",
      "no": "Nein",
      "РґР°": "Ja",
      "РЅРµС‚": "Nein",
      "РЅРµ-РІР°Р¶РЅРѕ": "Beliebig",
      "Р»СЋР±Р°СЏ": "Beliebig",
      "Р»СЋР±РѕР№": "Beliebig",
      "egal": "Beliebig",
      "beliebig": "Beliebig",

      "active": "Aktiv",
      "cancelled": "Aufgehoben",
      "archived": "Archiv",
      "sold": "Verkauft",
      "Р°РєС‚РёРІРЅРѕ": "Aktiv",
      "РѕС‚РјРµРЅРµРЅРѕ": "Aufgehoben",
      "Р°СЂС…РёРІ": "Archiv",
      "РїСЂРѕРґР°РЅРѕ": "Verkauft",
      "РІСЃРµ-Р°РєС‚СѓР°Р»СЊРЅС‹Рµ": "Alle aktuellen",
      "alle-aktuellen": "Alle aktuellen",
      "all-current": "Alle aktuellen",

      "weggefallen": "Weggefallen",
      "removed": "Weggefallen",
      "СЃРЅСЏС‚С‹": "Weggefallen",
      "nicht-weggefallen": "Nicht weggefallen / unbekannt",
      "nicht-weggefallen-unbekannt": "Nicht weggefallen / unbekannt",
      "not-removed": "Nicht weggefallen / unbekannt",
      "not-removed-unknown": "Nicht weggefallen / unbekannt",
      "РЅРµ-СЃРЅСЏС‚С‹-РЅРµРёР·РІРµСЃС‚РЅРѕ": "Nicht weggefallen / unbekannt",

      "1": "1. Termin",
      "2": "2. Termin",
      "3": "3. und weitere",
      "3plus": "3. und weitere",
      "1-Р№-С‚РµСЂРјРёРЅ": "1. Termin",
      "2-Р№-С‚РµСЂРјРёРЅ": "2. Termin",
      "3-Р№-Рё-Р±РѕР»СЊС€Рµ": "3. und weitere",
      "Р»СЋР±РѕР№-С‚РµСЂРјРёРЅ": "Jeder Termin",
      "jeder-termin": "Jeder Termin",
      "any-auction": "Jeder Termin",
    },
    ru: {
      "": "Р›СЋР±Р°СЏ",
      "true": "Р”Р°",
      "false": "РќРµС‚",
      "yes": "Р”Р°",
      "no": "РќРµС‚",
      "ja": "Р”Р°",
      "nein": "РќРµС‚",
      "egal": "Р›СЋР±Р°СЏ",
      "beliebig": "Р›СЋР±Р°СЏ",
      "any": "Р›СЋР±Р°СЏ",

      "active": "РђРєС‚РёРІРЅРѕ",
      "cancelled": "РћС‚РјРµРЅРµРЅРѕ",
      "archived": "РђСЂС…РёРІ",
      "sold": "РџСЂРѕРґР°РЅРѕ",
      "aktiv": "РђРєС‚РёРІРЅРѕ",
      "aufgehoben": "РћС‚РјРµРЅРµРЅРѕ",
      "archiv": "РђСЂС…РёРІ",
      "verkauft": "РџСЂРѕРґР°РЅРѕ",
      "alle-aktuellen": "Р’СЃРµ Р°РєС‚СѓР°Р»СЊРЅС‹Рµ",
      "all-current": "Р’СЃРµ Р°РєС‚СѓР°Р»СЊРЅС‹Рµ",

      "weggefallen": "РЎРЅСЏС‚С‹",
      "removed": "РЎРЅСЏС‚С‹",
      "nicht-weggefallen": "РќРµ СЃРЅСЏС‚С‹ / РЅРµРёР·РІРµСЃС‚РЅРѕ",
      "nicht-weggefallen-unbekannt": "РќРµ СЃРЅСЏС‚С‹ / РЅРµРёР·РІРµСЃС‚РЅРѕ",
      "not-removed": "РќРµ СЃРЅСЏС‚С‹ / РЅРµРёР·РІРµСЃС‚РЅРѕ",
      "not-removed-unknown": "РќРµ СЃРЅСЏС‚С‹ / РЅРµРёР·РІРµСЃС‚РЅРѕ",

      "1": "1-Р№ С‚РµСЂРјРёРЅ",
      "2": "2-Р№ С‚РµСЂРјРёРЅ",
      "3": "3-Р№ Рё Р±РѕР»СЊС€Рµ",
      "3plus": "3-Р№ Рё Р±РѕР»СЊС€Рµ",
      "1-termin": "1-Р№ С‚РµСЂРјРёРЅ",
      "2-termin": "2-Р№ С‚РµСЂРјРёРЅ",
      "3-und-weitere": "3-Р№ Рё Р±РѕР»СЊС€Рµ",
      "jeder-termin": "Р›СЋР±РѕР№ С‚РµСЂРјРёРЅ",
      "any-auction": "Р›СЋР±РѕР№ С‚РµСЂРјРёРЅ",
    },
    en: {
      "": "Any",
      "true": "Yes",
      "false": "No",
      "ja": "Yes",
      "nein": "No",
      "РґР°": "Yes",
      "РЅРµС‚": "No",
      "egal": "Any",
      "beliebig": "Any",
      "Р»СЋР±Р°СЏ": "Any",

      "active": "Active",
      "cancelled": "Cancelled",
      "archived": "Archive",
      "sold": "Sold",
      "aktiv": "Active",
      "aufgehoben": "Cancelled",
      "archiv": "Archive",
      "verkauft": "Sold",
      "Р°РєС‚РёРІРЅРѕ": "Active",
      "РѕС‚РјРµРЅРµРЅРѕ": "Cancelled",
      "Р°СЂС…РёРІ": "Archive",
      "РїСЂРѕРґР°РЅРѕ": "Sold",
      "alle-aktuellen": "All current",
      "РІСЃРµ-Р°РєС‚СѓР°Р»СЊРЅС‹Рµ": "All current",

      "weggefallen": "Removed",
      "removed": "Removed",
      "СЃРЅСЏС‚С‹": "Removed",
      "nicht-weggefallen": "Not removed / unknown",
      "nicht-weggefallen-unbekannt": "Not removed / unknown",
      "not-removed": "Not removed / unknown",
      "not-removed-unknown": "Not removed / unknown",
      "РЅРµ-СЃРЅСЏС‚С‹-РЅРµРёР·РІРµСЃС‚РЅРѕ": "Not removed / unknown",

      "1": "1st auction",
      "2": "2nd auction",
      "3": "3rd and more",
      "3plus": "3rd and more",
      "1-termin": "1st auction",
      "2-termin": "2nd auction",
      "3-und-weitere": "3rd and more",
      "1-Р№-С‚РµСЂРјРёРЅ": "1st auction",
      "2-Р№-С‚РµСЂРјРёРЅ": "2nd auction",
      "3-Р№-Рё-Р±РѕР»СЊС€Рµ": "3rd and more",
      "jeder-termin": "Any auction",
      "Р»СЋР±РѕР№-С‚РµСЂРјРёРЅ": "Any auction",
    },
  };

  for (const key of keyCandidates) {
    const translated = dict[locale][key] || dict[locale][normalize(key)];
    if (translated) return { ...option, label: translated };
  }

  const legacyDict = optionLabels[locale] as Record<string, string>;
  return { ...option, label: legacyDict[rawValue] || legacyDict[rawLabel] || option.label };
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
  const [query, setQuery] = useState("");
  const selectedSet = useMemo(() => new Set(values), [values]);

  const filteredCities = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q ? cities.filter((city) => city.toLowerCase().includes(q)) : cities;
    const pinned = values.filter((city) => !base.includes(city));
    return [...pinned, ...base].slice(0, q ? 80 : 160);
  }, [cities, query, values]);

  function toggle(value: string, checked: boolean) {
    setValues((current) => {
      if (checked) return current.includes(value) ? current : [...current, value];
      return current.filter((item) => item !== value);
    });
  }

  function addFirstMatch() {
    const first = filteredCities.find((city) => !selectedSet.has(city));
    if (first) toggle(first, true);
  }

  return (
    <details className="multi-filter-v60 city-autocomplete-filter-v168a">
      <summary>
        <span>{labels[locale].city}</span>
        <b>{values.length === 0 ? labels[locale].allCities : values.length === 1 ? values[0] : `${values.length} ${labels[locale].selected}`}</b>
      </summary>

      <div className="multi-filter-panel-v60 multi-filter-panel-scroll-v60 city-autocomplete-panel-v168a">
        <input
          className="city-autocomplete-input-v168a"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addFirstMatch();
            }
          }}
          placeholder={locale === "de" ? "Stadt suchen..." : locale === "en" ? "Search city..." : "РќР°Р№С‚Рё РіРѕСЂРѕРґ..."}
        />

        {values.length > 0 ? (
          <div className="city-selected-pills-v168a">
            {values.map((city) => (
              <button key={city} type="button" onClick={() => toggle(city, false)}>
                {city} Г—
              </button>
            ))}
          </div>
        ) : null}

        <div className="city-options-v168a">
          {filteredCities.map((city) => (
            <label key={city} className={selectedSet.has(city) ? "multi-option-v60 is-selected" : "multi-option-v60"}>
              <input name="city" type="checkbox" value={city} checked={selectedSet.has(city)} onChange={(event) => toggle(city, event.target.checked)} />
              <span>{city}</span>
            </label>
          ))}
        </div>
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
  const display = isDefault ? labels[locale].any : `${formatNumber(safeMin)}${suffix} вЂ” ${formatNumber(safeMax)}${suffix}`;
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
      <div className="range-title-v60"><span>{label}</span><b>0вЂ“{formatNumber(max)}{suffix}</b></div>
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

  useEffect(() => {
    function stage68CloseOtherMultiselects(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const currentDetails = target?.closest?.(".multi-filter-v60, .multi-filter-v59, .multi-filter-v58") as HTMLDetailsElement | null;
      const opened = Array.from(document.querySelectorAll<HTMLDetailsElement>(".multi-filter-v60[open], .multi-filter-v59[open], .multi-filter-v58[open]"));
      for (const details of opened) {
        if (currentDetails && details === currentDetails) continue;
        details.open = false;
      }
    }

    document.addEventListener("click", stage68CloseOtherMultiselects, true);
    return () => document.removeEventListener("click", stage68CloseOtherMultiselects, true);
  }, []);

  function buildNextParams(form: HTMLFormElement): URLSearchParams {
    const formData = new FormData(form);
    const next = new URLSearchParams();
    
    
// Polygon is controlled by the map, not by this form.
    // Preserve it when applying price, type, area and other filters.
    const currentParams = new URLSearchParams(window.location.search);
    const activePolygon = currentParams.get("poly");
    if (activePolygon) next.set("poly", activePolygon);
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
      <input type="hidden" name="poly" value={searchParams.get("poly") ?? ""} />
      <div className="search-filter-grid-v60">
        {/* Row 1: normal search fields */}
        <div className="field span-2">
          <label htmlFor="q">{t.search}</label>
          <input id="q" name="q" placeholder={t.searchPlaceholder} defaultValue={getInitialValue(searchParams, "q")} />
        </div>

        <div className="field span-1">
          <label htmlFor="postalCode">{t.postalCode}</label>
          <input id="postalCode" name="postalCode" placeholder={t.postalPlaceholder} defaultValue={getInitialValue(searchParams, "postalCode")} />
        </div>

        <div className="field span-1">
          <label htmlFor="court">{t.court}</label>
          <select id="court" name="court" defaultValue={getInitialValue(searchParams, "court")}>
            <option value="">{t.allCourts}</option>
            {courts.map((court) => <option key={court} value={court}>{court}</option>)}
          </select>
        </div>

        {/* Row 2: all multiselect fields */}
        <StateMultiSelect states={states} selected={getInitialValues(searchParams, "state")} locale={locale} />
        <CityMultiSelect cities={cities} selected={getInitialValues(searchParams, "city")} locale={locale} />
        <MultiSelectDropdown title={t.propertyType} name="typeGroup" options={PROPERTY_GROUP_OPTIONS} selected={getInitialValues(searchParams, "typeGroup")} emptyLabel={t.allTypes} locale={locale} />
        <MultiSelectDropdown title={t.usage} name="occupancy" options={OCCUPANCY_OPTIONS} selected={getInitialValues(searchParams, "occupancy")} emptyLabel={t.anyUsage} locale={locale} />

        {/* Row 3: sliders */}
        <SingleRange label={t.radius} name="radiusKm" max={RADIUS_MAX} step={10} defaultValue={getInitialValue(searchParams, "radiusKm")} suffix=" km" locale={locale} />
        <DualRange label={t.marketValue} minName="minPrice" maxName="maxPrice" max={PRICE_MAX} step={5000} minDefault={getInitialValue(searchParams, "minPrice")} maxDefault={getInitialValue(searchParams, "maxPrice")} suffix=" в‚¬" locale={locale} />
        <DualRange label={t.livingArea} minName="minLivingArea" maxName="maxLivingArea" max={AREA_MAX} step={5} minDefault={getInitialValue(searchParams, "minLivingArea")} maxDefault={getInitialValue(searchParams, "maxLivingArea")} suffix=" mВІ" locale={locale} />
        <DualRange label={t.plotArea} minName="minPlotArea" maxName="maxPlotArea" max={PLOT_MAX} step={50} minDefault={getInitialValue(searchParams, "minPlotArea")} maxDefault={getInitialValue(searchParams, "maxPlotArea")} suffix=" mВІ" locale={locale} />

        {/* Row 4: date/status filters */}
        <div className="field span-1">
          <label htmlFor="dateFrom">{t.dateFrom}</label>
          <input id="dateFrom" name="dateFrom" type="date" lang={locale} defaultValue={getInitialValue(searchParams, "dateFrom")} />
        </div>

        <div className="field span-1">
          <label htmlFor="dateTo">{t.dateTo}</label>
          <input id="dateTo" name="dateTo" type="date" lang={locale} defaultValue={getInitialValue(searchParams, "dateTo")} />
        </div>

        <div className="field span-1">
          <label htmlFor="status">{t.status}</label>
          <select id="status" name="status" defaultValue={getInitialValue(searchParams, "status")}>
            {STATUS_OPTIONS.map((option) => {
              const localized = localizeOption(option, locale);
              const label = localized.value ? localized.label : t.allCurrent;
              return <option key={localized.value} value={localized.value}>{label}</option>;
            })}
          </select>
        </div>

        <div className="field span-1">
          <label htmlFor="denkmalschutz">{t.heritage}</label>
          <select id="denkmalschutz" name="denkmalschutz" defaultValue={getInitialValue(searchParams, "denkmalschutz")}>
            {BOOLEAN_OPTIONS.map((option) => {
              const localized = localizeOption(option, locale);
              const label = localized.value ? localized.label : t.any;
              return <option key={localized.value} value={localized.value}>{label}</option>;
            })}
          </select>
        </div>

        {/* Row 5: value limits / attempt / actions */}
        <div className="field span-1">
          <label htmlFor="wertgrenzen">{t.valueLimits}</label>
          <select id="wertgrenzen" name="wertgrenzen" defaultValue={getInitialValue(searchParams, "wertgrenzen")}>
            {getWertgrenzenOptions(locale).map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div className="field span-1">
          <label htmlFor="auctionAttempt">{t.attempt}</label>
          <select id="auctionAttempt" name="auctionAttempt" defaultValue={getInitialValue(searchParams, "auctionAttempt")}>
            {AUCTION_ATTEMPT_OPTIONS.map((option) => {
              const localized = localizeOption(option, locale);
              const label = localized.value ? localized.label : t.any;
              return <option key={localized.value} value={localized.value}>{label}</option>;
            })}
          </select>
        </div>

        <button type="submit" className="btn btn-primary filter-action-button-v60">{t.submit}</button>
        <button type="button" onClick={clearFilters} className="btn btn-ghost filter-action-button-v60">{t.resetFilters}</button>
      </div>
    </form>
  );
}
