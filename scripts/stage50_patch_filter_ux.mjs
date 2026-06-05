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

// CSS: replace/append Stage 50 slider styles.
patchFile("app/globals.css", (s) => {
  if (s.includes("/* Stage 50 filter UX corrections */")) return s;

  return s + `

/* Stage 50 filter UX corrections */
.filter-topline-v50 {
  align-items: flex-start;
  gap: 16px;
}

.filter-top-actions-v50 {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.range-row-v50 {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.range-card-v50,
.radius-range-card-v50 {
  border: 1px solid rgba(47, 79, 62, 0.16);
  background: linear-gradient(180deg, #ffffff 0%, #fbfdfb 100%);
  border-radius: 22px;
  padding: 18px;
  box-shadow: 0 10px 30px rgba(17, 36, 27, 0.04);
}

.slider-track-v50 {
  position: relative;
  height: 34px;
  margin: 14px 0 2px;
  width: 100%;
}

.slider-track-v50::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: 15px;
  height: 4px;
  border-radius: 999px;
  background: rgba(47, 79, 62, 0.16);
}

.slider-track-v50::after {
  content: "";
  position: absolute;
  left: var(--range-start, 0%);
  right: calc(100% - var(--range-end, 100%));
  top: 15px;
  height: 4px;
  border-radius: 999px;
  background: #2f604f;
}

.single-slider-v50::after {
  left: 0;
  right: calc(100% - var(--range-end, 0%));
}

.slider-track-v50 input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 34px;
  margin: 0;
  padding: 0;
  appearance: none;
  background: transparent;
  pointer-events: none;
  z-index: 2;
}

.slider-track-v50 input::-webkit-slider-runnable-track {
  height: 34px;
  background: transparent;
  border: 0;
}

.slider-track-v50 input::-moz-range-track {
  height: 34px;
  background: transparent;
  border: 0;
}

.slider-track-v50 input::-webkit-slider-thumb {
  appearance: none;
  pointer-events: auto;
  width: 22px;
  height: 22px;
  margin-top: 6px;
  border-radius: 999px;
  border: 4px solid #ffffff;
  background: #2f604f;
  box-shadow: 0 3px 10px rgba(17, 36, 27, 0.28);
  cursor: grab;
}

.slider-track-v50 input::-moz-range-thumb {
  pointer-events: auto;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  border: 4px solid #ffffff;
  background: #2f604f;
  box-shadow: 0 3px 10px rgba(17, 36, 27, 0.28);
  cursor: grab;
}

.radius-range-field-v50 {
  grid-column: span 4;
}

.filter-actions-v50 {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

@media (max-width: 900px) {
  .range-row-v50 {
    grid-template-columns: 1fr;
  }

  .radius-range-field-v50 {
    grid-column: span 12;
  }

  .filter-top-actions-v50 {
    justify-content: flex-start;
  }
}
`;
});

// LanguageRuntimeFix: add active filter chip translations if file exists.
patchFile("components/LanguageRuntimeFix.tsx", (s) => {
  if (s.includes("Stage 50 active filter chip translations")) return s;

  const additions = String.raw`
  // Stage 50 active filter chip translations
  ["Активные фильтры:", { de: "Aktive Filter:", ru: "Активные фильтры:", en: "Active filters:" }],
  ["Aktive Filter:", { de: "Aktive Filter:", ru: "Активные фильтры:", en: "Active filters:" }],
  ["Active filters:", { de: "Aktive Filter:", ru: "Активные фильтры:", en: "Active filters:" }],
  ["Очистить всё", { de: "Alles löschen", ru: "Очистить всё", en: "Clear all" }],
  ["Alles löschen", { de: "Alles löschen", ru: "Очистить всё", en: "Clear all" }],
  ["Clear all", { de: "Alles löschen", ru: "Очистить всё", en: "Clear all" }],
`;

  const marker = "];\n\nconst translations:";
  if (s.includes(marker)) return s.replace(marker, additions + "\n];\n\nconst translations:");
  return s;
});

console.log("Stage 50 patch completed.");
