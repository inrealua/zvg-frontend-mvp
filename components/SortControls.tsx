"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { SORT_OPTIONS, type SelectOption } from "@/lib/filter-options";

type Locale = "de" | "ru" | "en";

const pageSizeOptions = [12, 24, 48, 96];

const labels = {
  de: {
    sort: "Sortierung",
    perPage: "Anzeigen",
    apply: "Anwenden",
    auctionDateAsc: "Termin aufsteigend",
    auctionDateDesc: "Termin absteigend",
    priceAsc: "Preis aufsteigend",
    priceDesc: "Preis absteigend",
    perPageSuffix: "pro Seite",
  },
  ru: {
    sort: "Сортировка",
    perPage: "Показывать",
    apply: "Применить",
    auctionDateAsc: "Дата торгов по возрастанию",
    auctionDateDesc: "Дата торгов по убыванию",
    priceAsc: "Цена по возрастанию",
    priceDesc: "Цена по убыванию",
    perPageSuffix: "на странице",
  },
  en: {
    sort: "Sorting",
    perPage: "Show",
    apply: "Apply",
    auctionDateAsc: "Auction date ascending",
    auctionDateDesc: "Auction date descending",
    priceAsc: "Price ascending",
    priceDesc: "Price descending",
    perPageSuffix: "per page",
  },
} as const;

function readLocaleFromCookie(): Locale {
  if (typeof document === "undefined") return "de";
  const match = document.cookie.match(/(?:^|;\s*)zvg_locale=(de|ru|en)(?:;|$)/);
  return (match?.[1] as Locale) || "de";
}

function useClientLocale(): Locale {
  const [locale, setLocale] = useState<Locale>("de");

  useEffect(() => {
    setLocale(readLocaleFromCookie());

    function update() {
      setLocale(readLocaleFromCookie());
    }

    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);

    return () => {
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  return locale;
}

function localizeSort(option: SelectOption, locale: Locale) {
  const value = option.value as keyof typeof labels.de;
  return labels[locale][value] || option.label;
}

export function SortControls() {
  const locale = useClientLocale();
  const t = labels[locale];
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const next = new URLSearchParams(searchParams.toString());

    const sort = String(formData.get("sort") || "").trim();
    const perPage = String(formData.get("perPage") || "").trim();

    if (sort) next.set("sort", sort);
    else next.delete("sort");

    if (perPage) next.set("perPage", perPage);
    else next.delete("perPage");

    next.delete("page");

    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <form className="sort-controls-v54 sort-controls-v55" onSubmit={onSubmit}>
      <label>
        <span>{t.sort}</span>
        <select name="sort" defaultValue={searchParams.get("sort") || "auctionDateAsc"}>
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{localizeSort(option, locale)}</option>
          ))}
        </select>
      </label>

      <label>
        <span>{t.perPage}</span>
        <select name="perPage" defaultValue={searchParams.get("perPage") || "12"}>
          {pageSizeOptions.map((value) => (
            <option key={value} value={value}>{value} {t.perPageSuffix}</option>
          ))}
        </select>
      </label>

      <button type="submit" className="btn btn-soft">{t.apply}</button>
    </form>
  );
}
