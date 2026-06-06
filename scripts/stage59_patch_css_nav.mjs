import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function patchFile(rel, updater) {
  const file = path.join(root, rel);

  if (!fs.existsSync(file)) {
    console.log("skip missing", rel);
    return;
  }

  const before = fs.readFileSync(file, "utf8");
  const after = updater(before);

  if (after !== before) {
    fs.writeFileSync(file, after, "utf8");
    console.log("patched", rel);
  } else {
    console.log("unchanged", rel);
  }
}

function removeMapLinks(source) {
  return source
    .replace(/<Link[^>]+href=["']\/map["'][\s\S]*?<\/Link>/g, "")
    .replace(/<a[^>]+href=["']\/map["'][\s\S]*?<\/a>/g, "")
    .replace(/<NavLink[^>]+href=["']\/map["'][\s\S]*?<\/NavLink>/g, "");
}

for (const rel of [
  "components/Header.tsx",
  "components/SiteHeader.tsx",
  "components/AppHeader.tsx",
  "app/layout.tsx",
]) {
  patchFile(rel, removeMapLinks);
}

patchFile("app/globals.css", (s) => {
  if (s.includes("/* Stage 59 working compact filter */")) return s;

  return s + `

/* Stage 59 working compact filter */

.search-filter-head-v56,
.search-filter-head-v57,
.search-filter-head-v58,
.search-filter-bottom-v56,
.search-filter-bottom-v57,
.search-filter-bottom-v58,
.filter-actions-v56,
.filter-actions-v57,
.filter-actions-v58 {
  display: none !important;
}

.search-filter-v59 {
  border: 1px solid rgba(47, 79, 62, 0.16);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.94);
  padding: 18px;
  box-shadow: 0 18px 44px rgba(17, 36, 27, 0.06);
}

.search-filter-grid-v59 {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  align-items: stretch;
}

.filter-span-2-v59 {
  grid-column: span 2;
}

.filter-cell-v59,
.multi-filter-v59,
.range-filter-v59,
.filter-action-button-v59 {
  min-width: 0;
}

.filter-action-button-v59 {
  min-height: 56px;
  border-radius: 14px;
  width: 100%;
  height: 100%;
  align-self: stretch;
}

.multi-filter-v59 {
  position: relative;
}

.multi-filter-v59 summary {
  list-style: none;
  cursor: pointer;
  border: 1px solid rgba(47, 79, 62, 0.18);
  border-radius: 14px;
  padding: 8px 12px;
  min-height: 48px;
  background: #fff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 3px;
}

.multi-filter-v59 summary::-webkit-details-marker {
  display: none;
}

.multi-filter-v59 summary span,
.range-title-v59 span {
  font-size: 12px;
  font-weight: 800;
  color: #5a6b84;
}

.multi-filter-v59 summary b,
.range-title-v59 b {
  font-size: 14px;
  color: #0d3327;
}

.multi-filter-v59[open] summary {
  border-color: #2f604f;
  box-shadow: 0 0 0 3px rgba(47, 96, 79, 0.08);
}

.multi-filter-panel-v59 {
  position: absolute;
  z-index: 90;
  left: 0;
  right: 0;
  top: calc(100% + 6px);
  background: #fff;
  border: 1px solid rgba(47, 79, 62, 0.18);
  border-radius: 16px;
  padding: 10px;
  box-shadow: 0 18px 44px rgba(17, 36, 27, 0.16);
  display: grid;
  gap: 8px;
}

.multi-filter-panel-scroll-v59 {
  max-height: 280px;
  overflow: auto;
}

.multi-option-v59 {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(47, 79, 62, 0.12);
  border-radius: 12px;
  padding: 8px 10px;
  cursor: pointer;
  background: #fff;
}

.multi-option-v59.is-selected {
  background: #edf6f1;
  border-color: rgba(47, 96, 79, 0.35);
}

.range-filter-v59 {
  border: 1px solid rgba(47, 79, 62, 0.16);
  border-radius: 16px;
  padding: 10px 12px 8px;
  background: #fff;
}

.range-title-v59 {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: baseline;
  margin-bottom: 8px;
}

.range-track-v59 {
  position: relative;
  height: 26px;
  padding: 0 11px;
}

.range-track-v59::before {
  content: "";
  position: absolute;
  left: 11px;
  right: 11px;
  top: 11px;
  height: 4px;
  border-radius: 999px;
  background: rgba(47, 79, 62, 0.16);
}

.range-track-v59::after {
  content: "";
  position: absolute;
  left: calc(11px + (100% - 22px) * var(--range-start, 0) / 100);
  right: calc(11px + (100% - 22px) * (100 - var(--range-end, 100)) / 100);
  top: 11px;
  height: 4px;
  border-radius: 999px;
  background: #2f604f;
}

.range-track-single-v59::after {
  left: 11px;
  right: calc(11px + (100% - 22px) * (100 - var(--range-end, 0)) / 100);
}

.range-track-v59 input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 26px;
  margin: 0;
  appearance: none;
  background: transparent;
  pointer-events: none;
  z-index: 2;
}

.range-track-v59 input::-webkit-slider-runnable-track {
  height: 26px;
  background: transparent;
  border: 0;
}

.range-track-v59 input::-webkit-slider-thumb {
  appearance: none;
  pointer-events: auto;
  width: 22px;
  height: 22px;
  margin-top: 2px;
  border-radius: 999px;
  border: 4px solid #ffffff;
  background: #2f604f;
  box-shadow: 0 3px 10px rgba(17, 36, 27, 0.26);
  cursor: grab;
}

.range-track-v59 input::-moz-range-track {
  height: 26px;
  background: transparent;
  border: 0;
}

.range-track-v59 input::-moz-range-thumb {
  pointer-events: auto;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  border: 4px solid #ffffff;
  background: #2f604f;
  box-shadow: 0 3px 10px rgba(17, 36, 27, 0.26);
  cursor: grab;
}

/* Hide obsolete map teaser. The map card title remains visible. */
.home-map-teaser,
.map-teaser,
.map-intro,
.map-section-intro,
.map-teaser-head,
.map-preview-head,
.map-block-head,
.map-section-head {
  display: none !important;
}

/* Hide /map menu item if it remains in the header. */
nav a[href="/map"],
nav a[href*="/map"] {
  display: none !important;
}

@media (max-width: 1100px) {
  .search-filter-grid-v59 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .filter-span-2-v59 {
    grid-column: span 2;
  }
}

@media (max-width: 700px) {
  .search-filter-grid-v59 {
    grid-template-columns: 1fr;
  }

  .filter-span-2-v59 {
    grid-column: span 1;
  }

  .multi-filter-panel-v59 {
    position: static;
    margin-top: 8px;
  }
}
`;
});

console.log("Stage 59 patch completed.");
