const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();

function full(rel) {
  return path.join(root, rel);
}

function exists(rel) {
  return fs.existsSync(full(rel));
}

function read(rel) {
  return fs.readFileSync(full(rel), "utf8");
}

function write(rel, content) {
  const target = full(rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
  console.log("written", rel);
}

function patch(rel, fn) {
  if (!exists(rel)) {
    console.log("skip missing", rel);
    return;
  }

  const before = read(rel);
  const after = fn(before);

  if (after !== before) {
    write(rel, after);
    console.log("patched", rel);
  } else {
    console.log("unchanged", rel);
  }
}

/**
 * Stage 105 — hard logout clear all cookies.
 *
 * Stage103/104 redirected correctly, but user stayed logged in.
 *
 * That means the actual auth cookie name/options are different from the
 * guessed list or the cookie has a different Path/Domain variant.
 *
 * This stage makes logout aggressive and deterministic:
 * - reads ALL cookies present in request.cookies;
 * - clears every cookie name it sees;
 * - also clears common auth names;
 * - clears Path variants: /, /api, /api/auth, /cabinet, /app;
 * - clears Domain variants: no domain, host, .host, apex, .apex;
 * - adds Clear-Site-Data: "cookies" as an extra browser-level fallback;
 * - immediately re-sets zvg_locale so language is preserved after Clear-Site-Data.
 */

write("app/api/auth/logout/route.ts", `import { NextRequest, NextResponse } from "next/server";

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
  if (/\\bru\\b/i.test(accept)) return "ru";
  if (/\\ben\\b/i.test(accept)) return "en";
  return "de";
}

function getDomainVariants(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase() || "";
  const domains = new Set<string>();

  if (host && host !== "localhost" && !/^\\d+\\.\\d+\\.\\d+\\.\\d+$/.test(host)) {
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
    \`\${name}=deleted\`,
    \`Path=\${options.path}\`,
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
  ];

  if (options.domain) parts.push(\`Domain=\${options.domain}\`);
  if (options.sameSite) parts.push(\`SameSite=\${options.sameSite}\`);
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
    \`zvg_locale=\${locale}; Path=/; Max-Age=31536000; SameSite=Lax; Secure\`,
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
`);

// Strengthen LogoutPageStage104 client fallback too.
patch("components/LogoutPageStage104.tsx", (s) => {
  if (!s.includes("stage105HardClientCookieClear")) {
    s = s.replace(
      /function clearClientCookies\(\) \{[\s\S]*?\n\}/,
      `function clearClientCookies() {
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
}`
    );
  }

  return s;
});

patch("components/LogoutButtonStage103.tsx", (s) => {
  if (!s.includes("stage105HardClientCookieClear")) {
    s = s.replace(
      /function clearClientCookies\(\) \{[\s\S]*?\n\}/,
      `function clearClientCookies() {
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
}`
    );
  }

  // Make fetch DELETE fallback after POST if possible.
  if (!s.includes('method: "DELETE"')) {
    s = s.replace(
      /await fetch\("\/api\/auth\/logout", \{[\s\S]*?\n\s*\}\);/,
      `await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "content-type": "application/json" },
      });

      await fetch("/api/auth/logout", {
        method: "DELETE",
        credentials: "include",
        cache: "no-store",
      });`
    );
  }

  return s;
});

console.log("Stage 105 completed.");
