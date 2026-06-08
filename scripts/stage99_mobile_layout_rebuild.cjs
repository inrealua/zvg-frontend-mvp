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
 * Stage 99 — mobile layout rebuild.
 *
 * Current state:
 * - Leaflet map tiles load, but content is still shifted right.
 * - Map action buttons overlap.
 * - A filter/range control can visually overlap the map.
 *
 * Cause:
 * accumulated mobile CSS with broad selectors.
 *
 * Fix:
 * 1) Remove all Stage91–98 CSS blocks.
 * 2) Remove old map repair helper from layout.
 * 3) Add a tiny marker component that adds classes only to:
 *    - actual search/filter panel
 *    - actual map panel
 *    - actual sort row / property grid
 * 4) Add clean CSS only for those marker classes.
 * 5) Do not style Leaflet internals except tile img max-width protection.
 */

/* -------------------------------------------------------------------------- */
/* 1. Remove old Stage91–98 CSS blocks                                         */
/* -------------------------------------------------------------------------- */

patch("app/globals.css", (s) => {
  const markers = [
    "/* Stage 91 mobile header */",
    "/* Stage 92 mobile header static i18n */",
    "/* Stage 93 mobile content width restore */",
    "/* Stage 94 mobile filter and language select */",
    "/* Stage 95 mobile filter map restore */",
    "/* Stage 96 restore leaflet narrow filter */",
    "/* Stage 97 clean mobile layout leaflet */",
    "/* Stage 98 mobile left align content */",
  ];

  for (const marker of markers) {
    let start = s.indexOf(marker);

    while (start !== -1) {
      let end = s.length;
      const next = s.indexOf("\n/* Stage ", start + marker.length);
      if (next !== -1) end = next;

      s = s.slice(0, start).trimEnd() + "\n\n" + s.slice(end).trimStart();
      start = s.indexOf(marker);
    }
  }

  if (!s.includes("/* Stage 99 mobile layout rebuild */")) {
    s += `

/* Stage 99 mobile layout rebuild */

/* Keep custom language dropdown styled on desktop/mobile */
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
}

/* Leaflet global protection only. Do not change panes/transforms. */
.leaflet-container img,
.leaflet-container .leaflet-tile {
  max-width: none !important;
  max-height: none !important;
}
.leaflet-container .leaflet-tile {
  width: 256px !important;
  height: 256px !important;
}
.leaflet-marker-icon,
.leaflet-marker-shadow {
  max-width: none !important;
}

@media (max-width: 768px) {
  html,
  body {
    width: 100% !important;
    max-width: 100% !important;
    overflow-x: hidden !important;
  }

  main {
    width: 100% !important;
    max-width: 100vw !important;
    min-width: 0 !important;
    margin: 0 !important;
    padding-left: 0 !important;
    padding-right: 0 !important;
    overflow-x: hidden !important;
  }

  /* Header: compact and scrolls away normally */
  header,
  .site-header,
  .public-header,
  .header,
  [class*="Header"],
  [class*="header"] {
    position: static !important;
    top: auto !important;
    z-index: auto !important;
    width: 100% !important;
    max-width: 100vw !important;
    overflow-x: hidden !important;
  }

  header > div,
  .site-header > div,
  .public-header > div,
  .header > div,
  [class*="Header"] > div,
  [class*="header"] > div {
    width: 100% !important;
    max-width: 100vw !important;
    margin: 0 !important;
    padding: 10px 12px 12px !important;
    display: grid !important;
    grid-template-columns: 1fr !important;
    justify-items: center !important;
    align-items: center !important;
    gap: 10px !important;
    box-sizing: border-box !important;
  }

  header a:has(img),
  .site-header a:has(img),
  .public-header a:has(img),
  .header a:has(img),
  [class*="Header"] a:has(img),
  [class*="header"] a:has(img) {
    display: flex !important;
    justify-content: center !important;
    width: 100% !important;
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

  header nav,
  .site-header nav,
  .public-header nav,
  .header nav,
  [class*="Header"] nav,
  [class*="header"] nav {
    width: 100% !important;
    display: flex !important;
    flex-wrap: wrap !important;
    justify-content: center !important;
    align-items: center !important;
    gap: 7px !important;
    padding: 0 !important;
    margin: 0 !important;
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
    padding: 0 9px !important;
    border-radius: 999px !important;
    white-space: nowrap !important;
    font-size: 13px !important;
    line-height: 1 !important;
  }

  header nav button,
  header nav select,
  .language-switcher-button-v94 {
    height: 36px !important;
    min-height: 36px !important;
    max-height: 36px !important;
    padding: 0 11px !important;
    border-radius: 999px !important;
    font-size: 13px !important;
  }

  /* Hard reset only for direct main children. This fixes the right shift. */
  main > * {
    max-width: calc(100vw - 16px) !important;
    width: calc(100vw - 16px) !important;
    min-width: 0 !important;
    margin-left: auto !important;
    margin-right: auto !important;
    box-sizing: border-box !important;
    transform: none !important;
    left: auto !important;
    right: auto !important;
  }

  /* Search/filter panel: class is added by Stage99 component */
  .mobile-filter-panel-v99 {
    width: calc(100vw - 56px) !important;
    max-width: calc(100vw - 56px) !important;
    min-width: 0 !important;
    margin: 18px auto !important;
    padding-left: 0 !important;
    padding-right: 0 !important;
    overflow: hidden !important;
    box-sizing: border-box !important;
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) !important;
    gap: 10px !important;
  }

  .mobile-filter-panel-v99 > * {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    grid-column: 1 / -1 !important;
    box-sizing: border-box !important;
  }

  .mobile-filter-panel-v99 input,
  .mobile-filter-panel-v99 select,
  .mobile-filter-panel-v99 textarea,
  .mobile-filter-panel-v99 button {
    max-width: 100% !important;
    min-width: 0 !important;
    box-sizing: border-box !important;
  }

  .mobile-filter-panel-v99 input[type="range"] {
    width: calc(100% - 18px) !important;
    margin-left: 9px !important;
    margin-right: 9px !important;
  }

  /* Map panel: class is added by Stage99 component */
  .mobile-map-panel-v99 {
    width: calc(100vw - 24px) !important;
    max-width: calc(100vw - 24px) !important;
    min-width: 0 !important;
    margin: 18px auto !important;
    padding-left: 0 !important;
    padding-right: 0 !important;
    box-sizing: border-box !important;
    overflow: hidden !important;
    transform: none !important;
    left: auto !important;
    right: auto !important;
  }

  .mobile-map-panel-v99 .leaflet-container {
    width: 100% !important;
    height: 390px !important;
    min-height: 330px !important;
    border-radius: 18px !important;
    overflow: hidden !important;
  }

  .mobile-map-actions-v99 {
    display: grid !important;
    grid-template-columns: 1fr !important;
    gap: 8px !important;
    width: 100% !important;
    max-width: 100% !important;
    margin: 10px 0 12px !important;
  }

  .mobile-map-actions-v99 button,
  .mobile-map-actions-v99 a {
    width: 100% !important;
    max-width: 100% !important;
    min-height: 42px !important;
    white-space: normal !important;
    padding: 10px 12px !important;
    line-height: 1.15 !important;
    justify-content: center !important;
  }

  /* Hide accidental escaped range overlays inside map panel */
  .mobile-map-panel-v99 input[type="range"] {
    display: none !important;
  }

  .mobile-sort-row-v99 {
    width: calc(100vw - 24px) !important;
    max-width: calc(100vw - 24px) !important;
    margin-left: auto !important;
    margin-right: auto !important;
    display: grid !important;
    grid-template-columns: 1fr !important;
    gap: 10px !important;
  }

  .mobile-property-grid-v99 {
    width: calc(100vw - 24px) !important;
    max-width: calc(100vw - 24px) !important;
    margin-left: auto !important;
    margin-right: auto !important;
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) !important;
    gap: 16px !important;
  }

  .mobile-property-grid-v99 > *,
  .mobile-property-grid-v99 article,
  .mobile-property-grid-v99 [href*="/properties/"] {
    max-width: 100% !important;
    min-width: 0 !important;
    box-sizing: border-box !important;
  }

  .language-switcher-menu-v94 {
    right: 50%;
    transform: translateX(50%);
    min-width: 150px;
  }
}

@media (max-width: 430px) {
  main > * {
    max-width: calc(100vw - 12px) !important;
    width: calc(100vw - 12px) !important;
  }

  .mobile-filter-panel-v99 {
    width: calc(100vw - 60px) !important;
    max-width: calc(100vw - 60px) !important;
  }

  .mobile-map-panel-v99,
  .mobile-sort-row-v99,
  .mobile-property-grid-v99 {
    width: calc(100vw - 22px) !important;
    max-width: calc(100vw - 22px) !important;
  }

  .mobile-map-panel-v99 .leaflet-container {
    height: 380px !important;
    min-height: 320px !important;
  }
}
`;
  }

  return s;
});

/* -------------------------------------------------------------------------- */
/* 2. Add marker component                                                     */
/* -------------------------------------------------------------------------- */

write("components/MobileLayoutStage99.tsx", `"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function clearOldClasses() {
  document.querySelectorAll<HTMLElement>(
    ".mobile-filter-panel-v99,.mobile-map-panel-v99,.mobile-map-actions-v99,.mobile-sort-row-v99,.mobile-property-grid-v99"
  ).forEach((el) => {
    el.classList.remove(
      "mobile-filter-panel-v99",
      "mobile-map-panel-v99",
      "mobile-map-actions-v99",
      "mobile-sort-row-v99",
      "mobile-property-grid-v99",
    );
  });
}

function scoreFilter(el: HTMLElement) {
  const text = el.innerText || "";
  let score = 0;
  if (/Suche|Поиск|Search/.test(text)) score += 2;
  if (/Ergebnisse anzeigen|Показать результаты|Show results/.test(text)) score += 3;
  if (/Filter zurücksetzen|Сбросить фильтр|Reset filter/.test(text)) score += 3;
  if (el.querySelector("input")) score += 1;
  if (el.querySelector("select")) score += 1;
  if (el.querySelector(".leaflet-container")) score -= 20;
  const rect = el.getBoundingClientRect();
  if (rect.height > 120 && rect.height < 900) score += 1;
  return score;
}

function markFilter() {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>("main form, main section, main div"));
  const best = candidates
    .map((el) => ({ el, score: scoreFilter(el) }))
    .filter((item) => item.score >= 6)
    .sort((a, b) => b.score - a.score || a.el.getBoundingClientRect().height - b.el.getBoundingClientRect().height)[0];

  best?.el.classList.add("mobile-filter-panel-v99");
}

function markMap() {
  const leaflet = document.querySelector<HTMLElement>(".leaflet-container");
  if (!leaflet) return;

  let panel: HTMLElement | null = leaflet.parentElement;

  while (panel && panel !== document.body) {
    const text = panel.innerText || "";
    const rect = panel.getBoundingClientRect();

    if (/Karte|Карта|Map/.test(text) && rect.height > 250) break;
    panel = panel.parentElement;
  }

  if (!panel || panel === document.body) panel = leaflet.parentElement;

  panel?.classList.add("mobile-map-panel-v99");

  if (panel) {
    const actionCandidates = Array.from(panel.querySelectorAll<HTMLElement>("div, section"));
    const action = actionCandidates.find((el) => {
      const text = el.innerText || "";
      const hasButton = Boolean(el.querySelector("button, a"));
      const rect = el.getBoundingClientRect();
      return hasButton && /Kartenausschnitt|Region|области карты|область|map area|Draw/.test(text) && rect.height < 180;
    });

    action?.classList.add("mobile-map-actions-v99");
  }

  // Trigger Leaflet reflow after class changes.
  window.dispatchEvent(new Event("resize"));

  setTimeout(() => window.dispatchEvent(new Event("resize")), 120);
  setTimeout(() => window.dispatchEvent(new Event("resize")), 500);
}

function markSortAndCards() {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>("main section, main div"));

  nodes.forEach((el) => {
    const text = el.innerText || "";
    const rect = el.getBoundingClientRect();

    if (/Sortierung|Сортировка|Sorting/.test(text) && /Zeigen|Показывать|per page|на стр/.test(text) && rect.height < 180) {
      el.classList.add("mobile-sort-row-v99");
    }

    if (el.querySelector('[href*="/properties/"]') && rect.height > 400 && !el.querySelector(".leaflet-container")) {
      const cardCount = el.querySelectorAll('[href*="/properties/"]').length;
      if (cardCount >= 2) el.classList.add("mobile-property-grid-v99");
    }
  });
}

function run() {
  clearOldClasses();
  markFilter();
  markMap();
  markSortAndCards();
}

export function MobileLayoutStage99() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    run();
    const timers = [100, 300, 700, 1300, 2200].map((ms) => window.setTimeout(run, ms));

    const onResize = () => run();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, [pathname, searchParams?.toString()]);

  return null;
}
`);

/* -------------------------------------------------------------------------- */
/* 3. Remove old helper usage and mount Stage99                                */
/* -------------------------------------------------------------------------- */

for (const rel of ["app/layout.tsx", "app/[locale]/layout.tsx"]) {
  patch(rel, (s) => {
    const oldNames = ["MobileMapRepairStage97", "MobileMapInvalidateStage96"];
    for (const name of oldNames) {
      s = s.replace(new RegExp(String.raw`import\s+\{\s*${name}\s*\}\s+from\s+["'][^"']+["'];?\s*\n`, "g"), "");
      s = s.replace(new RegExp(String.raw`\s*<${name}\s*/>\s*`, "g"), "\n");
    }

    if (!s.includes("MobileLayoutStage99")) {
      s = 'import { MobileLayoutStage99 } from "@/components/MobileLayoutStage99";\n' + s;
    }

    if (!s.includes("<MobileLayoutStage99 />")) {
      s = s.replace(/<body([^>]*)>/, "<body$1>\n        <MobileLayoutStage99 />");
      if (!s.includes("<MobileLayoutStage99 />")) {
        s = s.replace(/\{children\}/, "<MobileLayoutStage99 />\n        {children}");
      }
    }

    return s.replace(/\n{3,}/g, "\n\n");
  });
}

console.log("Stage 99 completed.");
