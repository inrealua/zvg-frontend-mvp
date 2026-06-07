const fs = require("node:fs");
const path = require("node:path");

const file = path.join(process.cwd(), "components", "PublicPropertiesPage.tsx");

if (!fs.existsSync(file)) {
  console.error("File not found:", file);
  process.exit(1);
}

let s = fs.readFileSync(file, "utf8");

/**
 * Stage 76D
 *
 * Your current broken fragment is exactly:
 *
 * images: {
 *   orderBy: [{ isMain: "desc" }, { sortOrder: "asc" }],
 * }, images: {
 *   orderBy: [{ isMain: "desc" }, { sortOrder: "asc" }],
 *   take: 1,
 * },
 *
 * Previous regex did not catch it because line endings/spacing differed.
 * This script uses a small scanner, not a fragile regex.
 */

function findMatchingBrace(text, openIndex) {
  let depth = 0;
  let inString = null;
  let escaped = false;

  for (let i = openIndex; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === inString) {
        inString = null;
      }
      continue;
    }

    if (ch === '"' || ch === "'" || ch === "`") {
      inString = ch;
      continue;
    }

    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }

  return -1;
}

function removeFirstDuplicateImages(text) {
  let pos = 0;
  let changed = false;

  while (true) {
    const firstKey = text.indexOf("images:", pos);
    if (firstKey === -1) break;

    const firstBrace = text.indexOf("{", firstKey);
    if (firstBrace === -1) break;

    const firstEndBrace = findMatchingBrace(text, firstBrace);
    if (firstEndBrace === -1) break;

    let afterFirst = firstEndBrace + 1;

    // skip whitespace
    while (/\s/.test(text[afterFirst] || "")) afterFirst++;

    // optional comma
    if (text[afterFirst] === ",") afterFirst++;
    while (/\s/.test(text[afterFirst] || "")) afterFirst++;

    // if next key is also images, remove the first images block including comma/space
    if (text.slice(afterFirst, afterFirst + "images:".length) === "images:") {
      const removeStart = firstKey;
      const removeEnd = afterFirst;
      text = text.slice(0, removeStart) + text.slice(removeEnd);
      changed = true;
      pos = Math.max(0, removeStart - 20);
      continue;
    }

    pos = firstEndBrace + 1;
  }

  return { text, changed };
}

let result = removeFirstDuplicateImages(s);
s = result.text;

// Also remove invalid relation if it came back.
s = s.replace(/\n\s*propertyImages:\s*true,\s*/g, "\n");

// Normalize the exact text if still present due CRLF weirdness.
s = s.replace(
  /images:\s*\{\s*orderBy:\s*\[\s*\{\s*isMain:\s*["']desc["']\s*\}\s*,\s*\{\s*sortOrder:\s*["']asc["']\s*\}\s*\]\s*,?\s*\}\s*,\s*images:\s*\{/g,
  "images: {"
);

// If there is a double comma after removal.
s = s.replace(/,\s*,/g, ",");

fs.writeFileSync(file, s, "utf8");

console.log("Stage 76D completed.");
console.log(result.changed ? "Removed duplicate images block by scanner." : "No adjacent duplicate images block found by scanner.");
