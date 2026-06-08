const fs = require("node:fs");
const path = require("node:path");

const file = path.join(process.cwd(), "components", "TargetedPolishStage90.tsx");

if (!fs.existsSync(file)) {
  console.error("File not found:", file);
  process.exit(1);
}

let s = fs.readFileSync(file, "utf8");

/**
 * Stage 90B
 *
 * Build error:
 *   Expected unicode escape
 *   if (/^\\/(de|ru|en)(\\/|\\?|$)/.test(path))
 *
 * Cause:
 *   Stage90 generated regex literals with too many backslashes.
 *   In a TS/JS regex literal, slash must be escaped as `\/`, not `\\/`.
 *
 * Fix:
 *   Replace over-escaped regex literals with valid ones.
 */

// Main failing line.
s = s.replace(
  /if \(\^?\/\^\\\\\/\(de\|ru\|en\)\(\\\\\/\|\\\\\?\|\$\)\/\.test\(path\)\) return path \+ search;/g,
  'if (/^\\/(de|ru|en)(\\/|\\?|$)/.test(path)) return path + search;'
);

// More direct exact text replacement.
s = s.replace(
  'if (/^\\\\/(de|ru|en)(\\\\/|\\\\?|$)/.test(path)) return path + search;',
  'if (/^\\/(de|ru|en)(\\/|\\?|$)/.test(path)) return path + search;'
);

// Fix common over-escaped slash fragments inside regex literals in this file.
// These replacements are safe for generated Stage90 regexes.
s = s.replace(/\\\\\/\|/g, '\\/|');
s = s.replace(/\|\\\\\/\|/g, '|\\/|');
s = s.replace(/\\\\\/\\\\s/g, '\\/\\s');
s = s.replace(/\\\\s\*\\\\\/\\\\s\*/g, '\\s*\\/\\s*');

// Fix over-escaped question mark inside regex literals.
s = s.replace(/\\\\\?/g, '\\?');

// Fix over-escaped whitespace classes created by Stage90.
// In regex literals, `\\s` is the correct source text for whitespace.
// If the file contains `\\\\s`, reduce it to `\\s`.
s = s.replace(/\\\\\\\\s/g, '\\\\s');
s = s.replace(/\\\\\\\\b/g, '\\\\b');

// Final direct safety check for the known bad pattern.
if (s.includes('/^\\\\/(de|ru|en)(\\\\/|\\\\?|$)/')) {
  console.error("Known bad regex still exists in TargetedPolishStage90.tsx");
  process.exit(1);
}

fs.writeFileSync(file, s, "utf8");
console.log("Stage 90B completed: TargetedPolishStage90 regex fixed.");
