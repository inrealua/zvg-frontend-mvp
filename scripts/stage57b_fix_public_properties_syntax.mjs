import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const file = path.join(root, "components", "PublicPropertiesPage.tsx");

if (!fs.existsSync(file)) {
  console.error("File not found:", file);
  process.exit(1);
}

let s = fs.readFileSync(file, "utf8");

const badLine = /\s*const allowedPageSizesV57 = \[12, 24, 48, 96\];\r?\n/;

if (!badLine.test(s)) {
  console.log("No misplaced allowedPageSizesV57 line found.");
  process.exit(0);
}

// Remove the wrongly inserted line from the function parameter destructuring.
s = s.replace(badLine, "\n");

// Insert the constant after the function parameter/type block opening brace.
// This matches:
// export async function PublicPropertiesPage({
//   params,
//   mode,
// }: {
//   params: ...
//   mode: ...
// }) {
const functionStart = /(export\s+async\s+function\s+PublicPropertiesPage\s*\(\s*\{[\s\S]*?\}\s*:\s*\{[\s\S]*?\}\s*\)\s*\{)/;

if (!functionStart.test(s)) {
  console.error("Could not find PublicPropertiesPage function opening. Please paste components/PublicPropertiesPage.tsx.");
  fs.writeFileSync(file, s, "utf8");
  process.exit(1);
}

if (!s.includes("const allowedPageSizesV57 = [12, 24, 48, 96];")) {
  s = s.replace(functionStart, "$1\n  const allowedPageSizesV57 = [12, 24, 48, 96];");
}

fs.writeFileSync(file, s, "utf8");
console.log("Fixed misplaced allowedPageSizesV57 in components/PublicPropertiesPage.tsx");
