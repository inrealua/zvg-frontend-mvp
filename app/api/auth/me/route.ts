import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest, USER_SESSION_COOKIE } from "@/lib/user-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);

  const response = NextResponse.json({ user });
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  response.headers.set("Vary", "Cookie");

  // Это не раскрывает значение cookie, только помогает браузеру/прокси не кэшировать неверный ответ.
  if (!request.cookies.get(USER_SESSION_COOKIE)?.value && !request.headers.get("cookie")?.includes(USER_SESSION_COOKIE)) {
    response.headers.set("X-ZVG-User-Cookie", "missing");
  } else {
    response.headers.set("X-ZVG-User-Cookie", "present");
  }

  return response;
}
