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
 * Stage 87 — emergency rollback/stabilize.
 *
 * The previous runtime DOM patches used MutationObserver over the whole document
 * and could add broad full-width classes. That can cause page hangs and broken
 * layout (map/cards becoming huge).
 *
 * This patch:
 * 1) Removes RuntimeStage82–86 imports and JSX from layouts.
 * 2) Turns RuntimeStage82–86 files into no-op components.
 * 3) Removes Stage82–86 CSS blocks from globals.css.
 * 4) Adds one tiny safe CSS correction for gallery arrows/calendar time only.
 *
 * After this, the site should stop hanging and layout should return to normal.
 * Then save-search/i18n must be fixed in the actual React components/API, not
 * by global DOM mutation.
 */

const runtimeComponents = [
  ["RuntimeUiEnhancementsStage82", "@/components/RuntimeUiEnhancementsStage82"],
  ["RuntimeStage83", "@/components/RuntimeStage83"],
  ["RuntimeStage84", "@/components/RuntimeStage84"],
  ["RuntimeStage85", "@/components/RuntimeStage85"],
  ["RuntimeStage86", "@/components/RuntimeStage86"],
];

for (const rel of ["app/layout.tsx", "app/[locale]/layout.tsx"]) {
  patch(rel, (s) => {
    for (const [name, importPath] of runtimeComponents) {
      const importRe = new RegExp(String.raw`import\s+\{\s*${name}\s*\}\s+from\s+["']${importPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'];?\s*\n`, "g");
      s = s.replace(importRe, "");

      const jsxRe = new RegExp(String.raw`\s*<${name}\s*/>\s*`, "g");
      s = s.replace(jsxRe, "\n");
    }

    // Clean excessive empty lines that can be left in body.
    s = s.replace(/\n{3,}/g, "\n\n");

    return s;
  });
}

const noopMap = {
  "components/RuntimeUiEnhancementsStage82.tsx": "RuntimeUiEnhancementsStage82",
  "components/RuntimeStage83.tsx": "RuntimeStage83",
  "components/RuntimeStage84.tsx": "RuntimeStage84",
  "components/RuntimeStage85.tsx": "RuntimeStage85",
  "components/RuntimeStage86.tsx": "RuntimeStage86",
};

for (const [rel, name] of Object.entries(noopMap)) {
  if (exists(rel)) {
    write(rel, `"use client";

export function ${name}() {
  return null;
}
`);
  }
}

// Remove appended Stage82–86 CSS blocks. This removes from a stage marker until
// the next stage marker or EOF.
patch("app/globals.css", (s) => {
  const markers = [
    "/* Stage 82 gallery calendar filters save */",
    "/* Stage 83 save search filters stats calendar account */",
    "/* Stage 84 real save no alert fullwidth */",
    "/* Stage 85 hard override save i18n layout */",
    "/* Stage 86 actual runtime patch */",
  ];

  let changed = true;
  while (changed) {
    changed = false;

    for (const marker of markers) {
      const start = s.indexOf(marker);
      if (start === -1) continue;

      let end = s.length;
      for (const other of markers) {
        if (other === marker) continue;
        const idx = s.indexOf(other, start + marker.length);
        if (idx !== -1 && idx < end) end = idx;
      }

      s = s.slice(0, start).trimEnd() + "\n\n" + s.slice(end).trimStart();
      changed = true;
    }
  }

  if (!s.includes("/* Stage 87 safe visual fixes only */")) {
    s += `

/* Stage 87 safe visual fixes only */

/* gallery arrows: visual-only, no layout expansion */
.main-card-gallery-nav-v77,
.main-card-gallery-nav-v76,
.main-card-gallery-nav-v75b,
.gallery-nav-v74 {
  width: 32px !important;
  height: 32px !important;
  min-width: 32px !important;
  min-height: 32px !important;
  padding: 0 !important;
  border-radius: 999px !important;
  border: 1px solid rgba(255,255,255,.85) !important;
  background: rgba(15,41,31,.74) !important;
  color: #fff !important;
  font-size: 22px !important;
  line-height: 1 !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  box-shadow: 0 8px 18px rgba(0,0,0,.20) !important;
}

.main-card-gallery-count-v77,
.main-card-gallery-count-v76,
.main-card-gallery-count-v75b,
.gallery-count-v74 {
  padding: 4px 8px !important;
  border-radius: 999px !important;
  background: rgba(15,41,31,.78) !important;
  color: #fff !important;
  font-size: 12px !important;
  font-weight: 800 !important;
}

/* calendar time badge: visual-only */
.auction-time-badge,
.auction-time,
[class*="auction-time"] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 20px;
  min-width: 44px;
  padding: 0 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  line-height: 20px;
  white-space: nowrap;
}
`;
  }

  return s;
});

console.log("Stage 87 completed. Runtime DOM mutations are disabled.");
