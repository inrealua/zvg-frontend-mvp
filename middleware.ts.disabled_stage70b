import { NextRequest, NextResponse } from "next/server";

const ADMIN_COOKIE = "zvg_admin_session";

function hasUserSession(request: NextRequest) {
  return (
    request.cookies.has("__Host-zvg_session") ||
    request.cookies.has("zvg_dev_session")
  );
}

function hasAdminSession(request: NextRequest) {
  return request.cookies.has(ADMIN_COOKIE);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin protection
  if (
    pathname.startsWith("/admin") &&
    pathname !== "/admin/login" &&
    pathname !== "/admin/logout"
  ) {
    if (!hasAdminSession(request)) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // User protected pages
  if (pathname.startsWith("/cabinet")) {
    if (!hasUserSession(request)) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/cabinet/:path*",
    "/admin/:path*",
  ],
};