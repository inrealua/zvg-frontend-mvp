const fs = require("node:fs");
const path = require("node:path");

const file = path.join(process.cwd(), "components", "PropertyMap.tsx");

if (!fs.existsSync(file)) {
  console.error("File not found:", file);
  process.exit(1);
}

let s = fs.readFileSync(file, "utf8");

/**
 * Stage 89C
 *
 * Stage 89 inserted invalid strings like:
 *   residential: "{stage89LegendLabel("apartments")}",
 *
 * Stage 89B fixed only `apartments`, but there are more dictionary keys.
 * This script removes ALL invalid `{stage89LegendLabel("...")}` string values
 * inside translation dictionaries and restores safe plain strings.
 */

// Keep use client exactly once at the top.
s = s.replace(/["']use client["'];\s*\n?/g, "");
s = `"use client";\n\n` + s.trimStart();

// Fix every possible bad dictionary assignment produced by Stage89.
const replacements = [
  // German/common keys
  [/residential:\s*"\{stage89LegendLabel\(["']apartments["']\)\}",/g, 'residential: "Wohnhäuser",'],
  [/houses:\s*"\{stage89LegendLabel\(["']apartments["']\)\}",/g, 'houses: "Häuser",'],
  [/apartments:\s*"\{stage89LegendLabel\(["']apartments["']\)\}",/g, 'apartments: "Wohnungen",'],
  [/wohnungen:\s*"\{stage89LegendLabel\(["']apartments["']\)\}",/g, 'wohnungen: "Wohnungen",'],

  // If the bad value was inserted with single quotes.
  [/residential:\s*'\{stage89LegendLabel\(["']apartments["']\)\}',/g, 'residential: "Wohnhäuser",'],
  [/houses:\s*'\{stage89LegendLabel\(["']apartments["']\)\}',/g, 'houses: "Häuser",'],
  [/apartments:\s*'\{stage89LegendLabel\(["']apartments["']\)\}',/g, 'apartments: "Wohnungen",'],

  // Very broad fallback for any dictionary value exactly equal to bad expression.
  [/(\w+):\s*"\{stage89LegendLabel\(["']apartments["']\)\}",/g, '$1: "Wohnungen",'],
  [/(\w+):\s*'\{stage89LegendLabel\(["']apartments["']\)\}',/g, '$1: "Wohnungen",'],
];

for (const [pattern, replacement] of replacements) {
  s = s.replace(pattern, replacement);
}

// Repair common dictionaries more semantically if broad fallback changed keys to Wohnungen.
s = s.replace(/residential:\s*"Wohnungen",/g, 'residential: "Wohnhäuser",');
s = s.replace(/houses:\s*"Wohnungen",/g, 'houses: "Häuser",');

// Fix raw visible literal only in JSX/text between tags.
s = s.replace(/>\s*\$\{escapeHtml\(groupText\)\}\s*</g, '>{stage89LegendLabel("apartments")}<');
s = s.replace(/>\s*\{\s*["'`]\$\{escapeHtml\(groupText\)\}["'`]\s*\}\s*</g, '>{stage89LegendLabel("apartments")}<');

// If helper exists multiple times, remove duplicates after first.
const helperName = "function stage89LegendLabel";
let first = s.indexOf(helperName);
if (first !== -1) {
  let next = s.indexOf(helperName, first + helperName.length);
  while (next !== -1) {
    const open = s.indexOf("{", next);
    if (open === -1) break;

    let depth = 0;
    let quote = null;
    let escaped = false;
    let end = -1;

    for (let i = open; i < s.length; i++) {
      const ch = s[i];

      if (quote) {
        if (escaped) escaped = false;
        else if (ch === "\\") escaped = true;
        else if (ch === quote) quote = null;
        continue;
      }

      if (ch === '"' || ch === "'" || ch === "`") {
        quote = ch;
        continue;
      }

      if (ch === "{") depth++;
      if (ch === "}") {
        depth--;
        if (depth === 0) {
          end = i + 1;
          break;
        }
      }
    }

    if (end === -1) break;

    s = s.slice(0, next) + s.slice(end).replace(/^\s*/, "\n");
    next = s.indexOf(helperName, first + helperName.length);
  }
}

// Final safety check: fail the patch with a readable message if bad code remains.
const bad = s.match(/\w+:\s*["']\{stage89LegendLabel\(["'][^"']+["']\)\}["']/);
if (bad) {
  console.error("Still found invalid dictionary value:", bad[0]);
  process.exit(1);
}

fs.writeFileSync(file, s, "utf8");
console.log("Stage 89C completed: all invalid Stage89 legend replacements fixed.");
