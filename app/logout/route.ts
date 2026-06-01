import { NextRequest, NextResponse } from "next/server";
import { USER_SESSION_COOKIE } from "@/lib/user-auth";

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set(USER_SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
