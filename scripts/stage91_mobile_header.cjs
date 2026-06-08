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
 * Stage 91 — mobile header optimization.
 *
 * Problem on mobile:
 * - Header menu items overlap: "StartseiteArchiv"
 * - Logout button is too wide and pushes items
 * - Language selector/other controls may overflow
 *
 * This patch is CSS-only and safe:
 * - Does not touch runtime logic
 * - Does not affect desktop layout above 768px
 * - Stacks logo and navigation on mobile
 * - Makes nav wrap cleanly
 * - Converts menu items/buttons/select to compact pills
 */

patch("app/globals.css", (s) => {
  if (s.includes("/* Stage 91 mobile header */")) return s;

  return s + `

/* Stage 91 mobile header */

@media (max-width: 768px) {
  header,
  .site-header,
  .public-header,
  .header,
  [class*="Header"],
  [class*="header"] {
    overflow-x: clip;
  }

  header > div,
  .site-header > div,
  .public-header > div,
  .header > div,
  [class*="Header"] > div,
  [class*="header"] > div {
    max-width: 100% !important;
  }

  header nav,
  .site-header nav,
  .public-header nav,
  .header nav,
  [class*="Header"] nav,
  [class*="header"] nav {
    display: flex !important;
    flex-wrap: wrap !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 8px !important;
    width: 100% !important;
    min-width: 0 !important;
    overflow: visible !important;
  }

  header a,
  header button,
  header select,
  .site-header a,
  .site-header button,
  .site-header select,
  .public-header a,
  .public-header button,
  .public-header select,
  .header a,
  .header button,
  .header select,
  [class*="Header"] a,
  [class*="Header"] button,
  [class*="Header"] select,
  [class*="header"] a,
  [class*="header"] button,
  [class*="header"] select {
    white-space: nowrap !important;
    flex: 0 0 auto !important;
    min-width: 0 !important;
  }

  header nav a,
  .site-header nav a,
  .public-header nav a,
  .header nav a,
  [class*="Header"] nav a,
  [class*="header"] nav a {
    font-size: 14px !important;
    line-height: 1 !important;
    padding: 10px 8px !important;
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
    height: 40px !important;
    min-height: 40px !important;
    max-height: 40px !important;
    padding: 0 12px !important;
    border-radius: 999px !important;
    font-size: 14px !important;
    line-height: 1 !important;
  }

  /* Logo row */
  header img,
  .site-header img,
  .public-header img,
  .header img,
  [class*="Header"] img,
  [class*="header"] img {
    max-width: min(260px, 72vw) !important;
    height: auto !important;
    object-fit: contain !important;
  }

  /* If header container is horizontal on desktop, allow clean mobile wrapping */
  header > div,
  .site-header > div,
  .public-header > div,
  .header > div,
  [class*="Header"] > div,
  [class*="header"] > div {
    display: flex !important;
    flex-wrap: wrap !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 10px 14px !important;
    padding-left: 14px !important;
    padding-right: 14px !important;
  }

  /* Keep logo on its own line when needed */
  header > div > a:has(img),
  .site-header > div > a:has(img),
  .public-header > div > a:has(img),
  .header > div > a:has(img),
  [class*="Header"] > div > a:has(img),
  [class*="header"] > div > a:has(img) {
    flex: 1 1 100% !important;
    display: flex !important;
    justify-content: center !important;
  }
}

@media (max-width: 430px) {
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
    font-size: 13px !important;
    padding: 9px 6px !important;
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
    height: 38px !important;
    min-height: 38px !important;
    padding: 0 10px !important;
    font-size: 13px !important;
  }

  /* Avoid "StartseiteArchiv" overlap by giving each link real spacing */
  header nav a + a,
  .site-header nav a + a,
  .public-header nav a + a,
  .header nav a + a,
  [class*="Header"] nav a + a,
  [class*="header"] nav a + a {
    margin-left: 0 !important;
  }
}
`;
});

console.log("Stage 91 completed.");
