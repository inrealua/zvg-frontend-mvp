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
 * Stage 98 — mobile left align content.
 *
 * The map works now, but all content blocks are shifted to the right.
 * This usually happens when a desktop wrapper keeps min-width/max-width/grid
 * placement on mobile while body overflow-x is hidden.
 *
 * This patch:
 * - keeps Leaflet protected;
 * - does not touch header;
 * - resets mobile page wrappers inside main to viewport width;
 * - removes desktop min-width/translate/margins for content sections;
 * - narrows the filter without shifting it right;
 * - keeps map wrapper inside viewport.
 */

patch("app/globals.css", (s) => {
  if (s.includes("/* Stage 98 mobile left align content */")) return s;

  return s + `

/* Stage 98 mobile left align content */

@media (max-width: 768px) {
  html,
  body {
    width: 100% !important;
    max-width: 100% !important;
    overflow-x: hidden !important;
  }

  main {
    display: block !important;
    width: 100% !important;
    max-width: 100vw !important;
    min-width: 0 !important;
    margin: 0 !important;
    padding-left: 0 !important;
    padding-right: 0 !important;
    overflow-x: hidden !important;
    transform: none !important;
    left: auto !important;
    right: auto !important;
  }

  /*
    Reset desktop wrappers that caused the whole content column to sit outside
    the visible phone viewport. Do NOT affect Leaflet internals.
  */
  main > *,
  main > section,
  main > div,
  main section:not(:has(.leaflet-container)),
  main div:not(:has(.leaflet-container)):not(.leaflet-pane):not(.leaflet-control-container):not(.leaflet-control) {
    min-width: 0 !important;
    max-width: calc(100vw - 16px) !important;
    width: calc(100vw - 16px) !important;
    margin-left: auto !important;
    margin-right: auto !important;
    padding-left: 0 !important;
    padding-right: 0 !important;
    box-sizing: border-box !important;
    transform: none !important;
    left: auto !important;
    right: auto !important;
    float: none !important;
  }

  /*
    If a desktop layout uses grid/flex columns around the content, collapse it.
    Exclude Leaflet panes so map tiles/markers stay correct.
  */
  main > div:not(:has(.leaflet-container)),
  main > section:not(:has(.leaflet-container)) {
    display: block !important;
    grid-template-columns: none !important;
  }

  /*
    Search/filter panel: narrower and centered, but no right shift.
  */
  main form:not(:has(.leaflet-container)),
  main section:not(:has(.leaflet-container)):has(input):has(select):has(button),
  main div:not(:has(.leaflet-container)):has(input):has(select):has(button) {
    width: calc(100vw - 48px) !important;
    max-width: calc(100vw - 48px) !important;
    min-width: 0 !important;
    margin-left: auto !important;
    margin-right: auto !important;
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) !important;
    gap: 10px !important;
    overflow: hidden !important;
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

  main input,
  main select,
  main textarea,
  main button {
    max-width: 100% !important;
    box-sizing: border-box !important;
  }

  /*
    Map: only outer wrapper. Leave Leaflet internals alone.
  */
  main section:has(.leaflet-container),
  main div:has(> .leaflet-container) {
    width: calc(100vw - 24px) !important;
    max-width: calc(100vw - 24px) !important;
    min-width: 0 !important;
    margin-left: auto !important;
    margin-right: auto !important;
    padding-left: 0 !important;
    padding-right: 0 !important;
    box-sizing: border-box !important;
    overflow: hidden !important;
    transform: none !important;
    left: auto !important;
    right: auto !important;
  }

  .leaflet-container {
    width: 100% !important;
    max-width: 100% !important;
  }

  /*
    Cards/list/sort rows should not exceed viewport.
  */
  main article,
  main [href*="/properties/"],
  main [class*="card" i]:not(.leaflet-control),
  main [class*="property" i],
  main [class*="listing" i],
  main [class*="sort" i] {
    max-width: 100% !important;
    min-width: 0 !important;
    box-sizing: border-box !important;
  }

  main [class*="grid" i]:not(:has(.leaflet-container)),
  main [class*="list" i]:not(:has(.leaflet-container)) {
    grid-template-columns: minmax(0, 1fr) !important;
    max-width: 100% !important;
    min-width: 0 !important;
  }

  /*
    Prevent Safari from keeping a previous horizontal scroll position after deploy.
  */
  body {
    left: 0 !important;
    right: auto !important;
  }
}

@media (max-width: 430px) {
  main > *,
  main > section,
  main > div,
  main section:not(:has(.leaflet-container)),
  main div:not(:has(.leaflet-container)):not(.leaflet-pane):not(.leaflet-control-container):not(.leaflet-control) {
    width: calc(100vw - 14px) !important;
    max-width: calc(100vw - 14px) !important;
  }

  main form:not(:has(.leaflet-container)),
  main section:not(:has(.leaflet-container)):has(input):has(select):has(button),
  main div:not(:has(.leaflet-container)):has(input):has(select):has(button) {
    width: calc(100vw - 54px) !important;
    max-width: calc(100vw - 54px) !important;
  }

  main section:has(.leaflet-container),
  main div:has(> .leaflet-container) {
    width: calc(100vw - 20px) !important;
    max-width: calc(100vw - 20px) !important;
  }
}
`;
});

console.log("Stage 98 completed.");
