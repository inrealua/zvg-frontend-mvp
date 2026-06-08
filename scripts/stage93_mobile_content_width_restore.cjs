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
 * Stage 93 — restore mobile content widths.
 *
 * Stage 92 fixed the mobile header, but the broad mobile selector:
 *   main, body > div, [class*="page"], [class*="Page"] { max-width: 100vw; }
 * and previous mobile overrides can let content blocks use desktop widths.
 *
 * This patch:
 * 1) Removes the risky broad `main, body > div, [class*="page"]...` rule from Stage 92 if present.
 * 2) Adds mobile-only constraints for search/filter panels, map blocks, stats and object cards.
 * 3) Makes the filter grid one-column on phones and prevents horizontal overflow.
 * 4) Does not touch the fixed header improvements.
 */

patch("app/globals.css", (s) => {
  // Remove only the risky broad Stage92 rule that affects all page/content wrappers.
  s = s.replace(
    /\n\s*\/\*\s*Prevent desktop header shadows\/offsets from creating blank right area\s*\*\/\s*\n\s*main,\s*\n\s*body > div,\s*\n\s*\[class\*="page"\],\s*\n\s*\[class\*="Page"\]\s*\{\s*\n\s*max-width:\s*100vw;\s*\n\s*\}\s*/g,
    "\n"
  );

  if (s.includes("/* Stage 93 mobile content width restore */")) return s;

  return s + `

/* Stage 93 mobile content width restore */

@media (max-width: 768px) {
  /* General mobile content safety */
  html,
  body {
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
  }

  main {
    width: 100% !important;
    max-width: 100% !important;
    overflow-x: hidden !important;
  }

  /* Page sections/cards should fit inside viewport, not desktop width */
  main > section,
  main > div,
  section[class*="section" i],
  section[class*="card" i],
  div[class*="panel" i],
  div[class*="search" i],
  div[class*="filter" i],
  div[class*="map" i],
  div[class*="stats" i],
  div[class*="grid" i] {
    max-width: calc(100vw - 24px) !important;
    box-sizing: border-box !important;
  }

  /* Search/filter box */
  form,
  form > div,
  [class*="search" i],
  [class*="filter" i] {
    min-width: 0 !important;
  }

  /* Only large filter/search grids: one column on phone */
  form:has(input, select),
  form:has(button),
  section:has(input):has(select),
  div:has(input):has(select):has(button) {
    width: calc(100vw - 24px) !important;
    max-width: calc(100vw - 24px) !important;
    margin-left: auto !important;
    margin-right: auto !important;
    overflow: hidden !important;
    display: grid !important;
    grid-template-columns: 1fr !important;
    gap: 10px !important;
  }

  /* Individual filter cells */
  form:has(input, select) > *,
  section:has(input):has(select) > *,
  div:has(input):has(select):has(button) > * {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    grid-column: auto !important;
  }

  input,
  select,
  textarea,
  button {
    max-width: 100% !important;
    box-sizing: border-box !important;
  }

  /* Keep labels readable and left/center consistent */
  label,
  [class*="label" i] {
    max-width: 100% !important;
    overflow-wrap: anywhere;
  }

  /* Map card should not create horizontal scroll */
  [class*="map" i],
  .leaflet-container,
  [class*="leaflet" i] {
    max-width: 100% !important;
    box-sizing: border-box !important;
  }

  .leaflet-container {
    width: 100% !important;
  }

  /* Object cards/grid: single column with sane width */
  [class*="property" i],
  [class*="object" i],
  [class*="listing" i] {
    box-sizing: border-box !important;
  }

  [class*="properties" i],
  [class*="objects" i],
  [class*="listings" i] {
    max-width: calc(100vw - 24px) !important;
    margin-left: auto !important;
    margin-right: auto !important;
  }

  [class*="properties" i]:has([href*="/properties/"]),
  [class*="objects" i]:has([href*="/properties/"]),
  [class*="listings" i]:has([href*="/properties/"]) {
    display: grid !important;
    grid-template-columns: 1fr !important;
    gap: 14px !important;
  }

  [href*="/properties/"] {
    max-width: 100% !important;
  }

  /* Stats cards in hero and results */
  [class*="stats" i],
  [class*="stat" i] {
    max-width: calc(100vw - 24px) !important;
  }
}

@media (max-width: 430px) {
  main > section,
  main > div,
  section[class*="section" i],
  section[class*="card" i],
  div[class*="panel" i],
  div[class*="search" i],
  div[class*="filter" i],
  div[class*="map" i],
  div[class*="stats" i],
  div[class*="grid" i],
  form:has(input, select),
  form:has(button),
  section:has(input):has(select),
  div:has(input):has(select):has(button),
  [class*="properties" i],
  [class*="objects" i],
  [class*="listings" i],
  [class*="stats" i],
  [class*="stat" i] {
    max-width: calc(100vw - 18px) !important;
  }

  form:has(input, select),
  form:has(button),
  section:has(input):has(select),
  div:has(input):has(select):has(button) {
    width: calc(100vw - 18px) !important;
  }
}
`;
});

console.log("Stage 93 completed.");
