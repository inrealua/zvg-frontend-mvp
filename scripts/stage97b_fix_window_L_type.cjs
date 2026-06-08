const fs = require("node:fs");
const path = require("node:path");

const file = path.join(process.cwd(), "components", "MobileMapRepairStage97.tsx");

if (!fs.existsSync(file)) {
  console.error("File not found:", file);
  process.exit(1);
}

let s = fs.readFileSync(file, "utf8");

/**
 * Stage 97B
 *
 * Build error:
 * Subsequent property declarations must have the same type.
 * Property 'L' must be of type 'LeafletNamespace | undefined',
 * but here has type 'unknown'.
 *
 * Reason:
 * Somewhere else in the project Window.L is already declared as LeafletNamespace.
 * Stage97 added Window.L?: unknown, causing a declaration conflict.
 *
 * Fix:
 * Remove the Window.L declaration entirely. The helper does not use window.L.
 */

s = s.replace(
  /declare global\s*\{\s*interface Window\s*\{\s*L\?: unknown;\s*\}\s*\}\s*\n*/s,
  ""
);

// Extra safety: remove any remaining single line L?: unknown declarations.
s = s.replace(/\s*L\?: unknown;\s*/g, "\n");

fs.writeFileSync(file, s, "utf8");
console.log("Stage 97B completed: removed conflicting Window.L declaration.");
