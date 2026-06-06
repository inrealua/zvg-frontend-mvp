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
 * Stage 66:
 * - date cells were too low/small because old overrides forced date input to 26px
 * - action buttons were too tall because they inherited 64px card height
 *
 * Fix:
 * - normal input/select/date fields = 46px inside field
 * - date fields use the same full-height input as normal select
 * - action buttons = same 46px height as fields, not full card height
 * - keep row layout from Stage 65 unchanged
 */
patchFile("app/globals.css", (s) => {
  if (s.includes("/* Stage 66 date and action height fix */")) return s;

  return s + `

/* Stage 66 date and action height fix */

/* Date fields must be normal full-height fields again */
.search-filter-v60 .field > input[type="date"],
.search-filter-v59 .field > input[type="date"],
.search-filter-v58 .field > input[type="date"] {
  height: 46px !important;
  min-height: 46px !important;
  padding: 0 14px !important;
  border: 1px solid rgba(47, 79, 62, 0.18) !important;
  border-radius: 14px !important;
  background: #fff !important;
  box-sizing: border-box !important;
  font-size: 15px !important;
  font-weight: 500 !important;
  color: #0d3327 !important;
  color-scheme: light !important;
}

/* Date field wrapper should have same vertical rhythm as other regular fields */
.search-filter-v60 .field:has(input[type="date"]),
.search-filter-v59 .field:has(input[type="date"]),
.search-filter-v58 .field:has(input[type="date"]) {
  min-height: 64px !important;
  height: auto !important;
  display: flex !important;
  flex-direction: column !important;
  justify-content: flex-start !important;
  gap: 6px !important;
}

/* Action buttons should visually match input/select height, not the full card height */
.filter-action-button-v60,
.filter-action-button-v59,
.filter-action-button-v58 {
  height: 46px !important;
  min-height: 46px !important;
  max-height: 46px !important;
  align-self: end !important;
  margin: 18px 0 0 !important;
  padding: 0 18px !important;
  border-radius: 14px !important;
  box-sizing: border-box !important;
  font-size: 15px !important;
  font-weight: 800 !important;
  line-height: 1.1 !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
}

/* If buttons are in the last row, align their visible box with select inputs */
.search-filter-grid-v60 > .filter-action-button-v60,
.search-filter-grid-v59 > .filter-action-button-v59,
.search-filter-grid-v58 > .filter-action-button-v58 {
  transform: none !important;
}

/* Make the last row consistent: value limits / auction no. / buttons */
.search-filter-v60 .field:has(#wertgrenzen),
.search-filter-v60 .field:has(#auctionAttempt),
.search-filter-v59 .field:has(#wertgrenzen),
.search-filter-v59 .field:has(#auctionAttempt),
.search-filter-v58 .field:has(#wertgrenzen),
.search-filter-v58 .field:has(#auctionAttempt) {
  min-height: 64px !important;
}

/* Avoid older patches making date labels float into the previous row */
.search-filter-v60 .field > label[for="dateFrom"],
.search-filter-v60 .field > label[for="dateTo"],
.search-filter-v59 .field > label[for="dateFrom"],
.search-filter-v59 .field > label[for="dateTo"],
.search-filter-v58 .field > label[for="dateFrom"],
.search-filter-v58 .field > label[for="dateTo"] {
  margin: 0 !important;
  padding: 0 !important;
  line-height: 1.15 !important;
}
`;
});

console.log("Stage 66 patch completed.");
