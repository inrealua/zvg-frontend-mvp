import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function patchFile(rel, updater) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) {
    console.log("skip missing", rel);
    return;
  }

  const before = fs.readFileSync(file, "utf8");
  const after = updater(before);

  if (after !== before) {
    fs.writeFileSync(file, after, "utf8");
    console.log("patched", rel);
  } else {
    console.log("unchanged", rel);
  }
}

/**
 * Stage 68B:
 * Stage 68 regex removed text/content from the cancelled legend item but left an open <span>.
 * That created:
 *
 *   <span>
 * </div>
 *
 * This script:
 * 1) removes empty/broken legend spans;
 * 2) removes the cancelled legend item safely;
 * 3) ensures no dangling <span> remains right before </div></aside>.
 */
for (const rel of ["components/PropertyMap.tsx", "app/components/PropertyMap.tsx"]) {
  patchFile(rel, (s) => {
    // Remove a broken empty span directly before closing the legend div.
    s = s.replace(/\n\s*<span>\s*\n\s*<\/div>\s*\n\s*<\/aside>/g, "\n      </div>\n    </aside>");

    // Remove fully-formed cancelled legend items.
    s = s.replace(/\n\s*<span>\s*<i className=["']legend-dot\s+(?:cancelled|aufgehoben)["']\s*\/>\s*(?:\{stage61MapT\(\)\.cancelled\}|отменено|aufgehoben|cancelled)\s*<\/span>/gi, "");

    // Remove any span that contains cancelled/aufgehoben text.
    s = s.replace(/\n\s*<span>[\s\S]*?(?:stage61MapT\(\)\.cancelled|отменено|aufgehoben|cancelled)[\s\S]*?<\/span>/gi, "");

    // Remove common cancelled legend array entries if any remained.
    s = s.replace(/\n\s*\{[^{}]*(?:key|type|id|value)\s*:\s*["'](?:cancelled|CANCELLED|aufgehoben)["'][^{}]*\},?/g, "");
    s = s.replace(/\n\s*\{[^{}]*label\s*:\s*(?:["'](?:aufgehoben|отменено|cancelled)["']|stage61MapT\(\)\.cancelled)[^{}]*\},?/gi, "");

    return s;
  });
}

console.log("Stage 68B PropertyMap legend fix completed.");
