import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function patchFile(rel, updater) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    console.log("skip missing", rel);
    return;
  }

  const before = fs.readFileSync(full, "utf8");
  const after = updater(before);

  if (after !== before) {
    fs.writeFileSync(full, after, "utf8");
    console.log("patched", rel);
  } else {
    console.log("unchanged", rel);
  }
}

/**
 * Stage 74B
 *
 * Stage 74 inserted:
 *   import { PropertyGalleryImage } ...
 * before:
 *   "use client";
 *
 * In Next.js the "use client" directive must be the very first statement.
 *
 * This script:
 * 1) removes duplicated/early PropertyGalleryImage imports;
 * 2) moves "use client" to the first line;
 * 3) puts PropertyGalleryImage import after "use client";
 * 4) does the same for PropertyCard if needed.
 */

function fixUseClientAndGalleryImport(source) {
  let s = source;

  // Remove all PropertyGalleryImage imports first.
  s = s.replace(/import\s+\{\s*PropertyGalleryImage\s*\}\s+from\s+["']@\/components\/PropertyGalleryImage["'];?\s*\n/g, "");

  // Remove all "use client" occurrences.
  const hadUseClient = /["']use client["'];/.test(s);
  s = s.replace(/["']use client["'];\s*\n?/g, "");

  // If file uses React hooks / next navigation / gallery client component, it must stay client.
  const needsClient =
    hadUseClient ||
    s.includes("useEffect") ||
    s.includes("useMemo") ||
    s.includes("useRef") ||
    s.includes("useState") ||
    s.includes("usePathname") ||
    s.includes("useRouter") ||
    s.includes("useSearchParams") ||
    s.includes("<PropertyGalleryImage");

  const needsGalleryImport = s.includes("PropertyGalleryImage");

  let prefix = "";
  if (needsClient) prefix += `"use client";\n\n`;
  if (needsGalleryImport) prefix += `import { PropertyGalleryImage } from "@/components/PropertyGalleryImage";\n`;

  return prefix + s.trimStart();
}

for (const rel of [
  "components/PropertyMap.tsx",
  "app/components/PropertyMap.tsx",
  "components/PropertyCard.tsx",
  "app/components/PropertyCard.tsx",
]) {
  patchFile(rel, fixUseClientAndGalleryImport);
}

console.log("Stage 74B completed.");
