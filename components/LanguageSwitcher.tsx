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

const defaultLabels: Record<Locale, string> = {
  de: "Deutsch",
  ru: "Русский",
  en: "English",
};

function normalizeLocale(value?: string): Locale {
  if (value === "ru" || value === "en" || value === "de") return value;
  if (typeof window !== "undefined") {
    const first = window.location.pathname.split("/").filter(Boolean)[0];
    if (first === "ru" || first === "en" || first === "de") return first;
  }
  return "de";
}

function buildLocalePath(pathname: string, next: Locale) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "ru" || parts[0] === "de" || parts[0] === "en") {
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
          {(["de", "ru", "en"] as Locale[]).map((item) => (
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
