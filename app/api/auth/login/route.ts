import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createUserSessionToken, getSafeNextUrl, normalizeEmail, userSessionCookieOptions, USER_SESSION_COOKIE, verifyPassword } from "@/lib/user-auth";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  const nextUrl = getSafeNextUrl(String(formData.get("next") ?? ""));

  if (!email || !password) {
    return NextResponse.redirect(new URL(`/login?error=missing&next=${encodeURIComponent(nextUrl)}`, request.url));
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.redirect(new URL(`/login?error=invalid&next=${encodeURIComponent(nextUrl)}`, request.url));
  }

  const response = NextResponse.redirect(new URL(nextUrl, request.url));
  response.cookies.set(USER_SESSION_COOKIE, createUserSessionToken(user.id), userSessionCookieOptions());
  return response;
}
