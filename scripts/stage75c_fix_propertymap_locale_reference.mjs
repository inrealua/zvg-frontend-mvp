import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const file = path.join(root, "components", "PropertyMap.tsx");

if (!fs.existsSync(file)) {
  console.error("File not found:", file);
  process.exit(1);
}

let s = fs.readFileSync(file, "utf8");

/**
 * Stage 75C
 *
 * Error:
 *   Cannot find name 'locale'
 *
 * Cause:
 *   Stage 75 inserted calls like:
 *     stage75PopupT(locale)
 *     stage75BestTitle(property, locale)
 *   inside a scope where there is no variable named locale.
 *
 * Fix:
 *   Use client-side locale reader:
 *     stage75ReadClientLocale()
 *
 * This is safe for PropertyMap because it is a client component.
 */

s = s.replace(/stage75PopupT\(locale\)/g, "stage75PopupT(stage75ReadClientLocale())");
s = s.replace(/stage75BestTitle\(property,\s*locale\)/g, "stage75BestTitle(property, stage75ReadClientLocale())");
s = s.replace(/stage75PropertyTypeLabel\(([^,\n]+),\s*locale\)/g, "stage75PropertyTypeLabel($1, stage75ReadClientLocale())");
s = s.replace(/stage75StatusLabel\(([^,\n]+),\s*locale\)/g, "stage75StatusLabel($1, stage75ReadClientLocale())");

// Also fix selectedProperty variants if they exist.
s = s.replace(/stage75BestTitle\(selectedProperty,\s*locale\)/g, "stage75BestTitle(selectedProperty, stage75ReadClientLocale())");
s = s.replace(/stage75PropertyTypeLabel\(([^,\n]+),\s*stage75ReadClientLocale\(\)\)/g, (m) => m);

// Make sure "use client" is first.
s = s.replace(/["']use client["'];\s*\n?/g, "");
s = `"use client";\n\n` + s.trimStart();

fs.writeFileSync(file, s, "utf8");
console.log("Stage 75C fixed PropertyMap locale references.");
