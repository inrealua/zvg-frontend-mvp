#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(process.cwd(), "normalized");

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) out.push(...walk(full));
    else if (item.isFile() && item.name === "normalized.json") out.push(full);
  }
  return out;
}

const files = walk(root);
const rows = [];

for (const file of files) {
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    const images = Array.isArray(data.images) ? data.images.length : 0;
    const docs = Array.isArray(data.documents) ? data.documents.length : 0;
    const status = data.auction?.wertgrenzenStatus;
    const removed = data.auction?.wertgrenzenWeggefallen;
    rows.push({
      file,
      externalId: data.source?.externalId || "",
      az: data.case?.normalizedAktenzeichen || data.case?.aktenzeichen || "",
      title: data.property?.title || "",
      wertgrenzenStatus: status,
      wertgrenzenWeggefallen: removed,
      images,
      documents: docs,
      warnings: data.quality?.warnings || [],
    });
  } catch (e) {
    rows.push({ file, error: e.message });
  }
}

const summary = {
  count: rows.length,
  removed: rows.filter((r) => r.wertgrenzenStatus === "REMOVED" || r.wertgrenzenWeggefallen === true).length,
  active: rows.filter((r) => r.wertgrenzenStatus === "ACTIVE" || r.wertgrenzenWeggefallen === false).length,
  noImages: rows.filter((r) => r.images === 0).length,
  withImages: rows.filter((r) => r.images > 0).length,
};

fs.writeFileSync("stage134_quality_audit.json", JSON.stringify({ summary, rows }, null, 2), "utf8");

console.log(summary);
console.log("Report: stage134_quality_audit.json");
console.log("");
console.log("Objects without images:");
rows.filter((r) => r.images === 0).slice(0, 30).forEach((r) => {
  console.log("-", r.az, "|", r.externalId, "|", r.title);
});
