const fs = require("node:fs");
const path = require("node:path");

const file = path.join(process.cwd(), "components", "PropertyMap.tsx");

if (!fs.existsSync(file)) {
  console.error("File not found:", file);
  process.exit(1);
}

let s = fs.readFileSync(file, "utf8");

/**
 * Stage 89B
 *
 * Fixes build error from Stage 89:
 *
 * apartments: "{stage89LegendLabel("apartments")}",
 *
 * This is invalid TypeScript because the replacement was inserted inside
 * a string dictionary. Restore dictionary string values and only fix JSX /
 * template literal leftovers safely.
 */

// 1. Fix invalid dictionary strings caused by Stage89.
s = s.replace(/apartments:\s*"\{stage89LegendLabel\("apartments"\)\}",/g, 'apartments: "Wohnungen",');
s = s.replace(/apartments:\s*'\{stage89LegendLabel\("apartments"\)\}',/g, 'apartments: "Wohnungen",');

// If the same bad value appeared in other language dictionaries, keep language-specific values.
s = s.replace(/apartments:\s*"\{stage89LegendLabel\('apartments'\)\}",/g, 'apartments: "Wohnungen",');

// 2. Fix raw broken literal in JSX/text if present, not dictionary values.
s = s.replace(/>\s*\$\{escapeHtml\(groupText\)\}\s*</g, '>{stage89LegendLabel("apartments")}<');
s = s.replace(/>\s*\{\s*["'`]\$\{escapeHtml\(groupText\)\}["'`]\s*\}\s*</g, '>{stage89LegendLabel("apartments")}<');

// 3. If Stage89 helper was inserted at the top before "use client", move use client to top.
s = s.replace(/["']use client["'];\s*\n?/g, "");
s = `"use client";\n\n` + s.trimStart();

// 4. If helper exists before imports, it is still OK after "use client"; keep it.
// But remove duplicate "use client" if any.
s = s.replace(/^"use client";\s*\n\s*"use client";\s*/g, '"use client";\n\n');

fs.writeFileSync(file, s, "utf8");
console.log("Stage 89B completed: PropertyMap legend syntax fixed.");
