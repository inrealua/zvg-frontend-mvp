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
          <Link className="page-link" href={buildPageUrl(params, page - 1)}>← Назад</Link>
        ) : (
          <span className="page-link disabled">← Назад</span>
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
          <Link className="page-link" href={buildPageUrl(params, page + 1)}>Вперёд →</Link>
        ) : (
          <span className="page-link disabled">Вперёд →</span>
        )}
      </div>
    </nav>
  );
}
