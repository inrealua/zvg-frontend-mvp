import fs from "node:fs";
import path from "node:path";

const filePath = path.join(process.cwd(), "components", "FilterBar.tsx");

if (!fs.existsSync(filePath)) {
  console.error("components/FilterBar.tsx not found");
  process.exit(1);
}

let source = fs.readFileSync(filePath, "utf8");
const original = source;

// Fix JSX attributes where previous scripts turned expressions into raw words:
// title=Objektart -> title="Objektart"
// title=Nutzung   -> title="Nutzung"
// Also supports common labels with spaces if they got broken.

const replacements = new Map([
  ["title=Objektart", 'title="Objektart"'],
  ["title=Nutzung", 'title="Nutzung"'],
  ["title=Bundesland", 'title="Bundesland"'],
  ["title=Status", 'title="Status"'],
  ["title=Denkmalschutz", 'title="Denkmalschutz"'],
  ["title=Wertgrenzen", 'title="Wertgrenzen"'],

  ["label=Objektart", 'label="Objektart"'],
  ["label=Nutzung", 'label="Nutzung"'],
  ["label=Bundesland", 'label="Bundesland"'],
  ["label=Status", 'label="Status"'],
  ["label=Denkmalschutz", 'label="Denkmalschutz"'],
  ["label=Wertgrenzen", 'label="Wertgrenzen"'],

  ["placeholder=Objektart", 'placeholder="Objektart"'],
  ["placeholder=Nutzung", 'placeholder="Nutzung"'],
  ["placeholder=Bundesland", 'placeholder="Bundesland"'],
]);

for (const [from, to] of replacements.entries()) {
  source = source.replaceAll(from, to);
}

// Generic fallback: attr=SomeSingleWord before whitespace or > becomes attr="SomeSingleWord"
// only for specific JSX attrs and only when value is not already { or ".
source = source.replace(
  /\b(title|label|placeholder|emptyLabel|resetLabel|buttonLabel|valueLabel)=([A-Za-zÄÖÜäöüßА-Яа-яЁё][A-Za-zÄÖÜäöüßА-Яа-яЁё0-9_-]*)(?=\s|>)/g,
  '$1="$2"'
);

// Fix selectedLabel second argument if it became raw text.
source = source.replace(/selectedLabel\(([^,]+),\s*([A-Za-zÄÖÜäöüßА-Яа-яЁё][^)]*?)\)/g, (match, first, second) => {
  const trimmed = second.trim();
  if (trimmed.startsWith('"') || trimmed.startsWith("'") || trimmed.startsWith("ui.") || trimmed.startsWith("publicUi.")) {
    return match;
  }
  return `selectedLabel(${first}, "${trimmed}")`;
});

// Ensure use client stays first.
if (source.includes('"use client";') || source.includes("'use client';")) {
  source = source.replace(/["']use client["'];\s*/g, "");
  source = `"use client";\n\n` + source.trimStart();
}

if (source !== original) {
  fs.writeFileSync(filePath, source, "utf8");
  console.log("Fixed FilterBar raw JSX attribute values.");
} else {
  console.log("No changes made.");
}

console.log("Now run: npm run build");
