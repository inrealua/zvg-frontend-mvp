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
 * Stage 94
 *
 * Fixes:
 * 1) Mobile filter is still wider than viewport.
 *    This patch strongly scopes mobile width rules to the search/filter panel
 *    and its direct controls. It avoids touching header/menu.
 *
 * 2) Desktop language selector looks like a raw native select when opened.
 *    If components/LanguageSwitcher.tsx exists, replace it with a custom
 *    dropdown that matches the button/pill style.
 *
 * Notes:
 * - No global DOM scanner.
 * - No MutationObserver.
 * - CSS only for mobile filter/layout.
 */

/* -------------------------------------------------------------------------- */
/* 1. Replace LanguageSwitcher with styled custom dropdown if file exists       */
/* -------------------------------------------------------------------------- */

const languageSwitcherCandidates = [
  "components/LanguageSwitcher.tsx",
  "components/LocaleSwitcher.tsx",
  "components/LangSwitcher.tsx",
];

for (const rel of languageSwitcherCandidates) {
  if (!exists(rel)) continue;

  const source = read(rel);
  if (!/LanguageSwitcher|LocaleSwitcher|LangSwitcher/.test(source)) continue;

  // Use the exported function name from the existing file if possible.
  const nameMatch =
    source.match(/export\s+function\s+([A-Za-z0-9_]+)/) ||
    source.match(/function\s+([A-Za-z0-9_]+)\s*\(/) ||
    source.match(/export\s+default\s+function\s+([A-Za-z0-9_]+)/);

  const componentName = nameMatch?.[1] || "LanguageSwitcher";

  const replacement = `"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Locale = "de" | "ru" | "en";

type Labels = {
  label?: string;
  de?: string;
  ru?: string;
  en?: string;
};

type Props = {
  locale?: Locale;
  currentLocale?: Locale;
  labels?: Labels;
  className?: string;
};

const defaultLabels: Record<Locale, string> = {
  de: "Deutsch",
  ru: "Русский",
  en: "English",
};

function normalizeLocale(value?: string): Locale {
  if (value === "ru" || value === "en" || value === "de") return value;
  if (typeof window !== "undefined") {
    const first = window.location.pathname.split("/").filter(Boolean)[0];
    if (first === "ru" || first === "en" || first === "de") return first;
  }
  return "de";
}

function buildLocalePath(pathname: string, next: Locale) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "ru" || parts[0] === "de" || parts[0] === "en") {
    parts[0] = next;
    return "/" + parts.join("/");
  }
  return "/" + next + (pathname === "/" ? "" : pathname);
}

export function ${componentName}({ locale, currentLocale, labels, className }: Props) {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  const active = normalizeLocale(locale || currentLocale);
  const query = searchParams?.toString();
  const names: Record<Locale, string> = {
    de: labels?.de || defaultLabels.de,
    ru: labels?.ru || defaultLabels.ru,
    en: labels?.en || defaultLabels.en,
  };

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function choose(next: Locale) {
    document.cookie = "zvg_locale=" + next + "; path=/; max-age=31536000; SameSite=Lax";

    const nextPath = buildLocalePath(pathname, next);
    router.push(nextPath + (query ? "?" + query : ""));
    setOpen(false);
  }

  return (
    <div className={className || "language-switcher-v94"} ref={wrapperRef}>
      <button
        type="button"
        className="language-switcher-button-v94"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span>{active.toUpperCase()}</span>
        <span className="language-switcher-chevron-v94">⌄</span>
      </button>

      {open ? (
        <div className="language-switcher-menu-v94" role="menu">
          {(["de", "ru", "en"] as Locale[]).map((item) => (
            <button
              type="button"
              role="menuitem"
              className={item === active ? "is-active" : ""}
              key={item}
              onClick={() => choose(item)}
            >
              {names[item]}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default ${componentName};
`;

  write(rel, replacement);
  break;
}

/* -------------------------------------------------------------------------- */
/* 2. CSS for mobile filter width and styled language dropdown                 */
/* -------------------------------------------------------------------------- */

patch("app/globals.css", (s) => {
  if (s.includes("/* Stage 94 mobile filter and language select */")) return s;

  return s + `

/* Stage 94 mobile filter and language select */

/* Styled language switcher */
.language-switcher-v94 {
  position: relative;
  display: inline-flex;
  flex: 0 0 auto;
  z-index: 80;
}

.language-switcher-button-v94 {
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
  gap: 10px;
  cursor: pointer;
}

.language-switcher-button-v94:hover {
  background: rgba(234, 245, 240, .95);
}

.language-switcher-chevron-v94 {
  font-size: 13px;
  line-height: 1;
  transform: translateY(-1px);
}

.language-switcher-menu-v94 {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 160px;
  padding: 8px;
  border: 1px solid rgba(47,97,79,.18);
  border-radius: 18px;
  background: rgba(255,255,255,.98);
  box-shadow: 0 18px 38px rgba(18,45,34,.16);
  display: grid;
  gap: 4px;
}

.language-switcher-menu-v94 button {
  width: 100%;
  height: 38px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: #203a33;
  font-weight: 700;
  font-size: 14px;
  text-align: left;
  padding: 0 12px;
  cursor: pointer;
}

.language-switcher-menu-v94 button:hover,
.language-switcher-menu-v94 button.is-active {
  background: rgba(234, 245, 240, .95);
  color: #0b3b2e;
}

/* Hide old raw select if both old select and new custom switcher accidentally render */
header nav .language-switcher-v94 + select,
header nav select + .language-switcher-v94 {
  margin-left: 0;
}

/* Mobile content/filter width recovery */
@media (max-width: 768px) {
  html,
  body {
    width: 100%;
    max-width: 100%;
    overflow-x: hidden !important;
  }

  main {
    width: 100% !important;
    max-width: 100vw !important;
    overflow-x: hidden !important;
  }

  /* Search/filter panel: target by actual controls, not all page grids */
  main form:has(input):has(select),
  main section:has(input):has(select):has(button),
  main div:has(> input):has(> select),
  main div:has(input[placeholder*="PLZ"]),
  main div:has(input[placeholder*="09111"]),
  main div:has(input[placeholder*="Ort"]) {
    width: calc(100vw - 24px) !important;
    max-width: calc(100vw - 24px) !important;
    min-width: 0 !important;
    margin-left: auto !important;
    margin-right: auto !important;
    box-sizing: border-box !important;
    overflow: hidden !important;
  }

  /* The filter's inner grid must never keep desktop min-width */
  main form:has(input):has(select) *,
  main section:has(input):has(select):has(button) *,
  main div:has(input[placeholder*="PLZ"]) *,
  main div:has(input[placeholder*="09111"]) *,
  main div:has(input[placeholder*="Ort"]) * {
    min-width: 0 !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
  }

  main form:has(input):has(select),
  main section:has(input):has(select):has(button) {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) !important;
    gap: 10px !important;
  }

  main form:has(input):has(select) > *,
  main section:has(input):has(select):has(button) > * {
    grid-column: 1 / -1 !important;
    width: 100% !important;
    max-width: 100% !important;
  }

  /* Input/select controls */
  main input,
  main select,
  main textarea {
    width: 100% !important;
    max-width: 100% !important;
  }

  /* Range cards: prevent right values/handles from clipping */
  main [class*="range" i],
  main [class*="slider" i] {
    width: 100% !important;
    max-width: 100% !important;
    overflow: hidden !important;
  }

  main [class*="range" i] input,
  main [class*="slider" i] input {
    width: calc(100% - 18px) !important;
    margin-left: 9px !important;
    margin-right: 9px !important;
  }

  /* Map block and object cards should fit viewport too, but no forced full-screen width */
  main [class*="map" i],
  main .leaflet-container {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    box-sizing: border-box !important;
    overflow: hidden !important;
  }

  main [class*="card" i],
  main article,
  main [href*="/properties/"] {
    max-width: 100% !important;
    box-sizing: border-box !important;
  }

  .language-switcher-button-v94 {
    height: 34px;
    min-height: 34px;
    padding: 0 12px;
    font-size: 13px;
  }

  .language-switcher-menu-v94 {
    right: 50%;
    transform: translateX(50%);
    min-width: 150px;
  }
}

@media (max-width: 430px) {
  main form:has(input):has(select),
  main section:has(input):has(select):has(button),
  main div:has(input[placeholder*="PLZ"]),
  main div:has(input[placeholder*="09111"]),
  main div:has(input[placeholder*="Ort"]) {
    width: calc(100vw - 16px) !important;
    max-width: calc(100vw - 16px) !important;
  }

  main input,
  main select,
  main textarea,
  main button {
    font-size: 15px !important;
  }
}
`;
});

console.log("Stage 94 completed.");
