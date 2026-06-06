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

/**
 * Fix perPage default/allowed page sizes more aggressively.
 */
patchFile("components/PublicPropertiesPage.tsx", (s) => {
  if (!s.includes("const allowedPageSizesV57")) {
    s = s.replace(
      /(export\s+(?:async\s+)?function\s+PublicPropertiesPage[^{]*\{)/,
      `$1
  const allowedPageSizesV57 = [12, 24, 48, 96];`
    );
  }

  // Common patterns:
  s = s.replace(/Number\(searchParams\.perPage\s*\|\|\s*["']20["']\)\s*\|\|\s*20/g, 'Number(searchParams.perPage || "12") || 12');
  s = s.replace(/Number\(searchParams\.perPage\s*\|\|\s*["']20["']\)/g, 'Number(searchParams.perPage || "12")');
  s = s.replace(/parseInt\(String\(searchParams\.perPage\s*\?\?\s*["']20["']\),\s*10\)/g, 'parseInt(String(searchParams.perPage ?? "12"), 10)');
  s = s.replace(/parseInt\(String\(searchParams\.perPage\s*\|\|\s*["']20["']\),\s*10\)/g, 'parseInt(String(searchParams.perPage || "12"), 10)');
  s = s.replace(/const\s+perPage\s*=\s*Math\.min\([^;]+;/g, 'const perPageRaw = Number(searchParams.perPage || "12") || 12;\n  const perPage = allowedPageSizesV57.includes(perPageRaw) ? perPageRaw : 12;');
  s = s.replace(/const\s+perPage\s*=\s*Number\([^;]+?\)\s*\|\|\s*20\s*;/g, 'const perPageRaw = Number(searchParams.perPage || "12") || 12;\n  const perPage = allowedPageSizesV57.includes(perPageRaw) ? perPageRaw : 12;');
  s = s.replace(/const\s+pageSize\s*=\s*Number\([^;]+?\)\s*\|\|\s*20\s*;/g, 'const pageSizeRaw = Number(searchParams.perPage || "12") || 12;\n  const pageSize = allowedPageSizesV57.includes(pageSizeRaw) ? pageSizeRaw : 12;');
  s = s.replace(/take:\s*20/g, "take: perPage");
  s = s.replace(/perPage:\s*20/g, "perPage: 12");
  s = s.replace(/pageSize:\s*20/g, "pageSize: 12");

  /**
   * Remove/avoid the text block above the map.
   * We do not remove map itself, only common headings.
   */
  s = s.replace(/<h2>\{[^}]*map[^}]*title[^}]*\}<\/h2>\s*<p>\{[^}]*map[^}]*subtitle[^}]*\}<\/p>/g, "");
  s = s.replace(/<h2>[^<]*(?:Auktionen auf der Karte|Аукционы на карте|Auctions on the map)[^<]*<\/h2>\s*<p>[^<]*<\/p>/g, "");

  return s;
});

/**
 * CSS: remove filter top block, put actions inside grid, clean map heading,
 * make sort selects stylistically consistent.
 */
patchFile("app/globals.css", (s) => {
  if (s.includes("/* Stage 57 filter actions and sort cleanup */")) return s;

  return s + `

/* Stage 57 filter actions and sort cleanup */

/* Old filter header block must disappear */
.search-filter-head-v56,
.search-filter-head-v57,
.filter-topline-v52,
.filter-topline-v56 {
  display: none !important;
}

/* Remove duplicated bottom buttons from older stages */
.search-filter-bottom-v56,
.search-filter-bottom-v57,
.filter-actions-v56,
.filter-actions-v57 {
  display: none !important;
}

.search-filter-v57 {
  border: 1px solid rgba(47, 79, 62, 0.16);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.94);
  padding: 18px;
  box-shadow: 0 18px 44px rgba(17, 36, 27, 0.06);
}

.search-filter-grid-v57 {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 12px;
  align-items: end;
}

.search-filter-v57 .field,
.search-filter-v57 .multi-filter-v57,
.search-filter-v57 .range-filter-v57 {
  grid-column: span 3;
}

.search-filter-v57 .span-6 {
  grid-column: span 6;
}

.filter-action-cell-v57 {
  grid-column: span 3;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  align-self: stretch;
}

.filter-action-cell-v57 .btn {
  min-height: 48px;
  height: 100%;
  white-space: normal;
}

/* Hide old map introduction block/title, keep only the map card */
.map-intro,
.map-section-intro,
.map-teaser-head,
.map-preview-head,
.map-block-head,
.map-section-head,
.section-head:has(+ .map-card),
section:has(.map-card) > h2:first-child,
section:has(.map-card) > p:first-of-type {
  display: none !important;
}

/* If project uses a custom map heading wrapper */
.home-map-title,
.home-map-subtitle,
.map-title-row-v54,
.map-text-row-v54 {
  display: none !important;
}

/* Sort controls styled like filter fields */
.sort-controls-v57,
.sort-controls-v56 {
  display: flex !important;
  justify-content: flex-end;
  align-items: end;
  gap: 12px;
  margin: 18px 0;
  flex-wrap: wrap;
}

.sort-controls-v57 label,
.sort-controls-v56 label {
  display: grid;
  gap: 5px;
  min-width: 220px;
}

.sort-controls-v57 span,
.sort-controls-v56 span {
  font-size: 12px;
  font-weight: 800;
  color: #5a6b84;
}

.sort-controls-v57 select,
.sort-controls-v56 select {
  min-height: 46px;
  border: 1px solid rgba(47, 79, 62, 0.18);
  border-radius: 14px;
  padding: 0 14px;
  background: #fff;
  color: #0d3327;
  font-weight: 700;
  box-shadow: 0 10px 26px rgba(17, 36, 27, 0.035);
}

/* Multiselect dropdowns */
.multi-filter-v57 {
  position: relative;
}

.multi-filter-v57 summary {
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

.multi-filter-v57 summary::-webkit-details-marker {
  display: none;
}

.multi-filter-v57 summary span {
  font-size: 12px;
  font-weight: 800;
  color: #5a6b84;
}

.multi-filter-v57 summary b {
  font-size: 14px;
  color: #0d3327;
}

.multi-filter-v57[open] summary {
  border-color: #2f604f;
  box-shadow: 0 0 0 3px rgba(47, 96, 79, 0.08);
}

.multi-filter-panel-v57 {
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

.multi-filter-panel-scroll-v57 {
  max-height: 280px;
  overflow: auto;
}

.multi-option-v57 {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(47, 79, 62, 0.12);
  border-radius: 12px;
  padding: 8px 10px;
  cursor: pointer;
  background: #fff;
}

.multi-option-v57.is-selected {
  background: #edf6f1;
  border-color: rgba(47, 96, 79, 0.35);
}

/* Range sliders */
.range-filter-v57 {
  border: 1px solid rgba(47, 79, 62, 0.16);
  border-radius: 16px;
  padding: 10px 12px 8px;
  background: #fff;
}

.range-title-v57 {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: baseline;
  margin-bottom: 8px;
}

.range-title-v57 span {
  font-size: 12px;
  font-weight: 800;
  color: #5a6b84;
}

.range-title-v57 b {
  font-size: 13px;
  color: #0d3327;
}

.range-track-v57 {
  position: relative;
  height: 26px;
  padding: 0 11px;
}

.range-track-v57::before {
  content: "";
  position: absolute;
  left: 11px;
  right: 11px;
  top: 11px;
  height: 4px;
  border-radius: 999px;
  background: rgba(47, 79, 62, 0.16);
}

.range-track-v57::after {
  content: "";
  position: absolute;
  left: calc(11px + (100% - 22px) * var(--range-start, 0) / 100);
  right: calc(11px + (100% - 22px) * (100 - var(--range-end, 100)) / 100);
  top: 11px;
  height: 4px;
  border-radius: 999px;
  background: #2f604f;
}

.range-track-single-v57::after {
  left: 11px;
  right: calc(11px + (100% - 22px) * (100 - var(--range-end, 0)) / 100);
}

.range-track-v57 input {
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

.range-track-v57 input::-webkit-slider-runnable-track {
  height: 26px;
  background: transparent;
  border: 0;
}

.range-track-v57 input::-webkit-slider-thumb {
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

.range-track-v57 input::-moz-range-track {
  height: 26px;
  background: transparent;
  border: 0;
}

.range-track-v57 input::-moz-range-thumb {
  pointer-events: auto;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  border: 4px solid #ffffff;
  background: #2f604f;
  box-shadow: 0 3px 10px rgba(17, 36, 27, 0.26);
  cursor: grab;
}

@media (max-width: 1100px) {
  .search-filter-v57 .field,
  .search-filter-v57 .multi-filter-v57,
  .search-filter-v57 .range-filter-v57,
  .search-filter-v57 .span-6,
  .filter-action-cell-v57 {
    grid-column: span 6;
  }
}

@media (max-width: 700px) {
  .search-filter-v57 .field,
  .search-filter-v57 .multi-filter-v57,
  .search-filter-v57 .range-filter-v57,
  .search-filter-v57 .span-6,
  .filter-action-cell-v57 {
    grid-column: span 12;
  }

  .multi-filter-panel-v57 {
    position: static;
    margin-top: 8px;
  }
}
`;
});
console.log("Stage 57 patch completed.");
