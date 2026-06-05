import fs from "node:fs";
import path from "node:path";

const filePath = path.join(process.cwd(), "components", "PropertyCard.tsx");

if (!fs.existsSync(filePath)) {
  console.log("components/PropertyCard.tsx not found, skipped.");
  process.exit(0);
}

let source = fs.readFileSync(filePath, "utf8");
const original = source;

// Убираем дубль в eyebrow на уровне кода:
// было: {labelGroup(...)} · {translated.propertyType || property.propertyType}
// стало: только group label.
source = source.replace(
  /\{labelGroup\(property\.propertyTypeGroup,\s*locale\)\}\s*·\s*\{translated\.propertyType\s*\|\|\s*property\.propertyType\}/g,
  "{labelGroup(property.propertyTypeGroup, locale)}"
);

// Другой возможный формат из старого файла.
source = source.replace(
  /\{labelGroup\(property\.propertyTypeGroup,\s*locale\)\}\s*·\s*\{property\.propertyType\}/g,
  "{labelGroup(property.propertyTypeGroup, locale)}"
);

if (source !== original) {
  fs.writeFileSync(filePath, source, "utf8");
  console.log("patched components/PropertyCard.tsx");
} else {
  console.log("No duplicate kicker pattern found in PropertyCard.tsx");
}
