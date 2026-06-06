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

patchFile("app/globals.css", (css) => {
  if (css.includes("/* Stage 54 — unified search homepage */")) return css;

  return css + `


/* Stage 54 — unified search homepage */
.zvg-search-page-v54 .search-hero-v54 {
  padding: 24px 0 16px;
}

.search-hero-inner-v54 {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 28px;
  align-items: end;
}

.search-hero-v54 h1 {
  margin: 0 0 12px;
  max-width: 900px;
  font-size: clamp(34px, 5vw, 58px);
  line-height: 1;
  letter-spacing: -0.055em;
}

.search-hero-v54 p {
  max-width: 860px;
}

.hero-trust-row {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 16px;
  color: #2f4f3e;
  font-weight: 800;
  font-size: 14px;
}

.hero-trust-row span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.hero-trust-row span::before {
  content: "";
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #2f604f;
  box-shadow: 0 0 0 6px rgba(47, 96, 79, 0.1);
}

.hero-stats-v54 {
  display: grid;
  gap: 10px;
}

.unified-search-page-v54 {
  display: grid;
  gap: 18px;
}

.horizontal-filter-shell-v54 {
  position: relative;
  z-index: 4;
}

.search-filter-v54 {
  border-radius: 26px;
  padding: 18px;
  margin: 0;
  box-shadow: 0 18px 46px rgba(17, 36, 27, 0.08);
}

.search-filter-head-v54 {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 18px;
  margin-bottom: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(47, 79, 62, 0.12);
}

.search-filter-head-v54 h2 {
  margin: 0 0 4px;
  font-size: 22px;
}

.search-filter-head-v54 p {
  margin: 0;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.45;
}

.search-filter-actions-v54 {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.search-filter-grid-v54 {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 12px;
  align-items: end;
}

.search-field-v54 {
  grid-column: span 2;
  min-width: 0;
}

.search-field-v54.span-3-v54 {
  grid-column: span 3;
}

.radius-field-v54 {
  grid-column: span 3;
}

.search-field-v54 label {
  color: var(--muted);
  font-size: 12px;
  font-weight: 900;
}

.search-field-v54 input,
.search-field-v54 select {
  width: 100%;
  height: 46px;
  border: 1px solid rgba(47, 79, 62, 0.22);
  border-radius: 16px;
  padding: 0 13px;
  background: #fff;
  color: var(--text);
  outline: none;
}

.search-field-v54 input:focus,
.search-field-v54 select:focus {
  border-color: #2f604f;
  box-shadow: 0 0 0 4px rgba(47, 96, 79, 0.10);
}

.radius-compact-v54 {
  height: auto;
  min-height: 46px;
  border: 1px solid rgba(47, 79, 62, 0.22);
  border-radius: 16px;
  background: #fff;
  padding: 9px 12px 8px;
}

.radius-compact-top-v54 {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 12px;
  font-weight: 900;
  color: var(--text);
  margin-bottom: 5px;
}

.radius-compact-top-v54 b {
  color: var(--muted);
}

.radius-track-v54 {
  position: relative;
  height: 22px;
}

.radius-track-v54::before {
  content: "";
  position: absolute;
  left: 10px;
  right: 10px;
  top: 9px;
  height: 4px;
  border-radius: 999px;
  background: rgba(47, 79, 62, 0.16);
}

.radius-track-v54::after {
  content: "";
  position: absolute;
  left: 10px;
  right: calc(10px + (100% - 20px) * (100 - var(--radius-end, 0)) / 100);
  top: 9px;
  height: 4px;
  border-radius: 999px;
  background: #2f604f;
}

.radius-track-v54 input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 22px;
  margin: 0;
  appearance: none;
  background: transparent;
  z-index: 2;
}

.radius-track-v54 input::-webkit-slider-runnable-track {
  height: 22px;
  background: transparent;
  border: 0;
}

.radius-track-v54 input::-webkit-slider-thumb {
  appearance: none;
  width: 20px;
  height: 20px;
  margin-top: 1px;
  border-radius: 999px;
  border: 4px solid #fff;
  background: #2f604f;
  box-shadow: 0 3px 10px rgba(17, 36, 27, 0.28);
  cursor: grab;
}

.radius-track-v54 input::-moz-range-track {
  height: 22px;
  background: transparent;
  border: 0;
}

.radius-track-v54 input::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 999px;
  border: 4px solid #fff;
  background: #2f604f;
  box-shadow: 0 3px 10px rgba(17, 36, 27, 0.28);
  cursor: grab;
}

.search-map-section-v54 {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 26px;
  padding: 16px;
  box-shadow: var(--shadow);
}

.search-map-section-v54 .section-heading-row {
  margin-bottom: 12px;
}

.zvg-search-page-v54 .summary-strip {
  margin: 0;
}

.results-actions-v54 {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.sort-controls-v54 {
  display: flex;
  align-items: end;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.sort-controls-v54 label {
  display: grid;
  gap: 5px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 900;
}

.sort-controls-v54 select {
  height: 42px;
  min-width: 190px;
  border: 1px solid rgba(47, 79, 62, 0.22);
  border-radius: 14px;
  padding: 0 12px;
  background: #fff;
  color: var(--text);
}

.search-results-grid-section-v54 .results-head {
  align-items: flex-end;
  gap: 16px;
  margin: 4px 0 14px;
}

.zvg-search-page-v54 .home-property-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.zvg-search-page-v54 .home-property-grid .property-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  border-radius: 24px;
  overflow: hidden;
}

.zvg-search-page-v54 .home-property-grid .card-image-wrap {
  width: 100%;
  min-height: 220px;
  height: 220px;
}

.zvg-search-page-v54 .home-property-grid .card-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 16px;
}

.zvg-search-page-v54 .home-property-grid .card-main-row {
  display: block;
}

.zvg-search-page-v54 .home-property-grid .price-box {
  margin-top: 14px;
  width: 100%;
  text-align: center;
}

.zvg-search-page-v54 .home-property-grid .kpis {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.zvg-search-page-v54 .home-property-grid .card-footer {
  margin-top: auto;
}

@media (max-width: 1180px) {
  .search-filter-grid-v54 {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }

  .search-field-v54,
  .search-field-v54.span-3-v54,
  .radius-field-v54 {
    grid-column: span 2;
  }

  .zvg-search-page-v54 .home-property-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .search-hero-inner-v54 {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .search-filter-head-v54,
  .results-head {
    display: grid;
  }

  .search-filter-actions-v54 {
    justify-content: flex-start;
  }

  .search-filter-grid-v54 {
    grid-template-columns: 1fr;
  }

  .search-field-v54,
  .search-field-v54.span-3-v54,
  .radius-field-v54 {
    grid-column: span 1;
  }

  .zvg-search-page-v54 .home-property-grid {
    grid-template-columns: 1fr;
  }

  .sort-controls-v54 {
    justify-content: flex-start;
  }

  .sort-controls-v54 label,
  .sort-controls-v54 select {
    width: 100%;
  }
}

`;
});

console.log("Stage 54 CSS patch completed.");
console.log("Run: npm run build");
