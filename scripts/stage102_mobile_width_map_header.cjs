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
 * Stage 102 — mobile width alignment + map header layout.
 *
 * Current problem:
 * - header visually narrower than hero/filter/map blocks;
 * - map description is squeezed into a narrow left column while there is empty
 *   space near the buttons.
 *
 * This patch is deliberately conservative:
 * - does not add runtime JS;
 * - does not touch Leaflet internals;
 * - does not change filter display/grid logic;
 * - only aligns mobile page/header widths and improves map card header flow.
 */

patch("app/globals.css", (s) => {
  if (s.includes("/* Stage 102 mobile width and map header */")) return s;

  return s + `

/* Stage 102 mobile width and map header */

@media (max-width: 768px) {
  /*
    Make the whole public page use one consistent mobile width.
    Stage101 used 100vw for the header while the content blocks were effectively
    wider. Instead, clamp content to viewport and let header be 100% of the same
    layout width.
  */
  html,
  body {
    width: 100% !important;
    max-width: 100% !important;
    overflow-x: hidden !important;
  }

  main {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    margin-left: 0 !important;
    margin-right: 0 !important;
    overflow-x: hidden !important;
    box-sizing: border-box !important;
  }

  /*
    Header full width, but not 100vw with negative margins.
    This avoids the header being narrower/wider than the content area in mobile Safari.
  */
  header,
  .site-header,
  .public-header,
  .header,
  [class*="Header"],
  [class*="header"] {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    margin-left: 0 !important;
    margin-right: 0 !important;
    box-sizing: border-box !important;
    position: static !important;
    overflow-x: hidden !important;
  }

  header > div,
  .site-header > div,
  .public-header > div,
  .header > div,
  [class*="Header"] > div,
  [class*="header"] > div {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    margin-left: 0 !important;
    margin-right: 0 !important;
    padding-left: max(10px, env(safe-area-inset-left)) !important;
    padding-right: max(10px, env(safe-area-inset-right)) !important;
    box-sizing: border-box !important;
  }

  /*
    Keep direct page blocks inside viewport. Do not set overflow hidden here,
    because that previously cut off content.
  */
  main > section,
  main > div,
  main > article {
    max-width: calc(100vw - 16px) !important;
    width: calc(100vw - 16px) !important;
    min-width: 0 !important;
    margin-left: auto !important;
    margin-right: auto !important;
    box-sizing: border-box !important;
  }

  /*
    Form/filter cards should not exceed the same width.
    No grid rewrite, no forced overflow hidden.
  */
  main form,
  main form > *,
  main input,
  main select,
  main textarea,
  main button {
    max-width: 100% !important;
    box-sizing: border-box !important;
  }

  /*
    Map block: only outer card and its header. Leaflet internals are untouched.
  */
  main section:has(.leaflet-container),
  main div:has(> .leaflet-container),
  main div:has(.leaflet-container) {
    max-width: calc(100vw - 16px) !important;
    width: calc(100vw - 16px) !important;
    margin-left: auto !important;
    margin-right: auto !important;
    box-sizing: border-box !important;
  }

  /*
    Map card header layout:
    - title left;
    - buttons right or next row;
    - description uses the full available width instead of a narrow column.
  */
  main section:has(.leaflet-container) > div:first-child,
  main div:has(.leaflet-container) > div:first-child {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) !important;
    gap: 10px !important;
    align-items: start !important;
    max-width: 100% !important;
  }

  main section:has(.leaflet-container) h1,
  main section:has(.leaflet-container) h2,
  main section:has(.leaflet-container) h3,
  main div:has(.leaflet-container) h1,
  main div:has(.leaflet-container) h2,
  main div:has(.leaflet-container) h3 {
    max-width: 100% !important;
    margin-bottom: 4px !important;
  }

  main section:has(.leaflet-container) p,
  main div:has(.leaflet-container) p {
    max-width: 100% !important;
    width: 100% !important;
    grid-column: 1 / -1 !important;
  }

  main section:has(.leaflet-container) > div:has(button),
  main div:has(.leaflet-container) > div:has(button) {
    display: flex !important;
    flex-wrap: wrap !important;
    gap: 8px !important;
    align-items: center !important;
    justify-content: flex-start !important;
    max-width: 100% !important;
    grid-column: 1 / -1 !important;
  }

  main section:has(.leaflet-container) > div:has(button) button,
  main div:has(.leaflet-container) > div:has(button) button {
    flex: 1 1 160px !important;
    min-width: 0 !important;
    max-width: 100% !important;
    white-space: normal !important;
    line-height: 1.15 !important;
  }

  .leaflet-container {
    max-width: 100% !important;
    width: 100% !important;
  }
}

@media (max-width: 430px) {
  main > section,
  main > div,
  main > article,
  main section:has(.leaflet-container),
  main div:has(> .leaflet-container),
  main div:has(.leaflet-container) {
    max-width: calc(100vw - 14px) !important;
    width: calc(100vw - 14px) !important;
  }

  main section:has(.leaflet-container) > div:has(button) button,
  main div:has(.leaflet-container) > div:has(button) button {
    flex-basis: 100% !important;
  }
}
`;
});

console.log("Stage 102 completed.");
