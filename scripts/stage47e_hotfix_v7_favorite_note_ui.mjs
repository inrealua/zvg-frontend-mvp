import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const candidates = [
  path.join(root, "app", "components", "FavoriteNoteForm.tsx"),
  path.join(root, "components", "FavoriteNoteForm.tsx"),
];

for (const filePath of candidates) {
  if (!fs.existsSync(filePath)) continue;

  let source = fs.readFileSync(filePath, "utf8");
  const original = source;

  // This is a client component, so remove accidental server i18n leftovers.
  source = source.replace(/^import\s+\{\s*getI18n\s*\}\s+from\s+["']@\/lib\/i18n\/server["'];\s*\n/gm, "");
  source = source.replace(/^import\s+\{\s*getUiText\s*\}\s+from\s+["']@\/lib\/i18n\/ui-texts["'];\s*\n/gm, "");
  source = source.replace(/\n\s*const\s+\{\s*locale\s*\}\s*=\s*await\s+getI18n\(\);\s*/g, "\n");
  source = source.replace(/\n\s*const\s+ui\s*=\s*getUiText\(locale\);\s*/g, "\n");

  // Replace accidental ui references with safe German fallback text to restore build.
  source = source.replaceAll("{ui.cabinet.myNote}", "Meine Notiz");
  source = source.replaceAll("ui.cabinet.myNote", '"Meine Notiz"');

  source = source.replaceAll("{ui.cabinet.notePlaceholder}", "Ihre persönliche Notiz zu diesem Objekt...");
  source = source.replaceAll("ui.cabinet.notePlaceholder", '"Ihre persönliche Notiz zu diesem Objekt..."');

  source = source.replaceAll("{ui.cabinet.saveNote}", "Notiz speichern");
  source = source.replaceAll("ui.cabinet.saveNote", '"Notiz speichern"');

  source = source.replaceAll("{ui.common.save}", "Speichern");
  source = source.replaceAll("ui.common.save", '"Speichern"');

  // Fix common ternary expression if it was half-patched.
  source = source.replaceAll(': "Speichern"}', ': "Speichern"}');
  source = source.replaceAll(': "Notiz speichern"}', ': "Notiz speichern"}');

  // Ensure "use client" remains first if present.
  if (source.includes('"use client";') || source.includes("'use client';")) {
    source = source.replace(/["']use client["'];\s*/g, "");
    source = `"use client";\n\n` + source.trimStart();
  }

  if (source !== original) {
    fs.writeFileSync(filePath, source, "utf8");
    console.log("fixed", path.relative(root, filePath));
  } else {
    console.log("unchanged", path.relative(root, filePath));
  }
}

console.log("Stage 47E hotfix v7 completed. Run: npm run build");
