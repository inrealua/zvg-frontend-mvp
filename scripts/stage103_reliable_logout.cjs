const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();

function full(rel) { return path.join(root, rel); }
function exists(rel) { return fs.existsSync(full(rel)); }
function read(rel) { return fs.readFileSync(full(rel), "utf8"); }
function write(rel, content) {
  const target = full(rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
  console.log("written", rel);
}
function patch(rel, fn) {
  if (!exists(rel)) {
    console.log("skip missing", rel);
    return;
  }
  const before = read(rel);
  const after = fn(before);
  if (after !== before) {
    write(rel, after);
    console.log("patched", rel);
  } else {
    console.log("unchanged", rel);
  }
}

/**
 * Stage 103 — reliable logout.
 *
 * Reliable solution:
 * 1) server route clears all known auth/session cookies with all domain variants;
 * 2) route supports GET and POST;
 * 3) client button calls POST /api/auth/logout with credentials;
 * 4) client also clears visible JS cookies as fallback;
 * 5) after logout, redirect to /<locale> and router.refresh().
 */

write("app/api/auth/logout/route.ts", `import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const COOKIE_NAMES = [
  "zvg_user_session",
  "zvg_admin_session",
  "session",
  "user_session",
  "auth_session",
  "token",
  "access_token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

function getDomainVariants(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase() || "";
  const domains = new Set<string>();

  if (host && host !== "localhost" && !/^\\\\d+\\\\.\\\\d+\\\\.\\\\d+\\\\.\\\\d+$/.test(host)) {
    domains.add(host);
    domains.add("." + host);

    const parts = host.split(".");
    if (parts.length > 2) {
      const apex = parts.slice(-2).join(".");
      domains.add(apex);
      domains.add("." + apex);
    }
  }

  return Array.from(domains);
}

function expireCookieHeaders(request: NextRequest) {
  const headers: string[] = [];
  const domains = getDomainVariants(request);

  for (const name of COOKIE_NAMES) {
    headers.push(
      \`\${name}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax\`,
      \`\${name}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure\`,
      \`\${name}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=None; Secure\`,
    );

    for (const domain of domains) {
      headers.push(
        \`\${name}=; Path=/; Domain=\${domain}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax\`,
        \`\${name}=; Path=/; Domain=\${domain}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure\`,
        \`\${name}=; Path=/; Domain=\${domain}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=None; Secure\`,
      );
    }
  }

  return headers;
}

function jsonLogout(request: NextRequest) {
  const response = NextResponse.json(
    { ok: true, loggedOut: true },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    },
  );

  for (const header of expireCookieHeaders(request)) {
    response.headers.append("Set-Cookie", header);
  }

  return response;
}

function redirectLogout(request: NextRequest) {
  const url = new URL(request.url);
  const rawNext = url.searchParams.get("next") || "/";
  const safeNext = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";
  const response = NextResponse.redirect(new URL(safeNext, url.origin), 303);

  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");

  for (const header of expireCookieHeaders(request)) {
    response.headers.append("Set-Cookie", header);
  }

  return response;
}

export async function POST(request: NextRequest) {
  return jsonLogout(request);
}

export async function GET(request: NextRequest) {
  return redirectLogout(request);
}
`);

write("components/LogoutButtonStage103.tsx", `"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

type Locale = "de" | "ru" | "en";

function getLocale(pathname: string): Locale {
  const first = pathname.split("/").filter(Boolean)[0];
  if (first === "ru" || first === "de" || first === "en") return first;
  if (typeof document !== "undefined") {
    const match = document.cookie.match(/(?:^|;\\\\s*)zvg_locale=(ru|de|en)(?:;|$)/);
    if (match?.[1] === "ru" || match?.[1] === "de" || match?.[1] === "en") return match[1];
  }
  return "de";
}

function label(locale: Locale, pending: boolean) {
  if (pending) {
    if (locale === "ru") return "Выход...";
    if (locale === "en") return "Logging out...";
    return "Abmeldung...";
  }

  if (locale === "ru") return "Выйти";
  if (locale === "en") return "Logout";
  return "Abmelden";
}

function clearClientCookies() {
  const names = [
    "zvg_user_session",
    "zvg_admin_session",
    "session",
    "user_session",
    "auth_session",
    "token",
    "access_token",
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
  ];

  const host = window.location.hostname;
  const domains = ["", host, "." + host];

  for (const name of names) {
    for (const domain of domains) {
      const domainPart = domain ? "; domain=" + domain : "";
      document.cookie = name + "=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/" + domainPart + "; SameSite=Lax";
      document.cookie = name + "=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/" + domainPart + "; SameSite=None; Secure";
    }
  }
}

export function LogoutButtonStage103({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const [pending, setPending] = useState(false);
  const locale = getLocale(pathname);

  async function logout() {
    if (pending) return;
    setPending(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "content-type": "application/json" },
      });
    } catch {
      // Continue with client cleanup and redirect even if network request fails.
    }

    clearClientCookies();

    const target = "/" + locale;
    router.replace(target);
    router.refresh();

    window.setTimeout(() => {
      window.location.assign(target);
    }, 150);
  }

  return (
    <button
      type="button"
      className={className || "logout-button-stage103"}
      onClick={logout}
      disabled={pending}
    >
      {label(locale, pending)}
    </button>
  );
}
`);

const headerFiles = [
  "components/Header.tsx",
  "components/PublicHeader.tsx",
  "components/SiteHeader.tsx",
  "app/Header.tsx",
];

for (const rel of headerFiles) {
  patch(rel, (s) => {
    if (!/Abmelden|Выйти|Logout|logout/i.test(s)) return s;

    if (!s.includes("LogoutButtonStage103")) {
      s = 'import { LogoutButtonStage103 } from "@/components/LogoutButtonStage103";\n' + s;
    }

    s = s.replace(/<form[^>]*action=["']\/api\/auth\/logout["'][\s\S]*?<\/form>/g, '<LogoutButtonStage103 />');
    s = s.replace(/<a([^>]*href=["']\/api\/auth\/logout["'][^>]*)>[\s\S]*?<\/a>/g, '<LogoutButtonStage103 />');
    s = s.replace(/<button([^>]*)>\s*(Abmelden|Выйти|Logout)\s*<\/button>/g, '<LogoutButtonStage103 />');
    s = s.replace(/<button([^>]*)>\s*\{[^}]*logout[^}]*\}\s*<\/button>/gi, '<LogoutButtonStage103 />');

    return s.replace(/\n{3,}/g, "\n\n");
  });
}

patch("app/globals.css", (s) => {
  if (s.includes("/* Stage 103 reliable logout */")) return s;

  return s + `

/* Stage 103 reliable logout */

.logout-button-stage103 {
  height: 42px;
  min-height: 42px;
  padding: 0 18px;
  border: 1px solid rgba(47, 97, 79, .22);
  border-radius: 999px;
  background: rgba(255,255,255,.92);
  color: #26483d;
  font-weight: 800;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.logout-button-stage103:hover {
  background: rgba(234, 245, 240, .95);
}

.logout-button-stage103:disabled {
  opacity: .65;
  cursor: default;
}

@media (max-width: 768px) {
  .logout-button-stage103 {
    height: 36px;
    min-height: 36px;
    padding: 0 11px;
    font-size: 13px;
  }
}
`;
});

console.log("Stage 103 completed.");
