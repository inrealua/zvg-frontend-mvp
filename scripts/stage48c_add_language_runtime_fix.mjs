import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const layoutPath = path.join(root, "app", "layout.tsx");

if (!fs.existsSync(layoutPath)) {
  console.error("app/layout.tsx not found");
  process.exit(1);
}

let source = fs.readFileSync(layoutPath, "utf8");
const original = source;

if (!source.includes('@/components/LanguageRuntimeFix')) {
  source = 'import { LanguageRuntimeFix } from "@/components/LanguageRuntimeFix";\n' + source;
}

if (!source.includes("<LanguageRuntimeFix />")) {
  source = source.replace("</body>", "        <LanguageRuntimeFix />\n      </body>");
}

if (source !== original) {
  fs.writeFileSync(layoutPath, source, "utf8");
  console.log("patched app/layout.tsx");
} else {
  console.log("app/layout.tsx already patched");
}

console.log("Now run: npm run build");
