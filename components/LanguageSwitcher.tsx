"use client";

import { useRouter } from "next/navigation";
import { localeCookieName, locales, type Locale } from "@/lib/i18n/config";

type LanguageSwitcherProps = {
  locale: Locale;
  labels: { label: string; de: string; ru: string; en: string; };
};

export function LanguageSwitcher({ locale, labels }: LanguageSwitcherProps) {
  const router = useRouter();

  function setLocale(nextLocale: Locale) {
    document.cookie = `${localeCookieName}=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;
    router.refresh();
  }

  return (
    <label className="language-switcher" aria-label={labels.label}>
      <span className="sr-only">{labels.label}</span>
      <select value={locale} onChange={(event) => setLocale(event.target.value as Locale)}>
        {locales.map((item) => (
          <option value={item} key={item}>{item.toUpperCase()}</option>
        ))}
      </select>
    </label>
  );
}
