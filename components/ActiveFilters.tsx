"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ActiveFilterChip } from "@/lib/search-params";

export function ActiveFilters({ chips }: { chips: ActiveFilterChip[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (chips.length === 0) return null;

  function removeFilter(chip: ActiveFilterChip) {
    const next = new URLSearchParams(searchParams.toString());
    const keysToRemove = chip.removeKeys && chip.removeKeys.length > 0 ? chip.removeKeys : [chip.key];

    keysToRemove.forEach((key) => next.delete(key));
    next.delete("page");

    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function clearAll() {
    router.push(pathname);
  }

  return (
    <div className="active-filters" aria-label="Активные фильтры">
      <span className="active-filter-title">Активные фильтры:</span>
      {chips.map((chip) => (
        <button key={chip.key} type="button" className="filter-chip" onClick={() => removeFilter(chip)}>
          {chip.label} <span aria-hidden="true">×</span>
        </button>
      ))}
      <button type="button" className="filter-chip clear" onClick={clearAll}>Очистить всё</button>
    </div>
  );
}
