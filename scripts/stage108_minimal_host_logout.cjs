const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
function full(rel) { return path.join(root, rel); }
function exists(rel) { return fs.existsSync(full(rel)); }
function read(rel) { return fs.readFileSync(full(rel), "utf8"); }
function write(rel, content) {
  const target = full(rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
  console.log("written", rel);
}
function patch(rel, fn) {
  if (!exists(rel)) { console.log("skip missing", rel); return; }
  const before = read(rel);
  const after = fn(before);
  if (after !== before) { write(rel, after); console.log("patched", rel); }
  else console.log("unchanged", rel);
}

/*
 Stage 108 — minimal reliable __Host-zvg_session logout.
 Stage107 sent too many Set-Cookie headers + Clear-Site-Data and caused server error.
 This version clears only the real auth cookie: __Host-zvg_session.
*/

write("app/api/auth/logout/route.ts", `import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

function getLocale(request: NextRequest): "de" | "ru" | "en" {
  const next = new URL(request.url).searchParams.get("next") || "";
  const nextLocale = next.split("/").filter(Boolean)[0];

  if (nextLocale === "ru" || nextLocale === "de" || nextLocale === "en") return nextLocale;

  const cookieLocale = request.cookies.get("zvg_locale")?.value;
  if (cookieLocale === "ru" || cookieLocale === "de" || cookieLocale === "en") return cookieLocale;

  return "de";
}

function getSafeNext(request: NextRequest) {
  const url = new URL(request.url);
  const locale = getLocale(request);
  const rawNext = url.searchParams.get("next") || \`/\${locale}\`;

  if (!rawNext.startsWith("/") || rawNext.startsWith("//")) return \`/\${locale}\`;

  return rawNext;
}

function appendLogoutCookies(response: NextResponse, request: NextRequest) {
  const locale = getLocale(request);

  // IMPORTANT for __Host-* cookie: no Domain, Path=/, Secure.
  response.headers.append(
    "Set-Cookie",
    "__Host-zvg_session=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure; HttpOnly",
  );

  response.headers.append(
    "Set-Cookie",
    "__Host-zvg_session=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=None; Secure; HttpOnly",
  );

  // Keep language. This is not auth.
  response.headers.append(
    "Set-Cookie",
    \`zvg_locale=\${locale}; Path=/; Max-Age=31536000; SameSite=Lax; Secure\`,
  );

  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const response = NextResponse.redirect(new URL(getSafeNext(request), url.origin), 303);

  appendLogoutCookies(response, request);

  return response;
}

export async function POST(request: NextRequest) {
  const response = NextResponse.json({
    ok: true,
    loggedOut: true,
    cleared: ["__Host-zvg_session"],
  });

  appendLogoutCookies(response, request);

  return response;
}

export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({
    ok: true,
    loggedOut: true,
    cleared: ["__Host-zvg_session"],
  });

  appendLogoutCookies(response, request);

  return response;
}
`);

write("app/api/auth/logout-hard/route.ts", `export { GET, POST, DELETE, dynamic, runtime, revalidate } from "@/app/api/auth/logout/route";
`);

write("components/LogoutButtonStage103.tsx", `"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

type Locale = "de" | "ru" | "en";

function getLocale(pathname: string): Locale {
  const first = pathname.split("/").filter(Boolean)[0];
  if (first === "ru" || first === "de" || first === "en") return first;

  const match = document.cookie.match(/(?:^|;\\\\s*)zvg_locale=(ru|de|en)(?:;|$)/);
  if (match?.[1] === "ru" || match?.[1] === "de" || match?.[1] === "en") return match[1];

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

function clearVisibleHostCookie() {
  // Works only if cookie is not HttpOnly. Server route is the real logout.
  document.cookie = "__Host-zvg_session=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax; Secure";
  document.cookie = "__Host-zvg_session=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=None; Secure";
}

export function LogoutButtonStage103({ className }: { className?: string }) {
  const pathname = usePathname() || "/";
  const [pending, setPending] = useState(false);
  const locale = getLocale(pathname);

  function logout() {
    if (pending) return;

    setPending(true);
    clearVisibleHostCookie();

    const target = "/" + locale;
    window.location.assign("/api/auth/logout?next=" + encodeURIComponent(target) + "&t=" + Date.now());
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
`);

patch("components/LogoutPageStage104.tsx", () => `"use client";

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
`);

write("app/api/auth/session-cookie-debug/route.ts", `import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const response = NextResponse.json({
    cookieNames: request.cookies.getAll().map((cookie) => cookie.name),
    hasHostSession: Boolean(request.cookies.get("__Host-zvg_session")),
  });

  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");

  return response;
}
`);

console.log("Stage 108 completed.");
