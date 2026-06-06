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

function removeBlock(source, pattern) {
  const match = source.match(pattern);
  if (!match) return { source, block: "" };
  return { source: source.replace(match[0], ""), block: match[0] };
}

patchFile("components/FilterBar.tsx", (s) => {
  // Remove old combined action cell from row 2/3.
  const actionPattern = /\n\s*<div className="filter-action-cell-v57">[\s\S]*?<\/div>\s*\n/;
  const removed = removeBlock(s, actionPattern);
  s = removed.source;

  // Move Radius to the row with sliders: before the first DualRange.
  const radiusPattern = /\n\s*<SingleRange\s+label=\{t\.radius\}[\s\S]*?locale=\{locale\}\s*\/>
/;
  const radiusRemoved = removeBlock(s, radiusPattern);
  s = radiusRemoved.source;
  const radiusBlock = radiusRemoved.block || '\n        <SingleRange label={t.radius} name="radiusKm" max={RADIUS_MAX} step={10} defaultValue={getInitialValue(searchParams, "radiusKm")} suffix=" km" locale={locale} />\n';
  if (!s.includes('name="radiusKm"') && s.includes('<DualRange label={t.marketValue}')) {
    s = s.replace(/\n\s*<DualRange label=\{t\.marketValue\}/, radiusBlock + '\n        <DualRange label={t.marketValue}');
  } else if (radiusBlock && s.includes('<DualRange label={t.marketValue}')) {
    // If radius was removed and not present, place it before price.
    if (!/name="radiusKm"/.test(s)) {
      s = s.replace(/\n\s*<DualRange label=\{t\.marketValue\}/, radiusBlock + '\n        <DualRange label={t.marketValue}');
    }
  }

  // Split actions into two independent grid cells at the end, positions 19 and 20.
  if (!s.includes('filter-action-button-v58')) {
    const actions = `
        <button type="submit" className="btn btn-primary filter-action-button-v58">{t.submit}</button>
        <button type="button" onClick={clearFilters} className="btn btn-ghost filter-action-button-v58">{t.resetFilters}</button>
`;
    s = s.replace(/\n\s*<\/div>\s*\n\s*<\/form>/, actions + '      </div>\n    </form>');
  }

  // Upgrade classes to v58 for clean CSS.
  s = s.replace(/search-filter-v57/g, "search-filter-v58");
  s = s.replace(/search-filter-grid-v57/g, "search-filter-grid-v58");
  s = s.replace(/multi-filter-v57/g, "multi-filter-v58");
  s = s.replace(/multi-filter-panel-v57/g, "multi-filter-panel-v58");
  s = s.replace(/multi-filter-panel-scroll-v57/g, "multi-filter-panel-scroll-v58");
  s = s.replace(/multi-option-v57/g, "multi-option-v58");
  s = s.replace(/range-filter-v57/g, "range-filter-v58");
  s = s.replace(/range-title-v57/g, "range-title-v58");
  s = s.replace(/range-track-v57/g, "range-track-v58");
  s = s.replace(/range-track-single-v57/g, "range-track-single-v58");

  return s;
});

patchFile("components/PublicPropertiesPage.tsx", (s) => {
  // Active filters: perPage/sort/page are not real filters.
  s = s.replace(/if\s*\(\s*key\s*===\s*["']page["']\s*\)\s*return\s+null\s*;/g, 'if (["page", "perPage", "sort"].includes(key)) return null;');
  s = s.replace(/if\s*\(\s*key\s*===\s*["']page["']\s*\)\s*continue\s*;/g, 'if (["page", "perPage", "sort"].includes(key)) continue;');
  s = s.replace(/new Set\(\s*\[\s*["']page["']\s*\]\s*\)/g, 'new Set(["page", "perPage", "sort"])');

  // Remove common map teaser headings/subtitles. Keep inner map card title.
  s = s.replace(/<h2>\s*(?:Аукционы на карте|Versteigerungen auf der Karte|Auctions on the map)\s*<\/h2>\s*<p>[\s\S]*?<\/p>/g, "");

  // Page size: replace fallback 20 with 12 and make common take/slice use perPage.
  s = s.replace(/Number\((params|searchParams)\.perPage\s*\|\|\s*["']20["']\)/g, 'Number($1.perPage || "12")');
  s = s.replace(/Number\((params|searchParams)\.perPage\s*\?\?\s*["']20["']\)/g, 'Number($1.perPage ?? "12")');
  s = s.replace(/parseInt\(String\((params|searchParams)\.perPage\s*\?\?\s*["']20["']\),\s*10\)/g, 'parseInt(String($1.perPage ?? "12"), 10)');
  s = s.replace(/parseInt\(String\((params|searchParams)\.perPage\s*\|\|\s*["']20["']\),\s*10\)/g, 'parseInt(String($1.perPage || "12"), 10)');
  s = s.replace(/const\s+perPage\s*=\s*20\s*;/g, 'const perPage = 12;');
  s = s.replace(/const\s+pageSize\s*=\s*20\s*;/g, 'const pageSize = 12;');
  s = s.replace(/take:\s*20/g, 'take: perPage');
  s = s.replace(/limit:\s*20/g, 'limit: perPage');
  s = s.replace(/\.slice\(([^,\)]+),\s*([^\)]+)\+\s*20\)/g, '.slice($1, $2 + perPage)');

  // If perPage is clamped against allowed values including 20, replace with multiples of 3.
  s = s.replace(/\[\s*12\s*,\s*20\s*,\s*24\s*,\s*48\s*,\s*96\s*\]/g, '[12, 24, 48, 96]');
  s = s.replace(/\[\s*20\s*,\s*40\s*,\s*60\s*\]/g, '[12, 24, 48, 96]');
  return s;
});

// Header cleanup: remove /map link and empty advanced search label in common files.
for (const rel of ["components/Header.tsx", "components/SiteHeader.tsx", "components/MainNav.tsx", "app/layout.tsx"]) {
  patchFile(rel, (s) => {
    s = s.replace(/<Link[^>]+href=["']\/map["'][\s\S]*?<\/Link>/g, "");
    s = s.replace(/<a[^>]+href=["']\/map["'][\s\S]*?<\/a>/g, "");
    s = s.replace(/\s*(?:Расширенный поиск|Erweiterte Suche|Advanced Search)\s*/g, "");
    return s;
  });
}

patchFile("app/globals.css", (s) => {
  if (s.includes("/* Stage 58 final filter layout */")) return s;
  return s + `

/* Stage 58 final filter layout */
.search-filter-head-v56,
.search-filter-head-v57,
.search-filter-head-v58,
.search-filter-bottom-v56,
.search-filter-bottom-v57,
.search-filter-bottom-v58,
.filter-actions-v56,
.filter-actions-v57,
.filter-actions-v58,
.filter-action-cell-v57 {
  display: none !important;
}

.search-filter-v58 {
  border: 1px solid rgba(47, 79, 62, 0.16);
  border-radius: 24px;
  background: rgba(255,255,255,.94);
  padding: 18px;
  box-shadow: 0 18px 44px rgba(17,36,27,.06);
}

.search-filter-grid-v58 {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  align-items: stretch;
}

.search-filter-v58 .span-6 { grid-column: span 2; }
.search-filter-v58 .field,
.search-filter-v58 .multi-filter-v58,
.search-filter-v58 .range-filter-v58,
.search-filter-v58 .filter-action-button-v58 { min-width: 0; }

.filter-action-button-v58 {
  min-height: 48px;
  border-radius: 14px;
  width: 100%;
  height: 100%;
  align-self: stretch;
}

.multi-filter-v58 { position: relative; }
.multi-filter-v58 summary {
  list-style: none;
  cursor: pointer;
  border: 1px solid rgba(47,79,62,.18);
  border-radius: 14px;
  padding: 8px 12px;
  min-height: 48px;
  background: #fff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 3px;
}
.multi-filter-v58 summary::-webkit-details-marker { display: none; }
.multi-filter-v58 summary span, .range-title-v58 span {
  font-size: 12px;
  font-weight: 800;
  color: #5a6b84;
}
.multi-filter-v58 summary b, .range-title-v58 b {
  font-size: 14px;
  color: #0d3327;
}
.multi-filter-v58[open] summary {
  border-color: #2f604f;
  box-shadow: 0 0 0 3px rgba(47,96,79,.08);
}
.multi-filter-panel-v58 {
  position: absolute;
  z-index: 90;
  left: 0;
  right: 0;
  top: calc(100% + 6px);
  background: #fff;
  border: 1px solid rgba(47,79,62,.18);
  border-radius: 16px;
  padding: 10px;
  box-shadow: 0 18px 44px rgba(17,36,27,.16);
  display: grid;
  gap: 8px;
}
.multi-filter-panel-scroll-v58 { max-height: 280px; overflow: auto; }
.multi-option-v58 {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(47,79,62,.12);
  border-radius: 12px;
  padding: 8px 10px;
  cursor: pointer;
  background: #fff;
}
.multi-option-v58.is-selected { background: #edf6f1; border-color: rgba(47,96,79,.35); }

.range-filter-v58 {
  border: 1px solid rgba(47,79,62,.16);
  border-radius: 16px;
  padding: 10px 12px 8px;
  background: #fff;
}
.range-title-v58 {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: baseline;
  margin-bottom: 8px;
}
.range-track-v58 {
  position: relative;
  height: 26px;
  padding: 0 11px;
}
.range-track-v58::before {
  content: "";
  position: absolute;
  left: 11px;
  right: 11px;
  top: 11px;
  height: 4px;
  border-radius: 999px;
  background: rgba(47,79,62,.16);
}
.range-track-v58::after {
  content: "";
  position: absolute;
  left: calc(11px + (100% - 22px) * var(--range-start, 0) / 100);
  right: calc(11px + (100% - 22px) * (100 - var(--range-end, 100)) / 100);
  top: 11px;
  height: 4px;
  border-radius: 999px;
  background: #2f604f;
}
.range-track-single-v58::after {
  left: 11px;
  right: calc(11px + (100% - 22px) * (100 - var(--range-end, 0)) / 100);
}
.range-track-v58 input {
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
.range-track-v58 input::-webkit-slider-runnable-track { height: 26px; background: transparent; border: 0; }
.range-track-v58 input::-webkit-slider-thumb {
  appearance: none;
  pointer-events: auto;
  width: 22px;
  height: 22px;
  margin-top: 2px;
  border-radius: 999px;
  border: 4px solid #fff;
  background: #2f604f;
  box-shadow: 0 3px 10px rgba(17,36,27,.26);
  cursor: grab;
}
.range-track-v58 input::-moz-range-track { height: 26px; background: transparent; border: 0; }
.range-track-v58 input::-moz-range-thumb {
  pointer-events: auto;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  border: 4px solid #fff;
  background: #2f604f;
  box-shadow: 0 3px 10px rgba(17,36,27,.26);
  cursor: grab;
}

/* Hide perPage/sort active filter chips and /map nav fallback */
nav a[href="/map"], nav a[href*="/map"] { display: none !important; }
.active-filter-chip:has([href*="perPage"]), .filter-chip:has([href*="perPage"]), .chip:has([href*="perPage"]),
.active-filter-chip:has([href*="sort"]), .filter-chip:has([href*="sort"]), .chip:has([href*="sort"]) { display: none !important; }
.home-map-teaser, .map-teaser, .map-intro, .map-section-intro, .map-teaser-head, .map-preview-head, .map-block-head, .map-section-head { display: none !important; }

@media (max-width: 1100px) {
  .search-filter-grid-v58 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .search-filter-v58 .span-6 { grid-column: span 2; }
}
@media (max-width: 700px) {
  .search-filter-grid-v58 { grid-template-columns: 1fr; }
  .search-filter-v58 .span-6 { grid-column: span 1; }
  .multi-filter-panel-v58 { position: static; margin-top: 8px; }
}
`;
});

console.log("Stage 58 patch completed.");
