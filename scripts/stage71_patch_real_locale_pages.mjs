import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function file(rel) {
  return path.join(root, rel);
}

function patchFile(rel, updater) {
  const full = file(rel);
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
  const full = file(rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, "utf8");
  console.log("written", rel);
}

/**
 * Stage 71
 * Real locale pages for:
 * /ru
 * /de
 * /en
 *
 * Why:
 * proxy.ts alone can fail on Vercel/routing setup or during static route matching.
 * Real app/[locale]/page.tsx guarantees these URLs exist and do not return 404.
 *
 * We patch PublicPropertiesPage to accept forcedLocale,
 * then app/[locale]/page.tsx renders the same home/search page with forced language.
 */

// 1) Patch PublicPropertiesPage to accept forcedLocale.
patchFile("components/PublicPropertiesPage.tsx", (s) => {
  // Add forcedLocale to destructuring.
  s = s.replace(
    /export async function PublicPropertiesPage\(\{\s*params,\s*mode,\s*\}/,
    'export async function PublicPropertiesPage({\n  params,\n  mode,\n  forcedLocale,\n}'
  );

  // Add forcedLocale to prop type.
  s = s.replace(
    /mode\??:\s*["']home["']\s*\|\s*["']map["']\s*\|\s*["']archive["'];/,
    'mode?: "home" | "map" | "archive";\n  forcedLocale?: "de" | "ru" | "en";'
  );

  // Some versions have only home/archive or another order. Add if not added.
  if (!s.includes('forcedLocale?: "de" | "ru" | "en";')) {
    s = s.replace(
      /(\{\s*\n\s*params[^}]+mode[^}]+)(\n\s*\})/,
      '$1\n  forcedLocale?: "de" | "ru" | "en";$2'
    );
  }

  // Replace common getI18n destructuring.
  s = s.replace(
    /const\s+\{\s*locale\s*,\s*t\s*\}\s*=\s*await\s+getI18n\(\)\s*;/,
    'const i18n = await getI18n();\n  const locale = forcedLocale ?? i18n.locale;\n  const t = i18n.t;'
  );

  s = s.replace(
    /const\s+\{\s*locale\s*\}\s*=\s*await\s+getI18n\(\)\s*;/,
    'const i18n = await getI18n();\n  const locale = forcedLocale ?? i18n.locale;'
  );

  // If there is already const locale = await getLocale() etc.
  s = s.replace(
    /const\s+locale\s*=\s*await\s+getLocale\(\)\s*;/,
    'const detectedLocale = await getLocale();\n  const locale = forcedLocale ?? detectedLocale;'
  );

  return s;
});

// 2) Create app/[locale]/page.tsx.
writeFile("app/[locale]/page.tsx", `import { notFound } from "next/navigation";
import { PublicPropertiesPage } from "@/components/PublicPropertiesPage";

const LOCALES = ["ru", "de", "en"] as const;
type Locale = (typeof LOCALES)[number];

function isLocale(value: string): value is Locale {
  return value === "ru" || value === "de" || value === "en";
}

export default async function LocaleHomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};

  return <PublicPropertiesPage params={resolvedSearchParams} mode="home" forcedLocale={locale} />;
}
`);

// 3) Add route-group friendly pages for direct static paths as fallback.
// If dynamic segment is enough, these are not needed. But explicit paths make it harder to 404.
for (const locale of ["ru", "de", "en"]) {
  writeFile(`app/${locale}/page.tsx`, `import { PublicPropertiesPage } from "@/components/PublicPropertiesPage";

export default async function ${locale.toUpperCase()}HomePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  return <PublicPropertiesPage params={resolvedSearchParams} mode="home" forcedLocale="${locale}" />;
}
`);
}

// 4) Patch language switcher links if known files exist.
// Goal: selector should navigate to /ru /de /en, not only set cookie.
for (const rel of [
  "components/LanguageSwitcher.tsx",
  "components/LocaleSwitcher.tsx",
  "components/Header.tsx",
  "components/SiteHeader.tsx",
]) {
  patchFile(rel, (s) => {
    // This is conservative. It does not rewrite complex code unless obvious.
    if (s.includes('value="/ru"') || s.includes('href="/ru"')) return s;

    s = s.replace(/<option value=["']ru["']>/g, '<option value="/ru">');
    s = s.replace(/<option value=["']de["']>/g, '<option value="/de">');
    s = s.replace(/<option value=["']en["']>/g, '<option value="/en">');

    return s;
  });
}

// 5) CSS hide old top12 heading fallback.
patchFile("app/globals.css", (s) => {
  if (s.includes("/* Stage 71 real locale route fixes */")) return s;
  return s + `

/* Stage 71 real locale route fixes */

/* Keep old Top-12/list intro hidden if any earlier text remains */
.section-heading-row:has(h2):has(p) h2,
.section-heading-row:has(h2):has(p) p {
  /* Do not globally hide all headings; actual removal is done in component patches. */
}

/* Explicit language pages are provided by app/[locale]/page.tsx and app/ru|de|en/page.tsx */
`;
});

console.log("Stage 71 completed. Now /ru /de /en are real App Router pages.");
