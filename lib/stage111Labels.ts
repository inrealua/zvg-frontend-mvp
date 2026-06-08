export type Stage111Locale = "de" | "ru" | "en";

export function stage111Locale(value?: string | null): Stage111Locale {
  if (value === "ru" || value === "en" || value === "de") return value;
  return "de";
}

export const stage111Labels = {
  de: {
    wertgrenzenRemoved: "Weggefallen",
    wertgrenzenActive: "Gelten",
    statusActive: "Aktuell",
    statusCancelled: "Aufgehoben",
    term1: "1. Termin",
    term2: "2. Termin",
    term3: "3. Termin",
  },
  ru: {
    wertgrenzenRemoved: "Сняты",
    wertgrenzenActive: "Действуют",
    statusActive: "Актуальный",
    statusCancelled: "Отмененный",
    term1: "1-й термин",
    term2: "2-й термин",
    term3: "3-й термин",
  },
  en: {
    wertgrenzenRemoved: "Removed",
    wertgrenzenActive: "Active",
    statusActive: "Current",
    statusCancelled: "Cancelled",
    term1: "1st auction",
    term2: "2nd auction",
    term3: "3rd auction",
  },
} as const;

export function stage111WertgrenzenLabel(value: unknown, locale?: string | null) {
  const labels = stage111Labels[stage111Locale(locale)];
  const raw = String(value ?? "").trim().toLowerCase();

  if (
    value === true ||
    raw === "true" ||
    raw === "removed" ||
    raw === "weggefallen" ||
    raw === "wertgrenzen weggefallen" ||
    raw === "сняты"
  ) {
    return labels.wertgrenzenRemoved;
  }

  return labels.wertgrenzenActive;
}

export function stage111StatusLabel(value: unknown, locale?: string | null) {
  const labels = stage111Labels[stage111Locale(locale)];
  const raw = String(value ?? "").trim().toUpperCase();

  if (
    raw === "CANCELLED" ||
    raw === "CANCELED" ||
    raw === "AUFGEHOBEN" ||
    raw === "ABGESAGT" ||
    raw === "ОТМЕНЕН" ||
    raw === "ОТМЕНЕННЫЙ"
  ) {
    return labels.statusCancelled;
  }

  return labels.statusActive;
}

export function stage111IsWertgrenzenRemoved(property: Record<string, unknown>) {
  const candidates = [
    property.wertgrenzenWeggefallen,
    property.wertgrenzenRemoved,
    property.priceLimitsRemoved,
    property.valueLimitsRemoved,
    property.limitsRemoved,
    property.wertgrenzen,
  ];

  return candidates.some((value) => {
    const raw = String(value ?? "").trim().toLowerCase();

    return (
      value === true ||
      raw === "true" ||
      raw === "removed" ||
      raw === "weggefallen" ||
      raw === "wertgrenzen weggefallen" ||
      raw === "сняты"
    );
  });
}

export function stage111IsArchived(property: Record<string, unknown>) {
  const status = String(property.status ?? "").toUpperCase();
  if (status === "ARCHIVED") return true;

  const archiveFlag = property.isArchived ?? property.archived;
  if (archiveFlag === true) return true;

  const auctionDate = property.auctionDate ?? property.termin;
  if (!auctionDate) return false;

  const date = new Date(String(auctionDate));
  if (Number.isNaN(date.getTime())) return false;

  return date.getTime() < Date.now();
}

export function stage111TermNumber(property: Record<string, unknown>) {
  const rawTerm =
    property.termNumber ??
    property.terminNumber ??
    property.terminNr ??
    property.termNo ??
    property.auctionRound ??
    property.termineCount ??
    property.anzahlTermine;

  let term = Number(rawTerm || 1);

  if (!Number.isFinite(term) || term < 1) term = 1;

  if (stage111IsWertgrenzenRemoved(property)) {
    term = Math.max(term, 2);
  }

  if (stage111IsWertgrenzenRemoved(property) && stage111IsArchived(property)) {
    term = Math.max(term, 3);
  }

  return term;
}

export function stage111TermLabel(property: Record<string, unknown>, locale?: string | null) {
  const labels = stage111Labels[stage111Locale(locale)];
  const term = stage111TermNumber(property);

  if (term <= 1) return labels.term1;
  if (term === 2) return labels.term2;
  return labels.term3;
}

export function stage111NormalizeProperty<T extends Record<string, unknown>>(property: T): T {
  const termNumber = stage111TermNumber(property);

  return {
    ...property,
    termNumber,
    terminNumber: termNumber,
    terminNr: termNumber,
    termNo: termNumber,
    anzahlTermine: termNumber,
  };
}
