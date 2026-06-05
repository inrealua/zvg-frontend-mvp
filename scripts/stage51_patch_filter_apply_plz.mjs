import fs from "node:fs";
import path from "node:path";
const root = process.cwd();

function patchFile(rel, updater) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) { console.log("skip missing", rel); return; }
  const original = fs.readFileSync(p, "utf8");
  const next = updater(original);
  if (next !== original) { fs.writeFileSync(p, next, "utf8"); console.log("patched", rel); }
  else console.log("unchanged", rel);
}

// 1) Add mini apply enhancer to layout
patchFile("app/layout.tsx", (s) => {
  if (!s.includes('FilterMiniApplyEnhancer')) {
    s = 'import { FilterMiniApplyEnhancer } from "@/components/FilterMiniApplyEnhancer";\n' + s;
  }
  if (!s.includes("<FilterMiniApplyEnhancer />")) {
    s = s.replace("</body>", "        <FilterMiniApplyEnhancer />\n      </body>");
  }
  return s;
});

// 2) Disable old auto-apply in FilterBar without breaking manual submit.
patchFile("components/FilterBar.tsx", (s) => {
  // Remove direct calls that auto-navigate on checkbox/range/select change.
  s = s.replace(/^\s*scheduleAutoApply\(\);\s*$/gm, "");

  // Remove form-level onChange handler if it exists.
  s = s.replace(/\n\s*onChange=\{\(event\) => \{[\s\S]*?scheduleAutoApply\(\);[\s\S]*?\}\}\n\s*>/m, "\n    >");
  return s;
});

// 3) CSS repair: override broken slider styles and add mini apply buttons.
patchFile("app/globals.css", (s) => {
  if (s.includes("/* Stage 51 filter mini apply and slider repair */")) return s;
  return s + `

/* Stage 51 filter mini apply and slider repair */
.filter-mini-apply-host-v51 { position: relative; }
.field.filter-mini-apply-host-v51 > .filter-mini-apply-v51 {
  position: absolute; right: -48px; top: 31px;
}
.advanced-check-group.filter-mini-apply-host-v51 > .filter-mini-apply-v51,
.advanced-range-card.filter-mini-apply-host-v51 > .filter-mini-apply-v51,
.radius-range-card-v49.filter-mini-apply-host-v51 > .filter-mini-apply-v51,
.radius-range-card-v50.filter-mini-apply-host-v51 > .filter-mini-apply-v51,
.radius-range-card-v51.filter-mini-apply-host-v51 > .filter-mini-apply-v51 {
  position: absolute; right: 14px; top: 14px;
}
.filter-mini-apply-v51 {
  border: 0; border-radius: 999px; background: #b6ef34; color: #173326;
  font-size: 26px; font-weight: 900; line-height: 1; min-width: 38px; height: 38px;
  cursor: pointer; box-shadow: 0 7px 18px rgba(58,104,75,.16); z-index: 10;
}
.field.filter-mini-apply-host-v51 { padding-right: 48px; }
.field.filter-mini-apply-host-v51 input,
.field.filter-mini-apply-host-v51 select { width: 100%; }

.dual-range-v49, .single-range-v49, .dual-range-v50, .single-range-v50,
.slider-track-v50, .range-track-v51 {
  position: relative !important; height: 34px !important; margin: 16px 0 4px !important;
  padding: 0 11px !important; background: transparent !important; overflow: visible !important;
}
.dual-range-v49::before, .single-range-v49::before, .dual-range-v50::before, .single-range-v50::before,
.slider-track-v50::before, .range-track-v51::before {
  content: ""; position: absolute; left: 11px; right: 11px; top: 15px; height: 4px;
  border-radius: 999px; background: rgba(47,79,62,.16);
}
.dual-range-v49::after, .single-range-v49::after, .dual-range-v50::after, .single-range-v50::after,
.slider-track-v50::after, .range-track-v51::after {
  content: ""; position: absolute; left: 11px; right: 11px; top: 15px; height: 4px;
  border-radius: 999px; background: #2f604f;
}
.single-range-v49::after, .single-range-v50::after, .range-track-single-v51::after {
  right: calc(11px + (100% - 22px) * (100 - var(--range-end, 0)) / 100) !important;
}
.dual-range-v49 input, .single-range-v49 input, .dual-range-v50 input, .single-range-v50 input,
.slider-track-v50 input, .range-track-v51 input {
  position: absolute !important; inset: 0 !important; width: 100% !important; height: 34px !important;
  margin: 0 !important; padding: 0 !important; appearance: none !important; background: transparent !important;
  pointer-events: none !important; z-index: 2 !important;
}
.dual-range-v49 input::-webkit-slider-runnable-track, .single-range-v49 input::-webkit-slider-runnable-track,
.dual-range-v50 input::-webkit-slider-runnable-track, .single-range-v50 input::-webkit-slider-runnable-track,
.slider-track-v50 input::-webkit-slider-runnable-track, .range-track-v51 input::-webkit-slider-runnable-track {
  height: 34px; background: transparent; border: 0;
}
.dual-range-v49 input::-webkit-slider-thumb, .single-range-v49 input::-webkit-slider-thumb,
.dual-range-v50 input::-webkit-slider-thumb, .single-range-v50 input::-webkit-slider-thumb,
.slider-track-v50 input::-webkit-slider-thumb, .range-track-v51 input::-webkit-slider-thumb {
  appearance: none; pointer-events: auto; width: 22px; height: 22px; margin-top: 6px;
  border-radius: 999px; border: 4px solid #fff; background: #2f604f;
  box-shadow: 0 3px 10px rgba(17,36,27,.28); cursor: grab;
}
@media (max-width: 900px) { .field.filter-mini-apply-host-v51 { padding-right: 0; } .field.filter-mini-apply-host-v51 > .filter-mini-apply-v51 { right: 8px; top: 34px; } }
`;
});

console.log("Stage 51 patch completed.");
