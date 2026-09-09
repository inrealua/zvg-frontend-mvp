export const locales = ["de", "ru", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "de";
export const localeCookieName = "zvg_locale";

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "de" || value === "ru" || value === "en";
}

export function normalizeLocale(value: string | undefined | null): Locale {
  return isLocale(value) ? value : defaultLocale;
}
