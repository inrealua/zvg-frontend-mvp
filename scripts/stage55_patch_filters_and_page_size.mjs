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

patchFile("components/PublicPropertiesPage.tsx", (source) => {
  let s = source;

  // Default page size should match 3-column grid: 12 items.
  s = s.replace(
    "const paginationState = getPaginationState(params);",
    "const paginationState = getPaginationState({ ...params, perPage: asString(params.perPage) || \"12\" });"
  );

  return s;
});

patchFile("app/globals.css", (source) => {
  if (source.includes("/* Stage 55 filter sliders and page-size multiples */")) return source;

  return source + `

/* Stage 55 filter sliders and page-size multiples */
.search-filter-v55 {
  overflow: visible;
}

.search-filter-head-v55 {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) auto !important;
  align-items: start !important;
  gap: 18px !important;
}

.search-filter-actions-v55 {
  display: flex !important;
  flex-direction: column !important;
  gap: 10px !important;
  min-width: 180px !important;
}

.search-filter-actions-v55 .btn {
  width: 100% !important;
  min-height: 44px !important;
}

.search-filter-grid-v55 {
  display: grid !important;
  grid-template-columns: repeat(6, minmax(0, 1fr)) !important;
  gap: 14px !important;
  align-items: end !important;
}

.filter-range-field-v55 {
  min-width: 0;
}

.filter-range-compact-v55 {
  min-height: 76px;
  border: 1px solid rgba(47, 79, 62, 0.18);
  border-radius: 18px;
  background: #fff;
  padding: 10px 12px 8px;
  box-shadow: 0 8px 20px rgba(17, 36, 27, 0.035);
}

.filter-range-top-v55 {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  min-height: 20px;
  margin-bottom: 9px;
  font-size: 12px;
  font-weight: 900;
}

.filter-range-top-v55 span {
  color: #0f2a1d;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.filter-range-top-v55 b {
  color: #51627a;
  white-space: nowrap;
}

.filter-range-track-v55 {
  position: relative;
  height: 28px;
  padding: 0 11px;
}

.filter-range-track-v55::before {
  content: "";
  position: absolute;
  left: 11px;
  right: 11px;
  top: 12px;
  height: 4px;
  border-radius: 999px;
  background: rgba(47, 79, 62, 0.16);
}

.filter-range-track-v55::after {
  content: "";
  position: absolute;
  left: 11px;
  right: calc(11px + (100% - 22px) * (100 - var(--range-end, 0)) / 100);
  top: 12px;
  height: 4px;
  border-radius: 999px;
  background: #2f604f;
}

.filter-range-track-v55 input[type="range"] {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 28px;
  margin: 0;
  padding: 0;
  appearance: none;
  background: transparent;
  z-index: 2;
}

.filter-range-track-v55 input[type="range"]::-webkit-slider-runnable-track {
  height: 28px;
  background: transparent;
  border: 0;
}

.filter-range-track-v55 input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  width: 22px;
  height: 22px;
  margin-top: 3px;
  border-radius: 999px;
  border: 4px solid #ffffff;
  background: #2f604f;
  box-shadow: 0 3px 10px rgba(17, 36, 27, 0.28);
  cursor: grab;
}

.filter-range-track-v55 input[type="range"]::-moz-range-track {
  height: 28px;
  background: transparent;
  border: 0;
}

.filter-range-track-v55 input[type="range"]::-moz-range-thumb {
  width: 22px;
  height: 22px;
  border-radius: 999px;
  border: 4px solid #ffffff;
  background: #2f604f;
  box-shadow: 0 3px 10px rgba(17, 36, 27, 0.28);
  cursor: grab;
}

.sort-controls-v55 select {
  min-width: 150px;
}

@media (max-width: 1180px) {
  .search-filter-grid-v55 {
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  }
}

@media (max-width: 760px) {
  .search-filter-head-v55 {
    grid-template-columns: 1fr !important;
  }

  .search-filter-actions-v55 {
    width: 100% !important;
    min-width: 0 !important;
    flex-direction: row !important;
  }

  .search-filter-grid-v55 {
    grid-template-columns: 1fr !important;
  }
}
`;
});

console.log("Stage 55 patch completed.");
console.log("Run: npm run build");
