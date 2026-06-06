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
 * Default page size should be 12.
 * This patches common defaults in PublicPropertiesPage.
 */
patchFile("components/PublicPropertiesPage.tsx", (s) => {
  s = s.replace(/const\s+perPage\s*=\s*Number\([^;]*?\)\s*\|\|\s*20\s*;/g, 'const perPage = Number(searchParams.perPage || "12") || 12;');
  s = s.replace(/const\s+pageSize\s*=\s*Number\([^;]*?\)\s*\|\|\s*20\s*;/g, 'const pageSize = Number(searchParams.perPage || "12") || 12;');
  s = s.replace(/perPage:\s*20/g, "perPage: 12");
  s = s.replace(/pageSize:\s*20/g, "pageSize: 12");
  return s;
});

/**
 * Make old /map route redirect to / if the copied file was not applied for any reason.
 */
patchFile("app/map/page.tsx", () => {
  return `import { redirect } from "next/navigation";

export default function MapPage() {
  redirect("/");
}
`;
});

/**
 * CSS for compact horizontal filter + 3-column grid page.
 */
patchFile("app/globals.css", (s) => {
  if (s.includes("/* Stage 56 compact multi filters */")) return s;

  return s + `

/* Stage 56 compact multi filters */

.search-filter-v56 {
  border: 1px solid rgba(47, 79, 62, 0.16);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.94);
  padding: 18px;
  box-shadow: 0 18px 44px rgba(17, 36, 27, 0.06);
}

.search-filter-head-v56 {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 210px;
  gap: 18px;
  align-items: start;
  border-bottom: 1px solid rgba(47, 79, 62, 0.12);
  padding-bottom: 14px;
  margin-bottom: 14px;
}

.search-filter-head-v56 h2 {
  margin: 0 0 4px;
}

.search-filter-head-v56 p {
  margin: 0;
  color: #50627a;
}

.search-filter-actions-v56,
.search-filter-bottom-v56 {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.search-filter-actions-v56 {
  flex-direction: column;
}

.search-filter-actions-v56 .btn,
.search-filter-bottom-v56 .btn {
  min-height: 44px;
}

.search-filter-grid-v56 {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 12px;
  align-items: end;
}

.search-filter-v56 .field,
.search-filter-v56 .multi-filter-v56,
.search-filter-v56 .range-filter-v56 {
  grid-column: span 3;
}

.search-filter-v56 .span-6 {
  grid-column: span 6;
}

.multi-filter-v56 {
  position: relative;
}

.multi-filter-v56 summary {
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

.multi-filter-v56 summary::-webkit-details-marker {
  display: none;
}

.multi-filter-v56 summary span {
  font-size: 12px;
  font-weight: 800;
  color: #5a6b84;
}

.multi-filter-v56 summary b {
  font-size: 14px;
  color: #0d3327;
}

.multi-filter-v56[open] summary {
  border-color: #2f604f;
  box-shadow: 0 0 0 3px rgba(47, 96, 79, 0.08);
}

.multi-filter-panel-v56 {
  position: absolute;
  z-index: 80;
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

.multi-filter-panel-scroll-v56 {
  max-height: 280px;
  overflow: auto;
}

.multi-option-v56 {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(47, 79, 62, 0.12);
  border-radius: 12px;
  padding: 8px 10px;
  cursor: pointer;
  background: #fff;
}

.multi-option-v56.is-selected {
  background: #edf6f1;
  border-color: rgba(47, 96, 79, 0.35);
}

.range-filter-v56 {
  border: 1px solid rgba(47, 79, 62, 0.16);
  border-radius: 16px;
  padding: 10px 12px 8px;
  background: #fff;
}

.range-title-v56 {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: baseline;
  margin-bottom: 8px;
}

.range-title-v56 span {
  font-size: 12px;
  font-weight: 800;
  color: #5a6b84;
}

.range-title-v56 b {
  font-size: 13px;
  color: #0d3327;
}

.range-track-v56 {
  position: relative;
  height: 26px;
  padding: 0 11px;
}

.range-track-v56::before {
  content: "";
  position: absolute;
  left: 11px;
  right: 11px;
  top: 11px;
  height: 4px;
  border-radius: 999px;
  background: rgba(47, 79, 62, 0.16);
}

.range-track-v56::after {
  content: "";
  position: absolute;
  left: calc(11px + (100% - 22px) * var(--range-start, 0) / 100);
  right: calc(11px + (100% - 22px) * (100 - var(--range-end, 100)) / 100);
  top: 11px;
  height: 4px;
  border-radius: 999px;
  background: #2f604f;
}

.range-track-single-v56::after {
  left: 11px;
  right: calc(11px + (100% - 22px) * (100 - var(--range-end, 0)) / 100);
}

.range-track-v56 input {
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

.range-track-v56 input::-webkit-slider-runnable-track {
  height: 26px;
  background: transparent;
  border: 0;
}

.range-track-v56 input::-webkit-slider-thumb {
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

.range-track-v56 input::-moz-range-track {
  height: 26px;
  background: transparent;
  border: 0;
}

.range-track-v56 input::-moz-range-thumb {
  pointer-events: auto;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  border: 4px solid #ffffff;
  background: #2f604f;
  box-shadow: 0 3px 10px rgba(17, 36, 27, 0.26);
  cursor: grab;
}

.search-filter-bottom-v56 {
  margin-top: 14px;
}

.sort-controls-v56 {
  display: flex;
  justify-content: flex-end;
  align-items: end;
  gap: 12px;
  margin: 18px 0;
  flex-wrap: wrap;
}

.sort-controls-v56 label {
  display: grid;
  gap: 5px;
  min-width: 180px;
}

.sort-controls-v56 span {
  font-size: 12px;
  font-weight: 800;
  color: #5a6b84;
}

.sort-controls-v56 select {
  min-height: 42px;
}

@media (max-width: 1100px) {
  .search-filter-v56 .field,
  .search-filter-v56 .multi-filter-v56,
  .search-filter-v56 .range-filter-v56,
  .search-filter-v56 .span-6 {
    grid-column: span 6;
  }
}

@media (max-width: 700px) {
  .search-filter-head-v56 {
    grid-template-columns: 1fr;
  }

  .search-filter-actions-v56 {
    flex-direction: row;
  }

  .search-filter-v56 .field,
  .search-filter-v56 .multi-filter-v56,
  .search-filter-v56 .range-filter-v56,
  .search-filter-v56 .span-6 {
    grid-column: span 12;
  }

  .multi-filter-panel-v56 {
    position: static;
    margin-top: 8px;
  }
}
`;
});
console.log("Stage 56 patch completed.");
