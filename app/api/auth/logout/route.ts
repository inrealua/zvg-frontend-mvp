import { NextRequest, NextResponse } from "next/server";

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
  const rawNext = url.searchParams.get("next") || `/${locale}`;

  if (!rawNext.startsWith("/") || rawNext.startsWith("//")) return `/${locale}`;

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
    `zvg_locale=${locale}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`,
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
