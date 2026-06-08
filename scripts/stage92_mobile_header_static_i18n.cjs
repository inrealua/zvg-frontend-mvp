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
 * Stage 92 — mobile header static + better mobile layout + Startseite i18n.
 *
 * Fixes:
 * 1) Header/menu must NOT stay fixed/sticky while scrolling.
 * 2) Header must adapt better to mobile width.
 * 3) Startseite must be translated by selected locale.
 *
 * CSS-only for layout + safe small source patch for Header labels.
 */

/* -------------------------------------------------------------------------- */
/* 1. Source-level Header translations                                         */
/* -------------------------------------------------------------------------- */

for (const rel of ["components/Header.tsx", "components/PublicHeader.tsx", "components/SiteHeader.tsx", "app/Header.tsx"]) {
  patch(rel, (s) => {
    // Add helper only once if this header file contains Startseite.
    if (s.includes("Startseite") && !s.includes("stage92NavLabel")) {
      const helper = `
function stage92NavLabel(key: "home" | "archive" | "account" | "logout", locale: "de" | "ru" | "en") {
  const labels = {
    de: {
      home: "Startseite",
      archive: "Archiv",
      account: "Mein Konto",
      logout: "Abmelden",
    },
    ru: {
      home: "Главная",
      archive: "Архив",
      account: "Кабинет",
      logout: "Выйти",
    },
    en: {
      home: "Home",
      archive: "Archive",
      account: "My account",
      logout: "Logout",
    },
  } as const;

  return labels[locale]?.[key] || labels.de[key];
}
`;

      // Insert after imports if possible.
      const imports = [...s.matchAll(/^import[\s\S]*?;\s*$/gm)];
      if (imports.length) {
        const last = imports[imports.length - 1];
        const idx = last.index + last[0].length;
        s = s.slice(0, idx) + "\n" + helper + s.slice(idx);
      } else {
        s = helper + "\n" + s;
      }
    }

    // Replace plain JSX text. These are intentionally conservative.
    s = s.replace(/>Startseite</g, '>{stage92NavLabel("home", locale)}<');
    s = s.replace(/>Archiv</g, '>{stage92NavLabel("archive", locale)}<');
    s = s.replace(/>Mein Konto</g, '>{stage92NavLabel("account", locale)}<');
    s = s.replace(/>Abmelden</g, '>{stage92NavLabel("logout", locale)}<');

    // Replace object-label strings where common.
    s = s.replace(/home:\s*"Startseite"/g, 'home: stage92NavLabel("home", locale)');
    s = s.replace(/archive:\s*"Archiv"/g, 'archive: stage92NavLabel("archive", locale)');
    s = s.replace(/account:\s*"Mein Konto"/g, 'account: stage92NavLabel("account", locale)');
    s = s.replace(/logout:\s*"Abmelden"/g, 'logout: stage92NavLabel("logout", locale)');

    return s;
  });
}

/* -------------------------------------------------------------------------- */
/* 2. Add tiny header text fallback for files with hardcoded text not patched   */
/* -------------------------------------------------------------------------- */

const fallback = `"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

type Locale = "de" | "ru" | "en";

function getLocale(): Locale {
  const first = window.location.pathname.split("/").filter(Boolean)[0];
  if (first === "ru" || first === "de" || first === "en") return first;
  const select = document.querySelector<HTMLSelectElement>("select");
  const value = select?.value?.toLowerCase();
  if (value === "ru" || value === "de" || value === "en") return value;
  return "de";
}

const labels = {
  de: { home: "Startseite", archive: "Archiv", account: "Mein Konto", logout: "Abmelden" },
  ru: { home: "Главная", archive: "Архив", account: "Кабинет", logout: "Выйти" },
  en: { home: "Home", archive: "Archive", account: "My account", logout: "Logout" },
} as const;

function replaceExactText(root: ParentNode, from: string[], to: string) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Node[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  for (const node of nodes) {
    const text = node.textContent?.trim();
    if (text && from.includes(text)) node.textContent = to;
  }
}

function updateHeaderTexts() {
  const locale = getLocale();
  const header = document.querySelector("header");
  if (!header) return;

  replaceExactText(header, ["Startseite", "Главная", "Home"], labels[locale].home);
  replaceExactText(header, ["Archiv", "Архив", "Archive"], labels[locale].archive);
  replaceExactText(header, ["Mein Konto", "Кабинет", "My account", "My Account"], labels[locale].account);
  replaceExactText(header, ["Abmelden", "Выйти", "Logout"], labels[locale].logout);
}

export function HeaderMobileI18nStage92() {
  const pathname = usePathname();

  useEffect(() => {
    updateHeaderTexts();
    const id = window.setTimeout(updateHeaderTexts, 300);
    return () => window.clearTimeout(id);
  }, [pathname]);

  return null;
}
`;

write("components/HeaderMobileI18nStage92.tsx", fallback);

for (const rel of ["app/layout.tsx", "app/[locale]/layout.tsx"]) {
  patch(rel, (s) => {
    if (!s.includes("HeaderMobileI18nStage92")) {
      s = 'import { HeaderMobileI18nStage92 } from "@/components/HeaderMobileI18nStage92";\n' + s;
    }

    if (!s.includes("<HeaderMobileI18nStage92 />")) {
      s = s.replace(/<body([^>]*)>/, "<body$1>\n        <HeaderMobileI18nStage92 />");
      if (!s.includes("<HeaderMobileI18nStage92 />")) {
        s = s.replace(/\{children\}/, "<HeaderMobileI18nStage92 />\n        {children}");
      }
    }

    return s.replace(/\n{3,}/g, "\n\n");
  });
}

/* -------------------------------------------------------------------------- */
/* 3. Mobile header CSS                                                        */
/* -------------------------------------------------------------------------- */

patch("app/globals.css", (s) => {
  if (s.includes("/* Stage 92 mobile header static i18n */")) return s;

  return s + `

/* Stage 92 mobile header static i18n */

@media (max-width: 768px) {
  html,
  body {
    max-width: 100%;
    overflow-x: hidden;
  }

  /* Header must scroll away with the page on mobile */
  header,
  .site-header,
  .public-header,
  .header,
  [class*="Header"],
  [class*="header"] {
    position: static !important;
    top: auto !important;
    left: auto !important;
    right: auto !important;
    z-index: auto !important;
    transform: none !important;
    width: 100% !important;
    max-width: 100vw !important;
    min-width: 0 !important;
    overflow-x: hidden !important;
  }

  header *,
  .site-header *,
  .public-header *,
  .header *,
  [class*="Header"] *,
  [class*="header"] * {
    box-sizing: border-box;
  }

  /* Header inner container */
  header > div,
  .site-header > div,
  .public-header > div,
  .header > div,
  [class*="Header"] > div,
  [class*="header"] > div {
    width: 100% !important;
    max-width: 100vw !important;
    min-width: 0 !important;
    margin: 0 !important;
    padding: 10px 12px 12px !important;
    display: grid !important;
    grid-template-columns: 1fr !important;
    justify-items: center !important;
    align-items: center !important;
    gap: 10px !important;
  }

  /* Logo */
  header a:has(img),
  .site-header a:has(img),
  .public-header a:has(img),
  .header a:has(img),
  [class*="Header"] a:has(img),
  [class*="header"] a:has(img) {
    display: flex !important;
    justify-content: center !important;
    width: 100% !important;
    min-width: 0 !important;
  }

  header img,
  .site-header img,
  .public-header img,
  .header img,
  [class*="Header"] img,
  [class*="header"] img {
    max-width: min(210px, 58vw) !important;
    width: auto !important;
    height: auto !important;
    max-height: 58px !important;
    object-fit: contain !important;
  }

  /* Navigation: compact two-line pill layout */
  header nav,
  .site-header nav,
  .public-header nav,
  .header nav,
  [class*="Header"] nav,
  [class*="header"] nav {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    display: flex !important;
    flex-wrap: wrap !important;
    justify-content: center !important;
    align-items: center !important;
    gap: 7px !important;
    padding: 0 !important;
    margin: 0 !important;
    overflow: visible !important;
  }

  header nav a,
  .site-header nav a,
  .public-header nav a,
  .header nav a,
  [class*="Header"] nav a,
  [class*="header"] nav a {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    height: 34px !important;
    min-height: 34px !important;
    padding: 0 9px !important;
    margin: 0 !important;
    border-radius: 999px !important;
    white-space: nowrap !important;
    text-decoration: none !important;
    font-size: 13px !important;
    line-height: 1 !important;
    flex: 0 0 auto !important;
  }

  header nav button,
  header nav select,
  .site-header nav button,
  .site-header nav select,
  .public-header nav button,
  .public-header nav select,
  .header nav button,
  .header nav select,
  [class*="Header"] nav button,
  [class*="Header"] nav select,
  [class*="header"] nav button,
  [class*="header"] nav select {
    height: 36px !important;
    min-height: 36px !important;
    max-height: 36px !important;
    width: auto !important;
    max-width: 130px !important;
    padding: 0 11px !important;
    border-radius: 999px !important;
    white-space: nowrap !important;
    font-size: 13px !important;
    line-height: 1 !important;
    flex: 0 0 auto !important;
  }

  /* Language selector should not sit alone too low and too large */
  header nav select,
  .site-header nav select,
  .public-header nav select,
  .header nav select,
  [class*="Header"] nav select,
  [class*="header"] nav select {
    min-width: 74px !important;
  }

  /* Prevent desktop header shadows/offsets from creating blank right area */
  main,
  body > div,
  [class*="page"],
  [class*="Page"] {
    max-width: 100vw;
  }
}

@media (max-width: 430px) {
  header > div,
  .site-header > div,
  .public-header > div,
  .header > div,
  [class*="Header"] > div,
  [class*="header"] > div {
    padding-left: 10px !important;
    padding-right: 10px !important;
  }

  header img,
  .site-header img,
  .public-header img,
  .header img,
  [class*="Header"] img,
  [class*="header"] img {
    max-width: min(190px, 62vw) !important;
    max-height: 52px !important;
  }

  header nav,
  .site-header nav,
  .public-header nav,
  .header nav,
  [class*="Header"] nav,
  [class*="header"] nav {
    gap: 6px !important;
  }

  header nav a,
  .site-header nav a,
  .public-header nav a,
  .header nav a,
  [class*="Header"] nav a,
  [class*="header"] nav a {
    height: 32px !important;
    min-height: 32px !important;
    padding: 0 7px !important;
    font-size: 12.5px !important;
  }

  header nav button,
  header nav select,
  .site-header nav button,
  .site-header nav select,
  .public-header nav button,
  .public-header nav select,
  .header nav button,
  .header nav select,
  [class*="Header"] nav button,
  [class*="Header"] nav select,
  [class*="header"] nav button,
  [class*="header"] nav select {
    height: 34px !important;
    min-height: 34px !important;
    padding: 0 9px !important;
    font-size: 12.5px !important;
  }
}
`;
});

console.log("Stage 92 completed.");
