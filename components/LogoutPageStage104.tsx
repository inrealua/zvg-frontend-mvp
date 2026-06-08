"use client";

import { useEffect } from "react";

type Locale = "de" | "ru" | "en";

const text = {
  de: { title: "Sie werden abgemeldet...", subtitle: "Ihre Sitzung wird beendet." },
  ru: { title: "Выходим из аккаунта...", subtitle: "Сессия завершается." },
  en: { title: "Logging out...", subtitle: "Your session is being ended." },
} as const;

function clearVisibleHostCookie() {
  document.cookie = "__Host-zvg_session=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax; Secure";
  document.cookie = "__Host-zvg_session=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=None; Secure";
}

export function LogoutPageStage104({ locale }: { locale: Locale }) {
  const t = text[locale];

  useEffect(() => {
    clearVisibleHostCookie();
    const target = "/" + locale;
    window.location.replace("/api/auth/logout?next=" + encodeURIComponent(target) + "&t=" + Date.now());
  }, [locale]);

  return (
    <main className="logout-page-stage104">
      <section>
        <h1>{t.title}</h1>
        <p>{t.subtitle}</p>
      </section>
    </main>
  );
}
