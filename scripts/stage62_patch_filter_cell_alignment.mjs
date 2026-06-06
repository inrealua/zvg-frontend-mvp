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

patchFile("app/globals.css", (s) => {
  if (s.includes("/* Stage 62 exact filter cell alignment */")) return s;

  return s + `

/* Stage 62 exact filter cell alignment */

/*
  Main idea:
  Every filter item must be the same card:
  - regular input/select fields
  - details-based multiselect fields
  - range slider fields
  - action buttons

  This removes the visual shift where multiselect cells and range cells sit on a
  different baseline than normal inputs.
*/

.search-filter-grid-v60,
.search-filter-grid-v59,
.search-filter-grid-v58 {
  display: grid !important;
  grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
  gap: 12px !important;
  align-items: stretch !important;
  grid-auto-rows: 74px !important;
}

.search-filter-v60 .span-6,
.search-filter-v59 .span-6,
.search-filter-v58 .span-6 {
  grid-column: span 2 !important;
}

/* Reset field model */
.search-filter-v60 .field,
.search-filter-v59 .field,
.search-filter-v58 .field {
  display: grid !important;
  grid-template-rows: 18px 1fr !important;
  align-items: center !important;
  gap: 2px !important;
  height: 74px !important;
  min-height: 74px !important;
  margin: 0 !important;
  padding: 10px 12px 9px !important;
  border: 1px solid rgba(47, 79, 62, 0.18) !important;
  border-radius: 14px !important;
  background: #fff !important;
  box-sizing: border-box !important;
}

/* Labels inside regular fields */
.search-filter-v60 .field > label,
.search-filter-v59 .field > label,
.search-filter-v58 .field > label {
  margin: 0 !important;
  padding: 0 !important;
  font-size: 12px !important;
  line-height: 1.15 !important;
  font-weight: 800 !important;
  color: #5a6b84 !important;
}

/* Inputs/selects become borderless content inside the card */
.search-filter-v60 .field > input,
.search-filter-v60 .field > select,
.search-filter-v59 .field > input,
.search-filter-v59 .field > select,
.search-filter-v58 .field > input,
.search-filter-v58 .field > select {
  width: 100% !important;
  height: auto !important;
  min-height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  color: #0d3327 !important;
  font-size: 15px !important;
  font-weight: 700 !important;
  line-height: 1.25 !important;
}

/* Keep date calendar clickable and visible */
.search-filter-v60 .field > input[type="date"],
.search-filter-v59 .field > input[type="date"],
.search-filter-v58 .field > input[type="date"] {
  min-height: 26px !important;
  color-scheme: light !important;
}

/* Multiselect cells: same exact height as regular field */
.search-filter-v60 .multi-filter-v60,
.search-filter-v59 .multi-filter-v59,
.search-filter-v58 .multi-filter-v58 {
  height: 74px !important;
  min-height: 74px !important;
  margin: 0 !important;
  padding: 0 !important;
  align-self: stretch !important;
  box-sizing: border-box !important;
}

.multi-filter-v60 summary,
.multi-filter-v59 summary,
.multi-filter-v58 summary {
  height: 74px !important;
  min-height: 74px !important;
  margin: 0 !important;
  padding: 10px 12px 9px !important;
  border: 1px solid rgba(47, 79, 62, 0.18) !important;
  border-radius: 14px !important;
  background: #fff !important;
  display: grid !important;
  grid-template-rows: 18px 1fr !important;
  align-items: center !important;
  gap: 2px !important;
  box-sizing: border-box !important;
  list-style: none !important;
}

.multi-filter-v60 summary::-webkit-details-marker,
.multi-filter-v59 summary::-webkit-details-marker,
.multi-filter-v58 summary::-webkit-details-marker {
  display: none !important;
}

.multi-filter-v60 summary span,
.multi-filter-v59 summary span,
.multi-filter-v58 summary span {
  margin: 0 !important;
  padding: 0 !important;
  font-size: 12px !important;
  line-height: 1.15 !important;
  font-weight: 800 !important;
  color: #5a6b84 !important;
}

.multi-filter-v60 summary b,
.multi-filter-v59 summary b,
.multi-filter-v58 summary b {
  margin: 0 !important;
  padding: 0 !important;
  color: #0d3327 !important;
  font-size: 15px !important;
  font-weight: 800 !important;
  line-height: 1.25 !important;
}

/* Range cells: same exact outer height, no overlap into next row */
.search-filter-v60 .range-filter-v60,
.search-filter-v59 .range-filter-v59,
.search-filter-v58 .range-filter-v58 {
  height: 74px !important;
  min-height: 74px !important;
  margin: 0 !important;
  padding: 10px 12px 7px !important;
  border: 1px solid rgba(47, 79, 62, 0.16) !important;
  border-radius: 14px !important;
  background: #fff !important;
  box-sizing: border-box !important;
  align-self: stretch !important;
  overflow: visible !important;
}

.range-title-v60,
.range-title-v59,
.range-title-v58 {
  display: flex !important;
  justify-content: space-between !important;
  align-items: baseline !important;
  gap: 8px !important;
  height: 18px !important;
  margin: 0 0 6px !important;
  padding: 0 !important;
  line-height: 1.15 !important;
}

.range-title-v60 span,
.range-title-v59 span,
.range-title-v58 span {
  font-size: 12px !important;
  line-height: 1.15 !important;
  font-weight: 800 !important;
  color: #5a6b84 !important;
}

.range-title-v60 b,
.range-title-v59 b,
.range-title-v58 b {
  font-size: 14px !important;
  line-height: 1.15 !important;
  font-weight: 800 !important;
  color: #0d3327 !important;
  white-space: nowrap !important;
}

.range-track-v60,
.range-track-v59,
.range-track-v58 {
  position: relative !important;
  height: 24px !important;
  margin: 0 !important;
  padding: 0 11px !important;
  box-sizing: border-box !important;
}

.range-track-v60::before,
.range-track-v59::before,
.range-track-v58::before {
  top: 10px !important;
  left: 11px !important;
  right: 11px !important;
  height: 4px !important;
}

.range-track-v60::after,
.range-track-v59::after,
.range-track-v58::after {
  top: 10px !important;
  height: 4px !important;
}

.range-track-v60 input,
.range-track-v59 input,
.range-track-v58 input {
  height: 24px !important;
}

.range-track-v60 input::-webkit-slider-thumb,
.range-track-v59 input::-webkit-slider-thumb,
.range-track-v58 input::-webkit-slider-thumb {
  width: 22px !important;
  height: 22px !important;
  margin-top: 1px !important;
}

.range-scale {
  height: 13px !important;
  margin-top: 1px !important;
  line-height: 1 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
}

/* Buttons same size as other filter cells */
.filter-action-button-v60,
.filter-action-button-v59,
.filter-action-button-v58 {
  height: 74px !important;
  min-height: 74px !important;
  margin: 0 !important;
  padding: 0 18px !important;
  border-radius: 14px !important;
  align-self: stretch !important;
  box-sizing: border-box !important;
}

/* Dropdown panels should open over the next row, not push layout */
.multi-filter-panel-v60,
.multi-filter-panel-v59,
.multi-filter-panel-v58 {
  position: absolute !important;
  z-index: 100 !important;
}

/* Remove any old margins from previous stages */
.search-filter-v60 .field + .field,
.search-filter-v60 .field + .multi-filter-v60,
.search-filter-v60 .multi-filter-v60 + .field,
.search-filter-v60 .range-filter-v60 + .range-filter-v60 {
  margin-top: 0 !important;
}

@media (max-width: 1100px) {
  .search-filter-grid-v60,
  .search-filter-grid-v59,
  .search-filter-grid-v58 {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }

  .search-filter-v60 .span-6,
  .search-filter-v59 .span-6,
  .search-filter-v58 .span-6 {
    grid-column: span 2 !important;
  }
}

@media (max-width: 700px) {
  .search-filter-grid-v60,
  .search-filter-grid-v59,
  .search-filter-grid-v58 {
    grid-template-columns: 1fr !important;
    grid-auto-rows: auto !important;
  }

  .search-filter-v60 .span-6,
  .search-filter-v59 .span-6,
  .search-filter-v58 .span-6 {
    grid-column: span 1 !important;
  }

  .multi-filter-panel-v60,
  .multi-filter-panel-v59,
  .multi-filter-panel-v58 {
    position: static !important;
    margin-top: 8px !important;
  }
}
`;
});

console.log("Stage 62 patch completed.");
