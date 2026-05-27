import { NextRequest, NextResponse } from "next/server";

const ADMIN_SESSION_COOKIE = "zvg_admin_session";

function getAdminSessionToken() {
  return process.env.ADMIN_SESSION_TOKEN || process.env.ADMIN_PASSWORD || "dev-admin-token-change-me";
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }

  const expectedToken = getAdminSessionToken();
  const currentToken = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;

  if (currentToken && currentToken === expectedToken) {
    return NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/admin/login";
  loginUrl.searchParams.set("next", pathname);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*"]
};
