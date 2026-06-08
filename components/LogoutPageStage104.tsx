"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type Locale = "de" | "ru" | "en";

const text = {
  de: {
    title: "Sie werden abgemeldet...",
    subtitle: "Ihre Sitzung wird beendet.",
  },
  ru: {
    title: "Выходим из аккаунта...",
    subtitle: "Сессия завершается.",
  },
  en: {
    title: "Logging out...",
    subtitle: "Your session is being ended.",
  },
} as const;

function clearClientCookies() {
  const names = [
    "zvg_user_session",
    "zvg_admin_session",
    "session",
    "user_session",
    "auth_session",
    "token",
    "access_token",
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
  ];

  const host = window.location.hostname;
  const domains = ["", host, "." + host];

  for (const name of names) {
    for (const domain of domains) {
      const domainPart = domain ? "; domain=" + domain : "";
      document.cookie = name + "=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/" + domainPart + "; SameSite=Lax";
      document.cookie = name + "=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/" + domainPart + "; SameSite=None; Secure";
    }
  }
}

export function LogoutPageStage104({ locale }: { locale: Locale }) {
  const router = useRouter();
  const t = text[locale];

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "include",
          cache: "no-store",
          headers: {
            "content-type": "application/json",
          },
        });
      } catch {
        // Continue with client cleanup and redirect.
      }

      clearClientCookies();

      if (cancelled) return;

      const target = "/" + locale;
      router.replace(target);
      router.refresh();

      window.setTimeout(() => {
        window.location.assign(target);
      }, 150);
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [locale, router]);

  return (
    <main className="logout-page-stage104">
      <section>
        <h1>{t.title}</h1>
        <p>{t.subtitle}</p>
      </section>
    </main>
  );
}
