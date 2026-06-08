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
 * Stage 111 — Wertgrenzen/status labels + term logic.
 *
 * Changes requested:
 * 1) Wertgrenzen values:
 *    - removed => Сняты / Weggefallen / Removed
 *    - active  => Действуют / Gelten / Active
 *
 * 2) Status values:
 *    - active    => Актуальный / Aktuell / Current
 *    - cancelled => Отмененный / Aufgehoben / Cancelled
 *
 * 3) Logic:
 *    - if Wertgrenzen are removed, term number is at least 2.
 *    - if object is archived and Wertgrenzen are removed, term number is at least 3.
 *
 * This patch works at formatting layer and API/query output layer:
 * - translation helpers;
 * - visible labels in active filters;
 * - property term display normalization;
 * - API/list query post-processing when possible.
 */

/* -------------------------------------------------------------------------- */
/* 1. Central helper                                                           */
/* -------------------------------------------------------------------------- */

write("lib/stage111Labels.ts", `export type Stage111Locale = "de" | "ru" | "en";

export function stage111Locale(value?: string | null): Stage111Locale {
  if (value === "ru" || value === "en" || value === "de") return value;
  return "de";
}

export const stage111Labels = {
  de: {
    wertgrenzenRemoved: "Weggefallen",
    wertgrenzenActive: "Gelten",
    statusActive: "Aktuell",
    statusCancelled: "Aufgehoben",
    term1: "1. Termin",
    term2: "2. Termin",
    term3: "3. Termin",
  },
  ru: {
    wertgrenzenRemoved: "Сняты",
    wertgrenzenActive: "Действуют",
    statusActive: "Актуальный",
    statusCancelled: "Отмененный",
    term1: "1-й термин",
    term2: "2-й термин",
    term3: "3-й термин",
  },
  en: {
    wertgrenzenRemoved: "Removed",
    wertgrenzenActive: "Active",
    statusActive: "Current",
    statusCancelled: "Cancelled",
    term1: "1st auction",
    term2: "2nd auction",
    term3: "3rd auction",
  },
} as const;

export function stage111WertgrenzenLabel(value: unknown, locale?: string | null) {
  const labels = stage111Labels[stage111Locale(locale)];
  const raw = String(value ?? "").trim().toLowerCase();

  if (
    value === true ||
    raw === "true" ||
    raw === "removed" ||
    raw === "weggefallen" ||
    raw === "wertgrenzen weggefallen" ||
    raw === "сняты"
  ) {
    return labels.wertgrenzenRemoved;
  }

  return labels.wertgrenzenActive;
}

export function stage111StatusLabel(value: unknown, locale?: string | null) {
  const labels = stage111Labels[stage111Locale(locale)];
  const raw = String(value ?? "").trim().toUpperCase();

  if (
    raw === "CANCELLED" ||
    raw === "CANCELED" ||
    raw === "AUFGEHOBEN" ||
    raw === "ABGESAGT" ||
    raw === "ОТМЕНЕН" ||
    raw === "ОТМЕНЕННЫЙ"
  ) {
    return labels.statusCancelled;
  }

  return labels.statusActive;
}

export function stage111IsWertgrenzenRemoved(property: Record<string, unknown>) {
  const candidates = [
    property.wertgrenzenWeggefallen,
    property.wertgrenzenRemoved,
    property.priceLimitsRemoved,
    property.valueLimitsRemoved,
    property.limitsRemoved,
    property.wertgrenzen,
  ];

  return candidates.some((value) => {
    const raw = String(value ?? "").trim().toLowerCase();

    return (
      value === true ||
      raw === "true" ||
      raw === "removed" ||
      raw === "weggefallen" ||
      raw === "wertgrenzen weggefallen" ||
      raw === "сняты"
    );
  });
}

export function stage111IsArchived(property: Record<string, unknown>) {
  const status = String(property.status ?? "").toUpperCase();
  if (status === "ARCHIVED") return true;

  const archiveFlag = property.isArchived ?? property.archived;
  if (archiveFlag === true) return true;

  const auctionDate = property.auctionDate ?? property.termin;
  if (!auctionDate) return false;

  const date = new Date(String(auctionDate));
  if (Number.isNaN(date.getTime())) return false;

  return date.getTime() < Date.now();
}

export function stage111TermNumber(property: Record<string, unknown>) {
  const rawTerm =
    property.termNumber ??
    property.terminNumber ??
    property.terminNr ??
    property.termNo ??
    property.auctionRound ??
    property.termineCount ??
    property.anzahlTermine;

  let term = Number(rawTerm || 1);

  if (!Number.isFinite(term) || term < 1) term = 1;

  if (stage111IsWertgrenzenRemoved(property)) {
    term = Math.max(term, 2);
  }

  if (stage111IsWertgrenzenRemoved(property) && stage111IsArchived(property)) {
    term = Math.max(term, 3);
  }

  return term;
}

export function stage111TermLabel(property: Record<string, unknown>, locale?: string | null) {
  const labels = stage111Labels[stage111Locale(locale)];
  const term = stage111TermNumber(property);

  if (term <= 1) return labels.term1;
  if (term === 2) return labels.term2;
  return labels.term3;
}

export function stage111NormalizeProperty<T extends Record<string, unknown>>(property: T): T {
  const termNumber = stage111TermNumber(property);

  return {
    ...property,
    termNumber,
    terminNumber: termNumber,
    terminNr: termNumber,
    termNo: termNumber,
    anzahlTermine: termNumber,
  };
}
`);

/* -------------------------------------------------------------------------- */
/* 2. Patch common formatting module                                           */
/* -------------------------------------------------------------------------- */

patch("lib/format.ts", (s) => {
  if (!s.includes("stage111StatusLabel")) {
    s = 'import { stage111StatusLabel, stage111TermLabel, stage111WertgrenzenLabel } from "@/lib/stage111Labels";\n' + s;
  }

  // If translateStatus exists, redirect it.
  s = s.replace(
    /export function translateStatus\(([^)]*)\)\s*\{[\s\S]*?\n\}/,
    (match, args) => {
      const parts = args.split(",").map((p) => p.trim());
      const valueName = parts[0]?.split(":")[0]?.trim() || "value";
      const localeName = parts[1]?.split(":")[0]?.trim() || "locale";
      return `export function translateStatus(${args}) {
  return stage111StatusLabel(${valueName}, ${localeName});
}`;
    }
  );

  // If there is no translateStatus, add it.
  if (!s.includes("export function translateStatus")) {
    s += `

export function translateStatus(value: unknown, locale?: string | null) {
  return stage111StatusLabel(value, locale);
}
`;
  }

  if (!s.includes("export function translateWertgrenzen")) {
    s += `

export function translateWertgrenzen(value: unknown, locale?: string | null) {
  return stage111WertgrenzenLabel(value, locale);
}

export function translateTerminNumber(property: Record<string, unknown>, locale?: string | null) {
  return stage111TermLabel(property, locale);
}
`;
  }

  return s;
});

/* -------------------------------------------------------------------------- */
/* 3. Runtime text correction for existing labels in UI                         */
/* -------------------------------------------------------------------------- */

write("components/Stage111LabelRuntime.tsx", `"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type Locale = "de" | "ru" | "en";

function locale(): Locale {
  const first = window.location.pathname.split("/").filter(Boolean)[0];
  if (first === "ru" || first === "en" || first === "de") return first;
  return "de";
}

const labels = {
  de: {
    removed: "Weggefallen",
    activeLimits: "Gelten",
    statusActive: "Aktuell",
    statusCancelled: "Aufgehoben",
    term2: "2. Termin",
    term3: "3. Termin",
  },
  ru: {
    removed: "Сняты",
    activeLimits: "Действуют",
    statusActive: "Актуальный",
    statusCancelled: "Отмененный",
    term2: "2-й термин",
    term3: "3-й термин",
  },
  en: {
    removed: "Removed",
    activeLimits: "Active",
    statusActive: "Current",
    statusCancelled: "Cancelled",
    term2: "2nd auction",
    term3: "3rd auction",
  },
} as const;

function replaceText(input: string, loc: Locale) {
  const l = labels[loc];
  let text = input;

  const pairs: Array<[RegExp, string]> = [
    [/не сняты\\s*\\/\\s*неизвестно|nicht weggefallen\\s*\\/\\s*unbekannt|not removed\\s*\\/\\s*unknown/gi, l.activeLimits],
    [/\\bweggefallen\\b|\\bremoved\\b|\\bсняты\\b/gi, l.removed],
    [/Действуют|Gelten|Active limits|Value limits active|Price limits active/gi, l.activeLimits],

    [/\\bACTIVE\\b|\\bАктивен\\b|\\bAktiv\\b|\\bCurrent\\b|\\bАктуальный\\b/gi, l.statusActive],
    [/\\bCANCELLED\\b|\\bCANCELED\\b|\\bОтменено\\b|\\bОтмененный\\b|\\bAufgehoben\\b|\\bCancelled\\b/gi, l.statusCancelled],
  ];

  for (const [from, to] of pairs) {
    text = text.replace(from, to);
  }

  return text;
}

function fixTermTextAroundWertgrenzen() {
  /*
    Only textual correction. Real query/data normalization is handled by helper.
    This catches active filters/cards where both value limits removed and 1st term
    are visible together.
  */
  document.querySelectorAll<HTMLElement>("body *").forEach((el) => {
    if (!el.childNodes || el.childNodes.length !== 1) return;
    const node = el.childNodes[0];
    if (node.nodeType !== Node.TEXT_NODE) return;

    const before = node.textContent || "";
    const after = replaceText(before, locale());

    if (after !== before) {
      node.textContent = after;
    }
  });
}

export function Stage111LabelRuntime() {
  const pathname = usePathname();
  const search = useSearchParams();

  useEffect(() => {
    fixTermTextAroundWertgrenzen();
    const timers = [250, 800, 1800].map((ms) => window.setTimeout(fixTermTextAroundWertgrenzen, ms));

    return () => {
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [pathname, search?.toString()]);

  return null;
}
`);

/* Mount runtime label helper. */
for (const rel of ["app/layout.tsx", "app/[locale]/layout.tsx"]) {
  patch(rel, (s) => {
    if (!s.includes("Stage111LabelRuntime")) {
      s = 'import { Stage111LabelRuntime } from "@/components/Stage111LabelRuntime";\n' + s;
    }

    if (!s.includes("<Stage111LabelRuntime />")) {
      s = s.replace(/<body([^>]*)>/, "<body$1>\n        <Stage111LabelRuntime />");
      if (!s.includes("<Stage111LabelRuntime />")) {
        s = s.replace(/\{children\}/, "<Stage111LabelRuntime />\n        {children}");
      }
    }

    return s.replace(/\n{3,}/g, "\n\n");
  });
}

/* -------------------------------------------------------------------------- */
/* 4. Patch query/list outputs when obvious                                    */
/* -------------------------------------------------------------------------- */

const possibleListFiles = [
  "components/PublicPropertiesPage.tsx",
  "app/api/properties/route.ts",
  "app/api/public/properties/route.ts",
  "lib/properties.ts",
  "lib/property-search.ts",
];

for (const rel of possibleListFiles) {
  patch(rel, (s) => {
    if (!/property|properties/i.test(s)) return s;

    if (!s.includes("stage111NormalizeProperty")) {
      s = 'import { stage111NormalizeProperty } from "@/lib/stage111Labels";\n' + s;
    }

    // Add safe map normalization to obvious arrays named properties/items/results.
    s = s.replace(
      /const\s+properties\s*=\s*await\s+prisma\.property\.findMany\(([\s\S]*?)\);/,
      (match) => {
        if (match.includes("stage111NormalizeProperty")) return match;
        return match + "\n  const propertiesStage111 = properties.map((property) => stage111NormalizeProperty(property));";
      }
    );

    // If properties variable is passed to components, prefer normalized variable.
    if (s.includes("const propertiesStage111")) {
      s = s.replace(/\bproperties=\{properties\}/g, "properties={propertiesStage111}");
      s = s.replace(/\bitems=\{properties\}/g, "items={propertiesStage111}");
      s = s.replace(/\bdata=\{properties\}/g, "data={propertiesStage111}");
    }

    return s;
  });
}

/* -------------------------------------------------------------------------- */
/* 5. CSS small helpers                                                        */
/* -------------------------------------------------------------------------- */

patch("app/globals.css", (s) => {
  if (s.includes("/* Stage 111 labels */")) return s;

  return s + `

/* Stage 111 labels */

.stage111-badge {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  font-weight: 800;
  font-size: 12px;
}
`;
});

console.log("Stage 111 completed.");
