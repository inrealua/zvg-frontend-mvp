import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function write(rel, content) {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
  console.log("written", rel);
}

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

/**
 * Stage 70A
 * Language routes:
 *   /ru -> same page with zvg_locale=ru
 *   /de -> same page with zvg_locale=de
 *   /en -> same page with zvg_locale=en
 *   /ru/properties/123 -> /properties/123 internally, cookie ru
 *
 * This keeps your existing app structure. No need to duplicate every app route under app/[locale].
 */
const proxyContent = `import { NextRequest, NextResponse } from "next/server";

const LOCALES = ["ru", "de", "en"] as const;
type Locale = (typeof LOCALES)[number];

function isLocale(value: string | undefined): value is Locale {
  return value === "ru" || value === "de" || value === "en";
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const first = pathname.split("/").filter(Boolean)[0];

  if (!isLocale(first)) {
    return NextResponse.next();
  }

  const nextPath = pathname.replace(new RegExp("^/" + first + "(?=/|$)"), "") || "/";
  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = nextPath;
  rewriteUrl.search = search;

  const response = NextResponse.rewrite(rewriteUrl);
  response.cookies.set("zvg_locale", first, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  return response;
}

export const config = {
  matcher: [
    "/ru/:path*",
    "/de/:path*",
    "/en/:path*",
  ],
};
`;

write("proxy.ts", proxyContent);

// Remove old middleware if it only redirected locale badly? Safer: keep it. But Next 16 warns middleware deprecated.
// We do not delete middleware to avoid breaking auth; proxy will handle locale paths first/also.

/**
 * Stage 70B
 * More reliable server-side locale detection:
 * If getI18n/getLocale uses only cookie, proxy is enough.
 * If it reads headers too, add x-zvg-locale header in proxy? Cookie set on rewrite may not be visible in same request.
 * So we also patch common i18n server helpers to read path prefix / header if possible.
 */
for (const rel of ["lib/i18n/server.ts", "lib/i18n.ts", "lib/locale.ts"]) {
  patchFile(rel, (s) => {
    // Add support for next/headers headers() if this is an async server helper and no x-zvg-locale present.
    if (!s.includes("x-zvg-locale") && s.includes("cookies")) {
      s = s.replace(/cookies\(\)\.get\(["']zvg_locale["']\)\?\.value/g, '(headers().get("x-zvg-locale") || cookies().get("zvg_locale")?.value)');
      if (!s.includes('headers } from "next/headers"') && s.includes('from "next/headers"')) {
        s = s.replace(/import\s*\{([^}]+)\}\s*from\s*["']next\/headers["'];/, (m, imports) => {
          return `import { ${imports.includes("headers") ? imports : imports.trim() + ", headers"} } from "next/headers";`;
        });
      }
    }
    return s;
  });
}

// Update proxy to set header too.
patchFile("proxy.ts", (s) => {
  if (s.includes("x-zvg-locale")) return s;
  s = s.replace(
    "const response = NextResponse.rewrite(rewriteUrl);",
    `const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-zvg-locale", first);

  const response = NextResponse.rewrite(rewriteUrl, {
    request: { headers: requestHeaders },
  });`
  );
  return s;
});

/**
 * Stage 70C
 * PublicPropertiesPage:
 * Replace hardcoded empty state via exact JSX-ish text, and hide old list heading.
 * This patch is careful: it does NOT insert server/client document code.
 */
patchFile("components/PublicPropertiesPage.tsx", (s) => {
  // Locate/add a small dictionary near imports/top level if not there.
  if (!s.includes("stage70ListText")) {
    const dict = `
type Stage70Locale = "de" | "ru" | "en";

const stage70ListText = {
  de: {
    emptyTitle: "Keine Objekte gefunden",
    emptyText: "Entfernen Sie einige Filter, erweitern Sie den Preisbereich oder wählen Sie eine andere Stadt.",
    activeFilters: "Aktive Filter:",
    clearAll: "Alles löschen",
    prev: "Zurück",
    next: "Weiter",
  },
  ru: {
    emptyTitle: "Объекты не найдены",
    emptyText: "Попробуй убрать часть фильтров, расширить диапазон цены или выбрать другой город.",
    activeFilters: "Активные фильтры:",
    clearAll: "Очистить всё",
    prev: "Назад",
    next: "Вперёд",
  },
  en: {
    emptyTitle: "No objects found",
    emptyText: "Try removing some filters, expanding the price range, or choosing another city.",
    activeFilters: "Active filters:",
    clearAll: "Clear all",
    prev: "Back",
    next: "Next",
  },
} as const;

function stage70T(locale: Stage70Locale) {
  return stage70ListText[locale] || stage70ListText.de;
}
`;
    s = dict + "\n" + s;
  }

  // If component has locale variable, this works. If not, it will show TS error and we'll patch next.
  s = s
    .replace(/<h2>\s*Top 12 aktuelle Objekte\s*<\/h2>\s*<p>\s*Kurze Auswahl für die Startseite\. Die vollständige Recherche finden Sie in der erweiterten Suche\.\s*<\/p>/g, "")
    .replace(/<h2>\s*Top-12 актуальных объектов\s*<\/h2>\s*<p>\s*Короткая подборка для главной страницы\.[\s\S]*?<\/p>/g, "")
    .replace(/<h2>\s*Top 12 current objects\s*<\/h2>\s*<p>\s*Short selection for the home page\.[\s\S]*?<\/p>/g, "");

  // Empty state direct replacements, both plain text and earlier stage broken placeholders.
  s = s
    .replace(/Объекты не найдены/g, "{stage70T(locale as Stage70Locale).emptyTitle}")
    .replace(/Попробуй убрать часть фильтров, расширить диапазон цены или выбрать другой город\./g, "{stage70T(locale as Stage70Locale).emptyText}")
    .replace(/Keine Objekte gefunden/g, "{stage70T(locale as Stage70Locale).emptyTitle}")
    .replace(/Entfernen Sie einige Filter, erweitern Sie den Preisbereich oder wählen Sie eine andere Stadt\./g, "{stage70T(locale as Stage70Locale).emptyText}")
    .replace(/No objects found/g, "{stage70T(locale as Stage70Locale).emptyTitle}")
    .replace(/Try removing some filters, expanding the price range, or choosing another city\./g, "{stage70T(locale as Stage70Locale).emptyText}");

  // Fix if JSX text became literal "{stage69Text...}" from older patch.
  s = s
    .replace(/\{stage69Text\(locale as Stage69Locale\)\.emptyTitle\}/g, "{stage70T(locale as Stage70Locale).emptyTitle}")
    .replace(/\{stage69Text\(locale as Stage69Locale\)\.emptyText\}/g, "{stage70T(locale as Stage70Locale).emptyText}")
    .replace(/\{stage69Text\(locale as Stage69Locale\)\.activeFilters\}/g, "{stage70T(locale as Stage70Locale).activeFilters}")
    .replace(/\{stage69Text\(locale as Stage69Locale\)\.clearAll\}/g, "{stage70T(locale as Stage70Locale).clearAll}")
    .replace(/\{stage69Text\(locale as Stage69Locale\)\.prev\}/g, "{stage70T(locale as Stage70Locale).prev}")
    .replace(/\{stage69Text\(locale as Stage69Locale\)\.next\}/g, "{stage70T(locale as Stage70Locale).next}");

  // Active filters / clear all / pagination text.
  s = s
    .replace(/Aktive Filter:/g, "{stage70T(locale as Stage70Locale).activeFilters}")
    .replace(/Active Filter:/g, "{stage70T(locale as Stage70Locale).activeFilters}")
    .replace(/Active Filters:/g, "{stage70T(locale as Stage70Locale).activeFilters}")
    .replace(/Активные фильтры:/g, "{stage70T(locale as Stage70Locale).activeFilters}")
    .replace(/Alles löschen/g, "{stage70T(locale as Stage70Locale).clearAll}")
    .replace(/Очистить всё/g, "{stage70T(locale as Stage70Locale).clearAll}")
    .replace(/Clear all/g, "{stage70T(locale as Stage70Locale).clearAll}")
    .replace(/←\s*Назад/g, "← {stage70T(locale as Stage70Locale).prev}")
    .replace(/Вперёд\s*→/g, "{stage70T(locale as Stage70Locale).next} →")
    .replace(/←\s*Zurück/g, "← {stage70T(locale as Stage70Locale).prev}")
    .replace(/Weiter\s*→/g, "{stage70T(locale as Stage70Locale).next} →")
    .replace(/←\s*Back/g, "← {stage70T(locale as Stage70Locale).prev}")
    .replace(/Next\s*→/g, "{stage70T(locale as Stage70Locale).next} →");

  // Empty listTitle/listText from copy builder if still used.
  s = s.replace(/listTitle:\s*["']Top 12 aktuelle Objekte["'],/g, 'listTitle: "",');
  s = s.replace(/listText:\s*["']Kurze Auswahl für die Startseite\. Die vollständige Recherche finden Sie in der erweiterten Suche\.["'],/g, 'listText: "",');

  return s;
});

/**
 * Stage 70D
 * PropertyMap legend: show all actual property type groups.
 * We add missing legend items if the rendered legend contains stage61MapT helpers.
 * Remove only cancelled.
 */
for (const rel of ["components/PropertyMap.tsx", "app/components/PropertyMap.tsx"]) {
  patchFile(rel, (s) => {
    // Extend map dictionary if present.
    s = s
      .replace(/commercial:\s*"Gewerbe",/g, 'commercial: "Gewerbe",\n    landForest: "Land / Wald",\n    garages: "Garagen / Parken",\n    other: "Sonstige",')
      .replace(/commercial:\s*"Коммерция",/g, 'commercial: "Коммерция",\n    landForest: "Земля / лес",\n    garages: "Гаражи / парковки",\n    other: "Прочее",')
      .replace(/commercial:\s*"Commercial",/g, 'commercial: "Commercial",\n    landForest: "Land / forest",\n    garages: "Garages / parking",\n    other: "Other",');

    // If already has no extra text, add extra legend items after commercial.
    if (s.includes("stage61MapT().commercial") && !s.includes("stage61MapT().landForest")) {
      s = s.replace(
        /(<span><i className="legend-dot gewerbe" \/>[\s\S]*?stage61MapT\(\)\.commercial[\s\S]*?<\/span>)/,
        `$1
        <span><i className="legend-dot land-wald" />{stage61MapT().landForest}</span>
        <span><i className="legend-dot garagen" />{stage61MapT().garages}</span>
        <span><i className="legend-dot sonstige" />{stage61MapT().other}</span>`
      );
    }

    // Remove only cancelled entry.
    s = s.replace(/\n\s*<span><i className=["']legend-dot\s+(?:cancelled|aufgehoben)["']\s*\/>\s*(?:\{stage61MapT\(\)\.cancelled\}|отменено|aufgehoben|cancelled)\s*<\/span>/gi, "");
    s = s.replace(/\n\s*<span>[\s\S]*?(?:stage61MapT\(\)\.cancelled|отменено|aufgehoben|cancelled)[\s\S]*?<\/span>/gi, "");
    s = s.replace(/\n\s*<span>\s*\n\s*<\/div>\s*\n\s*<\/aside>/g, "\n      </div>\n    </aside>");
    return s;
  });
}

/**
 * Stage 70E
 * Date format:
 * Native date popup language cannot be fully forced. To restore local placeholders:
 * use type="date" with lang and add CSS/attributes only. Do not switch to text.
 */
patchFile("components/FilterBar.tsx", (s) => {
  s = s.replace(
    /<input id="dateFrom" name="dateFrom" type="date" defaultValue=\{getInitialValue\(searchParams, "dateFrom"\)\} \/>/g,
    '<input id="dateFrom" name="dateFrom" type="date" lang={locale} defaultValue={getInitialValue(searchParams, "dateFrom")} />'
  );
  s = s.replace(
    /<input id="dateTo" name="dateTo" type="date" defaultValue=\{getInitialValue\(searchParams, "dateTo"\)\} \/>/g,
    '<input id="dateTo" name="dateTo" type="date" lang={locale} defaultValue={getInitialValue(searchParams, "dateTo")} />'
  );
  return s;
});

/**
 * Stage 70F CSS
 */
patchFile("app/globals.css", (s) => {
  if (s.includes("/* Stage 70 locale routes and i18n fixes */")) return s;

  return s + `

/* Stage 70 locale routes and i18n fixes */

/* Remove old Top-12 heading area if still present as empty block */
.section-heading-row h2:empty,
.section-heading-row p:empty,
.section-heading-row:has(h2:empty):has(p:empty) {
  display: none !important;
}

/* Buttons: Stage 69 target = 18px */
.search-filter-grid-v60 > .filter-action-button-v60,
.search-filter-grid-v59 > .filter-action-button-v59,
.search-filter-grid-v58 > .filter-action-button-v58 {
  margin-top: 18px !important;
}

/* Map legend: do not hide last item. Show all property types except cancelled. */
.map-legend > *:last-child,
.property-map-legend > *:last-child,
.leaflet-container + .map-legend > *:last-child {
  display: inline-flex !important;
}

.map-legend span:has(.legend-dot.cancelled),
.map-legend span:has(.legend-dot.aufgehoben),
.property-map-legend span:has(.legend-dot.cancelled),
.property-map-legend span:has(.legend-dot.aufgehoben) {
  display: none !important;
}

/* Colors for additional legend items if CSS classes did not exist */
.legend-dot.land-wald,
.legend-dot.garagen,
.legend-dot.sonstige {
  display: inline-block;
}

/* Date inputs: browser popup locale mostly follows browser/OS; lang attribute is set in JSX */
.search-filter-v60 input[type="date"],
.search-filter-v59 input[type="date"],
.search-filter-v58 input[type="date"] {
  color-scheme: light !important;
}
`;
});

console.log("Stage 70 patch completed.");
