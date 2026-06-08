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
  stage105HardClientCookieClear();
}

function stage105HardClientCookieClear() {
  const rawNames = document.cookie
    .split(";")
    .map((part) => part.split("=")[0]?.trim())
    .filter(Boolean);

  const names = Array.from(new Set([
    ...rawNames,
    "zvg_user_session",
    "zvg_admin_session",
    "zvg_session",
    "zvg_auth",
    "zvg_token",
    "session",
    "sessions",
    "sid",
    "connect.sid",
    "user_session",
    "auth_session",
    "auth",
    "token",
    "access_token",
    "refresh_token",
    "jwt",
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
  ]));

  const host = window.location.hostname;
  const parts = host.split(".");
  const apex = parts.length > 2 ? parts.slice(-2).join(".") : host;
  const domains = ["", host, "." + host, apex, "." + apex];
  const paths = ["/", "/api", "/api/auth", "/cabinet", "/app"];

  for (const name of names) {
    for (const path of paths) {
      for (const domain of domains) {
        const domainPart = domain ? "; domain=" + domain : "";
        document.cookie = name + "=deleted; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=" + path + domainPart + "; SameSite=Lax";
        document.cookie = name + "=deleted; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=" + path + domainPart + "; SameSite=None; Secure";
      }
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
