import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const response = NextResponse.json({
    cookieNames: request.cookies.getAll().map((cookie) => cookie.name),
    hasHostSession: Boolean(request.cookies.get("__Host-zvg_session")),
  });

  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");

  return response;
}
