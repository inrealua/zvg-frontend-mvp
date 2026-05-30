import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  createUserSessionToken,
  getSafeNextUrl,
  hashPassword,
  normalizeEmail,
  setUserSessionCookie,
} from "@/lib/user-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const name = String(formData.get("name") ?? "").trim() || null;
  const password = String(formData.get("password") ?? "");
  const nextUrl = getSafeNextUrl(String(formData.get("next") ?? "/cabinet"));

  if (!email || !password || password.length < 8) {
    return NextResponse.redirect(
      new URL(`/register?error=invalid&next=${encodeURIComponent(nextUrl)}`, request.url),
      { status: 303 }
    );
  }

  try {
    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash: hashPassword(password),
      },
      select: { id: true },
    });

    const token = await createUserSessionToken(user.id);
    const response = NextResponse.redirect(new URL(nextUrl, request.url), { status: 303 });

    setUserSessionCookie(response, token);
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    return response;
  } catch {
    return NextResponse.redirect(
      new URL(`/register?error=exists&next=${encodeURIComponent(nextUrl)}`, request.url),
      { status: 303 }
    );
  }
}
