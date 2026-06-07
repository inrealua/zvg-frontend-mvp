import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function patchFile(rel, updater) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) {
    console.log("skip missing", rel);
    return;
  }
  const before = fs.readFileSync(file, "utf8");
  const after = updater(before);
  if (after !== before) {
    fs.writeFileSync(file, after, "utf8");
    console.log("patched", rel);
  } else {
    console.log("unchanged", rel);
  }
}

// 1) FilterBar: date lang + close multiselects when opening neighbour / outside click.
patchFile("components/FilterBar.tsx", (s) => {
  s = s.replace(
    /<input id="dateFrom" name="dateFrom" type="date" defaultValue=\{getInitialValue\(searchParams, "dateFrom"\)\} \/>/g,
    '<input id="dateFrom" name="dateFrom" type="date" lang={locale} defaultValue={getInitialValue(searchParams, "dateFrom")} />'
  );
  s = s.replace(
    /<input id="dateTo" name="dateTo" type="date" defaultValue=\{getInitialValue\(searchParams, "dateTo"\)\} \/>/g,
    '<input id="dateTo" name="dateTo" type="date" lang={locale} defaultValue={getInitialValue(searchParams, "dateTo")} />'
  );

  if (!s.includes("stage68CloseOtherMultiselects")) {
    const marker = "  const searchParams = useSearchParams();";
    const insert = `  const searchParams = useSearchParams();

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
  }, []);`;
    s = s.includes(marker) ? s.replace(marker, insert) : s;
  }
  return s;
});

// 2) PropertyMap: remove cancelled from legend as property type.
for (const rel of ["components/PropertyMap.tsx", "app/components/PropertyMap.tsx"]) {
  patchFile(rel, (s) => {
    s = s.replace(/\s*\{[^{}]*(?:key|type|id|value)\s*:\s*["'](?:cancelled|CANCELLED|aufgehoben)["'][^{}]*\},?/g, "");
    s = s.replace(/\s*\{[^{}]*label\s*:\s*(?:["'](?:aufgehoben|отменено|cancelled)["']|stage61MapT\(\)\.cancelled)[^{}]*\},?/g, "");
    s = s.replace(/<[^>]+>\s*\{?stage61MapT\(\)\.cancelled\}?\s*<\/[^>]+>/g, "");
    s = s.replace(/<[^>]+>\s*(?:aufgehoben|отменено|cancelled)\s*<\/[^>]+>/gi, "");
    s = s.replace(/[^?\n]+===\s*["']CANCELLED["']\s*\?\s*["']cancelled["']\s*:\s*/g, "");
    s = s.replace(/[^?\n]+===\s*["']cancelled["']\s*\?\s*["']cancelled["']\s*:\s*/g, "");
    return s;
  });
}

// 3) Pagination translation for Back/Next.
function patchPagination(s) {
  if (!s.includes("stage68PaginationText")) {
    const dict = `
type Stage68PaginationLocale = "de" | "ru" | "en";

function stage68ReadPaginationLocale(): Stage68PaginationLocale {
  if (typeof document === "undefined") return "de";
  const match = document.cookie.match(/(?:^|;\\s*)zvg_locale=(de|ru|en)(?:;|$)/);
  return (match?.[1] as Stage68PaginationLocale) || "de";
}

const stage68PaginationText = {
  de: { prev: "Zurück", next: "Weiter" },
  ru: { prev: "Назад", next: "Вперёд" },
  en: { prev: "Back", next: "Next" },
} as const;

function stage68Pg() {
  return stage68PaginationText[stage68ReadPaginationLocale()];
}
`;
    if (s.includes('"use client";')) s = s.replace('"use client";', `"use client";\n${dict}`);
    else if (s.includes("'use client';")) s = s.replace("'use client';", `'use client';\n${dict}`);
    else s = dict + "\n" + s;
  }

  s = s.replace(/>\s*←\s*(Назад|Zurück|Back)\s*</g, ">← {stage68Pg().prev}<");
  s = s.replace(/>\s*(Вперёд|Weiter|Next)\s*→\s*</g, ">{stage68Pg().next} →<");
  s = s.replace(/["']←\s*(Назад|Zurück|Back)["']/g, '`← ${stage68Pg().prev}`');
  s = s.replace(/["'](Вперёд|Weiter|Next)\s*→["']/g, '`${stage68Pg().next} →`');
  return s;
}
for (const rel of ["components/Pagination.tsx", "app/components/Pagination.tsx"]) {
  patchFile(rel, patchPagination);
}

// 4) PublicPropertiesPage fallback for pagination labels in the page itself.
patchFile("components/PublicPropertiesPage.tsx", (s) => {
  s = s.replace(/←\s*Назад/g, "← {siteText?.pagination?.prev ?? 'Назад'}");
  s = s.replace(/Вперёд\s*→/g, "{siteText?.pagination?.next ?? 'Вперёд'} →");
  s = s.replace(/←\s*Zurück/g, "← {siteText?.pagination?.prev ?? 'Zurück'}");
  s = s.replace(/Weiter\s*→/g, "{siteText?.pagination?.next ?? 'Weiter'} →");
  s = s.replace(/←\s*Back/g, "← {siteText?.pagination?.prev ?? 'Back'}");
  s = s.replace(/Next\s*→/g, "{siteText?.pagination?.next ?? 'Next'} →");
  return s;
});

// 5) CSS small fixes.
patchFile("app/globals.css", (s) => {
  if (s.includes("/* Stage 68 final small fixes */")) return s;
  return s + `

/* Stage 68 final small fixes */

/* Buttons: move 2px up compared to Stage 67 */
.search-filter-grid-v60 > .filter-action-button-v60,
.search-filter-grid-v59 > .filter-action-button-v59,
.search-filter-grid-v58 > .filter-action-button-v58 {
  margin-top: 20px !important;
}

/* Hide cancelled as a legend item, because it is not a property type */
.map-legend [data-type="cancelled"],
.map-legend [data-status="cancelled"],
.map-legend [data-key="cancelled"],
.map-legend [class*="cancelled"],
.map-legend [class*="aufgehoben"],
.property-map-legend [data-type="cancelled"],
.property-map-legend [data-status="cancelled"],
.property-map-legend [data-key="cancelled"],
.property-map-legend [class*="cancelled"],
.property-map-legend [class*="aufgehoben"] {
  display: none !important;
}

/* Fallback: in current map legend cancelled is the last item */
.map-legend > *:last-child,
.property-map-legend > *:last-child,
.leaflet-container + .map-legend > *:last-child {
  display: none !important;
}

.search-filter-v60 input[type="date"],
.search-filter-v59 input[type="date"],
.search-filter-v58 input[type="date"] {
  color-scheme: light !important;
}

.multi-filter-panel-v60,
.multi-filter-panel-v59,
.multi-filter-panel-v58 {
  position: absolute !important;
  z-index: 150 !important;
}
`;
});

console.log("Stage 68 patch completed.");
