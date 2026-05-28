import { NextRequest, NextResponse } from "next/server";

export const USER_SESSION_COOKIE = "zvg_user_session";

const isProduction = process.env.NODE_ENV === "production";

export function setUserSessionCookie(response: NextResponse, value: string) {
  response.cookies.set({
    name: USER_SESSION_COOKIE,
    value,
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearUserSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: USER_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function readUserSessionCookie(request: NextRequest) {
  const fromCookies = request.cookies.get(USER_SESSION_COOKIE)?.value;
  if (fromCookies) return fromCookies;

  const rawCookie = request.headers.get("cookie") || "";
  const match = rawCookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${USER_SESSION_COOKIE}=`));

  if (!match) return null;
  return decodeURIComponent(match.slice(USER_SESSION_COOKIE.length + 1));
}

export function noStoreJson<T>(data: T, init?: ResponseInit) {
  const response = NextResponse.json(data, init);
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  response.headers.set("Vary", "Cookie");
  return response;
}
