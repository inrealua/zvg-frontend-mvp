import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const files = [
  "app/components/FavoriteNoteForm.tsx",
  "components/FavoriteNoteForm.tsx",
  "components/QuickSearchBar.tsx",
  "components/FilterBar.tsx",
  "components/SavedSearchNameForm.tsx",
];

function fixFile(rel) {
  const filePath = path.join(root, rel);
  if (!fs.existsSync(filePath)) return;

  let source = fs.readFileSync(filePath, "utf8");
  const original = source;

  // Specific broken case:
  // placeholder=Ihre persönliche Notiz zu diesem Objekt...
  source = source.replace(
    /placeholder=Ihre persönliche Notiz zu diesem Objekt\.\.\./g,
    'placeholder="Ihre persönliche Notiz zu diesem Objekt..."'
  );

  // Generic JSX attr values without quotes/braces.
  // Fixes:
  // placeholder=Text...
  // title=Objektart
  // label=Bundesland
  // aria-label=Text
  // but avoids values already starting with " or {.
  const attrs = [
    "placeholder",
    "title",
    "label",
    "aria-label",
    "emptyLabel",
    "resetLabel",
    "buttonLabel",
    "valueLabel",
  ];

  for (const attr of attrs) {
    const escapedAttr = attr.replace("-", "\\-");

    // Value until line end or before rows/onChange/className/name/etc.
    const re = new RegExp(
      `\\b${escapedAttr}=([^\\{\\\\"'\\n][^\\n>]*?)(?=\\s+(?:rows|onChange|className|name|type|value|selected|options|maxLength|disabled|href|id|htmlFor|key|aria-|data-|/>|>))`,
      "g"
    );

    source = source.replace(re, (match, value) => {
      const clean = String(value).trim();
      if (!clean) return match;
      if (clean.startsWith("{") || clean.startsWith('"') || clean.startsWith("'")) return match;
      return `${attr}="${clean}"`;
    });

    // Single word value before whitespace or >.
    const reWord = new RegExp(
      `\\b${escapedAttr}=([A-Za-zÄÖÜäöüßА-Яа-яЁё][A-Za-zÄÖÜäöüßА-Яа-яЁё0-9_.-]*)(?=\\s|>|/)`,
      "g"
    );

    source = source.replace(reWord, `${attr}="$1"`);
  }

  // If a quoted attr accidentally captured trailing JSX syntax, repair common cases.
  source = source.replace(/placeholder="([^"]*?)"\s*rows=/g, 'placeholder="$1"\n        rows=');

  // Keep "use client" first when present.
  if (source.includes('"use client";') || source.includes("'use client';")) {
    source = source.replace(/["']use client["'];\s*/g, "");
    source = `"use client";\n\n` + source.trimStart();
  }

  if (source !== original) {
    fs.writeFileSync(filePath, source, "utf8");
    console.log("fixed", rel);
  }
}

for (const rel of files) fixFile(rel);

console.log("Stage 47E hotfix v8 completed. Run: npm run build");
