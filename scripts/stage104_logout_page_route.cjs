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
 * Stage 104 — /logout route.
 *
 * Stage103 created /api/auth/logout and a client logout button, but direct
 * https://zvg-de.com/logout still returns 404 because there is no app/logout/page.tsx.
 *
 * This stage adds:
 * - /logout
 * - /ru/logout
 * - /de/logout
 * - /en/logout
 *
 * Each route calls the robust logout API on mount and redirects to the proper
 * locale home page. It also shows a simple localized message while logging out.
 */

// Reusable client component.
write("components/LogoutPageStage104.tsx", `"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type Locale = "de" | "ru" | "en";

const text = {
  de: {
    title: "Sie werden abgemeldet...",
    subtitle: "Ihre Sitzung wird beendet.",
  },
  ru: {
    title: "Выходим из аккаунта...",
    subtitle: "Сессия завершается.",
  },
  en: {
    title: "Logging out...",
    subtitle: "Your session is being ended.",
  },
} as const;

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

export function LogoutPageStage104({ locale }: { locale: Locale }) {
  const router = useRouter();
  const t = text[locale];

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "include",
          cache: "no-store",
          headers: {
            "content-type": "application/json",
          },
        });
      } catch {
        // Continue with client cleanup and redirect.
      }

      clearClientCookies();

      if (cancelled) return;

      const target = "/" + locale;
      router.replace(target);
      router.refresh();

      window.setTimeout(() => {
        window.location.assign(target);
      }, 150);
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [locale, router]);

  return (
    <main className="logout-page-stage104">
      <section>
        <h1>{t.title}</h1>
        <p>{t.subtitle}</p>
      </section>
    </main>
  );
}
`);

// Root /logout. Default to stored/browser locale where possible, but server side
// cannot read localStorage. Use a client redirect component with de as fallback;
// the component can still preserve locale cookie indirectly via current URL only.
// For direct /logout default de is acceptable; /ru/logout etc. are exact.
write("app/logout/page.tsx", `import { LogoutPageStage104 } from "@/components/LogoutPageStage104";

export default function LogoutPage() {
  return <LogoutPageStage104 locale="de" />;
}
`);

// Locale logout pages.
for (const locale of ["ru", "de", "en"]) {
  write(`app/${locale}/logout/page.tsx`, `import { LogoutPageStage104 } from "@/components/LogoutPageStage104";

export default function LogoutPage() {
  return <LogoutPageStage104 locale="${locale}" />;
}
`);
}

// Also support dynamic /[locale]/logout if app/[locale] exists and project routes through it.
write("app/[locale]/logout/page.tsx", `import { notFound } from "next/navigation";
import { LogoutPageStage104 } from "@/components/LogoutPageStage104";

type Locale = "de" | "ru" | "en";

export default async function LocaleLogoutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (locale !== "de" && locale !== "ru" && locale !== "en") {
    notFound();
  }

  return <LogoutPageStage104 locale={locale as Locale} />;
}
`);

// Patch Header button if Stage103 did not catch it and it still links to /logout.
// Make direct href still work, but prefer client component where possible.
const headerFiles = [
  "components/Header.tsx",
  "components/PublicHeader.tsx",
  "components/SiteHeader.tsx",
  "app/Header.tsx",
];

for (const rel of headerFiles) {
  patch(rel, (s) => {
    if (!/\/logout|Abmelden|Выйти|Logout/i.test(s)) return s;

    if (!s.includes("LogoutButtonStage103") && exists("components/LogoutButtonStage103.tsx")) {
      s = 'import { LogoutButtonStage103 } from "@/components/LogoutButtonStage103";\n' + s;
    }

    // Replace direct /logout link/button variants.
    s = s.replace(/<a([^>]*href=["']\/logout["'][^>]*)>[\s\S]*?<\/a>/g, '<LogoutButtonStage103 />');
    s = s.replace(/<a([^>]*href=["']\/(ru|de|en)\/logout["'][^>]*)>[\s\S]*?<\/a>/g, '<LogoutButtonStage103 />');

    return s.replace(/\n{3,}/g, "\n\n");
  });
}

// CSS.
patch("app/globals.css", (s) => {
  if (s.includes("/* Stage 104 logout page */")) return s;

  return s + `

/* Stage 104 logout page */

.logout-page-stage104 {
  min-height: 60vh;
  display: grid;
  place-items: center;
  padding: 40px 18px;
}

.logout-page-stage104 section {
  width: min(520px, 100%);
  border: 1px solid rgba(47, 97, 79, .18);
  border-radius: 24px;
  background: rgba(255,255,255,.94);
  box-shadow: 0 18px 42px rgba(18,45,34,.10);
  padding: 32px;
  text-align: center;
}

.logout-page-stage104 h1 {
  margin: 0 0 10px;
  color: #123c30;
  font-size: clamp(24px, 4vw, 34px);
}

.logout-page-stage104 p {
  margin: 0;
  color: #637085;
  font-size: 16px;
}
`;
});

console.log("Stage 104 completed.");
