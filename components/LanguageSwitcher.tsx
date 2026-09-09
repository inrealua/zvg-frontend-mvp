"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Locale = "de" | "ru" | "en";

type Labels = {
  label?: string;
  de?: string;
  ru?: string;
  en?: string;
};

type Props = {
  locale?: Locale;
  currentLocale?: Locale;
  labels?: Labels;
  className?: string;
};

const LOCALES: readonly Locale[] = ["de", "ru", "en"];
const defaultLabels: Record<Locale, string> = {
  de: "Deutsch",
  ru: "Русский",
  en: "English",
};

function normalizeLocale(value?: string): Locale {
  const normalized = value?.toLowerCase();
  if (normalized === "ru" || normalized === "en" || normalized === "de") return normalized;
  if (normalized === "uk" || normalized === "ua") return "en";
  if (typeof window !== "undefined") {
    const first = window.location.pathname.split("/").filter(Boolean)[0]?.toLowerCase();
    if (first === "ru" || first === "en" || first === "de") return first;
    if (first === "uk" || first === "ua") return "en";
  }
  return "de";
}

function buildLocalePath(pathname: string, next: Locale) {
  const parts = pathname.split("/").filter(Boolean);
  const first = parts[0]?.toLowerCase();
  if (first === "ru" || first === "de" || first === "en" || first === "uk" || first === "ua") {
    parts[0] = next;
    return "/" + parts.join("/");
  }
  return "/" + next + (pathname === "/" ? "" : pathname);
}

export function LanguageSwitcher({ locale, currentLocale, labels, className }: Props) {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  const active = normalizeLocale(locale || currentLocale);
  const query = searchParams?.toString();
  const names: Record<Locale, string> = {
    de: labels?.de || defaultLabels.de,
    ru: labels?.ru || defaultLabels.ru,
    en: labels?.en || defaultLabels.en,
  };

  useEffect(() => {
    // Convert stale Ukrainian locale cookies from older deployments to English.
    const cookie = document.cookie.match(/(?:^|;\s*)zvg_locale=([^;]+)/)?.[1]?.toLowerCase();
    if (cookie === "uk" || cookie === "ua") {
      document.cookie = "zvg_locale=en; path=/; max-age=31536000; SameSite=Lax";
    }

    function onClick(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function choose(next: Locale) {
    document.cookie = "zvg_locale=" + next + "; path=/; max-age=31536000; SameSite=Lax";
    const nextPath = buildLocalePath(pathname, next);
    router.push(nextPath + (query ? "?" + query : ""));
    setOpen(false);
  }

  return (
    <div className={className || "language-switcher-v94"} ref={wrapperRef}>
      <button
        type="button"
        className="language-switcher-button-v94"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span>{active.toUpperCase()}</span>
        <span className="language-switcher-chevron-v94">⌄</span>
      </button>

      {open ? (
        <div className="language-switcher-menu-v94" role="menu">
          {LOCALES.map((item) => (
            <button
              type="button"
              role="menuitem"
              className={item === active ? "is-active" : ""}
              key={item}
              onClick={() => choose(item)}
            >
              {names[item]}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default LanguageSwitcher;
