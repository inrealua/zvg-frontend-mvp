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

patchFile("components/PublicPropertiesPage.tsx", (s) => {
  // Move summary before map in objects/home mode and remove the extra heading row.
  s = s.replace(
    /\s*<div className="search-map-section-v54">[\s\S]*?<PropertyMap properties=\{mapProperties\} variant="wide" \/>[\s\S]*?<\/div>\s*\{summary\}/,
    `
        {summary}

        <div className="search-map-section-v60">
          <PropertyMap properties={mapProperties} variant="wide" />
        </div>`
  );

  // Fallback: if structure changed, at least remove only the heading row above the map.
  s = s.replace(
    /\s*<div className="section-heading-row">\s*<div>\s*<strong>\{siteText\.map\.sectionTitle\}<\/strong>\s*<span>\{siteText\.map\.sectionText\}<\/span>\s*<\/div>\s*<\/div>/g,
    ""
  );

  return s;
});

patchFile("app/globals.css", (s) => {
  if (s.includes("/* Stage 60 filter alignment and summary order */")) return s;
  return s + `

/* Stage 60 filter alignment and summary order */
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

.search-filter-v60 {
  border: 1px solid rgba(47, 79, 62, 0.16);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.94);
  padding: 18px;
  box-shadow: 0 18px 44px rgba(17, 36, 27, 0.06);
}

.search-filter-grid-v60 {
  display: grid !important;
  grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
  gap: 12px !important;
  align-items: stretch !important;
}

.search-filter-v60 .span-6 {
  grid-column: span 2 !important;
}

.search-filter-v60 .field,
.search-filter-v60 .multi-filter-v60,
.search-filter-v60 .range-filter-v60,
.search-filter-v60 .filter-action-button-v60 {
  min-width: 0;
  min-height: 48px;
}

.search-filter-v60 input,
.search-filter-v60 select {
  min-height: 48px;
}

.filter-action-button-v60 {
  min-height: 48px !important;
  height: 48px !important;
  border-radius: 14px !important;
  width: 100% !important;
  align-self: end !important;
  padding: 0 16px !important;
  white-space: normal;
}

.filter-action-cell-v57,
.filter-action-cell-v58 {
  display: contents !important;
}

.multi-filter-v60 {
  position: relative;
}

.multi-filter-v60 summary {
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

.multi-filter-v60 summary::-webkit-details-marker {
  display: none;
}

.multi-filter-v60 summary span,
.range-title-v60 span {
  font-size: 12px;
  font-weight: 800;
  color: #5a6b84;
}

.multi-filter-v60 summary b,
.range-title-v60 b {
  font-size: 14px;
  color: #0d3327;
}

.multi-filter-v60[open] summary {
  border-color: #2f604f;
  box-shadow: 0 0 0 3px rgba(47, 96, 79, 0.08);
}

.multi-filter-panel-v60 {
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

.multi-filter-panel-scroll-v60 {
  max-height: 280px;
  overflow: auto;
}

.multi-option-v60 {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(47, 79, 62, 0.12);
  border-radius: 12px;
  padding: 8px 10px;
  cursor: pointer;
  background: #fff;
}

.multi-option-v60.is-selected {
  background: #edf6f1;
  border-color: rgba(47, 96, 79, 0.35);
}

.range-filter-v60 {
  border: 1px solid rgba(47, 79, 62, 0.16);
  border-radius: 16px;
  padding: 10px 12px 8px;
  background: #fff;
}

.range-title-v60 {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: baseline;
  margin-bottom: 8px;
}

.range-track-v60 {
  position: relative;
  height: 26px;
  padding: 0 11px;
}

.range-track-v60::before {
  content: "";
  position: absolute;
  left: 11px;
  right: 11px;
  top: 11px;
  height: 4px;
  border-radius: 999px;
  background: rgba(47, 79, 62, 0.16);
}

.range-track-v60::after {
  content: "";
  position: absolute;
  left: calc(11px + (100% - 22px) * var(--range-start, 0) / 100);
  right: calc(11px + (100% - 22px) * (100 - var(--range-end, 100)) / 100);
  top: 11px;
  height: 4px;
  border-radius: 999px;
  background: #2f604f;
}

.range-track-single-v60::after {
  left: 11px;
  right: calc(11px + (100% - 22px) * (100 - var(--range-end, 0)) / 100);
}

.range-track-v60 input {
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

.range-track-v60 input::-webkit-slider-runnable-track {
  height: 26px;
  background: transparent;
  border: 0;
}

.range-track-v60 input::-webkit-slider-thumb {
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

.range-track-v60 input::-moz-range-track {
  height: 26px;
  background: transparent;
  border: 0;
}

.range-track-v60 input::-moz-range-thumb {
  pointer-events: auto;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  border: 4px solid #ffffff;
  background: #2f604f;
  box-shadow: 0 3px 10px rgba(17, 36, 27, 0.26);
  cursor: grab;
}

.search-map-section-v60 {
  margin-top: 18px;
}

.search-map-section-v54 > .section-heading-row,
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

@media (max-width: 1100px) {
  .search-filter-grid-v60 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
  .search-filter-v60 .span-6 { grid-column: span 2 !important; }
}

@media (max-width: 700px) {
  .search-filter-grid-v60 { grid-template-columns: 1fr !important; }
  .search-filter-v60 .span-6 { grid-column: span 1 !important; }
  .multi-filter-panel-v60 { position: static; margin-top: 8px; }
}
`;
});

console.log("Stage 60 patch completed.");
