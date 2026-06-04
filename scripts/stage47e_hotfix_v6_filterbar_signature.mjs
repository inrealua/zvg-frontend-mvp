import fs from "node:fs";
import path from "node:path";

const filePath = path.join(process.cwd(), "components", "FilterBar.tsx");

if (!fs.existsSync(filePath)) {
  console.error("components/FilterBar.tsx not found");
  process.exit(1);
}

let source = fs.readFileSync(filePath, "utf8");
const original = source;

// Fix broken function parameter created by previous attr patch:
// function selectedLabel(values: string[], "totalLabel: string"): string
source = source.replace(
  /function\s+selectedLabel\s*\(\s*values:\s*string\[\]\s*,\s*["']totalLabel:\s*string["']\s*\)\s*:\s*string\s*\{/,
  "function selectedLabel(values: string[], totalLabel: string): string {"
);

// Also fix similar accidental quoted TS parameters if any.
source = source.replace(/,\s*["']([A-Za-z_$][A-Za-z0-9_$]*)\s*:\s*([^"']+)["']\s*\)/g, ", $1: $2)");

// Restore German label for count if it was broken.
source = source.replace(/return `\$\{values\.length\} ausgewählt`;/g, 'return `${values.length} ausgewählt`;');

// Keep use client as first line.
if (source.includes('"use client";') || source.includes("'use client';")) {
  source = source.replace(/["']use client["'];\s*/g, "");
  source = `"use client";\n\n` + source.trimStart();
}

if (source !== original) {
  fs.writeFileSync(filePath, source, "utf8");
  console.log("Fixed selectedLabel signature in FilterBar.tsx.");
} else {
  console.log("No changes made.");
}

console.log("Now run: npm run build");
