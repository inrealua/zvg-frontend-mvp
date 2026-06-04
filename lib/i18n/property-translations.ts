import type { Locale } from "@/lib/i18n/config";

type TranslationLike = {
  locale: "DE" | "RU" | "EN";
  title: string;
  propertyType?: string | null;
  description: string;
  locationDescription?: string | null;
};

type PropertyWithTranslations<T> = T & {
  translations?: TranslationLike[];
};

export function localeToDbLocale(locale: Locale): "DE" | "RU" | "EN" {
  if (locale === "ru") return "RU";
  if (locale === "en") return "EN";
  return "DE";
}

export function dbLocaleToLocale(locale: "DE" | "RU" | "EN"): Locale {
  if (locale === "RU") return "ru";
  if (locale === "EN") return "en";
  return "de";
}

export function pickPropertyTranslation<T extends { title: string; propertyType?: string | null; description: string; locationDescription?: string | null }>(
  property: PropertyWithTranslations<T>,
  locale: Locale
) {
  const dbLocale = localeToDbLocale(locale);
  const translation =
    property.translations?.find((item) => item.locale === dbLocale) ||
    property.translations?.find((item) => item.locale === "DE") ||
    property.translations?.[0];

  return {
    title: translation?.title || property.title,
    propertyType: translation?.propertyType || property.propertyType || null,
    description: translation?.description || property.description,
    locationDescription: translation?.locationDescription || property.locationDescription || null,
  };
}

export function translationInclude(locale: Locale) {
  return {
    translations: {
      where: {
        locale: {
          in: [localeToDbLocale(locale), "DE"] as Array<"DE" | "RU" | "EN">,
        },
      },
    },
  };
}
