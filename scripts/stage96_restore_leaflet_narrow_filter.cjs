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
 * Stage 96
 *
 * The grey mobile map is almost certainly caused by the broad mobile CSS from
 * Stage93/94/95 touching Leaflet internals. Leaflet uses absolutely positioned
 * tile images with transforms. Rules like max-width/overflow/box-sizing on
 * all div/img inside map can break tile rendering.
 *
 * This patch:
 * 1) Removes Stage93, Stage94 and Stage95 CSS blocks.
 * 2) Adds safe mobile CSS that does NOT target `.leaflet-container *`.
 * 3) Narrows the mobile search/filter panel a bit more.
 * 4) Adds a tiny client component that calls Leaflet map.invalidateSize() on
 *    mobile after layout changes. It does not scan the DOM endlessly.
 */

/* -------------------------------------------------------------------------- */
/* 1. Remove problematic CSS blocks from Stage93/94/95                         */
/* -------------------------------------------------------------------------- */

patch("app/globals.css", (s) => {
  const markers = [
    "/* Stage 93 mobile content width restore */",
    "/* Stage 94 mobile filter and language select */",
    "/* Stage 95 mobile filter map restore */",
  ];

  for (const marker of markers) {
    let start = s.indexOf(marker);

    while (start !== -1) {
      let end = s.length;

      for (const other of markers) {
        if (other === marker) continue;
        const idx = s.indexOf(other, start + marker.length);
        if (idx !== -1 && idx < end) end = idx;
      }

      // Stop at next known stage block, if present.
      const nextStage = s.indexOf("\n/* Stage ", start + marker.length);
      if (nextStage !== -1 && nextStage < end) end = nextStage;

      s = s.slice(0, start).trimEnd() + "\n\n" + s.slice(end).trimStart();
      start = s.indexOf(marker);
    }
  }

  if (!s.includes("/* Stage 96 restore leaflet narrow filter */")) {
    s += `

/* Stage 96 restore leaflet narrow filter */

/*
  Important:
  Do NOT style `.leaflet-container *`, `.leaflet-tile`, `.leaflet-pane`,
  or map internals here. Leaflet needs its own absolute positioning.
*/

@media (max-width: 768px) {
  html,
  body {
    max-width: 100%;
    overflow-x: hidden;
  }

  main {
    max-width: 100vw;
    overflow-x: hidden;
  }

  /*
    Mobile filter width.
    We scope this to the search form / first filter panel only and avoid map internals.
    The user asked to make it a bit smaller again.
  */
  main form {
    width: calc(100vw - 44px) !important;
    max-width: calc(100vw - 44px) !important;
    margin-left: auto !important;
    margin-right: auto !important;
    box-sizing: border-box !important;
  }

  main form > * {
    max-width: 100% !important;
    min-width: 0 !important;
    box-sizing: border-box !important;
  }

  main form input,
  main form select,
  main form textarea,
  main form button {
    max-width: 100% !important;
    box-sizing: border-box !important;
  }

  /*
    If the filter is not a <form>, catch only the large panel that contains
    both "Ergebnisse anzeigen" and "Filter zurücksetzen" buttons by layout,
    but do not touch descendants of Leaflet.
  */
  main section:not(:has(.leaflet-container)):has(button),
  main div:not(:has(.leaflet-container)):has(button) {
    box-sizing: border-box;
  }

  main section:not(:has(.leaflet-container)):has(input):has(select):has(button),
  main div:not(:has(.leaflet-container)):has(input):has(select):has(button) {
    width: calc(100vw - 44px) !important;
    max-width: calc(100vw - 44px) !important;
    margin-left: auto !important;
    margin-right: auto !important;
    overflow: hidden !important;
    box-sizing: border-box !important;
  }

  main section:not(:has(.leaflet-container)):has(input):has(select):has(button) > *,
  main div:not(:has(.leaflet-container)):has(input):has(select):has(button) > * {
    max-width: 100% !important;
    min-width: 0 !important;
    box-sizing: border-box !important;
  }

  /* Mobile map wrapper: only outer block sizing, no Leaflet internals */
  main section:has(.leaflet-container),
  main div:has(> .leaflet-container) {
    width: calc(100vw - 28px) !important;
    max-width: calc(100vw - 28px) !important;
    margin-left: auto !important;
    margin-right: auto !important;
    box-sizing: border-box !important;
    overflow: hidden !important;
  }

  .leaflet-container {
    width: 100% !important;
    height: 420px !important;
    min-height: 360px !important;
    border-radius: 18px;
  }

  /* Buttons above map should wrap below title */
  main section:has(.leaflet-container) > div:has(button),
  main div:has(> .leaflet-container) > div:has(button) {
    display: flex !important;
    flex-wrap: wrap !important;
    gap: 8px !important;
    align-items: center !important;
    justify-content: flex-start !important;
  }

  main section:has(.leaflet-container) > div:has(button) button,
  main div:has(> .leaflet-container) > div:has(button) button {
    flex: 1 1 150px !important;
    min-width: 0 !important;
    white-space: normal !important;
    min-height: 42px !important;
    padding: 10px 12px !important;
    line-height: 1.15 !important;
  }
}

@media (max-width: 430px) {
  main form,
  main section:not(:has(.leaflet-container)):has(input):has(select):has(button),
  main div:not(:has(.leaflet-container)):has(input):has(select):has(button) {
    width: calc(100vw - 36px) !important;
    max-width: calc(100vw - 36px) !important;
  }

  main section:has(.leaflet-container),
  main div:has(> .leaflet-container) {
    width: calc(100vw - 24px) !important;
    max-width: calc(100vw - 24px) !important;
  }

  .leaflet-container {
    height: 400px !important;
    min-height: 340px !important;
  }
}
`;
  }

  return s;
});

/* -------------------------------------------------------------------------- */
/* 2. Tiny Leaflet invalidateSize helper                                       */
/* -------------------------------------------------------------------------- */

write("components/MobileMapInvalidateStage96.tsx", `"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

declare global {
  interface Window {
    L?: unknown;
  }
}

function invalidateLeafletMaps() {
  const maps = document.querySelectorAll<HTMLElement>(".leaflet-container");

  maps.forEach((container) => {
    // Leaflet stores the map instance in a private property on the container.
    // This is intentionally defensive and only runs a few times after layout.
    const map = (container as unknown as { _leaflet_map?: { invalidateSize?: () => void } })._leaflet_map;
    map?.invalidateSize?.();

    // Some Leaflet builds do not expose _leaflet_map. Dispatching resize still
    // makes existing map listeners call invalidateSize in many implementations.
    window.dispatchEvent(new Event("resize"));
  });
}

export function MobileMapInvalidateStage96() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const timers = [100, 350, 800, 1500].map((ms) => window.setTimeout(invalidateLeafletMaps, ms));
    window.addEventListener("orientationchange", invalidateLeafletMaps);
    window.addEventListener("resize", invalidateLeafletMaps);

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      window.removeEventListener("orientationchange", invalidateLeafletMaps);
      window.removeEventListener("resize", invalidateLeafletMaps);
    };
  }, [pathname, searchParams?.toString()]);

  return null;
}
`);

for (const rel of ["app/layout.tsx", "app/[locale]/layout.tsx"]) {
  patch(rel, (s) => {
    if (!s.includes("MobileMapInvalidateStage96")) {
      s = 'import { MobileMapInvalidateStage96 } from "@/components/MobileMapInvalidateStage96";\n' + s;
    }

    if (!s.includes("<MobileMapInvalidateStage96 />")) {
      s = s.replace(/<body([^>]*)>/, "<body$1>\n        <MobileMapInvalidateStage96 />");
      if (!s.includes("<MobileMapInvalidateStage96 />")) {
        s = s.replace(/\{children\}/, "<MobileMapInvalidateStage96 />\n        {children}");
      }
    }

    return s.replace(/\n{3,}/g, "\n\n");
  });
}

console.log("Stage 96 completed.");
