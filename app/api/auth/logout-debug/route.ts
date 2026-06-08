import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const cookieNames = request.cookies.getAll().map((cookie) => cookie.name);

  const response = NextResponse.json({
    ok: true,
    cookieNames,
    hasCookies: cookieNames.length > 0,
  });

  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");

  return response;
}
