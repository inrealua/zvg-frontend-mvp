import { NextRequest, NextResponse } from "next/server";
import {
  USER_SESSION_COOKIE,
  clearUserSessionCookies,
  setUserSessionCookie,
} from "@/lib/user-auth";

export { USER_SESSION_COOKIE, setUserSessionCookie, clearUserSessionCookies };

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
