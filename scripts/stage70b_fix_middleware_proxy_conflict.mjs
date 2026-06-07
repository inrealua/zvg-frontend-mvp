import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const middlewareTs = path.join(root, "middleware.ts");
const middlewareJs = path.join(root, "middleware.js");

function disable(file) {
  if (!fs.existsSync(file)) return;

  const backup = `${file}.disabled_stage70b`;
  if (!fs.existsSync(backup)) {
    fs.copyFileSync(file, backup);
    console.log("backup created:", path.relative(root, backup));
  }

  fs.rmSync(file);
  console.log("removed:", path.relative(root, file));
}

disable(middlewareTs);
disable(middlewareJs);

console.log("Stage 70B completed. Next.js should now use proxy.ts only.");
