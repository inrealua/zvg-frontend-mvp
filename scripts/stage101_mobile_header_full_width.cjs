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
 * Stage 101 — mobile header full width.
 *
 * After Stage100 the page content is visible again, but the mobile header is
 * narrower than the rest of the site. This patch changes only the mobile header
 * width/alignment. It does not touch filters, map, cards, or Leaflet.
 */

patch("app/globals.css", (s) => {
  if (s.includes("/* Stage 101 mobile header full width */")) return s;

  return s + `

/* Stage 101 mobile header full width */

@media (max-width: 768px) {
  /*
    Header must use the same visual width as the rest of the page.
    Stage100 centered the inner header grid too tightly. This keeps the
    compact menu but lets the header background/container span the viewport.
  */
  header,
  .site-header,
  .public-header,
  .header,
  [class*="Header"],
  [class*="header"] {
    width: 100vw !important;
    max-width: 100vw !important;
    min-width: 100vw !important;
    margin-left: calc(50% - 50vw) !important;
    margin-right: calc(50% - 50vw) !important;
    box-sizing: border-box !important;
  }

  header > div,
  .site-header > div,
  .public-header > div,
  .header > div,
  [class*="Header"] > div,
  [class*="header"] > div {
    width: 100% !important;
    max-width: 100vw !important;
    min-width: 0 !important;
    margin-left: 0 !important;
    margin-right: 0 !important;
    padding-left: max(12px, env(safe-area-inset-left)) !important;
    padding-right: max(12px, env(safe-area-inset-right)) !important;
    box-sizing: border-box !important;
  }

  /*
    The logo/menu themselves should stay centered and compact, not stretch.
  */
  header nav,
  .site-header nav,
  .public-header nav,
  .header nav,
  [class*="Header"] nav,
  [class*="header"] nav {
    max-width: calc(100vw - 24px) !important;
    margin-left: auto !important;
    margin-right: auto !important;
  }

  header a:has(img),
  .site-header a:has(img),
  .public-header a:has(img),
  .header a:has(img),
  [class*="Header"] a:has(img),
  [class*="header"] a:has(img) {
    max-width: calc(100vw - 24px) !important;
    margin-left: auto !important;
    margin-right: auto !important;
  }
}

@media (max-width: 430px) {
  header > div,
  .site-header > div,
  .public-header > div,
  .header > div,
  [class*="Header"] > div,
  [class*="header"] > div {
    padding-left: max(10px, env(safe-area-inset-left)) !important;
    padding-right: max(10px, env(safe-area-inset-right)) !important;
  }
}
`;
});

console.log("Stage 101 completed.");
