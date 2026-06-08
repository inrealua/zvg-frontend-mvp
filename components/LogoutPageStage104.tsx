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


function stage107ClearHostCookie() {
  document.cookie = "__Host-zvg_session=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax; Secure";
  document.cookie = "__Host-zvg_session=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=None; Secure";
}

function clearClientCookies() {
  stage107ClearHostCookie();
  stage106ClientCookieClear();
}

function stage106ClientCookieClear() {
  const rawNames = document.cookie
    .split(";")
    .map((part) => part.split("=")[0]?.trim())
    .filter(Boolean);

  const names = Array.from(new Set([
    "__Host-zvg_session",
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
    for (const cookiePath of paths) {
      for (const domain of domains) {
        const domainPart = domain ? "; domain=" + domain : "";
        document.cookie = name + "=deleted; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=" + cookiePath + domainPart + "; SameSite=Lax";
        document.cookie = name + "=deleted; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=" + cookiePath + domainPart + "; SameSite=None; Secure";
      }
    }
  }
}

function stage106TopLevelLogout(locale: Locale) {
  clearClientCookies();
  const next = "/" + locale;
  const url = "/api/auth/logout?next=" + encodeURIComponent(next) + "&t=" + Date.now();
  window.location.replace(url);
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
    stage106TopLevelLogout(locale);
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
