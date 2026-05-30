import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

const PROD_COOKIE = "__Host-zvg_session";
const DEV_COOKIE = "zvg_dev_session";
const LEGACY_COOKIE = "zvg_user_session";

function getSessionToken(request: NextRequest) {
  return (
    request.cookies.get(PROD_COOKIE)?.value ||
    request.cookies.get(DEV_COOKIE)?.value ||
    request.cookies.get(LEGACY_COOKIE)?.value ||
    null
  );
}

function expireCookie(response: NextResponse, name: string, secure: boolean) {
  response.cookies.set({
    name,
    value: "",
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

async function clearSession(request: NextRequest) {
  const sessionToken = getSessionToken(request);

  if (sessionToken) {
    await prisma.session.deleteMany({
      where: { sessionToken },
    });
  }

  const response = NextResponse.redirect(new URL("/", request.url), {
    status: 303,
  });

  expireCookie(response, PROD_COOKIE, true);
  expireCookie(response, DEV_COOKIE, false);
  expireCookie(response, LEGACY_COOKIE, true);

  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");

  return response;
}

export async function POST(request: NextRequest) {
  return clearSession(request);
}

export async function GET(request: NextRequest) {
  return clearSession(request);
}
