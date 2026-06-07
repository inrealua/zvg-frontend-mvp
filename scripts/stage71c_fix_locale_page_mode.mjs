import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function file(rel) {
  return path.join(root, rel);
}

function patchFile(rel, updater) {
  const full = file(rel);
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

function detectMainPageMode() {
  const appPage = file("app/page.tsx");
  if (fs.existsSync(appPage)) {
    const s = fs.readFileSync(appPage, "utf8");
    const m = s.match(/<PublicPropertiesPage[^>]*\s+mode=["']([^"']+)["']/);
    if (m?.[1]) return m[1];
  }

  const publicPage = file("components/PublicPropertiesPage.tsx");
  if (fs.existsSync(publicPage)) {
    const s = fs.readFileSync(publicPage, "utf8");

    const modeType = s.match(/type\s+PageMode\s*=\s*([^;]+);/);
    if (modeType?.[1]) {
      const modes = Array.from(modeType[1].matchAll(/["']([^"']+)["']/g)).map((x) => x[1]);
      for (const preferred of ["objects", "search", "list", "map", "archive"]) {
        if (modes.includes(preferred)) return preferred;
      }
      if (modes[0]) return modes[0];
    }
  }

  return "objects";
}

const mode = detectMainPageMode();
console.log("Using locale page mode:", mode);

for (const rel of [
  "app/[locale]/page.tsx",
  "app/ru/page.tsx",
  "app/de/page.tsx",
  "app/en/page.tsx",
]) {
  patchFile(rel, (s) => {
    s = s.replace(/mode=["']home["']/g, `mode="${mode}"`);
    return s;
  });
}

console.log("Stage 71C completed.");
