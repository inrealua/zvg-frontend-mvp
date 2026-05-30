import { NextRequest, NextResponse } from "next/server";

import { getSafeNextUrl } from "@/lib/user-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

function getRequestBaseUrl(request: NextRequest) {
  return `${request.nextUrl.protocol}//${request.nextUrl.host}`.replace(/\/$/, "");
}

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json(
      { error: "GOOGLE_CLIENT_ID is not configured" },
      { status: 500 }
    );
  }

  const baseUrl = getRequestBaseUrl(request);
  const callbackUrl = `${baseUrl}/api/auth/google/callback`;
  const next = getSafeNextUrl(request.nextUrl.searchParams.get("next"), "/cabinet");

  const statePayload = Buffer.from(
    JSON.stringify({ next, createdAt: Date.now() }),
    "utf8"
  ).toString("base64url");

  const googleUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleUrl.searchParams.set("client_id", clientId);
  googleUrl.searchParams.set("redirect_uri", callbackUrl);
  googleUrl.searchParams.set("response_type", "code");
  googleUrl.searchParams.set("scope", "openid email profile");
  googleUrl.searchParams.set("access_type", "offline");
  googleUrl.searchParams.set("prompt", "select_account");
  googleUrl.searchParams.set("state", statePayload);

  return NextResponse.redirect(googleUrl);
}
