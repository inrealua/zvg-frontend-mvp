export const locales = ["de", "ru", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "de";
export const localeCookieName = "zvg_locale";

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "de" || value === "ru" || value === "en";
}

export function normalizeLocale(value: string | undefined | null): Locale {
  // Legacy Ukrainian locale was used by an old build. It is no longer public.
  // Old cookies/links are migrated to English rather than leaking a fourth locale.
  if (value === "uk" || value === "ua") return "en";
  return isLocale(value) ? value : defaultLocale;
}
