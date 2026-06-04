import type { Locale } from "@/lib/i18n/config";

export type DbLocale = "DE" | "RU" | "EN";

export type PropertyTranslationLike = {
  locale: DbLocale;
  title: string;
  propertyType?: string | null;
  description: string;
  locationDescription?: string | null;
};

export type PropertyWithTranslations<T> = T & {
  translations?: PropertyTranslationLike[];
};

export function localeToDbLocale(locale: Locale): DbLocale {
  if (locale === "ru") return "RU";
  if (locale === "en") return "EN";
  return "DE";
}

export function dbLocaleToLocale(locale: DbLocale): Locale {
  if (locale === "RU") return "ru";
  if (locale === "EN") return "en";
  return "de";
}

export function pickPropertyTranslation<
  T extends {
    title: string;
    propertyType?: string | null;
    description?: string | null;
    locationDescription?: string | null;
  }
>(property: PropertyWithTranslations<T>, locale: Locale) {
  const dbLocale = localeToDbLocale(locale);
  const translations = property.translations || [];

  const translation =
    translations.find((item) => item.locale === dbLocale) ||
    translations.find((item) => item.locale === "DE") ||
    translations[0];

  return {
    title: translation?.title || property.title,
    propertyType: translation?.propertyType || property.propertyType || null,
    description: translation?.description || property.description || "",
    locationDescription: translation?.locationDescription || property.locationDescription || null,
  };
}

export function translationInclude(locale: Locale) {
  return {
    translations: {
      where: {
        locale: {
          in: [localeToDbLocale(locale), "DE"] as DbLocale[],
        },
      },
    },
  };
}

export const propertyUi = {
  de: {
    noPhoto: "Kein Foto",
    openObject: "Objekt öffnen",
    marketValue: "Verkehrswert",
    auctionDate: "Termin",
    livingArea: "Wohnfläche",
    plotArea: "Grundstück",
    attempt: "Termin-Nr.",
    source: "Quelle",
    details: "Details ansehen",
    objects: "Objekte",
    type: "Typ",
    file: "Datei",
    action: "Aktion",
    open: "Öffnen",
    documents: "Dokumente",
    noDocuments: "Noch keine Dokumente vorhanden.",
    description: "Objektbeschreibung",
    location: "Lage",
    auction: "Versteigerung",
    features: "Merkmale",
    map: "Karte",
    coordinates: "Koordinaten",
    sourceInfo: "Quelle",
    yes: "Ja",
    no: "Nein",
    unknown: "k. A.",
    use: "Nutzung",
    address: "Adresse",
    federalState: "Bundesland",
    constructionYear: "Baujahr",
    heritage: "Denkmalschutz",
    cancelled: "Termin aufgehoben",
    auctionLocation: "Ort der Versteigerung",
    court: "Gericht",
    valueLimits: "Wertgrenzen",
    valueLimitsGone: "weggefallen",
    valueLimitsNotGone: "nicht weggefallen / unbekannt",
  },
  ru: {
    noPhoto: "Нет фото",
    openObject: "Открыть объект",
    marketValue: "Оценочная стоимость",
    auctionDate: "Торги",
    livingArea: "Жилая площадь",
    plotArea: "Участок",
    attempt: "№ термина",
    source: "Источник",
    details: "Подробнее",
    objects: "Объекты",
    type: "Тип",
    file: "Файл",
    action: "Действие",
    open: "Открыть",
    documents: "Документы",
    noDocuments: "Документов пока нет.",
    description: "Описание объекта",
    location: "Локация",
    auction: "Торги",
    features: "Характеристики",
    map: "Карта",
    coordinates: "Координаты",
    sourceInfo: "Источник",
    yes: "Да",
    no: "Нет",
    unknown: "н/д",
    use: "Использование",
    address: "Адрес",
    federalState: "Федеральная земля",
    constructionYear: "Год постройки",
    heritage: "Памятник архитектуры",
    cancelled: "Торги отменены",
    auctionLocation: "Место торгов",
    court: "Суд",
    valueLimits: "Ценовые границы",
    valueLimitsGone: "сняты",
    valueLimitsNotGone: "не сняты / неизвестно",
  },
  en: {
    noPhoto: "No photo",
    openObject: "Open object",
    marketValue: "Market value",
    auctionDate: "Auction date",
    livingArea: "Living area",
    plotArea: "Plot size",
    attempt: "Auction no.",
    source: "Source",
    details: "View details",
    objects: "Objects",
    type: "Type",
    file: "File",
    action: "Action",
    open: "Open",
    documents: "Documents",
    noDocuments: "No documents available yet.",
    description: "Property description",
    location: "Location",
    auction: "Auction",
    features: "Features",
    map: "Map",
    coordinates: "Coordinates",
    sourceInfo: "Source",
    yes: "Yes",
    no: "No",
    unknown: "n/a",
    use: "Use",
    address: "Address",
    federalState: "Federal state",
    constructionYear: "Year built",
    heritage: "Listed monument",
    cancelled: "Auction cancelled",
    auctionLocation: "Auction location",
    court: "Court",
    valueLimits: "Value limits",
    valueLimitsGone: "removed",
    valueLimitsNotGone: "not removed / unknown",
  },
} as const;

export function getPropertyUi(locale: Locale) {
  return propertyUi[locale];
}
