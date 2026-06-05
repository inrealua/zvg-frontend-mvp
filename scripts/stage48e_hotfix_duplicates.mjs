import fs from "node:fs";
import path from "node:path";

const filePath = path.join(process.cwd(), "components", "LanguageRuntimeFix.tsx");

if (!fs.existsSync(filePath)) {
  console.error("components/LanguageRuntimeFix.tsx not found");
  process.exit(1);
}

let source = fs.readFileSync(filePath, "utf8");
const original = source;

// Remove duplicate object literal keys in the translations object.
// This is conservative: it only removes exact duplicate key declarations
// like `"Alle Bundesländer": {...},` after the first occurrence.
const lines = source.split("\n");
const seenKeys = new Set();
const output = [];
let insideTranslations = false;

for (const line of lines) {
  if (line.includes("const translations:")) {
    insideTranslations = true;
    output.push(line);
    continue;
  }

  if (insideTranslations && line.startsWith("};")) {
    insideTranslations = false;
    output.push(line);
    continue;
  }

  if (insideTranslations) {
    const match = line.match(/^\s*"([^"]+)"\s*:\s*\{/);
    if (match) {
      const key = match[1];
      if (seenKeys.has(key)) {
        console.log("removed duplicate key:", key);
        continue;
      }
      seenKeys.add(key);
    }
  }

  output.push(line);
}

source = output.join("\n");

if (source !== original) {
  fs.writeFileSync(filePath, source, "utf8");
  console.log("Fixed duplicate translation keys in LanguageRuntimeFix.tsx.");
} else {
  console.log("No duplicate keys found.");
}

console.log("Now run: npm run build");
