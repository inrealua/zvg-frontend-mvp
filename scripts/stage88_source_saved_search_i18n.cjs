const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();

function full(rel) {
  return path.join(root, rel);
}
function exists(rel) {
  return fs.existsSync(full(rel));
}
function read(rel) {
  return fs.readFileSync(full(rel), "utf8");
}
function write(rel, content) {
  const target = full(rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
  console.log("written", rel);
}
function patch(rel, fn) {
  if (!exists(rel)) {
    console.log("skip missing", rel);
    return;
  }
  const before = read(rel);
  const after = fn(before);
  if (after !== before) {
    write(rel, after);
    console.log("patched", rel);
  } else {
    console.log("unchanged", rel);
  }
}

/**
 * Stage 88 — source-level fix.
 *
 * The diagnostics show the database model is OK:
 * SavedSearch has filtersUrl, filtersHash and humanReadableSummary.
 * The API also creates savedSearch with these fields.
 *
 * The real problems are in components:
 * 1) Cabinet German texts were hardcoded in Russian.
 * 2) SaveSearchButton likely uses alert/old behavior.
 * 3) ActiveFilters are built with mixed labels/values.
 * 4) Previous runtime patches must stay disabled.
 *
 * This patch avoids global MutationObserver/runtime DOM scanning.
 */

/* -------------------------------------------------------------------------- */
/* 0. Disable unstable runtime stages if they exist                            */
/* -------------------------------------------------------------------------- */

const noopComponents = [
  ["components/RuntimeUiEnhancementsStage82.tsx", "RuntimeUiEnhancementsStage82"],
  ["components/RuntimeStage83.tsx", "RuntimeStage83"],
  ["components/RuntimeStage84.tsx", "RuntimeStage84"],
  ["components/RuntimeStage85.tsx", "RuntimeStage85"],
  ["components/RuntimeStage86.tsx", "RuntimeStage86"],
];

for (const [rel, name] of noopComponents) {
  if (exists(rel)) {
    write(rel, `"use client";

export function ${name}() {
  return null;
}
`);
  }
}

for (const rel of ["app/layout.tsx", "app/[locale]/layout.tsx"]) {
  patch(rel, (s) => {
    for (const [name] of noopComponents) {
      s = s.replace(new RegExp(String.raw`import\s+\{\s*${name}\s*\}\s+from\s+["'][^"']+["'];?\s*\n`, "g"), "");
      s = s.replace(new RegExp(String.raw`\s*<${name}\s*/>\s*`, "g"), "\n");
    }
    return s.replace(/\n{3,}/g, "\n\n");
  });
}

/* -------------------------------------------------------------------------- */
/* 1. Replace SaveSearchButton with no-alert source implementation             */
/* -------------------------------------------------------------------------- */

write("components/SaveSearchButton.tsx", `"use client";

import { useState, type ReactNode } from "react";

type Locale = "de" | "ru" | "en";

type SaveSearchButtonProps = {
  filtersUrl?: string;
  currentFiltersUrl?: string;
  url?: string;
  summary?: string;
  humanReadableSummary?: string;
  name?: string;
  locale?: Locale;
  className?: string;
  children?: ReactNode;
};

const text = {
  de: {
    save: "Suche speichern",
    saving: "Speichern...",
    saved: "Gespeichert",
    already: "Bereits gespeichert",
    login: "Bitte anmelden",
    error: "Speichern fehlgeschlagen",
  },
  ru: {
    save: "Сохранить поиск",
    saving: "Сохранение...",
    saved: "Сохранено",
    already: "Уже сохранено",
    login: "Войдите в аккаунт",
    error: "Не удалось сохранить",
  },
  en: {
    save: "Save search",
    saving: "Saving...",
    saved: "Saved",
    already: "Already saved",
    login: "Please sign in",
    error: "Could not save",
  },
} as const;

function normalizeLocale(locale?: string): Locale {
  if (locale === "ru" || locale === "en" || locale === "de") return locale;
  if (typeof window !== "undefined") {
    const first = window.location.pathname.split("/").filter(Boolean)[0];
    if (first === "ru" || first === "en" || first === "de") return first;
  }
  return "de";
}

function normalizeFiltersUrl(raw?: string) {
  if (raw && raw.startsWith("/")) return raw.slice(0, 2000);
  if (typeof window !== "undefined") {
    const path = window.location.pathname || "/";
    const query = window.location.search || "";
    return (path + query).slice(0, 2000);
  }
  return "/";
}

export function SaveSearchButton({
  filtersUrl,
  currentFiltersUrl,
  url,
  summary,
  humanReadableSummary,
  name,
  locale,
  className,
  children,
}: SaveSearchButtonProps) {
  const loc = normalizeLocale(locale);
  const t = text[loc];
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "already" | "login" | "error">("idle");

  async function save() {
    if (status === "saving") return;

    setStatus("saving");

    const finalUrl = normalizeFiltersUrl(filtersUrl || currentFiltersUrl || url);
    const finalSummary = (summary || humanReadableSummary || "").trim() || "Alle Objekte";

    try {
      const response = await fetch("/api/saved-searches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          filtersUrl: finalUrl,
          summary: finalSummary,
          name: name || undefined,
        }),
      });

      if (response.status === 401) {
        setStatus("login");
        return;
      }

      if (response.status === 409) {
        setStatus("already");
        return;
      }

      if (!response.ok) {
        setStatus("error");
        return;
      }

      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  const label =
    status === "saving" ? t.saving :
    status === "saved" ? t.saved :
    status === "already" ? t.already :
    status === "login" ? t.login :
    status === "error" ? t.error :
    children || t.save;

  return (
    <button
      type="button"
      className={className || "btn btn-primary save-search-button"}
      onClick={save}
      disabled={status === "saving" || status === "saved"}
      aria-live="polite"
    >
      {label}
    </button>
  );
}

export default SaveSearchButton;
`);

/* -------------------------------------------------------------------------- */
/* 2. Cabinet page hardcoded German fixes                                      */
/* -------------------------------------------------------------------------- */

patch("app/cabinet/page.tsx", (s) => {
  s = s.replace(
    'locale === "ru" ? "Поиски" : locale === "en" ? "Saved searches" : "Сохранённые поиски"',
    'locale === "ru" ? "Поиски" : locale === "en" ? "Saved searches" : "Gespeicherte Suchen"'
  );

  s = s.replace(
    'locale === "ru" ? "Сохранённые поиски" : locale === "en" ? "Saved Searches" : "Сохранённые поиски"',
    'locale === "ru" ? "Сохранённые поиски" : locale === "en" ? "Saved searches" : "Gespeicherte Suchen"'
  );

  s = s.replace(
    'locale === "ru"\\n                  ? "Переименуйте поиски, чтобы позже получать уведомления по понятным названиям."\\n                  : locale === "en"\\n                    ? "Name your searches so future email notifications are easy to understand."\\n                    : "Переименуйте поиски, чтобы позже получать уведомления с понятными названиями."',
    'locale === "ru"\\n                  ? "Переименуйте поиски, чтобы позже получать уведомления с понятными названиями."\\n                  : locale === "en"\\n                    ? "Name your searches so future notifications have clear names."\\n                    : "Benennen Sie Ihre Suchaufträge, damit spätere Benachrichtigungen verständliche Namen haben."'
  );

  // In case whitespace differs, use a broader replacement too.
  s = s.replace(
    /: "Переименуйте поиски, чтобы позже получать уведомления с понятными названиями\."}/g,
    ': "Benennen Sie Ihre Suchaufträge, damit spätere Benachrichtigungen verständliche Namen haben."}'
  );

  s = s.replace(
    'locale === "ru" ? "Открыть поиск" : locale === "en" ? "Open search" : "Открыть поиск"',
    'locale === "ru" ? "Открыть поиск" : locale === "en" ? "Open search" : "Suche öffnen"'
  );

  // Make sure saved URL opens with locale prefix when needed.
  if (!s.includes("function localizeSavedSearchUrl")) {
    s = s.replace(
      'export const dynamic = "force-dynamic";',
      `export const dynamic = "force-dynamic";

function localizeSavedSearchUrl(filtersUrl: string, locale: "de" | "ru" | "en") {
  if (!filtersUrl || !filtersUrl.startsWith("/")) return \`/\${locale}\`;
  if (/^\\/(de|ru|en)(\\/|\\?|$)/.test(filtersUrl)) return filtersUrl;
  if (filtersUrl === "/") return \`/\${locale}\`;
  if (filtersUrl.startsWith("/?")) return \`/\${locale}\${filtersUrl.slice(1)}\`;
  if (filtersUrl.startsWith("/archive") || filtersUrl.startsWith("/map") || filtersUrl.startsWith("/properties")) return filtersUrl;
  return \`/\${locale}\${filtersUrl}\`;
}`
    );
  }

  s = s.replace(/href=\{savedSearch\.filtersUrl\}/g, 'href={localizeSavedSearchUrl(savedSearch.filtersUrl, locale)}');

  return s;
});

/* -------------------------------------------------------------------------- */
/* 3. Patch API to accept legacy/client payloads too                           */
/* -------------------------------------------------------------------------- */

patch("app/api/saved-searches/route.ts", (s) => {
  // Add url/query fields to body type.
  s = s.replace(
    'filtersUrl?: string;\\n    summary?: string;\\n    name?: string;',
    'filtersUrl?: string;\\n    url?: string;\\n    query?: string;\\n    summary?: string;\\n    humanReadableSummary?: string;\\n    name?: string;'
  );

  // More tolerant filtersUrl extraction.
  s = s.replace(
    /const filtersUrl =\s*\n\s*typeof body\?\.filtersUrl === "string" && body\.filtersUrl\.startsWith\("\/"\)\s*\n\s*\? body\.filtersUrl\.slice\(0, 2000\)\s*\n\s*: "\/";/,
    `const rawFiltersUrl =
    typeof body?.filtersUrl === "string"
      ? body.filtersUrl
      : typeof body?.url === "string"
        ? body.url
        : typeof body?.query === "string"
          ? "/" + body.query.replace(/^\\?/, "?")
          : "/";

  const filtersUrl = rawFiltersUrl.startsWith("/") ? rawFiltersUrl.slice(0, 2000) : "/";`
  );

  s = s.replace(
    /const humanReadableSummary =\s*\n\s*typeof body\?\.summary === "string" && body\.summary\.trim\(\)\s*\n\s*\? body\.summary\.trim\(\)\.slice\(0, 1000\)\s*\n\s*: "Alle Objekte";/,
    `const rawSummary =
    typeof body?.summary === "string"
      ? body.summary
      : typeof body?.humanReadableSummary === "string"
        ? body.humanReadableSummary
        : "";

  const humanReadableSummary = rawSummary.trim() ? rawSummary.trim().slice(0, 1000) : "Alle Objekte";`
  );

  return s;
});

/* -------------------------------------------------------------------------- */
/* 4. Source-level ActiveFilters replacement                                   */
/* -------------------------------------------------------------------------- */

write("components/ActiveFilters.tsx", `"use client";

import Link from "next/link";
import { useMemo } from "react";

type Locale = "de" | "ru" | "en";

type Chip = {
  key?: string;
  label?: string;
  value?: string;
  href?: string;
  removeHref?: string;
};

type ActiveFiltersProps = {
  chips?: Chip[];
  activeFilters?: Chip[];
  filters?: Chip[];
  clearHref?: string;
  resetHref?: string;
  locale?: Locale;
  className?: string;
};

const dict = {
  de: {
    activeFilters: "Aktive Filter:",
    clearAll: "Alles löschen",
    state: "Bundesland",
    city: "Ort",
    postalCode: "PLZ",
    radius: "Umkreis",
    court: "Amtsgericht",
    type: "Objektart",
    status: "Status",
    usage: "Nutzung",
    priceFrom: "Verkehrswert ab",
    priceTo: "Verkehrswert bis",
    livingFrom: "Wohnfläche ab",
    livingTo: "Wohnfläche bis",
    plotFrom: "Grundstück ab",
    plotTo: "Grundstück bis",
    dateFrom: "Termin ab",
    dateTo: "Termin bis",
    monument: "Denkmalschutz",
    limits: "Wertgrenzen",
    termNo: "Termin-Nr.",
    active: "Aktiv",
    yes: "Ja",
    no: "Nein",
    notRemoved: "nicht weggefallen / unbekannt",
    removed: "weggefallen",
    term1: "1. Termin",
    term2: "2. Termin",
    term3: "3. und weitere",
    apartments: "Wohnungen",
    commercial: "Gewerbe",
    plots: "Grundstücke",
    landForest: "Land / Wald",
    houses: "Wohnhäuser",
    rented: "Vermietet",
    ownUse: "Eigennutzung",
    free: "Frei",
    unknown: "Unbekannt",
  },
  ru: {
    activeFilters: "Активные фильтры:",
    clearAll: "Очистить всё",
    state: "Земля",
    city: "Город",
    postalCode: "Индекс",
    radius: "Радиус",
    court: "Суд",
    type: "Тип",
    status: "Статус",
    usage: "Использование",
    priceFrom: "Цена от",
    priceTo: "Цена до",
    livingFrom: "Жилая от",
    livingTo: "Жилая до",
    plotFrom: "Участок от",
    plotTo: "Участок до",
    dateFrom: "Торги от",
    dateTo: "Торги до",
    monument: "Памятник архитектуры",
    limits: "Ценовые границы",
    termNo: "№ термина",
    active: "Активен",
    yes: "Да",
    no: "Нет",
    notRemoved: "не сняты / неизвестно",
    removed: "сняты",
    term1: "1-й термин",
    term2: "2-й термин",
    term3: "3-й и больше",
    apartments: "Квартиры",
    commercial: "Коммерция",
    plots: "Участки",
    landForest: "Земля / лес",
    houses: "Жилые дома",
    rented: "Сдан в аренду",
    ownUse: "Используется собственником",
    free: "Свободен",
    unknown: "Неизвестно",
  },
  en: {
    activeFilters: "Active filters:",
    clearAll: "Clear all",
    state: "State",
    city: "City",
    postalCode: "ZIP",
    radius: "Radius",
    court: "Court",
    type: "Type",
    status: "Status",
    usage: "Usage",
    priceFrom: "Price from",
    priceTo: "Price to",
    livingFrom: "Living area from",
    livingTo: "Living area to",
    plotFrom: "Plot from",
    plotTo: "Plot to",
    dateFrom: "Auction from",
    dateTo: "Auction to",
    monument: "Listed building",
    limits: "Price limits",
    termNo: "Auction no.",
    active: "Active",
    yes: "Yes",
    no: "No",
    notRemoved: "not removed / unknown",
    removed: "removed",
    term1: "1st auction",
    term2: "2nd auction",
    term3: "3rd and later",
    apartments: "Apartments",
    commercial: "Commercial",
    plots: "Plots",
    landForest: "Land / forest",
    houses: "Residential houses",
    rented: "Rented",
    ownUse: "Owner-occupied",
    free: "Vacant",
    unknown: "Unknown",
  },
} as const;

function normalizeLocale(locale?: string): Locale {
  if (locale === "ru" || locale === "en" || locale === "de") return locale;
  if (typeof window !== "undefined") {
    const first = window.location.pathname.split("/").filter(Boolean)[0];
    if (first === "ru" || first === "en" || first === "de") return first;
  }
  return "de";
}

function translateText(input: string, locale: Locale) {
  const d = dict[locale];
  let text = String(input || "");

  const replacements: Array<[RegExp, string]> = [
    [/Земля|Bundesland|Federal state|State/g, d.state],
    [/Город|Ort|City/g, d.city],
    [/Индекс|PLZ|ZIP/g, d.postalCode],
    [/Суд|Amtsgericht|Court/g, d.court],
    [/Радиус|Umkreis|Radius/g, d.radius],
    [/Тип|Objektart|Type/g, d.type],
    [/Статус|Status/g, d.status],
    [/Использование|Nutzung|Usage/g, d.usage],
    [/Цена от|Verkehrswert ab|Price from/g, d.priceFrom],
    [/Цена до|Verkehrswert bis|Price to/g, d.priceTo],
    [/Жилая от|Wohnfläche ab|Living area from/g, d.livingFrom],
    [/Жилая до|Wohnfläche bis|Living area to/g, d.livingTo],
    [/Участок от|Grundstück ab|Plot from/g, d.plotFrom],
    [/Участок до|Grundstück bis|Plot to/g, d.plotTo],
    [/Торги от|Termin ab|Auction from/g, d.dateFrom],
    [/Торги до|Termin bis|Auction to/g, d.dateTo],
    [/Памятник архитектуры|Denkmalschutz|Listed building/g, d.monument],
    [/Ценовые границы|Wertgrenzen|Price limits/g, d.limits],
    [/№ термина|Termin-Nr\\.|Auction no\\./g, d.termNo],
    [/Активен|Aktiv|Active/g, d.active],
    [/\\bДа\\b|\\bJa\\b|\\bYes\\b/g, d.yes],
    [/\\bНет\\b|\\bNein\\b|\\bNo\\b/g, d.no],
    [/не сняты\\s*\\/\\s*неизвестно|nicht weggefallen\\s*\\/\\s*unbekannt|not removed\\s*\\/\\s*unknown/gi, d.notRemoved],
    [/\\bСняты\\b|\\bweggefallen\\b|\\bremoved\\b/gi, d.removed],
    [/1-й термин|1\\. Termin|1st auction/g, d.term1],
    [/2-й термин|2\\. Termin|2nd auction/g, d.term2],
    [/3-й и больше|3\\. und weitere|3rd and later/g, d.term3],
    [/Квартиры|Wohnungen|Apartments/g, d.apartments],
    [/Коммерция|Gewerbe|Commercial/g, d.commercial],
    [/Участки|Grundstücke|Plots/g, d.plots],
    [/Земля\\s*\\/\\s*лес|Land\\s*\\/\\s*Wald|Land\\s*\\/\\s*forest/g, d.landForest],
    [/Жилые дома|Wohnhäuser|Residential houses/g, d.houses],
    [/Сдан в аренду|Vermietet|Rented/g, d.rented],
    [/Используется собственником|Eigennutzung|Owner-occupied/g, d.ownUse],
    [/Свободен|Frei|Vacant/g, d.free],
    [/Неизвестно|Unbekannt|Unknown/g, d.unknown],
  ];

  for (const [from, to] of replacements) text = text.replace(from, to);
  return text;
}

function chipText(chip: Chip, locale: Locale) {
  const raw = chip.label && chip.value ? \`\${chip.label}: \${chip.value}\` : chip.label || chip.value || "";
  return translateText(raw, locale);
}

export function ActiveFilters(props: ActiveFiltersProps) {
  const locale = normalizeLocale(props.locale);
  const chips = props.chips || props.activeFilters || props.filters || [];
  const clearHref = props.clearHref || props.resetHref || (typeof window !== "undefined" ? window.location.pathname : "/");

  const visible = useMemo(() => chips.filter(Boolean), [chips]);

  if (visible.length === 0) return null;

  return (
    <div className={props.className || "active-filters"}>
      <span className="active-filters-label">{dict[locale].activeFilters}</span>
      {visible.map((chip, index) => {
        const href = chip.removeHref || chip.href || clearHref;
        return (
          <Link className="filter-chip" href={href} key={chip.key || chip.label || chip.value || index}>
            {chipText(chip, locale)} ×
          </Link>
        );
      })}
      <Link className="filter-chip clear-chip" href={clearHref}>
        {dict[locale].clearAll}
      </Link>
    </div>
  );
}

export default ActiveFilters;
`);

/* -------------------------------------------------------------------------- */
/* 5. CSS: remove unstable blocks and add stable sizing                         */
/* -------------------------------------------------------------------------- */

patch("app/globals.css", (s) => {
  // Remove old unstable stage blocks.
  const markers = [
    "/* Stage 82 gallery calendar filters save */",
    "/* Stage 83 save search filters stats calendar account */",
    "/* Stage 84 real save no alert fullwidth */",
    "/* Stage 85 hard override save i18n layout */",
    "/* Stage 86 actual runtime patch */",
  ];

  for (const marker of markers) {
    let start = s.indexOf(marker);
    while (start !== -1) {
      let end = s.length;
      for (const other of markers) {
        if (other === marker) continue;
        const idx = s.indexOf(other, start + marker.length);
        if (idx !== -1 && idx < end) end = idx;
      }
      s = s.slice(0, start).trimEnd() + "\n\n" + s.slice(end).trimStart();
      start = s.indexOf(marker);
    }
  }

  if (!s.includes("/* Stage 88 source saved search i18n */")) {
    s += `

/* Stage 88 source saved search i18n */

.save-search-button {
  border: 0;
  cursor: pointer;
}

.active-filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  width: min(1280px, calc(100% - 48px));
  margin: 18px auto;
}

.active-filters-label {
  font-weight: 800;
  color: #526381;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid rgba(47, 97, 79, .22);
  background: rgba(234, 245, 240, .88);
  color: #0b3b2e;
  font-weight: 800;
  font-size: 13px;
  text-decoration: none;
}

.clear-chip {
  background: #fff;
  color: #526381;
}

.saved-search-list {
  display: grid;
  gap: 10px;
}

.saved-search-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  min-height: auto;
}

.cabinet-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cabinet-actions .btn,
.cabinet-actions button {
  min-height: 40px;
  height: 40px;
  padding: 0 16px;
  border-radius: 14px;
}

.cabinet-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: flex-end;
}

.cabinet-stats a {
  min-height: 40px;
  height: 40px;
  padding: 0 16px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.stats-panel,
.search-stats,
.results-stats {
  width: min(1280px, calc(100% - 48px));
  margin-left: auto;
  margin-right: auto;
}

@media (max-width: 760px) {
  .active-filters {
    width: min(100% - 24px, 1280px);
  }

  .saved-search-item {
    grid-template-columns: 1fr;
  }

  .cabinet-actions {
    justify-content: flex-start;
  }
}
`;
  }

  return s;
});

console.log("Stage 88 completed.");
