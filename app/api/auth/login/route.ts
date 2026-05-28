import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { createUserSessionToken } from "@/lib/user-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/cabinet");

  if (!email || !password) {
    return NextResponse.redirect(
      new URL(`/login?error=missing&next=${encodeURIComponent(next)}`, request.url),
      { status: 303 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !user.passwordHash) {
    return NextResponse.redirect(
      new URL(`/login?error=invalid&next=${encodeURIComponent(next)}`, request.url),
      { status: 303 }
    );
  }

  const bcrypt = await import("bcryptjs");
  const validPassword = await bcrypt.compare(password, user.passwordHash);

  if (!validPassword) {
    return NextResponse.redirect(
      new URL(`/login?error=invalid&next=${encodeURIComponent(next)}`, request.url),
      { status: 303 }
    );
  }

  const session = await createUserSessionToken(user.id);

  const redirectUrl = new URL(next.startsWith("/") ? next : "/cabinet", request.url);
  const response = NextResponse.redirect(redirectUrl, { status: 303 });

  response.cookies.set({
    name: "zvg_user_session",
    value: session,
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");

  return response;
}