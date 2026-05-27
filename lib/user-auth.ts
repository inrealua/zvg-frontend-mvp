import crypto from "crypto";
import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const USER_SESSION_COOKIE = "zvg_user_session";
const SESSION_DAYS = 30;
const PBKDF2_ITERATIONS = 120_000;
const PBKDF2_KEY_LENGTH = 32;

export type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
};

function getSessionSecret(): string {
  return process.env.USER_SESSION_SECRET || process.env.ADMIN_SESSION_TOKEN || process.env.ADMIN_PASSWORD || "dev-user-session-secret-change-me";
}

function base64UrlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function sign(data: string): string {
  return crypto.createHmac("sha256", getSessionSecret()).update(data).digest("base64url");
}

function timingSafeEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) return false;
  return crypto.timingSafeEqual(aBuffer, bBuffer);
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

export function createUserSessionToken(userId: string): string {
  const payload = {
    userId,
    exp: Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000
  };
  const data = base64UrlJson(payload);
  return `${data}.${sign(data)}`;
}

function verifyUserSessionToken(token: string): { userId: string } | null {
  const [data, signature] = token.split(".");
  if (!data || !signature) return null;
  if (!timingSafeEqual(sign(data), signature)) return null;

  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as { userId?: string; exp?: number };
    if (!payload.userId || !payload.exp) return null;
    if (payload.exp < Date.now()) return null;
    return { userId: payload.userId };
  } catch {
    return null;
  }
}

export function userSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60
  };
}

async function getUserByToken(token: string | undefined): Promise<CurrentUser | null> {
  if (!token) return null;

  const session = verifyUserSessionToken(token);
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, role: true }
  });

  return user;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  noStore();
  const cookieStore = await cookies();
  return getUserByToken(cookieStore.get(USER_SESSION_COOKIE)?.value);
}

export async function getCurrentUserFromRequest(request: NextRequest): Promise<CurrentUser | null> {
  noStore();
  const tokenFromRequest = request.cookies.get(USER_SESSION_COOKIE)?.value;
  if (tokenFromRequest) return getUserByToken(tokenFromRequest);

  const cookieStore = await cookies();
  return getUserByToken(cookieStore.get(USER_SESSION_COOKIE)?.value);
}

export function getSafeNextUrl(rawNext: string | null, fallback = "/cabinet"): string {
  if (!rawNext) return fallback;
  if (!rawNext.startsWith("/")) return fallback;
  if (rawNext.startsWith("//")) return fallback;
  return rawNext;
}
