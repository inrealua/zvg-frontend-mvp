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

function removeMapLink(s) {
  return s
    .replace(/<Link[^>]+href=["']\/map["'][\s\S]*?<\/Link>/g, "")
    .replace(/<a[^>]+href=["']\/map["'][\s\S]*?<\/a>/g, "")
    .replace(/<NavLink[^>]+href=["']\/map["'][\s\S]*?<\/NavLink>/g, "");
}

/**
 * PublicPropertiesPage:
 * - убираем perPage/sort из active filters, где есть типовые циклы;
 * - агрессивно убираем дефолт 20;
 * - убираем старый текст "Аукционы на карте".
 */
patchFile("components/PublicPropertiesPage.tsx", (s) => {
  // Не показывать perPage/sort как активные фильтры.
  s = s.replace(
    /if\s*\(\s*key\s*===\s*["']page["']\s*\)\s*return\s*null\s*;/g,
    'if (["page", "perPage", "sort"].includes(key)) return null;'
  );
  s = s.replace(
    /if\s*\(\s*key\s*===\s*["']page["']\s*\)\s*continue\s*;/g,
    'if (["page", "perPage", "sort"].includes(key)) continue;'
  );
  s = s.replace(
    /if\s*\(\s*\[\s*["']page["']\s*\]\.includes\(key\)\s*\)\s*return\s*null\s*;/g,
    'if (["page", "perPage", "sort"].includes(key)) return null;'
  );
  s = s.replace(
    /new Set\(\s*\[\s*["']page["']\s*\]\s*\)/g,
    'new Set(["page", "perPage", "sort"])'
  );

  // Дефолт 20 -> 12.
  s = s.replace(/Number\(searchParams\.perPage\s*\|\|\s*["']20["']\)/g, 'Number(searchParams.perPage || "12")');
  s = s.replace(/Number\(params\.perPage\s*\|\|\s*["']20["']\)/g, 'Number(params.perPage || "12")');
  s = s.replace(/parseInt\(String\(searchParams\.perPage\s*\?\?\s*["']20["']\),\s*10\)/g, 'parseInt(String(searchParams.perPage ?? "12"), 10)');
  s = s.replace(/parseInt\(String\(params\.perPage\s*\?\?\s*["']20["']\),\s*10\)/g, 'parseInt(String(params.perPage ?? "12"), 10)');
  s = s.replace(/perPage\s*=\s*20/g, "perPage = 12");
  s = s.replace(/pageSize\s*=\s*20/g, "pageSize = 12");
  s = s.replace(/take:\s*20/g, "take: perPage");
  s = s.replace(/limit:\s*20/g, "limit: perPage");
  s = s.replace(/\.slice\(([^,]+),\s*([^,\)]+)\s*\+\s*20\)/g, ".slice($1, $2 + perPage)");

  // Старая надпись над картой.
  s = s.replace(/<h2>\s*Аукционы на карте\s*<\/h2>\s*<p>[\s\S]*?<\/p>/g, "");
  s = s.replace(/<h2>\s*Versteigerungen auf der Karte\s*<\/h2>\s*<p>[\s\S]*?<\/p>/g, "");
  s = s.replace(/<h2>\s*Auctions on the map\s*<\/h2>\s*<p>[\s\S]*?<\/p>/g, "");

  return s;
});

/**
 * Header cleanup.
 */
for (const rel of [
  "components/Header.tsx",
  "components/SiteHeader.tsx",
  "components/AppHeader.tsx",
  "app/layout.tsx",
]) {
  patchFile(rel, removeMapLink);
}

/**
 * CSS: 4 columns x 5 rows layout.
 * Кнопки находятся последними элементами сетки — 19 и 20 место.
 */
patchFile("app/globals.css", (s) => {
  if (s.includes("/* Stage 58B final filter layout */")) return s;

  return s + `

/* Stage 58B final filter layout */

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

.search-filter-v58,
.search-filter-v57 {
  border: 1px solid rgba(47, 79, 62, 0.16);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.94);
  padding: 18px;
  box-shadow: 0 18px 44px rgba(17, 36, 27, 0.06);
}

.search-filter-grid-v58,
.search-filter-grid-v57 {
  display: grid !important;
  grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
  gap: 12px !important;
  align-items: stretch !important;
}

.search-filter-v58 .span-6,
.search-filter-v57 .span-6 {
  grid-column: span 2 !important;
}

.filter-action-button-v58,
.filter-action-cell-v57 .btn {
  min-height: 48px !important;
  border-radius: 14px !important;
  width: 100% !important;
  height: 100% !important;
  align-self: stretch !important;
}

/* Hide old action cell if previous component is still rendered */
.filter-action-cell-v57 {
  display: contents !important;
}

/* Multiselect common */
.multi-filter-v58,
.multi-filter-v57 {
  position: relative;
}

.multi-filter-v58 summary,
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

.multi-filter-v58 summary::-webkit-details-marker,
.multi-filter-v57 summary::-webkit-details-marker {
  display: none;
}

.multi-filter-v58 summary span,
.multi-filter-v57 summary span,
.range-title-v58 span,
.range-title-v57 span {
  font-size: 12px;
  font-weight: 800;
  color: #5a6b84;
}

.multi-filter-v58 summary b,
.multi-filter-v57 summary b,
.range-title-v58 b,
.range-title-v57 b {
  font-size: 14px;
  color: #0d3327;
}

.multi-filter-v58[open] summary,
.multi-filter-v57[open] summary {
  border-color: #2f604f;
  box-shadow: 0 0 0 3px rgba(47, 96, 79, 0.08);
}

.multi-filter-panel-v58,
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

.multi-filter-panel-scroll-v58,
.multi-filter-panel-scroll-v57 {
  max-height: 280px;
  overflow: auto;
}

.multi-option-v58,
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

.multi-option-v58.is-selected,
.multi-option-v57.is-selected {
  background: #edf6f1;
  border-color: rgba(47, 96, 79, 0.35);
}

/* Range sliders */
.range-filter-v58,
.range-filter-v57 {
  border: 1px solid rgba(47, 79, 62, 0.16);
  border-radius: 16px;
  padding: 10px 12px 8px;
  background: #fff;
}

.range-title-v58,
.range-title-v57 {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: baseline;
  margin-bottom: 8px;
}

.range-track-v58,
.range-track-v57 {
  position: relative;
  height: 26px;
  padding: 0 11px;
}

.range-track-v58::before,
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

.range-track-v58::after,
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

.range-track-single-v58::after,
.range-track-single-v57::after {
  left: 11px;
  right: calc(11px + (100% - 22px) * (100 - var(--range-end, 0)) / 100);
}

.range-track-v58 input,
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

.range-track-v58 input::-webkit-slider-runnable-track,
.range-track-v57 input::-webkit-slider-runnable-track {
  height: 26px;
  background: transparent;
  border: 0;
}

.range-track-v58 input::-webkit-slider-thumb,
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

.range-track-v58 input::-moz-range-track,
.range-track-v57 input::-moz-range-track {
  height: 26px;
  background: transparent;
  border: 0;
}

.range-track-v58 input::-moz-range-thumb,
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

/* Hide perPage/sort active filter chips when possible */
.active-filter-chip:has([href*="perPage"]),
.filter-chip:has([href*="perPage"]),
.chip:has([href*="perPage"]),
.active-filter-chip:has([href*="sort"]),
.filter-chip:has([href*="sort"]),
.chip:has([href*="sort"]) {
  display: none !important;
}

/* Hide obsolete map teaser. Keep map card. */
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

/* Hide /map menu item */
nav a[href="/map"],
nav a[href*="/map"] {
  display: none !important;
}

@media (max-width: 1100px) {
  .search-filter-grid-v58,
  .search-filter-grid-v57 {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }

  .search-filter-v58 .span-6,
  .search-filter-v57 .span-6 {
    grid-column: span 2 !important;
  }
}

@media (max-width: 700px) {
  .search-filter-grid-v58,
  .search-filter-grid-v57 {
    grid-template-columns: 1fr !important;
  }

  .search-filter-v58 .span-6,
  .search-filter-v57 .span-6 {
    grid-column: span 1 !important;
  }

  .multi-filter-panel-v58,
  .multi-filter-panel-v57 {
    position: static;
    margin-top: 8px;
  }
}
`;
});

console.log("Stage 58B patch completed.");
