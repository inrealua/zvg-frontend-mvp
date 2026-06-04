import type { Locale } from "@/lib/i18n/config";

type LabelRecord = Record<string, string>;

const groupLabels: Record<Locale, LabelRecord> = {
  de: {
    WOHNHAEUSER: "Wohnhäuser",
    WOHNUNGEN: "Wohnungen",
    GEWERBE: "Gewerbe",
    GRUNDSTUECKE: "Grundstücke",
    LAND_WALD: "Land / Wald",
    GARAGEN: "Garagen / Parken",
    SONSTIGE: "Sonstige",
  },
  ru: {
    WOHNHAEUSER: "Жилые дома",
    WOHNUNGEN: "Квартиры",
    GEWERBE: "Коммерческая недвижимость",
    GRUNDSTUECKE: "Участки",
    LAND_WALD: "Земля / лес",
    GARAGEN: "Гаражи / парковки",
    SONSTIGE: "Прочее",
  },
  en: {
    WOHNHAEUSER: "Residential houses",
    WOHNUNGEN: "Apartments",
    GEWERBE: "Commercial",
    GRUNDSTUECKE: "Land plots",
    LAND_WALD: "Land / forest",
    GARAGEN: "Garages / parking",
    SONSTIGE: "Other",
  },
};

const statusLabels: Record<Locale, LabelRecord> = {
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

const occupancyLabels: Record<Locale, LabelRecord> = {
  de: {
    VACANT: "Frei",
    RENTED: "Vermietet",
    OWNER_OCCUPIED: "Eigennutzung",
    UNKNOWN: "Unbekannt",
  },
  ru: {
    VACANT: "Свободен",
    RENTED: "Сдан в аренду",
    OWNER_OCCUPIED: "Используется собственником",
    UNKNOWN: "Неизвестно",
  },
  en: {
    VACANT: "Vacant",
    RENTED: "Rented",
    OWNER_OCCUPIED: "Owner-occupied",
    UNKNOWN: "Unknown",
  },
};

export const publicUi = {
  de: {
    topTitle: "Top 12 aktuelle Objekte",
    topSubtitle: "Kurze Auswahl für die Startseite. Die vollständige Recherche finden Sie in der erweiterten Suche.",
    advancedSearch: "Zur erweiterten Suche",
    marketValue: "Verkehrswert",
    auctionDate: "Termin",
    livingArea: "Wohnfläche",
    plotArea: "Grundstück",
    attempt: "Termin-Nr.",
    details: "Details ansehen",
    noPhoto: "Kein Foto",
    source: "Quelle",
  },
  ru: {
    topTitle: "Топ-12 актуальных объектов",
    topSubtitle: "Короткая подборка для главной страницы. Полный поиск доступен в расширенном поиске.",
    advancedSearch: "К расширенному поиску",
    marketValue: "Оценочная стоимость",
    auctionDate: "Торги",
    livingArea: "Жилая площадь",
    plotArea: "Участок",
    attempt: "№ термина",
    details: "Подробнее",
    noPhoto: "Нет фото",
    source: "Источник",
  },
  en: {
    topTitle: "Top 12 current properties",
    topSubtitle: "A short selection for the homepage. Full research is available in Advanced Search.",
    advancedSearch: "Go to advanced search",
    marketValue: "Market value",
    auctionDate: "Auction date",
    livingArea: "Living area",
    plotArea: "Plot size",
    attempt: "Auction no.",
    details: "View details",
    noPhoto: "No photo",
    source: "Source",
  },
} as const;

export function labelGroup(value: string | null | undefined, locale: Locale) {
  if (!value) return "";
  return groupLabels[locale][value] || value;
}

export function labelStatus(value: string | null | undefined, locale: Locale) {
  if (!value) return "";
  return statusLabels[locale][value] || value;
}

export function labelOccupancy(value: string | null | undefined, locale: Locale) {
  if (!value) return "";
  return occupancyLabels[locale][value] || value;
}

export function getPublicUi(locale: Locale) {
  return publicUi[locale];
}
