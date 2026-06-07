import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function patchFile(rel, updater) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    console.log("skip missing", rel);
    return;
  }

  const before = fs.readFileSync(full, "utf8");
  const after = updater(before);

  if (after !== before) {
    fs.writeFileSync(full, after, "utf8");
    console.log("patched", rel);
  } else {
    console.log("unchanged", rel);
  }
}

function writeFile(rel, content) {
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, "utf8");
  console.log("written", rel);
}

/**
 * STAGE 72
 *
 * 1) Root / redirects to /ru, /de, /en by cookie or browser language.
 * 2) Language switcher should use locale URLs where obvious.
 * 3) FilterBar option values Denkmalschutz / Wertgrenzen / Termin-Nr. are translated
 *    even if option values or option labels are mixed RU/DE/EN from older stages.
 * 4) Map legend extra types get visible colored dots.
 */

/**
 * 1. Replace proxy.ts with robust locale redirect/rewrite.
 */
writeFile("proxy.ts", `import { NextRequest, NextResponse } from "next/server";

const LOCALES = ["ru", "de", "en"] as const;
type Locale = (typeof LOCALES)[number];

function isLocale(value: string | undefined): value is Locale {
  return value === "ru" || value === "de" || value === "en";
}

function pickLocale(request: NextRequest): Locale {
  const cookieLocale = request.cookies.get("zvg_locale")?.value;
  if (isLocale(cookieLocale)) return cookieLocale;

  const accept = request.headers.get("accept-language")?.toLowerCase() || "";

  if (accept.startsWith("ru") || accept.includes(",ru")) return "ru";
  if (accept.startsWith("de") || accept.includes(",de")) return "de";
  return "en";
}

function isPublicFile(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/robots") ||
    pathname.startsWith("/sitemap") ||
    pathname.match(/\\.[a-zA-Z0-9]+$/)
  );
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isPublicFile(pathname)) {
    return NextResponse.next();
  }

  const first = pathname.split("/").filter(Boolean)[0];

  // User opens zvg-de.com -> redirect to language URL.
  if (pathname === "/") {
    const locale = pickLocale(request);
    const url = request.nextUrl.clone();
    url.pathname = "/" + locale;
    url.search = search;

    const response = NextResponse.redirect(url);
    response.cookies.set("zvg_locale", locale, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  }

  // Locale URLs exist as real pages, but nested locale URLs are internally rewritten:
  // /ru/properties/123 -> /properties/123 with cookie/header locale ru.
  if (isLocale(first)) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-zvg-locale", first);

    const nextPath = pathname.replace(new RegExp("^/" + first + "(?=/|$)"), "") || "/";
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = nextPath;
    rewriteUrl.search = search;

    // For exact /ru /de /en, do not rewrite. Real app/ru/page.tsx etc handle them.
    const response = nextPath === "/"
      ? NextResponse.next({ request: { headers: requestHeaders } })
      : NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } });

    response.cookies.set("zvg_locale", first, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
`);

/**
 * 2. Patch layout/header language switcher to route to /ru /de /en where obvious.
 * This is intentionally conservative.
 */
for (const rel of [
  "components/LanguageSwitcher.tsx",
  "components/LocaleSwitcher.tsx",
  "components/Header.tsx",
  "components/SiteHeader.tsx",
  "components/MainNav.tsx",
]) {
  patchFile(rel, (s) => {
    // If it has select options by language code, make values URLs.
    s = s.replace(/<option value=["']ru["']>/g, '<option value="/ru">');
    s = s.replace(/<option value=["']de["']>/g, '<option value="/de">');
    s = s.replace(/<option value=["']en["']>/g, '<option value="/en">');

    // If onChange only sets cookie, navigate when value starts with /.
    if (s.includes("onChange") && !s.includes("stage72LanguageNavigate")) {
      s = s.replace(
        /onChange=\{\s*\(event\)\s*=>\s*\{/,
        `onChange={(event) => {
          const stage72LanguageNavigate = String(event.target.value);
          if (stage72LanguageNavigate.startsWith("/")) {
            window.location.href = stage72LanguageNavigate;
            return;
          }`
      );
    }

    return s;
  });
}

/**
 * 3. FilterBar: make option translation robust by value AND by label.
 */
patchFile("components/FilterBar.tsx", (s) => {
  // Add broader dictionary entries into optionLabels if those keys exist.
  const additions = {
    de: {
      "yes": "Ja",
      "no": "Nein",
      "ja": "Ja",
      "nein": "Nein",
      "Да": "Ja",
      "Нет": "Nein",
      "Не важно": "Beliebig",
      "Любая": "Beliebig",
      "Любой термин": "Jeder Termin",
      "1-й термин": "1. Termin",
      "2-й термин": "2. Termin",
      "3-й и больше": "3. und weitere",
      "Сняты": "Weggefallen",
      "Не сняты / неизвестно": "Nicht weggefallen / unbekannt",
      "removed": "Weggefallen",
      "not_removed": "Nicht weggefallen / unbekannt",
      "notRemoved": "Nicht weggefallen / unbekannt",
      "1": "1. Termin",
      "2": "2. Termin",
      "3plus": "3. und weitere"
    },
    ru: {
      "yes": "Да",
      "no": "Нет",
      "ja": "Да",
      "nein": "Нет",
      "Ja": "Да",
      "Nein": "Нет",
      "Beliebig": "Любая",
      "Jeder Termin": "Любой термин",
      "1. Termin": "1-й термин",
      "2. Termin": "2-й термин",
      "3. und weitere": "3-й и больше",
      "Weggefallen": "Сняты",
      "Nicht weggefallen / unbekannt": "Не сняты / неизвестно",
      "removed": "Сняты",
      "not_removed": "Не сняты / неизвестно",
      "notRemoved": "Не сняты / неизвестно",
      "1": "1-й термин",
      "2": "2-й термин",
      "3plus": "3-й и больше"
    },
    en: {
      "yes": "Yes",
      "no": "No",
      "ja": "Yes",
      "nein": "No",
      "Да": "Yes",
      "Нет": "No",
      "Beliebig": "Any",
      "Любая": "Any",
      "Любой термин": "Any auction",
      "Jeder Termin": "Any auction",
      "1-й термин": "1st auction",
      "2-й термин": "2nd auction",
      "3-й и больше": "3rd and more",
      "1. Termin": "1st auction",
      "2. Termin": "2nd auction",
      "3. und weitere": "3rd and more",
      "Сняты": "Removed",
      "Не сняты / неизвестно": "Not removed / unknown",
      "Weggefallen": "Removed",
      "Nicht weggefallen / unbekannt": "Not removed / unknown",
      "removed": "Removed",
      "not_removed": "Not removed / unknown",
      "notRemoved": "Not removed / unknown",
      "1": "1st auction",
      "2": "2nd auction",
      "3plus": "3rd and more"
    }
  };

  function inject(locale, entries, text) {
    for (const [key, value] of Object.entries(entries)) {
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const already = new RegExp(`["']${escapedKey}["']\\s*:`).test(text);
      if (!already) {
        const marker = `${locale}: {`;
        const idx = text.indexOf(marker);
        if (idx !== -1) {
          const insertAt = idx + marker.length;
          text = text.slice(0, insertAt) + `\n    ${JSON.stringify(key)}: ${JSON.stringify(value)},` + text.slice(insertAt);
        }
      }
    }
    return text;
  }

  s = inject("de", additions.de, s);
  s = inject("ru", additions.ru, s);
  s = inject("en", additions.en, s);

  // Replace localizeOption to check value and label.
  s = s.replace(
    /function localizeOption\(option: SelectOption, locale: Locale\): SelectOption \{[\s\S]*?\n\}/,
    `function localizeOption(option: SelectOption, locale: Locale): SelectOption {
  if (!option.value) return option;
  const dict = optionLabels[locale] as Record<string, string>;
  const byValue = dict[String(option.value)];
  const byLabel = dict[String(option.label)];
  return { ...option, label: byValue || byLabel || option.label };
}`
  );

  return s;
});

/**
 * 4. PropertyMap legend: ensure all labels have dots and useful classes.
 */
patchFile("components/PropertyMap.tsx", (s) => {
  // If extra legend items were added without matching css classes, keep them and CSS below handles dots.
  // Ensure entries exist if dictionary exists.
  if (s.includes("stage61MapT().commercial") && !s.includes("stage61MapT().landForest")) {
    s = s
      .replace(/commercial:\s*"Gewerbe",/g, 'commercial: "Gewerbe",\n    landForest: "Land / Wald",\n    garages: "Garagen / Parken",\n    other: "Sonstige",')
      .replace(/commercial:\s*"Коммерция",/g, 'commercial: "Коммерция",\n    landForest: "Земля / лес",\n    garages: "Гаражи / парковки",\n    other: "Прочее",')
      .replace(/commercial:\s*"Commercial",/g, 'commercial: "Commercial",\n    landForest: "Land / forest",\n    garages: "Garages / parking",\n    other: "Other",');

    s = s.replace(
      /(<span><i className="legend-dot gewerbe" \/>[\s\S]*?stage61MapT\(\)\.commercial[\s\S]*?<\/span>)/,
      `$1
        <span><i className="legend-dot land-wald" />{stage61MapT().landForest}</span>
        <span><i className="legend-dot garagen" />{stage61MapT().garages}</span>
        <span><i className="legend-dot sonstige" />{stage61MapT().other}</span>`
    );
  }

  // Remove only cancelled item.
  s = s.replace(/\n\s*<span><i className=["']legend-dot\s+(?:cancelled|aufgehoben)["']\s*\/>\s*(?:\{stage61MapT\(\)\.cancelled\}|отменено|aufgehoben|cancelled)\s*<\/span>/gi, "");
  s = s.replace(/\n\s*<span>[\s\S]*?(?:stage61MapT\(\)\.cancelled|отменено|aufgehoben|cancelled)[\s\S]*?<\/span>/gi, "");
  s = s.replace(/\n\s*<span>\s*\n\s*<\/div>\s*\n\s*<\/aside>/g, "\n      </div>\n    </aside>");

  return s;
});

/**
 * 5. CSS:
 * - all legend items get colored dots;
 * - buttons remain at corrected height/position;
 */
patchFile("app/globals.css", (s) => {
  if (s.includes("/* Stage 72 locale redirect filter option and map legend fixes */")) return s;

  return s + `

/* Stage 72 locale redirect filter option and map legend fixes */

/* Keep action buttons in the corrected line */
.search-filter-grid-v60 > .filter-action-button-v60,
.search-filter-grid-v59 > .filter-action-button-v59,
.search-filter-grid-v58 > .filter-action-button-v58 {
  margin-top: 18px !important;
}

/* Map legend: every property type must have a colored dot */
.legend-dot,
.map-legend .legend-dot,
.property-map-legend .legend-dot {
  width: 11px !important;
  height: 11px !important;
  min-width: 11px !important;
  border-radius: 999px !important;
  display: inline-block !important;
  margin-right: 8px !important;
  vertical-align: -1px !important;
}

.legend-dot.haus,
.legend-dot.haeuser,
.legend-dot.wohnhaus,
.legend-dot.wohnhaeuser {
  background: #1f6b55 !important;
}

.legend-dot.wohnung,
.legend-dot.wohnungen {
  background: #2b6478 !important;
}

.legend-dot.grundstueck,
.legend-dot.grundstuecke {
  background: #7d9448 !important;
}

.legend-dot.gewerbe {
  background: #b26b38 !important;
}

.legend-dot.land-wald {
  background: #6d7f3f !important;
}

.legend-dot.garagen {
  background: #6a557e !important;
}

.legend-dot.sonstige {
  background: #7a7f87 !important;
}

/* Hide only cancelled, never hide the last legend item blindly */
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
`;
});

console.log("Stage 72 patch completed.");
