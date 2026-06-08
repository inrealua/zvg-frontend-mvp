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

/**
 * Stage 107 — clear the real auth cookie.
 *
 * Debug showed the real auth cookie:
 *   __Host-zvg_session
 *
 * __Host-* cookies are special:
 * - MUST be Secure
 * - MUST have Path=/
 * - MUST NOT have Domain
 *
 * Therefore logout must explicitly send:
 *   __Host-zvg_session=; Path=/; Max-Age=0; Expires=...; Secure; HttpOnly; SameSite=Lax
 *
 * This script rewrites /api/auth/logout to clear exactly this real cookie,
 * plus the older guessed names, and also adds a fallback /api/auth/logout-hard.
 */

const route = `import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

const COOKIE_NAMES = [
  "__Host-zvg_session",
  "zvg_session",
  "zvg_user_session",
  "zvg_admin_session",
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
];

const PATHS = ["/", "/api", "/api/auth", "/cabinet", "/app"];

function getLocale(request: NextRequest): "de" | "ru" | "en" {
  const fromCookie = request.cookies.get("zvg_locale")?.value;
  if (fromCookie === "ru" || fromCookie === "de" || fromCookie === "en") return fromCookie;

  const next = new URL(request.url).searchParams.get("next") || "";
  const firstFromNext = next.split("/").filter(Boolean)[0];
  if (firstFromNext === "ru" || firstFromNext === "de" || firstFromNext === "en") return firstFromNext;

  const firstFromPath = new URL(request.url).pathname.split("/").filter(Boolean)[0];
  if (firstFromPath === "ru" || firstFromPath === "de" || firstFromPath === "en") return firstFromPath;

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

function allCookieNames(request: NextRequest) {
  return Array.from(
    new Set([
      ...request.cookies.getAll().map((cookie) => cookie.name),
      ...COOKIE_NAMES,
    ]),
  );
}

function appendNoDomainDelete(response: NextResponse, name: string, cookiePath: string) {
  response.headers.append(
    "Set-Cookie",
    \`\${name}=; Path=\${cookiePath}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; HttpOnly\`,
  );

  response.headers.append(
    "Set-Cookie",
    \`\${name}=; Path=\${cookiePath}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure; HttpOnly\`,
  );

  response.headers.append(
    "Set-Cookie",
    \`\${name}=; Path=\${cookiePath}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=None; Secure; HttpOnly\`,
  );
}

function appendDomainDelete(response: NextResponse, name: string, cookiePath: string, domain: string) {
  // Do not send Domain for __Host-* cookies. Browsers reject __Host cookies with Domain.
  if (name.startsWith("__Host-")) return;

  response.headers.append(
    "Set-Cookie",
    \`\${name}=; Path=\${cookiePath}; Domain=\${domain}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; HttpOnly\`,
  );

  response.headers.append(
    "Set-Cookie",
    \`\${name}=; Path=\${cookiePath}; Domain=\${domain}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure; HttpOnly\`,
  );

  response.headers.append(
    "Set-Cookie",
    \`\${name}=; Path=\${cookiePath}; Domain=\${domain}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=None; Secure; HttpOnly\`,
  );
}

function clearCookies(response: NextResponse, request: NextRequest) {
  const names = allCookieNames(request);
  const domains = getDomainVariants(request);

  // Explicit real auth cookie first. This is the important one from debug.
  response.headers.append(
    "Set-Cookie",
    "__Host-zvg_session=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure; HttpOnly",
  );

  response.headers.append(
    "Set-Cookie",
    "__Host-zvg_session=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=None; Secure; HttpOnly",
  );

  for (const name of names) {
    for (const cookiePath of PATHS) {
      appendNoDomainDelete(response, name, cookiePath);

      for (const domain of domains) {
        appendDomainDelete(response, name, cookiePath, domain);
      }
    }
  }

  response.headers.set("Clear-Site-Data", '"cookies"');
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");

  // Restore language only after clearing cookies.
  const locale = getLocale(request);
  response.headers.append(
    "Set-Cookie",
    \`zvg_locale=\${locale}; Path=/; Max-Age=31536000; SameSite=Lax; Secure\`,
  );
}

function safeNext(request: NextRequest) {
  const url = new URL(request.url);
  const locale = getLocale(request);
  const rawNext = url.searchParams.get("next") || \`/\${locale}\`;

  return rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : \`/\${locale}\`;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const response = NextResponse.redirect(new URL(safeNext(request), url.origin), 303);

  clearCookies(response, request);
  return response;
}

export async function POST(request: NextRequest) {
  const response = NextResponse.json({
    ok: true,
    loggedOut: true,
    cleared: allCookieNames(request),
  });

  clearCookies(response, request);
  return response;
}

export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({
    ok: true,
    loggedOut: true,
    cleared: allCookieNames(request),
  });

  clearCookies(response, request);
  return response;
}
`;

write("app/api/auth/logout/route.ts", route);

// Fallback hard route with same implementation.
write("app/api/auth/logout-hard/route.ts", route.replace(/app\/api\/auth\/logout/g, "app/api/auth/logout-hard"));

// Patch client-side cookie clearing to include __Host-zvg_session exactly.
for (const rel of ["components/LogoutButtonStage103.tsx", "components/LogoutPageStage104.tsx"]) {
  if (!exists(rel)) continue;

  let s = read(rel);

  if (!s.includes('"__Host-zvg_session"')) {
    s = s.replace(
      /const names = Array\.from\(new Set\(\[/,
      'const names = Array.from(new Set([\n    "__Host-zvg_session",'
    );
  }

  // __Host cookies must be cleared without Domain and with Path=/; Secure.
  if (!s.includes("stage107ClearHostCookie")) {
    const helper = `
function stage107ClearHostCookie() {
  document.cookie = "__Host-zvg_session=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax; Secure";
  document.cookie = "__Host-zvg_session=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=None; Secure";
}
`;

    s = s.replace(/function clearClientCookies\(\) \{/, helper + "\nfunction clearClientCookies() {\n  stage107ClearHostCookie();");
  }

  // If button uses /api/auth/logout, keep it. If not, enforce it.
  s = s.replace(/\/api\/auth\/logout-hard/g, "/api/auth/logout");
  write(rel, s);
}

// Add a very small debug page route that shows cookie names after clear if needed.
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

console.log("Stage 107 completed.");
