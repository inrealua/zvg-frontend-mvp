import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { createUserSessionToken } from "@/lib/user-auth";
import { setUserSessionCookie } from "@/lib/session-cookie";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type GoogleTokenResponse = {
  access_token?: string;
  id_token?: string;
  error?: string;
};

type GoogleUserInfo = {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

function getBaseUrl(request: NextRequest) {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    `${request.nextUrl.protocol}//${request.nextUrl.host}`
  ).replace(/\/$/, "");
}

function readNextFromState(state: string | null) {
  if (!state) return "/cabinet";
  try {
    const parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
    if (typeof parsed.next === "string" && parsed.next.startsWith("/")) {
      return parsed.next;
    }
  } catch {
    // ignore invalid state
  }
  return "/cabinet";
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const next = readNextFromState(state);

  if (!code) {
    return NextResponse.redirect(new URL(`/login?error=google`, request.url));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Google OAuth is not configured" },
      { status: 500 }
    );
  }

  const baseUrl = getBaseUrl(request);
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const tokenJson = (await tokenResponse.json()) as GoogleTokenResponse;

  if (!tokenResponse.ok || !tokenJson.access_token) {
    console.error("Google token exchange failed", tokenJson);
    return NextResponse.redirect(new URL(`/login?error=google`, request.url));
  }

  const userInfoResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    cache: "no-store",
  });

  const googleUser = (await userInfoResponse.json()) as GoogleUserInfo;

  if (!userInfoResponse.ok || !googleUser.email) {
    console.error("Google userinfo failed", googleUser);
    return NextResponse.redirect(new URL(`/login?error=google`, request.url));
  }

  const email = googleUser.email.trim().toLowerCase();

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: googleUser.name || email,
    },
    create: {
      email,
      name: googleUser.name || email,
      passwordHash: `google:${googleUser.sub}`,
      role: "USER",
    },
    select: {
      id: true,
    },
  });

  const token = await createUserSessionToken(user.id);
  const response = NextResponse.redirect(new URL(next, request.url), { status: 303 });

  setUserSessionCookie(response, token);
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");

  return response;
}
