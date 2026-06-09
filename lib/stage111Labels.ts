export type Stage111Locale = "de" | "ru" | "en";

function normalizeLocale(locale?: string | null): Stage111Locale {
  const value = String(locale || "").toLowerCase();
  if (value === "ru") return "ru";
  if (value === "en") return "en";
  return "de";
}

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[._\s/]+/g, "-");
}

export function stage111WertgrenzenLabel(value: unknown, locale?: string | null): string {
  const l = normalizeLocale(locale);

  const labels = {
    de: {
      active: "Wertgrenzen gelten",
      removed: "Wertgrenzen aufgehoben",
      unknown: "Unbekannt",
    },
    ru: {
      active: "Ограничения действуют",
      removed: "Ограничения сняты",
      unknown: "Неизвестно",
    },
    en: {
      active: "Limits apply",
      removed: "Limits removed",
      unknown: "Unknown",
    },
  } as const;

  if (typeof value === "boolean") {
    // If the field means "wertgrenzenWeggefallen", true = removed.
    return value ? labels[l].removed : labels[l].active;
  }

  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;

    if (typeof obj.wertgrenzenWeggefallen === "boolean") {
      return obj.wertgrenzenWeggefallen ? labels[l].removed : labels[l].active;
    }

    if (obj.wertgrenzenStatus !== undefined) {
      return stage111WertgrenzenLabel(obj.wertgrenzenStatus, locale);
    }

    if (obj.auction && typeof obj.auction === "object") {
      const auction = obj.auction as Record<string, unknown>;
      if (typeof auction.wertgrenzenWeggefallen === "boolean") {
        return auction.wertgrenzenWeggefallen ? labels[l].removed : labels[l].active;
      }
      if (auction.wertgrenzenStatus !== undefined) {
        return stage111WertgrenzenLabel(auction.wertgrenzenStatus, locale);
      }
    }
  }

  const key = normalizeText(value);

  if (!key || key === "unknown" || key === "unbekannt" || key === "неизвестно") {
    return labels[l].unknown;
  }

  const removed = new Set([
    "removed",
    "weggefallen",
    "aufgehoben",
    "entfallen",
    "limits-removed",
    "wertgrenzen-aufgehoben",
    "wertgrenzen-weggefallen",
    "sняты",
    "сняты",
    "true",
  ]);

  const active = new Set([
    "active",
    "not-removed",
    "notremoved",
    "not_removed",
    "nicht-weggefallen",
    "gelten",
    "gilt",
    "wertgrenzen-gelten",
    "limits-apply",
    "limits-applies",
    "действуют",
    "false",
  ]);

  if (removed.has(key)) return labels[l].removed;
  if (active.has(key)) return labels[l].active;

  return String(value ?? labels[l].unknown);
}

export function stage111StatusLabel(status: unknown, locale?: string | null): string {
  const l = normalizeLocale(locale);
  const key = String(status || "UNKNOWN").toUpperCase();

  const labels: Record<Stage111Locale, Record<string, string>> = {
    de: {
      ACTIVE: "Aktiv",
      CANCELLED: "Aufgehoben",
      ARCHIVED: "Archiv",
      SOLD: "Verkauft",
      UNKNOWN: "Unbekannt",
    },
    ru: {
      ACTIVE: "Активно",
      CANCELLED: "Отменено",
      ARCHIVED: "Архив",
      SOLD: "Продано",
      UNKNOWN: "Неизвестно",
    },
    en: {
      ACTIVE: "Active",
      CANCELLED: "Cancelled",
      ARCHIVED: "Archive",
      SOLD: "Sold",
      UNKNOWN: "Unknown",
    },
  };

  return labels[l][key] || String(status || labels[l].UNKNOWN);
}

export function stage111TermLabel(property: Record<string, unknown> | unknown, locale?: string | null): string {
  const l = normalizeLocale(locale);

  let value: unknown = property;
  if (property && typeof property === "object") {
    const obj = property as Record<string, unknown>;
    value = obj.auctionAttempt ?? obj.termNumber ?? obj.auctionTermNumber;
    if (obj.auction && typeof obj.auction === "object") {
      const auction = obj.auction as Record<string, unknown>;
      value = auction.termNumber ?? value;
    }
  }

  const n = Number(value || 0);

  if (!Number.isFinite(n) || n <= 0) {
    return l === "ru" ? "Неизвестно" : l === "en" ? "Unknown" : "Unbekannt";
  }

  if (l === "ru") {
    if (n === 1) return "1-й термин";
    if (n === 2) return "2-й термин";
    return "3-й и больше";
  }

  if (l === "en") {
    if (n === 1) return "1st auction";
    if (n === 2) return "2nd auction";
    return "3rd and more";
  }

  if (n === 1) return "1. Termin";
  if (n === 2) return "2. Termin";
  return "3. und weitere";
}

/**
 * Compatibility helper for older public pages.
 *
 * Some earlier project stages import `stage111NormalizeProperty` from this file.
 * Stage133 accidentally replaced the file without this export, so production build failed.
 *
 * This function is intentionally conservative:
 * - it does not mutate the original Prisma object;
 * - it keeps all original fields;
 * - it adds display-only labels that components may safely use;
 * - it works with unknown schemas and therefore does not break if a field is missing.
 */
export function stage111NormalizeProperty<T extends Record<string, any>>(
  property: T,
  locale?: string | null,
): T & {
  stage111StatusLabel: string;
  stage111WertgrenzenLabel: string;
  stage111TermLabel: string;
  statusLabel: string;
  wertgrenzenLabel: string;
  termLabel: string;
} {
  const statusLabel = stage111StatusLabel(property?.status, locale);

  const wertgrenzenSource =
    property?.wertgrenzenWeggefallen ??
    property?.wertgrenzenStatus ??
    property?.valueLimitsRemoved ??
    property?.valueLimits ??
    property;

  const wertgrenzenLabel = stage111WertgrenzenLabel(wertgrenzenSource, locale);
  const termLabel = stage111TermLabel(property, locale);

  return {
    ...property,
    stage111StatusLabel: statusLabel,
    stage111WertgrenzenLabel: wertgrenzenLabel,
    stage111TermLabel: termLabel,
    statusLabel,
    wertgrenzenLabel,
    termLabel,
  };
}
