const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const here = __dirname;
const packageRoot = path.resolve(__dirname, "..");

function copyDir(src, dst) {
  if (!fs.existsSync(src)) {
    console.error("Source not found:", src);
    process.exit(1);
  }
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else {
      fs.mkdirSync(path.dirname(d), { recursive: true });
      fs.copyFileSync(s, d);
      console.log("copied", path.relative(root, d));
    }
  }
}

copyDir(path.join(packageRoot, "scripts"), path.join(root, "scripts"));
copyDir(path.join(packageRoot, "public"), path.join(root, "public"));
copyDir(path.join(packageRoot, "docs"), path.join(root, "docs"));

console.log("");
console.log("Stage126 installed into:", root);
console.log("");
console.log("Run:");
console.log("  node .\\scripts\\repair_imported_properties_from_normalized.cjs --input=.\\normalized --dry-run --limit=5");
