import { NextRequest, NextResponse } from "next/server";

const LOCALES = ["ru", "de", "en"] as const;
type Locale = (typeof LOCALES)[number];

function isLocale(value: string | undefined): value is Locale {
  return value === "ru" || value === "de" || value === "en";
}

function pickLocale(request: NextRequest): Locale {
  const cookieLocale = request.cookies.get("zvg_locale")?.value;
  if (isLocale(cookieLocale)) return cookieLocale;

  const accept = request.headers.get("accept-language")?.toLowerCase() || "";

  if (accept.startsWith("ru") || accept.includes(",ru")) return "ru";
  if (accept.startsWith("de") || accept.includes(",de")) return "de";
  return "en";
}

function isPublicFile(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/robots") ||
    pathname.startsWith("/sitemap") ||
    pathname.match(/\.[a-zA-Z0-9]+$/)
  );
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isPublicFile(pathname)) {
    return NextResponse.next();
  }

  const first = pathname.split("/").filter(Boolean)[0];

  // User opens zvg-de.com -> redirect to language URL.
  if (pathname === "/") {
    const locale = pickLocale(request);
    const url = request.nextUrl.clone();
    url.pathname = "/" + locale;
    url.search = search;

    const response = NextResponse.redirect(url);
    response.cookies.set("zvg_locale", locale, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  }

  // Locale URLs exist as real pages, but nested locale URLs are internally rewritten:
  // /ru/properties/123 -> /properties/123 with cookie/header locale ru.
  if (isLocale(first)) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-zvg-locale", first);

    const nextPath = pathname.replace(new RegExp("^/" + first + "(?=/|$)"), "") || "/";
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = nextPath;
    rewriteUrl.search = search;

    // For exact /ru /de /en, do not rewrite. Real app/ru/page.tsx etc handle them.
    const response = nextPath === "/"
      ? NextResponse.next({ request: { headers: requestHeaders } })
      : NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } });

    response.cookies.set("zvg_locale", first, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
