"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ActiveFilterChip } from "@/lib/search-params";

export function ActiveFilters({ chips }: { chips: ActiveFilterChip[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (chips.length === 0) return null;

  function removeSingleValue(params: URLSearchParams, key: string, valueToRemove: string) {
    const values = params.getAll(key).filter((value) => value !== valueToRemove);
    params.delete(key);
    values.forEach((value) => params.append(key, value));
  }

  function removeFilter(chip: ActiveFilterChip) {
    const next = new URLSearchParams(searchParams.toString());
    const keysToRemove = chip.removeKeys && chip.removeKeys.length > 0 ? chip.removeKeys : [chip.key];

    if (chip.value && keysToRemove.length === 1) {
      removeSingleValue(next, chip.key, chip.value);
    } else {
      keysToRemove.forEach((key) => next.delete(key));
    }

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
      {chips.map((chip, index) => (
        <button key={`${chip.key}-${chip.value ?? "single"}-${index}`} type="button" className="filter-chip" onClick={() => removeFilter(chip)}>
          {chip.label} <span aria-hidden="true">×</span>
        </button>
      ))}
      <button type="button" className="filter-chip clear" onClick={clearAll}>Очистить всё</button>
    </div>
  );
}
