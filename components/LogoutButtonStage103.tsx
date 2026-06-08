"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

type Locale = "de" | "ru" | "en";

function getLocale(pathname: string): Locale {
  const first = pathname.split("/").filter(Boolean)[0];
  if (first === "ru" || first === "de" || first === "en") return first;
  if (typeof document !== "undefined") {
    const match = document.cookie.match(/(?:^|;\\s*)zvg_locale=(ru|de|en)(?:;|$)/);
    if (match?.[1] === "ru" || match?.[1] === "de" || match?.[1] === "en") return match[1];
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

export function LogoutButtonStage103({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const [pending, setPending] = useState(false);
  const locale = getLocale(pathname);

  async function logout() {
    if (pending) return;
    setPending(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "content-type": "application/json" },
      });
    } catch {
      // Continue with client cleanup and redirect even if network request fails.
    }

    clearClientCookies();

    const target = "/" + locale;
    router.replace(target);
    router.refresh();

    window.setTimeout(() => {
      window.location.assign(target);
    }, 150);
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
