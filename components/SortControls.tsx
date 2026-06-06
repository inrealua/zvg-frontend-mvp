"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type Locale = "de" | "ru" | "en";

const labels = {
  de: {
    sort: "Sortierung",
    perPage: "Anzeigen",
    auctionDateAsc: "Termin aufsteigend",
    auctionDateDesc: "Termin absteigend",
    priceAsc: "Preis aufsteigend",
    priceDesc: "Preis absteigend",
    12: "12 pro Seite",
    24: "24 pro Seite",
    48: "48 pro Seite",
    96: "96 pro Seite",
  },
  ru: {
    sort: "Сортировка",
    perPage: "Показывать",
    auctionDateAsc: "Дата торгов по возрастанию",
    auctionDateDesc: "Дата торгов по убыванию",
    priceAsc: "Цена по возрастанию",
    priceDesc: "Цена по убыванию",
    12: "12 на странице",
    24: "24 на странице",
    48: "48 на странице",
    96: "96 на странице",
  },
  en: {
    sort: "Sorting",
    perPage: "Show",
    auctionDateAsc: "Auction date ascending",
    auctionDateDesc: "Auction date descending",
    priceAsc: "Price ascending",
    priceDesc: "Price descending",
    12: "12 per page",
    24: "24 per page",
    48: "48 per page",
    96: "96 per page",
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

export function SortControls() {
  const locale = useClientLocale();
  const t = labels[locale];
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());

    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }

    next.delete("page");
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="sort-controls-v56">
      <label>
        <span>{t.sort}</span>
        <select
          value={searchParams.get("sort") || "auctionDateAsc"}
          onChange={(event) => updateParam("sort", event.target.value)}
        >
          <option value="auctionDateAsc">{t.auctionDateAsc}</option>
          <option value="auctionDateDesc">{t.auctionDateDesc}</option>
          <option value="priceAsc">{t.priceAsc}</option>
          <option value="priceDesc">{t.priceDesc}</option>
        </select>
      </label>

      <label>
        <span>{t.perPage}</span>
        <select
          value={searchParams.get("perPage") || "12"}
          onChange={(event) => updateParam("perPage", event.target.value)}
        >
          <option value="12">{t[12]}</option>
          <option value="24">{t[24]}</option>
          <option value="48">{t[48]}</option>
          <option value="96">{t[96]}</option>
        </select>
      </label>
    </div>
  );
}
