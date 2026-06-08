import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const COOKIE_NAMES = [
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

function expireCookieHeaders(request: NextRequest) {
  const headers: string[] = [];
  const domains = getDomainVariants(request);

  for (const name of COOKIE_NAMES) {
    headers.push(
      `${name}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`,
      `${name}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure`,
      `${name}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=None; Secure`,
    );

    for (const domain of domains) {
      headers.push(
        `${name}=; Path=/; Domain=${domain}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`,
        `${name}=; Path=/; Domain=${domain}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure`,
        `${name}=; Path=/; Domain=${domain}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=None; Secure`,
      );
    }
  }

  return headers;
}

function jsonLogout(request: NextRequest) {
  const response = NextResponse.json(
    { ok: true, loggedOut: true },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    },
  );

  for (const header of expireCookieHeaders(request)) {
    response.headers.append("Set-Cookie", header);
  }

  return response;
}

function redirectLogout(request: NextRequest) {
  const url = new URL(request.url);
  const rawNext = url.searchParams.get("next") || "/";
  const safeNext = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";
  const response = NextResponse.redirect(new URL(safeNext, url.origin), 303);

  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");

  for (const header of expireCookieHeaders(request)) {
    response.headers.append("Set-Cookie", header);
  }

  return response;
}

export async function POST(request: NextRequest) {
  return jsonLogout(request);
}

export async function GET(request: NextRequest) {
  return redirectLogout(request);
}
