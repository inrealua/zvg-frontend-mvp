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
 * Stage 75E
 *
 * Error:
 *   propertyImages does not exist in type PropertyInclude
 *
 * Cause:
 *   The Prisma relation in your schema is called `images`, not `propertyImages`.
 *   Previous patch inserted:
 *
 *   include: {
 *     images: true,
 *     propertyImages: true,
 *   }
 *
 * Fix:
 *   Remove only `propertyImages: true,`.
 *   Keep `images`, because your existing code already uses `images`.
 */

// Remove invalid Prisma include relation everywhere in this file.
s = s.replace(/\n\s*propertyImages:\s*true,\s*/g, "\n");

// Clean empty/simple include blocks that may have been inserted into queries where they are not needed.
s = s.replace(/\n\s*include:\s*\{\s*\},/g, "");

// Fix formatting if previous stages created `},select` / `},where`.
s = s.replace(/\},select:/g, "},\n      select:");
s = s.replace(/\},where,/g, "},\n      where,");

// If a `findMany({ include: { images: true }, select: ... })` exists, Prisma cannot combine include and select.
// For court/city distinct queries with select, remove the include block before select.
s = s.replace(
  /prisma\.property\.findMany\(\{\s*include:\s*\{\s*images:\s*true,\s*\},\s*select:/g,
  "prisma.property.findMany({ select:"
);

// Same for findMany with include images and distinct/orderBy select queries, if formatting differs.
s = s.replace(
  /include:\s*\{\s*images:\s*true,\s*\},\s*(select:\s*\{[^}]+\}\s*,\s*distinct:)/g,
  "$1"
);

fs.writeFileSync(file, s, "utf8");
console.log("Stage 75E removed invalid propertyImages include.");
