import { asNumber, type SearchParamRecord } from "@/lib/search-params";

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export type PaginationState = {
  page: number;
  perPage: number;
};

function normalizePerPage(value: number | undefined): number {
  if (!value || !Number.isFinite(value)) return DEFAULT_PAGE_SIZE;
  if (value === 10 || value === 20 || value === 50 || value === 100) return value;
  return DEFAULT_PAGE_SIZE;
}

export function getPaginationState(params: SearchParamRecord): PaginationState {
  const page = asNumber(params.page);
  const perPage = normalizePerPage(asNumber(params.perPage));

  return {
    page: page && page > 0 ? Math.floor(page) : 1,
    perPage: Math.min(perPage, MAX_PAGE_SIZE)
  };
}

export function getPaginationRange(totalItems: number, state: PaginationState) {
  const totalPages = Math.max(1, Math.ceil(totalItems / state.perPage));
  const safePage = Math.min(Math.max(state.page, 1), totalPages);
  const startIndex = (safePage - 1) * state.perPage;
  const endIndex = startIndex + state.perPage;

  return {
    page: safePage,
    perPage: state.perPage,
    totalPages,
    startIndex,
    endIndex,
    fromItem: totalItems === 0 ? 0 : startIndex + 1,
    toItem: Math.min(endIndex, totalItems)
  };
}

export function buildPageUrl(params: SearchParamRecord, page: number): string {
  const next = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (key === "page") return;

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item) next.append(key, item);
      });
      return;
    }

    if (value) next.set(key, value);
  });

  if (page > 1) next.set("page", String(page));

  const query = next.toString();
  return query ? `/?${query}` : "/";
}
