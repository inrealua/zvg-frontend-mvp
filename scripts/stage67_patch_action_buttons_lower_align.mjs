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
 * Stage 67:
 * Buttons in the last row are visually too high.
 * They must align with the input/select boxes in the same row, not with the label line.
 *
 * The select cells in the last row have:
 * - label on top
 * - 46px input/select below
 *
 * So buttons need top offset equal to label+gap: about 18px.
 */
patchFile("app/globals.css", (s) => {
  if (s.includes("/* Stage 67 action buttons lower alignment */")) return s;

  return s + `

/* Stage 67 action buttons lower alignment */

/* Lower action buttons to align with the select boxes in the same row */
.search-filter-grid-v60 > .filter-action-button-v60,
.search-filter-grid-v59 > .filter-action-button-v59,
.search-filter-grid-v58 > .filter-action-button-v58 {
  height: 46px !important;
  min-height: 46px !important;
  max-height: 46px !important;
  align-self: start !important;
  margin-top: 22px !important;
  margin-bottom: 0 !important;
  padding: 0 18px !important;
  border-radius: 14px !important;
  box-sizing: border-box !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  line-height: 1.1 !important;
}

/* Keep the row itself compact after moving buttons down */
.search-filter-grid-v60,
.search-filter-grid-v59,
.search-filter-grid-v58 {
  align-items: start !important;
}

/* On mobile, buttons should not have the desktop label-offset */
@media (max-width: 700px) {
  .search-filter-grid-v60 > .filter-action-button-v60,
  .search-filter-grid-v59 > .filter-action-button-v59,
  .search-filter-grid-v58 > .filter-action-button-v58 {
    margin-top: 0 !important;
    height: 48px !important;
    min-height: 48px !important;
    max-height: 48px !important;
  }
}
`;
});

console.log("Stage 67 patch completed.");
