import { cookies } from "next/headers";

export const ADMIN_SESSION_COOKIE = "zvg_admin_session";

export function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || "admin12345";
}

export function getAdminSessionToken() {
  return process.env.ADMIN_SESSION_TOKEN || process.env.ADMIN_PASSWORD || "dev-admin-token-change-me";
}

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  const currentToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  return Boolean(currentToken && currentToken === getAdminSessionToken());
}
