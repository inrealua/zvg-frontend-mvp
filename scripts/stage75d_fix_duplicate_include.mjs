import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const file = path.join(root, "components", "PublicPropertiesPage.tsx");

if (!fs.existsSync(file)) {
  console.error("File not found:", file);
  process.exit(1);
}

let s = fs.readFileSync(file, "utf8");

/**
 * Stage 75D
 *
 * Error:
 *   An object literal cannot have multiple properties with the same name.
 *
 * Cause:
 *   Stage 75B inserted:
 *
 *   include: {
 *     images: true,
 *     propertyImages: true,
 *   },where,
 *   include: {
 *     ...translationInclude(locale),
 *     images: {...}
 *   }
 *
 * Fix:
 *   Remove the first simple include block and keep the existing rich include.
 */

// Remove the bad include block inserted before `where, include:`.
s = s.replace(
  /\s*include:\s*\{\s*images:\s*true,\s*propertyImages:\s*true,\s*\},\s*where,/g,
  "\n      where,"
);

// Same but if there is no propertyImages line or different spacing.
s = s.replace(
  /\s*include:\s*\{\s*images:\s*true,\s*\},\s*where,/g,
  "\n      where,"
);

// If the file ended with `},where,` spacing from previous patch, normalize it.
s = s.replace(/\},where,/g, "},\n      where,");

// If there are still duplicated include blocks inside the same findMany object,
// remove a simple include only when followed shortly by another include.
s = s.replace(
  /include:\s*\{\s*(?:images:\s*true,\s*)?(?:propertyImages:\s*true,\s*)?\},\s*([\s\S]{0,120}?)include:\s*\{/g,
  "$1include: {"
);

fs.writeFileSync(file, s, "utf8");
console.log("Stage 75D removed duplicate include in PublicPropertiesPage.");
