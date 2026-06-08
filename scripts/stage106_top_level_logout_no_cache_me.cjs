const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();

function full(rel) {
  return path.join(root, rel);
}

function exists(rel) {
  return fs.existsSync(full(rel));
}

function read(rel) {
  return fs.readFileSync(full(rel), "utf8");
}

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
 * Stage 106 — top-level logout + no-cache /api/auth/me.
 *
 * Symptom:
 * After /logout redirects, /api/auth/me still returns:
 * { user: ... }
 *
 * This usually means one of two things:
 * 1) the browser did not apply Set-Cookie deletion from a fetch/subrequest as expected;
 * 2) /api/auth/me is cached or rendered with stale auth data.
 *
 * Fix:
 * - logout button and logout page now use TOP-LEVEL navigation to:
 *   /api/auth/logout?next=/ru|/de|/en
 *   This is the most reliable way to apply Set-Cookie deletion and Clear-Site-Data.
 *
 * - /api/auth/me is forced dynamic and every JSON response gets no-store headers.
 *
 * - logout route is kept aggressive and additionally returns no-store headers.
 */

/* -------------------------------------------------------------------------- */
/* 1. Make LogoutPageStage104 use top-level navigation, not fetch              */
/* -------------------------------------------------------------------------- */

patch("components/LogoutPageStage104.tsx", (s) => {
  if (!s.includes("stage106TopLevelLogout")) {
    s = s.replace(
      /useEffect\(\(\) => \{[\s\S]*?\n\s*\}, \[locale, router\]\);/,
      `useEffect(() => {
    stage106TopLevelLogout(locale);
  }, [locale]);`
    );

    s = s.replace(
      /function clearClientCookies\(\) \{[\s\S]*?\n\}/,
      `function clearClientCookies() {
  stage106ClientCookieClear();
}

function stage106ClientCookieClear() {
  const rawNames = document.cookie
    .split(";")
    .map((part) => part.split("=")[0]?.trim())
    .filter(Boolean);

  const names = Array.from(new Set([
    ...rawNames,
    "zvg_user_session",
    "zvg_admin_session",
    "zvg_session",
    "zvg_auth",
    "zvg_token",
    "session",
    "sessions",
    "sid",
    "connect.sid",
    "user_session",
    "auth_session",
    "auth",
    "token",
    "access_token",
    "refresh_token",
    "jwt",
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
  ]));

  const host = window.location.hostname;
  const parts = host.split(".");
  const apex = parts.length > 2 ? parts.slice(-2).join(".") : host;
  const domains = ["", host, "." + host, apex, "." + apex];
  const paths = ["/", "/api", "/api/auth", "/cabinet", "/app"];

  for (const name of names) {
    for (const cookiePath of paths) {
      for (const domain of domains) {
        const domainPart = domain ? "; domain=" + domain : "";
        document.cookie = name + "=deleted; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=" + cookiePath + domainPart + "; SameSite=Lax";
        document.cookie = name + "=deleted; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=" + cookiePath + domainPart + "; SameSite=None; Secure";
      }
    }
  }
}

function stage106TopLevelLogout(locale: Locale) {
  clearClientCookies();
  const next = "/" + locale;
  const url = "/api/auth/logout?next=" + encodeURIComponent(next) + "&t=" + Date.now();
  window.location.replace(url);
}`
    );
  }

  // If the old useRouter import is now unused, leave it; TS with noUnusedLocals likely false in this project.
  return s;
});

/* -------------------------------------------------------------------------- */
/* 2. Make LogoutButtonStage103 use top-level navigation                       */
/* -------------------------------------------------------------------------- */

patch("components/LogoutButtonStage103.tsx", (s) => {
  if (!s.includes("stage106TopLevelButtonLogout")) {
    // Replace async logout body with deterministic top-level redirect.
    s = s.replace(
      /async function logout\(\) \{[\s\S]*?\n\s*\}/,
      `async function logout() {
    if (pending) return;
    setPending(true);

    clearClientCookies();

    stage106TopLevelButtonLogout(locale);
  }

  function stage106TopLevelButtonLogout(nextLocale: Locale) {
    const target = "/" + nextLocale;
    const url = "/api/auth/logout?next=" + encodeURIComponent(target) + "&t=" + Date.now();
    window.location.assign(url);
  }`
    );
  }

  return s;
});

/* -------------------------------------------------------------------------- */
/* 3. Force /api/auth/me dynamic and no-store                                  */
/* -------------------------------------------------------------------------- */

patch("app/api/auth/me/route.ts", (s) => {
  if (!s.includes('export const dynamic = "force-dynamic"')) {
    // Put after imports.
    const importMatches = [...s.matchAll(/^import[\s\S]*?;\s*$/gm)];
    if (importMatches.length) {
      const last = importMatches[importMatches.length - 1];
      const idx = last.index + last[0].length;
      s = s.slice(0, idx) + `

export const dynamic = "force-dynamic";
export const revalidate = 0;
` + s.slice(idx);
    } else {
      s = `export const dynamic = "force-dynamic";
export const revalidate = 0;

` + s;
    }
  }

  if (!s.includes("function stage106NoStoreJson")) {
    const helper = `
function stage106NoStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}
`;

    const exportIdx = s.indexOf('export const dynamic = "force-dynamic"');
    if (exportIdx !== -1) {
      const afterRevalidate = s.indexOf(";", s.indexOf("export const revalidate", exportIdx));
      const insertAt = afterRevalidate !== -1 ? afterRevalidate + 1 : exportIdx;
      s = s.slice(0, insertAt) + "\n" + helper + s.slice(insertAt);
    } else {
      s = helper + s;
    }

    // Replace only after helper is inserted, avoid replacing inside helper.
    const marker = "function stage106NoStoreJson";
    const markerIndex = s.indexOf(marker);
    const before = s.slice(0, markerIndex);
    let after = s.slice(markerIndex);
    const helperEnd = after.indexOf("\n}\n");
    const helperPart = after.slice(0, helperEnd + 3);
    let rest = after.slice(helperEnd + 3);

    rest = rest.replace(/NextResponse\.json\(/g, "stage106NoStoreJson(");
    s = before + helperPart + rest;
  }

  return s;
});

/* -------------------------------------------------------------------------- */
/* 4. Ensure /api/auth/logout route has top-level GET redirect and no-store    */
/* -------------------------------------------------------------------------- */

patch("app/api/auth/logout/route.ts", (s) => {
  if (!s.includes("Clear-Site-Data")) {
    // If user has not applied Stage105, add a minimal reliable route.
    s = `import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const COOKIE_NAMES = [
  "zvg_user_session",
  "zvg_admin_session",
  "zvg_session",
  "zvg_auth",
  "zvg_token",
  "session",
  "sessions",
  "sid",
  "connect.sid",
  "user_session",
  "auth_session",
  "auth",
  "token",
  "access_token",
  "refresh_token",
  "jwt",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

function domains(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase() || "";
  const result = new Set<string>();
  if (host && host !== "localhost") {
    result.add(host);
    result.add("." + host);
    const parts = host.split(".");
    if (parts.length > 2) {
      const apex = parts.slice(-2).join(".");
      result.add(apex);
      result.add("." + apex);
    }
  }
  return Array.from(result);
}

function names(request: NextRequest) {
  return Array.from(new Set([
    ...request.cookies.getAll().map((c) => c.name),
    ...COOKIE_NAMES,
  ]));
}

function clear(response: NextResponse, request: NextRequest) {
  const paths = ["/", "/api", "/api/auth", "/cabinet", "/app"];
  for (const name of names(request)) {
    for (const path of paths) {
      response.headers.append("Set-Cookie", \`\${name}=deleted; Path=\${path}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax\`);
      response.headers.append("Set-Cookie", \`\${name}=deleted; Path=\${path}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=None; Secure\`);
      for (const domain of domains(request)) {
        response.headers.append("Set-Cookie", \`\${name}=deleted; Path=\${path}; Domain=\${domain}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax\`);
        response.headers.append("Set-Cookie", \`\${name}=deleted; Path=\${path}; Domain=\${domain}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=None; Secure\`);
      }
    }
  }
  response.headers.set("Clear-Site-Data", '"cookies"');
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const next = url.searchParams.get("next") || "/";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const response = NextResponse.redirect(new URL(safeNext, url.origin), 303);
  clear(response, request);
  return response;
}

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: true, loggedOut: true });
  clear(response, request);
  return response;
}

export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({ ok: true, loggedOut: true });
  clear(response, request);
  return response;
}
`;
  } else {
    if (!s.includes('export const dynamic = "force-dynamic"')) {
      const importMatches = [...s.matchAll(/^import[\s\S]*?;\s*$/gm)];
      if (importMatches.length) {
        const last = importMatches[importMatches.length - 1];
        const idx = last.index + last[0].length;
        s = s.slice(0, idx) + `

export const dynamic = "force-dynamic";
export const revalidate = 0;
` + s.slice(idx);
      }
    }

    if (!s.includes("proxy-revalidate")) {
      s = s.replace(/"Cache-Control":\s*"no-store[^"]*"/g, '"Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate"');
      s = s.replace(/response\.headers\.set\("Cache-Control",\s*"no-store[^"]*"\);/g, 'response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");');
    }
  }

  return s;
});

/* -------------------------------------------------------------------------- */
/* 5. Add diagnostic route: /api/auth/logout-debug                             */
/* -------------------------------------------------------------------------- */

write("app/api/auth/logout-debug/route.ts", `import { NextRequest, NextResponse } from "next/server";

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
`);

console.log("Stage 106 completed.");
