const fs = require("node:fs");
const path = require("node:path");

const file = path.join(process.cwd(), "app", "cabinet", "page.tsx");

if (!fs.existsSync(file)) {
  console.error("File not found:", file);
  process.exit(1);
}

let s = fs.readFileSync(file, "utf8");

/**
 * Stage 109C
 *
 * Stage109B accidentally inserted literal backslash-n text into TSX:
 *   return (\n    <>\n      <div ...
 *
 * In TSX source, that must be real newlines, not the two characters "\" and "n".
 */

// Fix the exact broken return prefix.
s = s.replace(/return \(\s*\\n\s*<>\s*\\n/g, "return (\n    <>\n");

// Fix any remaining literal \n sequences around the fragment that were inserted as text.
s = s.replace(/\\n\s*<>\s*\\n/g, "\n    <>\n");
s = s.replace(/\\n\s*<\/>\s*\\n/g, "\n    </>\n");

// If literal \n appears immediately before JSX tags in this area, convert to newlines.
s = s.replace(/\\n(\s*<div className="cabinet-admin-action-wrap-stage109")/g, "\n$1");
s = s.replace(/\\n(\s*<main className="cabinet-page)/g, "\n$1");
s = s.replace(/\\n(\s*<\/main>)/g, "\n$1");

// Ensure fragment closing exists if admin wrapper and main are both returned.
if (s.includes("cabinet-admin-action-wrap-stage109") && s.includes('<main className="cabinet-page')) {
  const returnIdx = s.indexOf("return (");
  const mainIdx = s.indexOf('<main className="cabinet-page', returnIdx);

  if (returnIdx !== -1 && mainIdx !== -1) {
    const between = s.slice(returnIdx, mainIdx);
    if (!between.includes("<>")) {
      s = s.slice(0, returnIdx) + s.slice(returnIdx).replace(/return\s*\(/, "return (\n    <>");
    }
  }

  if (!s.includes("</>\n  );") && !s.includes("</>\r\n  );")) {
    s = s.replace(/(\n\s*<\/main>\s*)\n\s*\);/, "$1\n    </>\n  );");
  }
}

// Safety check.
if (s.includes("return (\\n")) {
  console.error("Still found literal return (\\n in app/cabinet/page.tsx");
  process.exit(1);
}

fs.writeFileSync(file, s, "utf8");
console.log("Stage 109C completed: literal newline sequences fixed.");
