import { NextRequest, NextResponse } from "next/server";

const LOCALES = ["ru", "de", "en"] as const;
type Locale = (typeof LOCALES)[number];

function isLocale(value: string | undefined): value is Locale {
  return value === "ru" || value === "de" || value === "en";
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const first = pathname.split("/").filter(Boolean)[0];

  if (!isLocale(first)) {
    return NextResponse.next();
  }

  const nextPath = pathname.replace(new RegExp("^/" + first + "(?=/|$)"), "") || "/";
  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = nextPath;
  rewriteUrl.search = search;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-zvg-locale", first);

  const response = NextResponse.rewrite(rewriteUrl, {
    request: { headers: requestHeaders },
  });
  response.cookies.set("zvg_locale", first, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  return response;
}

export const config = {
  matcher: [
    "/ru/:path*",
    "/de/:path*",
    "/en/:path*",
  ],
};
