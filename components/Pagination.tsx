
type Stage69PaginationLocale = "de" | "ru" | "en";

function stage69ReadPaginationLocale(): Stage69PaginationLocale {
  if (typeof document === "undefined") return "de";
  const match = document.cookie.match(/(?:^|;\s*)zvg_locale=(de|ru|en)(?:;|$)/);
  return (match?.[1] as Stage69PaginationLocale) || "de";
}

const stage69PaginationText = {
  de: { prev: "Zurück", next: "Weiter" },
  ru: { prev: "Назад", next: "Вперёд" },
  en: { prev: "Back", next: "Next" },
} as const;

function stage69Pg() {
  return stage69PaginationText[stage69ReadPaginationLocale()];
}


type Stage68PaginationLocale = "de" | "ru" | "en";

function stage68ReadPaginationLocale(): Stage68PaginationLocale {
  if (typeof document === "undefined") return "de";
  const match = document.cookie.match(/(?:^|;\s*)zvg_locale=(de|ru|en)(?:;|$)/);
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

import Link from "next/link";
import { buildPageUrl } from "@/lib/pagination";
import type { SearchParamRecord } from "@/lib/search-params";

type PaginationProps = {
  params: SearchParamRecord;
  page: number;
  totalPages: number;
  totalItems: number;
  fromItem: number;
  toItem: number;
};

function pageNumbers(page: number, totalPages: number): number[] {
  const pages = new Set<number>();
  pages.add(1);
  pages.add(totalPages);

  for (let current = page - 2; current <= page + 2; current += 1) {
    if (current >= 1 && current <= totalPages) pages.add(current);
  }

  return Array.from(pages).sort((a, b) => a - b);
}

export function Pagination({ params, page, totalPages, totalItems, fromItem, toItem }: PaginationProps) {
  if (totalPages <= 1) {
    return (
      <div className="pagination compact">
        <span>Показано {totalItems} из {totalItems}</span>
      </div>
    );
  }

  const pages = pageNumbers(page, totalPages);
  let previousRendered = 0;

  return (
    <nav className="pagination" aria-label="Пагинация объектов">
      <div className="pagination-info">
        Показано <b>{fromItem}–{toItem}</b> из <b>{totalItems}</b>
      </div>

      <div className="pagination-links">
        {page > 1 ? (
          <Link className="page-link" href={buildPageUrl(params, page - 1)}>← {stage68Pg().prev}</Link>
        ) : (
          <span className="page-link disabled">← {stage68Pg().prev}</span>
        )}

        {pages.map((item) => {
          const hasGap = previousRendered > 0 && item - previousRendered > 1;
          previousRendered = item;

          return (
            <span key={item} className="page-link-wrap">
              {hasGap ? <span className="page-gap">…</span> : null}
              {item === page ? (
                <span className="page-link active">{item}</span>
              ) : (
                <Link className="page-link" href={buildPageUrl(params, item)}>{item}</Link>
              )}
            </span>
          );
        })}

        {page < totalPages ? (
          <Link className="page-link" href={buildPageUrl(params, page + 1)}>{stage68Pg().next} →</Link>
        ) : (
          <span className="page-link disabled">{stage68Pg().next} →</span>
        )}
      </div>
    </nav>
  );
}
