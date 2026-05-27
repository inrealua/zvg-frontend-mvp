import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createUserSessionToken, getSafeNextUrl, hashPassword, normalizeEmail, userSessionCookieOptions, USER_SESSION_COOKIE } from "@/lib/user-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const name = String(formData.get("name") ?? "").trim() || null;
  const password = String(formData.get("password") ?? "");
  const nextUrl = getSafeNextUrl(String(formData.get("next") ?? ""));

  if (!email || !password || password.length < 8) {
    return NextResponse.redirect(new URL(`/register?error=invalid&next=${encodeURIComponent(nextUrl)}`, request.url));
  }

  try {
    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash: hashPassword(password)
      }
    });

    const response = NextResponse.redirect(new URL(nextUrl, request.url));
    response.cookies.set(USER_SESSION_COOKIE, createUserSessionToken(user.id), userSessionCookieOptions());
    return response;
  } catch {
    return NextResponse.redirect(new URL(`/register?error=exists&next=${encodeURIComponent(nextUrl)}`, request.url));
  }
}
