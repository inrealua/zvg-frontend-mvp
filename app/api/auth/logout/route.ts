import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

const PROD_COOKIE = "__Host-zvg_session";
const DEV_COOKIE = "zvg_dev_session";
const LEGACY_COOKIE = "zvg_user_session";

function getSessionTokens(request: NextRequest) {
  const tokens = [
    request.cookies.get(PROD_COOKIE)?.value,
    request.cookies.get(DEV_COOKIE)?.value,
    request.cookies.get(LEGACY_COOKIE)?.value,
  ].filter((value): value is string => Boolean(value));

  return Array.from(new Set(tokens));
}

async function deleteSessions(tokens: string[]) {
  if (tokens.length === 0) return;

  try {
    await prisma.session.deleteMany({
      where: {
        sessionToken: {
          in: tokens,
        },
      },
    });
  } catch (error) {
    console.error("Logout session delete error:", error);
  }
}

function clearCookie(response: NextResponse, name: string, secure: boolean) {
  response.cookies.set({
    name,
    value: "",
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
}

async function logout(request: NextRequest) {
  const tokens = getSessionTokens(request);
  await deleteSessions(tokens);

  const redirectUrl = new URL("/", request.url);
  redirectUrl.searchParams.set("logout", String(Date.now()));

  const response = NextResponse.redirect(redirectUrl, { status: 303 });

  clearCookie(response, PROD_COOKIE, true);
  clearCookie(response, DEV_COOKIE, false);
  clearCookie(response, LEGACY_COOKIE, request.nextUrl.protocol === "https:");

  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  response.headers.set("Surrogate-Control", "no-store");

  return response;
}

export async function GET(request: NextRequest) {
  return logout(request);
}

export async function POST(request: NextRequest) {
  return logout(request);
}
