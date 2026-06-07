const fs = require("node:fs");
const path = require("node:path");

const file = path.join(process.cwd(), "components", "PropertyMap.tsx");

if (!fs.existsSync(file)) {
  console.error("File not found:", file);
  process.exit(1);
}

let s = fs.readFileSync(file, "utf8");

/**
 * Stage 81B
 *
 * Error:
 *   Expected 1 arguments, but got 2.
 *
 * Cause:
 *   translateGroup() in your project accepts only one argument.
 *   Stage 81 generated:
 *     translateGroup(property.propertyTypeGroup, popupLocaleStage81() as "de" | "ru" | "en")
 *
 * Fix:
 *   replace it with a local map-aware translation helper:
 *     popupGroupStage81(property.propertyTypeGroup)
 */

// Add helper if not present.
if (!s.includes("function popupGroupStage81")) {
  const helper = `
function popupGroupStage81(group: string) {
  const locale = popupLocaleStage81();
  const key = String(group || "").toUpperCase();

  const dict = {
    de: {
      WOHNHAEUSER: "Wohnhäuser",
      WOHNUNGEN: "Wohnungen",
      GRUNDSTUECKE: "Grundstücke",
      GEWERBE: "Gewerbe",
      LAND_WALD: "Land / Wald",
      GARAGEN: "Garagen / Parken",
      SONSTIGE: "Sonstige",
    },
    ru: {
      WOHNHAEUSER: "Жилые дома",
      WOHNUNGEN: "Квартиры",
      GRUNDSTUECKE: "Участки",
      GEWERBE: "Коммерция",
      LAND_WALD: "Земля / лес",
      GARAGEN: "Гаражи / парковки",
      SONSTIGE: "Прочее",
    },
    en: {
      WOHNHAEUSER: "Residential houses",
      WOHNUNGEN: "Apartments",
      GRUNDSTUECKE: "Plots",
      GEWERBE: "Commercial",
      LAND_WALD: "Land / forest",
      GARAGEN: "Garages / parking",
      SONSTIGE: "Other",
    },
  } as const;

  return (dict as any)[locale]?.[key] || translateGroup(group);
}
`;

  const insertAfter = s.indexOf("function popupAddressStage81");
  if (insertAfter !== -1) {
    const open = s.indexOf("{", insertAfter);
    let depth = 0;
    let quote = null;
    let escaped = false;
    let end = -1;

    for (let i = open; i < s.length; i++) {
      const ch = s[i];

      if (quote) {
        if (escaped) escaped = false;
        else if (ch === "\\") escaped = true;
        else if (ch === quote) quote = null;
        continue;
      }

      if (ch === '"' || ch === "'" || ch === "`") {
        quote = ch;
        continue;
      }

      if (ch === "{") depth++;
      if (ch === "}") {
        depth--;
        if (depth === 0) {
          end = i + 1;
          break;
        }
      }
    }

    if (end !== -1) {
      s = s.slice(0, end) + "\n" + helper + s.slice(end);
    } else {
      s += "\n" + helper;
    }
  } else {
    s += "\n" + helper;
  }
}

// Replace the bad two-argument call.
s = s.replace(
  /translateGroup\(\s*property\.propertyTypeGroup\s*,\s*popupLocaleStage81\(\)\s+as\s+"de"\s*\|\s*"ru"\s*\|\s*"en"\s*\)/g,
  "popupGroupStage81(property.propertyTypeGroup)"
);

// More tolerant variants.
s = s.replace(
  /translateGroup\(\s*property\.propertyTypeGroup\s*,\s*popupLocaleStage81\(\)[^)]*\)/g,
  "popupGroupStage81(property.propertyTypeGroup)"
);

fs.writeFileSync(file, s, "utf8");
console.log("Stage 81B fixed translateGroup signature.");
