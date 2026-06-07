"use client";

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
  return pathname.replace(/^\/(ru|de|en)(?=\/|$)/, "") || "/";
}

function currentLocale(pathname: string, fallback?: Locale): Locale {
  if (isLocale(fallback)) return fallback;

  const first = pathname.split("/").filter(Boolean)[0];
  if (isLocale(first)) return first;

  if (typeof document !== "undefined") {
    const match = document.cookie.match(/(?:^|;\s*)zvg_locale=(ru|de|en)(?:;|$)/);
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

    document.cookie = `zvg_locale=${nextLocale}; path=/; max-age=31536000; samesite=lax`;

    const cleanPath = stripLocale(pathname);
    const query = searchParams.toString();
    const nextPath = `/${nextLocale}${cleanPath === "/" ? "" : cleanPath}${query ? `?${query}` : ""}`;

    router.push(nextPath);
    router.refresh();
  }

  const shortLabel = selected.toUpperCase();

  return (
    <label className="language-switcher-shell-v74" aria-label={labels?.label ?? "Language"}>
      <span className="language-switcher-current-v74">{shortLabel}</span>
      <select className="language-select language-select-v74" value={selected} onChange={onChange}>
        <option value="de">{labels?.de ?? "Deutsch"}</option>
        <option value="ru">{labels?.ru ?? "Русский"}</option>
        <option value="en">{labels?.en ?? "English"}</option>
      </select>
    </label>
  );
}

export default LanguageSwitcher;
