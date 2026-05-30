import crypto from "crypto";
import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import type { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const USER_SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-zvg_session" : "zvg_dev_session";
export const OLD_USER_SESSION_COOKIE = "zvg_user_session";

const SESSION_DAYS = 30;
const PBKDF2_ITERATIONS = 120_000;
const PBKDF2_KEY_LENGTH = 32;

export type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
};

function timingSafeEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) return false;
  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

function getCookieValueFromHeader(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined;

  for (const part of cookieHeader.split(";")) {
    const [rawKey, ...rawValueParts] = part.trim().split("=");
    if (rawKey === name) {
      return decodeURIComponent(rawValueParts.join("="));
    }
  }

  return undefined;
}

function createRandomToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function sessionExpiresAt(): Date {
  return new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEY_LENGTH, "sha256").toString("hex");
  return `pbkdf2_sha256$${PBKDF2_ITERATIONS}$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2_sha256") return false;

  const iterations = Number(parts[1]);
  const salt = parts[2];
  const expectedHash = parts[3];

  if (!Number.isFinite(iterations) || !salt || !expectedHash) return false;

  const actualHash = crypto.pbkdf2Sync(password, salt, iterations, PBKDF2_KEY_LENGTH, "sha256").toString("hex");
  return timingSafeEqual(actualHash, expectedHash);
}

export function userSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  };
}

export function expiredUserSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };
}

export function setUserSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(USER_SESSION_COOKIE, token, userSessionCookieOptions());
  // Clear the old signed-cookie auth from previous stages so it cannot confuse the UI/API.
  response.cookies.set(OLD_USER_SESSION_COOKIE, "", expiredUserSessionCookieOptions());
}

export function clearUserSessionCookies(response: NextResponse) {
  response.cookies.set(USER_SESSION_COOKIE, "", expiredUserSessionCookieOptions());
  response.cookies.set(OLD_USER_SESSION_COOKIE, "", expiredUserSessionCookieOptions());
}

export async function createUserSessionToken(userId: string): Promise<string> {
  const token = createRandomToken();

  await prisma.session.create({
    data: {
      sessionToken: token,
      userId,
      expires: sessionExpiresAt(),
    },
  });

  return token;
}

async function getUserBySessionToken(token: string | undefined | null): Promise<CurrentUser | null> {
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { sessionToken: token },
    select: {
      expires: true,
      user: {
        select: { id: true, email: true, name: true, role: true },
      },
    },
  });

  if (!session) return null;

  if (session.expires.getTime() < Date.now()) {
    await prisma.session.deleteMany({ where: { sessionToken: token } }).catch(() => null);
    return null;
  }

  return session.user;
}

async function getTokenFromCookieStore(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(USER_SESSION_COOKIE)?.value;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  noStore();
  return getUserBySessionToken(await getTokenFromCookieStore());
}

export async function getCurrentUserFromRequest(request: NextRequest): Promise<CurrentUser | null> {
  noStore();

  const tokenFromRequest = request.cookies.get(USER_SESSION_COOKIE)?.value;
  if (tokenFromRequest) {
    const user = await getUserBySessionToken(tokenFromRequest);
    if (user) return user;
  }

  const tokenFromHeader = getCookieValueFromHeader(request.headers.get("cookie"), USER_SESSION_COOKIE);
  if (tokenFromHeader) {
    const user = await getUserBySessionToken(tokenFromHeader);
    if (user) return user;
  }

  return getUserBySessionToken(await getTokenFromCookieStore());
}

export async function deleteCurrentSessionFromRequest(request: NextRequest) {
  const token = request.cookies.get(USER_SESSION_COOKIE)?.value || getCookieValueFromHeader(request.headers.get("cookie"), USER_SESSION_COOKIE);
  if (!token) return;
  await prisma.session.deleteMany({ where: { sessionToken: token } }).catch(() => null);
}

export function getSafeNextUrl(rawNext: string | null, fallback = "/cabinet"): string {
  if (!rawNext) return fallback;
  if (!rawNext.startsWith("/")) return fallback;
  if (rawNext.startsWith("//")) return fallback;
  return rawNext;
}
