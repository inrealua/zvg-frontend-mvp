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
 * Stage 97 — mobile cleanup + Leaflet restore.
 *
 * Reason:
 * Previous mobile patches accumulated too many conflicting CSS blocks.
 * Some rules were broad and could still affect:
 * - mobile filter width;
 * - Leaflet tile panes/images;
 * - map controls/buttons.
 *
 * This stage:
 * 1) removes Stage91–96 CSS blocks completely;
 * 2) removes old mobile helper components Stage92/96 from layouts;
 * 3) adds ONE clean mobile CSS block:
 *    - header stays good and scrolls normally;
 *    - filter is narrow on phones;
 *    - Leaflet internals are protected;
 *    - map buttons wrap correctly;
 * 4) adds ONE small map repair component that resets Leaflet tile inline styles
 *    and triggers resize events several times after render.
 */

/* -------------------------------------------------------------------------- */
/* 1. Remove old mobile CSS blocks                                             */
/* -------------------------------------------------------------------------- */

patch("app/globals.css", (s) => {
  const markers = [
    "/* Stage 91 mobile header */",
    "/* Stage 92 mobile header static i18n */",
    "/* Stage 93 mobile content width restore */",
    "/* Stage 94 mobile filter and language select */",
    "/* Stage 95 mobile filter map restore */",
    "/* Stage 96 restore leaflet narrow filter */",
  ];

  for (const marker of markers) {
    let start = s.indexOf(marker);

    while (start !== -1) {
      let end = s.length;

      // cut until next Stage block or EOF
      const next = s.indexOf("\n/* Stage ", start + marker.length);
      if (next !== -1) end = next;

      s = s.slice(0, start).trimEnd() + "\n\n" + s.slice(end).trimStart();
      start = s.indexOf(marker);
    }
  }

  if (!s.includes("/* Stage 97 clean mobile layout leaflet */")) {
    s += `

/* Stage 97 clean mobile layout leaflet */

/* Desktop language switcher from Stage94, kept but safe */
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

/*
  Leaflet protection.
  Keep these outside media queries so they always beat global img rules.
  Do not force width/height for panes; Leaflet controls this.
*/
.leaflet-container img,
.leaflet-container .leaflet-tile {
  max-width: none !important;
  max-height: none !important;
}
.leaflet-container .leaflet-tile {
  width: 256px !important;
  height: 256px !important;
}
.leaflet-container .leaflet-pane,
.leaflet-container .leaflet-map-pane,
.leaflet-container .leaflet-tile-pane,
.leaflet-container .leaflet-overlay-pane,
.leaflet-container .leaflet-marker-pane,
.leaflet-container .leaflet-shadow-pane,
.leaflet-container .leaflet-tooltip-pane,
.leaflet-container .leaflet-popup-pane {
  overflow: visible !important;
  max-width: none !important;
}
.leaflet-container .leaflet-marker-icon,
.leaflet-container .leaflet-marker-shadow {
  max-width: none !important;
}

@media (max-width: 768px) {
  html,
  body {
    width: 100% !important;
    max-width: 100% !important;
    overflow-x: hidden !important;
  }

  body {
    position: relative;
  }

  main {
    width: 100% !important;
    max-width: 100vw !important;
    overflow-x: clip !important;
  }

  /*
    Header: normal scroll, compact, no sticky.
  */
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
    margin: 0 !important;
    border-radius: 999px !important;
    white-space: nowrap !important;
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

  /*
    Mobile filter.
    Force only the actual search/filter panel to be narrower.
    Exclude Leaflet containers explicitly.
  */
  main form:not(:has(.leaflet-container)),
  main section:not(:has(.leaflet-container)):has(input):has(select):has(button),
  main div:not(:has(.leaflet-container)):has(input):has(select):has(button) {
    width: min(100% - 56px, 540px) !important;
    max-width: min(100% - 56px, 540px) !important;
    margin-left: auto !important;
    margin-right: auto !important;
    box-sizing: border-box !important;
    overflow: hidden !important;
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) !important;
    gap: 10px !important;
  }

  main form:not(:has(.leaflet-container)) > *,
  main section:not(:has(.leaflet-container)):has(input):has(select):has(button) > *,
  main div:not(:has(.leaflet-container)):has(input):has(select):has(button) > * {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    grid-column: 1 / -1 !important;
    box-sizing: border-box !important;
  }

  main form input,
  main form select,
  main form textarea,
  main section:not(:has(.leaflet-container)):has(input):has(select):has(button) input,
  main section:not(:has(.leaflet-container)):has(input):has(select):has(button) select,
  main div:not(:has(.leaflet-container)):has(input):has(select):has(button) input,
  main div:not(:has(.leaflet-container)):has(input):has(select):has(button) select {
    max-width: 100% !important;
    min-width: 0 !important;
    box-sizing: border-box !important;
  }

  /*
    Map outer container only.
    Do not style map descendants except .leaflet-container itself.
  */
  main section:has(.leaflet-container),
  main div:has(> .leaflet-container) {
    width: min(100% - 28px, 760px) !important;
    max-width: min(100% - 28px, 760px) !important;
    margin-left: auto !important;
    margin-right: auto !important;
    box-sizing: border-box !important;
    overflow: hidden !important;
  }

  .leaflet-container {
    width: 100% !important;
    height: 400px !important;
    min-height: 340px !important;
    border-radius: 18px !important;
    overflow: hidden !important;
    background: #e6e6e6 !important;
  }

  main section:has(.leaflet-container) > div:has(button),
  main div:has(> .leaflet-container) > div:has(button) {
    display: flex !important;
    flex-wrap: wrap !important;
    gap: 8px !important;
    align-items: center !important;
    justify-content: flex-start !important;
    max-width: 100% !important;
  }

  main section:has(.leaflet-container) > div:has(button) button,
  main div:has(> .leaflet-container) > div:has(button) button {
    flex: 1 1 150px !important;
    min-width: 0 !important;
    max-width: 100% !important;
    white-space: normal !important;
    min-height: 42px !important;
    padding: 10px 12px !important;
    line-height: 1.15 !important;
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
  main form:not(:has(.leaflet-container)),
  main section:not(:has(.leaflet-container)):has(input):has(select):has(button),
  main div:not(:has(.leaflet-container)):has(input):has(select):has(button) {
    width: calc(100vw - 52px) !important;
    max-width: calc(100vw - 52px) !important;
  }

  main section:has(.leaflet-container),
  main div:has(> .leaflet-container) {
    width: calc(100vw - 24px) !important;
    max-width: calc(100vw - 24px) !important;
  }

  .leaflet-container {
    height: 390px !important;
    min-height: 330px !important;
  }
}
`;
  }

  return s;
});

/* -------------------------------------------------------------------------- */
/* 2. Replace map helper with a safer one                                      */
/* -------------------------------------------------------------------------- */

write("components/MobileMapRepairStage97.tsx", `"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

declare global {
  interface Window {
    L?: unknown;
  }
}

function repairLeaflet() {
  document.querySelectorAll<HTMLElement>(".leaflet-container").forEach((container) => {
    // Restore tile image sizing in case global CSS touched it.
    container.querySelectorAll<HTMLImageElement>("img.leaflet-tile").forEach((img) => {
      img.style.maxWidth = "none";
      img.style.maxHeight = "none";
      img.style.width = "256px";
      img.style.height = "256px";
    });

    // Trigger Leaflet resize listeners.
    window.dispatchEvent(new Event("resize"));
  });
}

export function MobileMapRepairStage97() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const timers = [100, 300, 700, 1200, 2000].map((ms) => window.setTimeout(repairLeaflet, ms));
    window.addEventListener("orientationchange", repairLeaflet);
    window.addEventListener("resize", repairLeaflet);

    return () => {
      for (const timer of timers) window.clearTimeout(timer);
      window.removeEventListener("orientationchange", repairLeaflet);
      window.removeEventListener("resize", repairLeaflet);
    };
  }, [pathname, searchParams?.toString()]);

  return null;
}
`);

/* Remove old helper imports/usages and mount the new helper. */
for (const rel of ["app/layout.tsx", "app/[locale]/layout.tsx"]) {
  patch(rel, (s) => {
    const oldNames = ["MobileMapInvalidateStage96"];
    for (const name of oldNames) {
      s = s.replace(new RegExp(String.raw`import\s+\{\s*${name}\s*\}\s+from\s+["'][^"']+["'];?\s*\n`, "g"), "");
      s = s.replace(new RegExp(String.raw`\s*<${name}\s*/>\s*`, "g"), "\n");
    }

    if (!s.includes("MobileMapRepairStage97")) {
      s = 'import { MobileMapRepairStage97 } from "@/components/MobileMapRepairStage97";\n' + s;
    }

    if (!s.includes("<MobileMapRepairStage97 />")) {
      s = s.replace(/<body([^>]*)>/, "<body$1>\n        <MobileMapRepairStage97 />");
      if (!s.includes("<MobileMapRepairStage97 />")) {
        s = s.replace(/\{children\}/, "<MobileMapRepairStage97 />\n        {children}");
      }
    }

    return s.replace(/\n{3,}/g, "\n\n");
  });
}

console.log("Stage 97 completed.");
