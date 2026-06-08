const fs = require("node:fs");
const path = require("node:path");
const root = process.cwd();

function full(rel){return path.join(root, rel)}
function exists(rel){return fs.existsSync(full(rel))}
function read(rel){return fs.readFileSync(full(rel), "utf8")}
function write(rel, content){
  const target = full(rel);
  fs.mkdirSync(path.dirname(target), {recursive:true});
  fs.writeFileSync(target, content, "utf8");
  console.log("written", rel);
}
function patch(rel, fn){
  if(!exists(rel)){console.log("skip missing", rel); return;}
  const before = read(rel);
  const after = fn(before);
  if(after !== before){write(rel, after); console.log("patched", rel);}
  else console.log("unchanged", rel);
}

/*
 Stage 100 — emergency mobile restore.

 Stage99 applied mobile filter styles to the wrong parent and hid everything
 after part of the filter. This removes Stage91-99 mobile CSS and removes
 MobileLayoutStage99 from layouts. It adds only safe CSS: header, language
 switcher, and Leaflet tile protection. No broad :has() content rewrites.
*/

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
    "/* Stage 99 mobile layout rebuild */",
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

  if (!s.includes("/* Stage 100 emergency mobile restore */")) {
    s += `

/* Stage 100 emergency mobile restore */

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

/* Leaflet protection only. Do not style panes/transforms/parents. */
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

/* Safe mobile header only. No content-panel rewriting here. */
@media (max-width: 768px) {
  html, body {
    width: 100%;
    max-width: 100%;
  }

  body {
    overflow-x: auto;
  }

  main {
    width: 100%;
    max-width: 100%;
    min-width: 0;
  }

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

  .language-switcher-menu-v94 {
    right: 50%;
    transform: translateX(50%);
    min-width: 150px;
  }

  .leaflet-container {
    min-height: 330px;
  }
}
`;
  }
  return s;
});

for (const rel of ["app/layout.tsx", "app/[locale]/layout.tsx"]) {
  patch(rel, (s) => {
    const oldNames = ["MobileLayoutStage99", "MobileMapRepairStage97", "MobileMapInvalidateStage96"];
    for (const name of oldNames) {
      s = s.replace(new RegExp(String.raw`import\s+\{\s*${name}\s*\}\s+from\s+["'][^"']+["'];?\s*\n`, "g"), "");
      s = s.replace(new RegExp(String.raw`\s*<${name}\s*/>\s*`, "g"), "\n");
    }
    return s.replace(/\n{3,}/g, "\n\n");
  });
}

if (exists("components/MobileLayoutStage99.tsx")) {
  write("components/MobileLayoutStage99.tsx", `"use client";

export function MobileLayoutStage99() {
  return null;
}
`);
}

console.log("Stage 100 completed.");
