import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const KNOWN_COOKIE_NAMES = [
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
  "__Host-next-auth.csrf-token",
  "next-auth.csrf-token",
  "__Secure-next-auth.callback-url",
  "next-auth.callback-url",
];

const PATH_VARIANTS = ["/", "/api", "/api/auth", "/cabinet", "/app"];

function getLocaleFromRequest(request: NextRequest): "de" | "ru" | "en" {
  const fromCookie = request.cookies.get("zvg_locale")?.value;
  if (fromCookie === "ru" || fromCookie === "de" || fromCookie === "en") return fromCookie;

  const first = new URL(request.url).pathname.split("/").filter(Boolean)[0];
  if (first === "ru" || first === "de" || first === "en") return first;

  const accept = request.headers.get("accept-language") || "";
  if (/\bru\b/i.test(accept)) return "ru";
  if (/\ben\b/i.test(accept)) return "en";
  return "de";
}

function getDomainVariants(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase() || "";
  const domains = new Set<string>();

  if (host && host !== "localhost" && !/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    domains.add(host);
    domains.add("." + host);

    const parts = host.split(".");
    if (parts.length > 2) {
      const apex = parts.slice(-2).join(".");
      domains.add(apex);
      domains.add("." + apex);
    }
  }

  return Array.from(domains);
}

function getAllCookieNames(request: NextRequest) {
  const names = new Set<string>();

  for (const cookie of request.cookies.getAll()) {
    if (cookie.name) names.add(cookie.name);
  }

  for (const name of KNOWN_COOKIE_NAMES) {
    names.add(name);
  }

  return Array.from(names);
}

function expireHeader(name: string, options: { path: string; domain?: string; secure?: boolean; sameSite?: "Lax" | "None" }) {
  const parts = [
    `${name}=deleted`,
    `Path=${options.path}`,
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
  ];

  if (options.domain) parts.push(`Domain=${options.domain}`);
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  if (options.secure) parts.push("Secure");
  parts.push("HttpOnly");

  return parts.join("; ");
}

function appendDeleteCookies(response: NextResponse, request: NextRequest) {
  const names = getAllCookieNames(request);
  const domains = getDomainVariants(request);

  for (const name of names) {
    for (const path of PATH_VARIANTS) {
      // No-domain variants.
      response.headers.append("Set-Cookie", expireHeader(name, { path, sameSite: "Lax" }));
      response.headers.append("Set-Cookie", expireHeader(name, { path, sameSite: "Lax", secure: true }));
      response.headers.append("Set-Cookie", expireHeader(name, { path, sameSite: "None", secure: true }));

      // Domain variants.
      for (const domain of domains) {
        response.headers.append("Set-Cookie", expireHeader(name, { path, domain, sameSite: "Lax" }));
        response.headers.append("Set-Cookie", expireHeader(name, { path, domain, sameSite: "Lax", secure: true }));
        response.headers.append("Set-Cookie", expireHeader(name, { path, domain, sameSite: "None", secure: true }));
      }
    }
  }

  // Browser-level fallback. This is intentionally strong.
  // It may clear zvg_locale, so we re-set zvg_locale below.
  response.headers.set("Clear-Site-Data", '"cookies"');

  const locale = getLocaleFromRequest(request);
  response.headers.append(
    "Set-Cookie",
    `zvg_locale=${locale}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`,
  );
}

function makeJsonResponse(request: NextRequest) {
  const response = NextResponse.json(
    {
      ok: true,
      loggedOut: true,
      clearedCookieNames: getAllCookieNames(request),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    },
  );

  appendDeleteCookies(response, request);
  return response;
}

function makeRedirectResponse(request: NextRequest) {
  const url = new URL(request.url);
  const rawNext = url.searchParams.get("next") || "/" + getLocaleFromRequest(request);
  const safeNext = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/" + getLocaleFromRequest(request);

  const response = NextResponse.redirect(new URL(safeNext, url.origin), 303);

  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");

  appendDeleteCookies(response, request);
  return response;
}

export async function POST(request: NextRequest) {
  return makeJsonResponse(request);
}

export async function GET(request: NextRequest) {
  return makeRedirectResponse(request);
}

export async function DELETE(request: NextRequest) {
  return makeJsonResponse(request);
}
