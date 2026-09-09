import type { Locale } from "@/lib/i18n/config";

export type DbLocale = "DE" | "RU" | "EN";
export type PropertyTranslationLike = {
  locale: DbLocale;
  title: string;
  propertyType?: string | null;
  shortDescription?: string | null;
  description: string;
  longDescription?: string | null;
  buildingAndLayout?: string | null;
  conditionAndRenovation?: string | null;
  useAndOccupancy?: string | null;
  plotAndAccess?: string | null;
  locationAndSurroundings?: string | null;
  specialFeatures?: string | null;
  auctionAndLegalNotes?: string | null;
  locationDescription?: string | null;
  recommendationSummary?: string | null;
  marketSummary?: string | null;
  renovationSummary?: string | null;
  riskSummary?: string | null;
  localizedFieldsJson?: unknown;
  prosJson?: unknown;
  consJson?: unknown;
  checksBeforeAuctionJson?: unknown;
};

export type PropertyWithTranslations<T> = T & { translations?: PropertyTranslationLike[] };

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

function jsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function pickPropertyTranslation<T extends { title:string; propertyType?:string|null; description?:string|null; locationDescription?:string|null }>(property: PropertyWithTranslations<T>, locale: Locale) {
  const dbLocale = localeToDbLocale(locale);
  const translations = property.translations || [];
  const translation =
    translations.find((item) => item.locale === dbLocale) ||
    translations.find((item) => item.locale === "DE") ||
    translations[0];
  return {
    title: translation?.title || property.title,
    propertyType: translation?.propertyType || property.propertyType || null,
    shortDescription: translation?.shortDescription || null,
    description: translation?.description || property.description || "",
    longDescription: translation?.longDescription || null,
    buildingAndLayout: translation?.buildingAndLayout || null,
    conditionAndRenovation: translation?.conditionAndRenovation || null,
    useAndOccupancy: translation?.useAndOccupancy || null,
    plotAndAccess: translation?.plotAndAccess || null,
    locationAndSurroundings: translation?.locationAndSurroundings || translation?.locationDescription || property.locationDescription || null,
    specialFeatures: translation?.specialFeatures || null,
    auctionAndLegalNotes: translation?.auctionAndLegalNotes || null,
    locationDescription: translation?.locationDescription || property.locationDescription || null,
    recommendationSummary: translation?.recommendationSummary || null,
    marketSummary: translation?.marketSummary || null,
    renovationSummary: translation?.renovationSummary || null,
    riskSummary: translation?.riskSummary || null,
    localizedFields: jsonObject(translation?.localizedFieldsJson),
    pros: Array.isArray(translation?.prosJson) ? translation?.prosJson as string[] : [],
    cons: Array.isArray(translation?.consJson) ? translation?.consJson as string[] : [],
    checksBeforeAuction: Array.isArray(translation?.checksBeforeAuctionJson) ? translation?.checksBeforeAuctionJson as string[] : [],
  };
}

export function translationInclude(locale: Locale) {
  return { translations: { where: { locale: { in: [localeToDbLocale(locale), "DE"] as DbLocale[] } } } };
}

export const propertyUi = {
  de:{noPhoto:"Kein Foto",openObject:"Objekt öffnen",marketValue:"Gerichtlicher Verkehrswert",auctionDate:"Termin",livingArea:"Wohnfläche",plotArea:"Grundstück",attempt:"Termin-Nr.",source:"Quelle",details:"Details ansehen",objects:"Objekte",type:"Typ",file:"Datei",action:"Aktion",open:"Öffnen",documents:"Originaldokumente",noDocuments:"Noch keine Dokumente vorhanden.",description:"Objektbeschreibung",location:"Lage",auction:"Versteigerung",features:"Merkmale",map:"Karte",coordinates:"Koordinaten",sourceInfo:"Primärquelle",yes:"Ja",no:"Nein",unknown:"k. A.",use:"Nutzung",address:"Adresse",federalState:"Bundesland",constructionYear:"Baujahr",heritage:"Denkmalschutz",cancelled:"Termin aufgehoben",auctionLocation:"Ort der Versteigerung",court:"Gericht",valueLimits:"Wertgrenzen",valueLimitsGone:"weggefallen",valueLimitsNotGone:"nicht weggefallen / unbekannt",analysis:"Analyse",building:"Gebäude und Aufteilung",condition:"Zustand und Sanierung",occupancy:"Nutzung und Belegung",plotAccess:"Grundstück und Zugang",surroundings:"Lage und Umfeld",special:"Besonderheiten",legalNotes:"Auktion und rechtliche Hinweise"},
  ru:{noPhoto:"Нет фото",openObject:"Открыть объект",marketValue:"Судебная оценочная стоимость",auctionDate:"Торги",livingArea:"Жилая площадь",plotArea:"Участок",attempt:"№ термина",source:"Источник",details:"Подробнее",objects:"Объекты",type:"Тип",file:"Файл",action:"Действие",open:"Открыть",documents:"Оригинальные документы",noDocuments:"Документов пока нет.",description:"Описание объекта",location:"Расположение",auction:"Торги",features:"Характеристики",map:"Карта",coordinates:"Координаты",sourceInfo:"Основной источник",yes:"Да",no:"Нет",unknown:"н/д",use:"Использование",address:"Адрес",federalState:"Федеральная земля",constructionYear:"Год постройки",heritage:"Памятник архитектуры",cancelled:"Торги отменены",auctionLocation:"Место торгов",court:"Суд",valueLimits:"Ценовые границы",valueLimitsGone:"сняты",valueLimitsNotGone:"не сняты / неизвестно",analysis:"Анализ",building:"Здание и планировка",condition:"Состояние и ремонт",occupancy:"Использование и занятость",plotAccess:"Участок и доступ",surroundings:"Расположение и окружение",special:"Особенности",legalNotes:"Торги и юридические замечания"},
  en:{noPhoto:"No photo",openObject:"Open property",marketValue:"Official court valuation",auctionDate:"Auction date",livingArea:"Living area",plotArea:"Plot size",attempt:"Auction no.",source:"Source",details:"View details",objects:"Properties",type:"Type",file:"File",action:"Action",open:"Open",documents:"Original documents",noDocuments:"No documents available yet.",description:"Property description",location:"Location",auction:"Auction",features:"Features",map:"Map",coordinates:"Coordinates",sourceInfo:"Primary source",yes:"Yes",no:"No",unknown:"n/a",use:"Use",address:"Address",federalState:"Federal state",constructionYear:"Year built",heritage:"Listed monument",cancelled:"Auction cancelled",auctionLocation:"Auction location",court:"Court",valueLimits:"Value limits",valueLimitsGone:"removed",valueLimitsNotGone:"not removed / unknown",analysis:"Analysis",building:"Building and layout",condition:"Condition and renovation",occupancy:"Use and occupancy",plotAccess:"Plot and access",surroundings:"Location and surroundings",special:"Special features",legalNotes:"Auction and legal notes"},
} as const;

export function getPropertyUi(locale: Locale) { return propertyUi[locale]; }
