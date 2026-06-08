"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

type Locale = "de" | "ru" | "en";

function getLocale(pathname: string): Locale {
  const first = pathname.split("/").filter(Boolean)[0];

  if (first === "ru" || first === "de" || first === "en") {
    return first;
  }

  if (typeof document !== "undefined") {
    const match = document.cookie.match(/(?:^|;\\s*)zvg_locale=(ru|de|en)(?:;|$)/);
    if (match?.[1] === "ru" || match?.[1] === "de" || match?.[1] === "en") {
      return match[1];
    }
  }

  return "de";
}

function label(locale: Locale, pending: boolean) {
  if (pending) {
    if (locale === "ru") return "Выход...";
    if (locale === "en") return "Logging out...";
    return "Abmeldung...";
  }

  if (locale === "ru") return "Выйти";
  if (locale === "en") return "Logout";
  return "Abmelden";
}


function stage107ClearHostCookie() {
  document.cookie = "__Host-zvg_session=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax; Secure";
  document.cookie = "__Host-zvg_session=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=None; Secure";
}

function clearClientCookies() {
  stage107ClearHostCookie();
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

export function LogoutButtonStage103({ className }: { className?: string }) {
  const pathname = usePathname() || "/";
  const [pending, setPending] = useState(false);
  const locale = getLocale(pathname);

  function logout() {
    if (pending) return;

    setPending(true);
    clearClientCookies();

    const target = "/" + locale;
    const url = "/api/auth/logout?next=" + encodeURIComponent(target) + "&t=" + Date.now();

    window.location.assign(url);
  }

  return (
    <button
      type="button"
      className={className || "logout-button-stage103"}
      onClick={logout}
      disabled={pending}
    >
      {label(locale, pending)}
    </button>
  );
}

export default LogoutButtonStage103;
