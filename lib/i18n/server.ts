import { cookies } from "next/headers";
import { defaultLocale, localeCookieName, normalizeLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export async function getLocale(): Promise<Locale> {
  try {
    const cookieStore = await cookies();
    return normalizeLocale(cookieStore.get(localeCookieName)?.value);
  } catch {
    return defaultLocale;
  }
}

export async function getI18n() {
  const locale = await getLocale();
  return { locale, t: getDictionary(locale) };
}
