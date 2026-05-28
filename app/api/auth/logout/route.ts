import { NextRequest, NextResponse } from "next/server";

import { clearUserSessionCookie } from "@/lib/session-cookie";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function logout(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/", request.url), { status: 303 });
  clearUserSessionCookie(response);
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
