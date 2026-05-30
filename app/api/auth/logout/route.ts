import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

const SESSION_COOKIE_NAMES = [
  "__Host-zvg_session",
  "zvg_dev_session",
  "zvg_user_session",
];

async function deleteSessionsFromDatabase(request: NextRequest) {
  const tokens = SESSION_COOKIE_NAMES
    .map((name) => request.cookies.get(name)?.value)
    .filter((value): value is string => Boolean(value));

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
    console.error("Logout session cleanup failed", error);
  }
}

function expireCookies(response: NextResponse) {
  const expires = new Date(0);

  response.cookies.set({
    name: "__Host-zvg_session",
    value: "",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires,
    maxAge: 0,
  });

  response.cookies.set({
    name: "zvg_dev_session",
    value: "",
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    expires,
    maxAge: 0,
  });

  response.cookies.set({
    name: "zvg_user_session",
    value: "",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires,
    maxAge: 0,
  });
}

async function logout(request: NextRequest) {
  await deleteSessionsFromDatabase(request);

  const response = NextResponse.redirect(new URL("/", request.url), {
    status: 303,
  });

  expireCookies(response);
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");

  return response;
}

export async function GET(request: NextRequest) {
  return logout(request);
}

export async function POST(request: NextRequest) {
  return logout(request);
}
