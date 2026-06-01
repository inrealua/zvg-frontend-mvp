import { NextRequest, NextResponse } from "next/server";

import { clearUserSessionCookies, deleteCurrentSessionFromRequest } from "@/lib/user-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

async function logout(request: NextRequest) {
  await deleteCurrentSessionFromRequest(request);

  const response = NextResponse.redirect(new URL("/", request.url), { status: 303 });
  clearUserSessionCookies(response);
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");

  return response;
}

export async function POST(request: NextRequest) {
  return logout(request);
}

export async function GET(request: NextRequest) {
  return logout(request);
}
