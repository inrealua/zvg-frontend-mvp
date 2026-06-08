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
 * Stage 95
 *
 * Fixes after Stage94:
 * 1) Mobile filter/content should be a bit narrower.
 * 2) Map became incorrect on mobile: Leaflet tiles/markers can be broken by
 *    broad CSS rules that affect images/divs inside map containers.
 * 3) Map header buttons overlap the title on mobile.
 *
 * This is CSS-only. It does not touch React/API.
 */

patch("app/globals.css", (s) => {
  if (s.includes("/* Stage 95 mobile filter map restore */")) return s;

  return s + `

/* Stage 95 mobile filter map restore */

@media (max-width: 768px) {
  /* Make filter/content a bit narrower than Stage94 */
  main form:has(input):has(select),
  main section:has(input):has(select):has(button) {
    width: calc(100vw - 36px) !important;
    max-width: calc(100vw - 36px) !important;
    margin-left: auto !important;
    margin-right: auto !important;
  }

  /* Do not let very broad Stage94 rules influence Leaflet internals */
  .leaflet-container,
  .leaflet-container * {
    box-sizing: content-box !important;
  }

  .leaflet-container {
    width: 100% !important;
    min-width: 0 !important;
    height: 420px !important;
    min-height: 360px !important;
    max-width: 100% !important;
    overflow: hidden !important;
    background: #d7d7d7 !important;
  }

  .leaflet-pane,
  .leaflet-map-pane,
  .leaflet-tile-pane,
  .leaflet-overlay-pane,
  .leaflet-marker-pane,
  .leaflet-shadow-pane,
  .leaflet-tooltip-pane,
  .leaflet-popup-pane {
    max-width: none !important;
    min-width: 0 !important;
    overflow: visible !important;
  }

  .leaflet-container img,
  .leaflet-container .leaflet-tile {
    max-width: none !important;
    min-width: 0 !important;
  }

  .leaflet-tile {
    width: 256px !important;
    height: 256px !important;
  }

  .leaflet-marker-icon,
  .leaflet-marker-shadow {
    max-width: none !important;
    width: auto;
    height: auto;
  }

  .leaflet-control-container,
  .leaflet-control,
  .leaflet-top,
  .leaflet-bottom {
    max-width: none !important;
    overflow: visible !important;
  }

  /* Map section/card should fit inside phone viewport but not squeeze Leaflet internals */
  main section:has(.leaflet-container),
  main div:has(> .leaflet-container),
  main div:has(.leaflet-container) {
    width: calc(100vw - 28px) !important;
    max-width: calc(100vw - 28px) !important;
    margin-left: auto !important;
    margin-right: auto !important;
    box-sizing: border-box !important;
  }

  /* The map card header: title/text/buttons should not overlap */
  main section:has(.leaflet-container) > div:first-child,
  main div:has(.leaflet-container) > div:first-child {
    max-width: 100% !important;
  }

  main section:has(.leaflet-container) h1,
  main section:has(.leaflet-container) h2,
  main section:has(.leaflet-container) h3,
  main div:has(.leaflet-container) h1,
  main div:has(.leaflet-container) h2,
  main div:has(.leaflet-container) h3 {
    max-width: 100% !important;
    overflow-wrap: anywhere !important;
  }

  /* Buttons above map: wrap below title, no overlapping */
  main section:has(.leaflet-container) button,
  main div:has(.leaflet-container) button {
    max-width: 100% !important;
    white-space: normal !important;
  }

  main section:has(.leaflet-container) > div:has(button),
  main div:has(.leaflet-container) > div:has(button) {
    display: flex !important;
    flex-wrap: wrap !important;
    align-items: center !important;
    justify-content: flex-start !important;
    gap: 8px !important;
    max-width: 100% !important;
  }

  main section:has(.leaflet-container) > div:has(button) button,
  main div:has(.leaflet-container) > div:has(button) button {
    flex: 1 1 150px !important;
    min-width: 0 !important;
    height: auto !important;
    min-height: 42px !important;
    padding: 10px 12px !important;
    line-height: 1.15 !important;
  }

  /* The count badge above the map should not become too wide */
  main section:has(.leaflet-container) [class*="count" i],
  main div:has(.leaflet-container) [class*="count" i] {
    max-width: 100% !important;
  }
}

@media (max-width: 430px) {
  main form:has(input):has(select),
  main section:has(input):has(select):has(button) {
    width: calc(100vw - 28px) !important;
    max-width: calc(100vw - 28px) !important;
  }

  main section:has(.leaflet-container),
  main div:has(> .leaflet-container),
  main div:has(.leaflet-container) {
    width: calc(100vw - 24px) !important;
    max-width: calc(100vw - 24px) !important;
  }

  .leaflet-container {
    height: 400px !important;
    min-height: 340px !important;
  }

  main section:has(.leaflet-container) > div:has(button) button,
  main div:has(.leaflet-container) > div:has(button) button {
    flex: 1 1 140px !important;
    font-size: 13px !important;
  }
}
`;
});

console.log("Stage 95 completed.");
