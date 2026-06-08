const fs = require("node:fs");
const path = require("node:path");

const file = path.join(process.cwd(), "app", "api", "saved-searches", "route.ts");

if (!fs.existsSync(file)) {
  console.error("File not found:", file);
  process.exit(1);
}

let s = fs.readFileSync(file, "utf8");

/**
 * Stage 88B
 *
 * Build error:
 * Property 'url' does not exist on type
 * { filtersUrl?: string; summary?: string; name?: string; }
 *
 * Reason:
 * Stage 88 patched the code that reads body.url/body.query,
 * but the TypeScript type block stayed old.
 *
 * This patch expands the inline body type safely.
 */

s = s.replace(
  /const body = \(await request\.json\(\)\.catch\(\(\) => null\)\) as \{\s*filtersUrl\?: string;\s*summary\?: string;\s*name\?: string;\s*\} \| null;/s,
  `const body = (await request.json().catch(() => null)) as {
    filtersUrl?: string;
    url?: string;
    query?: string;
    summary?: string;
    humanReadableSummary?: string;
    name?: string;
  } | null;`
);

// Fallback if the exact block is formatted slightly differently.
s = s.replace(
  /filtersUrl\?: string;\s*summary\?: string;\s*name\?: string;/,
  `filtersUrl?: string;
    url?: string;
    query?: string;
    summary?: string;
    humanReadableSummary?: string;
    name?: string;`
);

// Also ensure the summary block can compile if Stage88 replacement partially applied.
if (s.includes("body?.humanReadableSummary") && !s.includes("humanReadableSummary?: string")) {
  s = s.replace(
    /query\?: string;\s*summary\?: string;/,
    `query?: string;
    summary?: string;
    humanReadableSummary?: string;`
  );
}

fs.writeFileSync(file, s, "utf8");
console.log("Stage 88B completed: saved-searches route body type fixed.");
