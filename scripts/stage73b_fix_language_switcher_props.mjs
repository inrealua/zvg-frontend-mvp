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

/**
 * Stage 73B
 *
 * Error:
 * <LanguageSwitcher locale={locale} labels={t.locale} />
 * but Stage 73 replaced LanguageSwitcher with a component that accepts no props.
 *
 * Fix:
 * LanguageSwitcher accepts optional props:
 *   locale?: "de" | "ru" | "en"
 *   labels?: { label?: string; de?: string; ru?: string; en?: string }
 *
 * Header can keep current call unchanged.
 */

const languageSwitcher = `"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChangeEvent } from "react";

const LOCALES = ["ru", "de", "en"] as const;
type Locale = (typeof LOCALES)[number];

type LanguageSwitcherProps = {
  locale?: Locale;
  labels?: {
    label?: string;
    de?: string;
    ru?: string;
    en?: string;
  };
};

function isLocale(value: string | undefined): value is Locale {
  return value === "ru" || value === "de" || value === "en";
}

function stripLocale(pathname: string) {
  return pathname.replace(/^\\/(ru|de|en)(?=\\/|$)/, "") || "/";
}

function currentLocale(pathname: string, fallback?: Locale): Locale {
  if (isLocale(fallback)) return fallback;

  const first = pathname.split("/").filter(Boolean)[0];
  if (isLocale(first)) return first;

  if (typeof document !== "undefined") {
    const match = document.cookie.match(/(?:^|;\\s*)zvg_locale=(ru|de|en)(?:;|$)/);
    if (isLocale(match?.[1])) return match[1];
  }

  return "de";
}

export function LanguageSwitcher({ locale, labels }: LanguageSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selected = currentLocale(pathname, locale);

  function onChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextLocale = event.target.value as Locale;

    document.cookie = \`zvg_locale=\${nextLocale}; path=/; max-age=31536000; samesite=lax\`;

    const cleanPath = stripLocale(pathname);
    const query = searchParams.toString();
    const nextPath = \`/\${nextLocale}\${cleanPath === "/" ? "" : cleanPath}\${query ? \`?\${query}\` : ""}\`;

    router.push(nextPath);
    router.refresh();
  }

  return (
    <select className="language-select" value={selected} onChange={onChange} aria-label={labels?.label ?? "Language"}>
      <option value="de">{labels?.de ?? "DE"}</option>
      <option value="ru">{labels?.ru ?? "RU"}</option>
      <option value="en">{labels?.en ?? "EN"}</option>
    </select>
  );
}

export default LanguageSwitcher;
`;

const targets = [
  "components/LanguageSwitcher.tsx",
  "app/components/LanguageSwitcher.tsx",
];

let wrote = false;
for (const rel of targets) {
  const full = path.join(root, rel);
  if (fs.existsSync(full)) {
    fs.writeFileSync(full, languageSwitcher, "utf8");
    console.log("patched", rel);
    wrote = true;
  }
}

if (!wrote) {
  fs.mkdirSync(path.join(root, "components"), { recursive: true });
  fs.writeFileSync(path.join(root, "components", "LanguageSwitcher.tsx"), languageSwitcher, "utf8");
  console.log("created components/LanguageSwitcher.tsx");
}

/**
 * If Header imports default or named, both are supported.
 * But if Header passes labels with readonly exact type, props allow plain strings,
 * readonly object is assignable structurally.
 */

console.log("Stage 73B completed.");
