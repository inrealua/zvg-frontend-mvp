import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const files = [
  "app/components/FavoriteNoteForm.tsx",
  "components/FavoriteNoteForm.tsx",
  "components/SavedSearchNameForm.tsx",
  "components/DeleteFavoriteButton.tsx",
];

function fixFile(rel) {
  const filePath = path.join(root, rel);
  if (!fs.existsSync(filePath)) return;

  let source = fs.readFileSync(filePath, "utf8");
  const original = source;

  // Fix broken JSX expression:
  // {isPending ? "Speichern..." : Notiz speichern}
  source = source.replace(
    /\{\s*isPending\s*\?\s*"Speichern\.\.\."\s*:\s*Notiz\s+speichern\s*\}/g,
    '{isPending ? "Speichern..." : "Notiz speichern"}'
  );

  // Other possible broken button texts from the same automatic patch.
  source = source.replace(
    /\{\s*isPending\s*\?\s*"\.\.\."\s*:\s*Speichern\s*\}/g,
    '{isPending ? "..." : "Speichern"}'
  );

  source = source.replace(
    /\{\s*isLoading\s*\?\s*"Entferne\.\.\."\s*:\s*Entfernen\s*\}/g,
    '{isLoading ? "Entferne..." : "Entfernen"}'
  );

  source = source.replace(
    /\{\s*isPending\s*\?\s*"Speichern\.\.\."\s*:\s*Speichern\s*\}/g,
    '{isPending ? "Speichern..." : "Speichern"}'
  );

  // Generic fallback for exactly these raw German phrases in JSX expressions.
  source = source.replaceAll(": Notiz speichern}", ': "Notiz speichern"}');
  source = source.replaceAll(": Speichern}", ': "Speichern"}');
  source = source.replaceAll(": Entfernen}", ': "Entfernen"}');

  // Ensure "use client" first.
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

console.log("Stage 47E hotfix v9 completed. Run: npm run build");
