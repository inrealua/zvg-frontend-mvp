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

// 1. layout: add BackToTopButton
patchFile("app/layout.tsx", (s) => {
  if (!s.includes('BackToTopButton')) {
    s = 'import { BackToTopButton } from "@/components/BackToTopButton";\n' + s;
  }
  if (!s.includes("<BackToTopButton />")) {
    s = s.replace("</body>", "        <BackToTopButton />\n      </body>");
  }
  return s;
});

// 2. PublicPropertiesPage: postal code DB resolver + duplicate active filters above map
patchFile("components/PublicPropertiesPage.tsx", (s) => {
  if (!s.includes('resolvePostalCodeCenter')) {
    s = s.replace(
      'import { distanceKm, findKnownLocation, type GeoPoint } from "@/lib/geo";',
      'import { distanceKm, findKnownLocation, type GeoPoint } from "@/lib/geo";\nimport { resolvePostalCodeCenter } from "@/lib/postal-codes";'
    );
  }

  if (!s.includes("const postalCodeCenter = await resolvePostalCodeCenter(location);")) {
    s = s.replace(
      'const knownLocation = findKnownLocation(location);',
      'const postalCodeCenter = await resolvePostalCodeCenter(location);\n  if (postalCodeCenter) {\n    return { center: postalCodeCenter, radiusKm };\n  }\n\n  const knownLocation = findKnownLocation(location);'
    );
  }

  if (!s.includes("const activeFiltersMapToolbar =")) {
    s = s.replace(
      "  const notices = (",
      '  const resetHref = pagePathForMode(mode);\n\n  const activeFiltersMapToolbar = (\n    <div className="map-active-filter-toolbar-v49">\n      <div className="map-active-filter-toolbar-inner-v49">\n        {activeFilterBlock}\n      </div>\n      <a className="btn btn-soft" href={resetHref}>Filter zurücksetzen</a>\n    </div>\n  );\n\n  const notices = ('
    );
  }

  s = s.replace(
    "{summary}\n              <PropertyMap properties={mapProperties} variant=\"large\" />",
    "{summary}\n              {activeFiltersMapToolbar}\n              <PropertyMap properties={mapProperties} variant=\"large\" />"
  );

  s = s.replace(
    '<PropertyMap properties={mapProperties} variant="wide" />',
    '{activeFiltersMapToolbar}\n          <PropertyMap properties={mapProperties} variant="wide" />'
  );

  return s;
});

// 3. Prisma schema: add PostalCode model
patchFile("prisma/schema.prisma", (s) => {
  if (s.includes("model PostalCode")) return s;

  return s + `

model PostalCode {
  code      String   @id @db.VarChar(5)
  city      String
  state     String?
  latitude  Float
  longitude Float
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([city])
  @@index([state])
}
`;
});

// 4. CSS
patchFile("app/globals.css", (s) => {
  if (s.includes("/* Stage 49 advanced filter UX */")) return s;

  return s + `

/* Stage 49 advanced filter UX */
.filters-v49 {
  position: relative;
}

.range-row-v49 {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.range-card-v49,
.radius-range-card-v49 {
  border: 1px solid rgba(47, 79, 62, 0.16);
  background: linear-gradient(180deg, #ffffff 0%, #fbfdfb 100%);
  border-radius: 22px;
  padding: 18px;
  box-shadow: 0 10px 30px rgba(17, 36, 27, 0.04);
}

.dual-range-v49,
.single-range-v49 {
  position: relative;
  height: 34px;
  margin-top: 14px;
  background:
    linear-gradient(to right,
      rgba(47, 79, 62, 0.18) 0%,
      rgba(47, 79, 62, 0.18) var(--range-start, 0%),
      #2f604f var(--range-start, 0%),
      #2f604f var(--range-end, 100%),
      rgba(47, 79, 62, 0.18) var(--range-end, 100%),
      rgba(47, 79, 62, 0.18) 100%);
  background-size: 100% 4px;
  background-repeat: no-repeat;
  background-position: center;
}

.single-range-v49 {
  background:
    linear-gradient(to right,
      #2f604f 0%,
      #2f604f var(--range-end, 0%),
      rgba(47, 79, 62, 0.18) var(--range-end, 0%),
      rgba(47, 79, 62, 0.18) 100%);
  background-size: 100% 4px;
  background-repeat: no-repeat;
  background-position: center;
}

.dual-range-v49 input,
.single-range-v49 input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 34px;
  pointer-events: none;
  appearance: none;
  background: transparent;
  margin: 0;
}

.dual-range-v49 input::-webkit-slider-thumb,
.single-range-v49 input::-webkit-slider-thumb {
  pointer-events: auto;
  appearance: none;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  border: 4px solid #ffffff;
  background: #2f604f;
  box-shadow: 0 3px 10px rgba(17, 36, 27, 0.28);
  cursor: grab;
}

.dual-range-v49 input::-moz-range-thumb,
.single-range-v49 input::-moz-range-thumb {
  pointer-events: auto;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  border: 4px solid #ffffff;
  background: #2f604f;
  box-shadow: 0 3px 10px rgba(17, 36, 27, 0.28);
  cursor: grab;
}

.radius-range-field-v49 {
  grid-column: span 4;
}

.filter-actions-v49 {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.map-active-filter-toolbar-v49 {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  border: 1px solid rgba(47, 79, 62, 0.14);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.78);
  padding: 14px;
  margin: 16px 0;
}

.map-active-filter-toolbar-inner-v49 {
  flex: 1;
  min-width: 0;
}

.back-to-top-v49 {
  position: fixed;
  right: 22px;
  bottom: 24px;
  width: 48px;
  height: 48px;
  border-radius: 999px;
  border: 1px solid rgba(47, 79, 62, 0.2);
  background: #2f604f;
  color: #ffffff;
  font-size: 24px;
  font-weight: 800;
  cursor: pointer;
  z-index: 60;
  box-shadow: 0 14px 32px rgba(17, 36, 27, 0.28);
}

.back-to-top-v49:hover {
  transform: translateY(-2px);
}

@media (max-width: 900px) {
  .range-row-v49 {
    grid-template-columns: 1fr;
  }

  .radius-range-field-v49 {
    grid-column: span 12;
  }

  .map-active-filter-toolbar-v49 {
    flex-direction: column;
  }
}
`;
});
console.log("Stage 49 patch completed. Next:");
console.log("1) npm run db:push");
console.log("2) node ./scripts/import-postal-codes.mjs ./prisma/postal_codes_starter.csv");
console.log("3) npm run build");
