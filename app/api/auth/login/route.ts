import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  createUserSessionToken,
  getSafeNextUrl,
  normalizeEmail,
  setUserSessionCookie,
  verifyPassword,
} from "@/lib/user-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const email = normalizeEmail(String(formData.get("email") || ""));
  const password = String(formData.get("password") || "");
  const next = getSafeNextUrl(String(formData.get("next") || "/cabinet"));

  if (!email || !password) {
    return NextResponse.redirect(
      new URL(`/login?error=missing&next=${encodeURIComponent(next)}`, request.url),
      { status: 303 }
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.passwordHash || user.passwordHash.startsWith("google:")) {
    return NextResponse.redirect(
      new URL(`/login?error=invalid&next=${encodeURIComponent(next)}`, request.url),
      { status: 303 }
    );
  }

  const validPassword = verifyPassword(password, user.passwordHash);

  if (!validPassword) {
    return NextResponse.redirect(
      new URL(`/login?error=invalid&next=${encodeURIComponent(next)}`, request.url),
      { status: 303 }
    );
  }

  const token = await createUserSessionToken(user.id);
  const response = NextResponse.redirect(new URL(next, request.url), { status: 303 });

  setUserSessionCookie(response, token);
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");

  return response;
}
