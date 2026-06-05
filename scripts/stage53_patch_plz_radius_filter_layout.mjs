import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function patchFile(rel, updater) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    console.log("skip missing", rel);
    return;
  }

  const original = fs.readFileSync(p, "utf8");
  const next = updater(original);

  if (next !== original) {
    fs.writeFileSync(p, next, "utf8");
    console.log("patched", rel);
  } else {
    console.log("unchanged", rel);
  }
}

patchFile("app/globals.css", (s) => {
  if (s.includes("/* Stage 52 filter design and performance reset */")) return s;

  return s + `

/* Stage 52 filter design and performance reset */

/* Remove bad mini-apply buttons from Stage 51 if old markup remains cached */
.filter-mini-apply-v51,
.filter-field-with-apply-v51 > .filter-mini-apply-v51,
.check-group-v51 legend .filter-mini-apply-v51,
.range-title-v51 .filter-mini-apply-v51 {
  display: none !important;
}

/* Neutralize previous broken range CSS */
.dual-range-v49,
.single-range-v49,
.slider-track-v50,
.range-track-v51 {
  background: transparent !important;
}

.filters-v52 {
  position: relative;
}

.filter-topline-v52 {
  align-items: flex-start;
  gap: 16px;
}

.filter-top-actions-v52,
.filter-actions-v52 {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.range-row-v52 {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.clean-range-card-v52 {
  border: 1px solid rgba(47, 79, 62, 0.16);
  background: #fff;
  border-radius: 22px;
  padding: 18px;
  box-shadow: 0 10px 28px rgba(17, 36, 27, 0.045);
}

.clean-range-title-v52 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.clean-slider-track-v52 {
  position: relative;
  height: 30px;
  margin: 16px 0 4px;
  padding: 0 11px;
}

.clean-slider-track-v52::before {
  content: "";
  position: absolute;
  left: 11px;
  right: 11px;
  top: 13px;
  height: 4px;
  border-radius: 999px;
  background: rgba(47, 79, 62, 0.16);
}

.clean-slider-track-v52::after {
  content: "";
  position: absolute;
  left: calc(11px + (100% - 22px) * var(--range-start, 0) / 100);
  right: calc(11px + (100% - 22px) * (100 - var(--range-end, 100)) / 100);
  top: 13px;
  height: 4px;
  border-radius: 999px;
  background: #2f604f;
}

.clean-slider-single-v52::after {
  left: 11px;
  right: calc(11px + (100% - 22px) * (100 - var(--range-end, 0)) / 100);
}

.clean-slider-track-v52 input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 30px;
  margin: 0;
  appearance: none;
  background: transparent;
  pointer-events: none;
  z-index: 2;
}

.clean-slider-track-v52 input::-webkit-slider-runnable-track {
  height: 30px;
  background: transparent;
  border: 0;
}

.clean-slider-track-v52 input::-moz-range-track {
  height: 30px;
  background: transparent;
  border: 0;
}

.clean-slider-track-v52 input::-webkit-slider-thumb {
  appearance: none;
  pointer-events: auto;
  width: 22px;
  height: 22px;
  margin-top: 4px;
  border-radius: 999px;
  border: 4px solid #ffffff;
  background: #2f604f;
  box-shadow: 0 3px 10px rgba(17, 36, 27, 0.28);
  cursor: grab;
}

.clean-slider-track-v52 input::-moz-range-thumb {
  pointer-events: auto;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  border: 4px solid #ffffff;
  background: #2f604f;
  box-shadow: 0 3px 10px rgba(17, 36, 27, 0.28);
  cursor: grab;
}

.radius-range-field-v52 {
  grid-column: span 4;
}

@media (max-width: 900px) {
  .range-row-v52 {
    grid-template-columns: 1fr;
  }

  .radius-range-field-v52 {
    grid-column: span 12;
  }
}
`;
});

// Reduce LanguageRuntimeFix load if previous stages added a 150/250ms interval.
// This removes the interval but keeps mutation observer/on language switch behavior.
patchFile("components/LanguageRuntimeFix.tsx", (s) => {
  s = s.replace(/const timer = window\.setInterval\(run,\s*\d+\);\s*/g, "");
  s = s.replace(/window\.clearInterval\(timer\);\s*/g, "");
  return s;
});

console.log("Stage 52 patch completed.");
