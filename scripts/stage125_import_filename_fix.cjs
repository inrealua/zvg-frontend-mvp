const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const target = path.join(root, "scripts", "import_normalized_zvg_to_db.cjs");

if (!fs.existsSync(target)) {
  console.error("Not found:", target);
  process.exit(1);
}

let s = fs.readFileSync(target, "utf8");

if (!s.includes("STAGE125_IMPORT_FILENAME_FIX")) {
  const patch = String.raw`

// STAGE125_IMPORT_FILENAME_FIX
// Fix: media/document model has required filename:String.
// Previous importer created document with only propertyId + url.
// This patch wraps upsertMedia and guarantees filename/originalName/mimeType where fields exist.

function stage125FileNameFromItem(item, url, bucket) {
  if (item && item.sourceFile) return String(item.sourceFile);
  if (item && item.fileName) return String(item.fileName);
  if (item && item.localPath) return String(item.localPath).replace(/\\/g, "/").split("/").pop();
  if (url) return String(url).split("/").pop();
  return bucket === "images" ? "image.jpg" : "document.pdf";
}

function stage125MimeType(filename, bucket) {
  const f = String(filename || "").toLowerCase();
  if (f.endsWith(".pdf")) return "application/pdf";
  if (f.endsWith(".png")) return "image/png";
  if (f.endsWith(".webp")) return "image/webp";
  if (f.endsWith(".gif")) return "image/gif";
  if (f.endsWith(".jpg") || f.endsWith(".jpeg")) return "image/jpeg";
  return bucket === "images" ? "image/jpeg" : "application/octet-stream";
}

function stage125MediaData(modelName, propertyId, item, n, objectDir, bucket) {
  const url = copyToPublic(objectDir, item.localPath, n?.source?.externalId, bucket);
  if (!url) return null;

  const filename = stage125FileNameFromItem(item, url, bucket);
  const mimeType = stage125MimeType(filename, bucket);

  return pick(modelName, {
    propertyId,
    url,
    src: url,
    path: url,
    localPath: url,

    filename,
    fileName: filename,
    originalName: filename,
    originalFilename: filename,
    name: item.title || item.caption || filename,
    title: item.title || item.caption || filename,

    mimeType,
    contentType: mimeType,

    isMain: Boolean(item.isMain),
    main: Boolean(item.isMain),
    sortOrder: item.sortOrder || 0,
    position: item.sortOrder || 0,
    caption: item.caption,
    alt: item.caption || n?.property?.title,
    type: item.type || (bucket === "images" ? "IMAGE" : "OTHER"),
    sourceFile: item.sourceFile,
    sha1: item.sha1,
    hash: item.sha1,
  });
}

upsertMedia = async function stage125UpsertMedia(modelName, propertyId, items, n, objectDir, bucket) {
  if (!modelName || !propertyId || String(propertyId).startsWith("dry-")) return { model: modelName, count: 0 };
  const del = prisma[delegate(modelName)], f = fieldSet(modelName);
  let count = 0;

  for (const item of items || []) {
    const data = stage125MediaData(modelName, propertyId, item, n, objectDir, bucket);
    if (!data) continue;

    if (DRY_RUN) {
      count++;
      continue;
    }

    const or = [];
    if (f.has("url") && data.url) or.push({ url: data.url });
    if (f.has("src") && data.src) or.push({ src: data.src });
    if (f.has("filename") && data.filename) or.push({ filename: data.filename });
    if (f.has("fileName") && data.fileName) or.push({ fileName: data.fileName });
    if (f.has("sha1") && item.sha1) or.push({ sha1: item.sha1 });
    if (f.has("hash") && item.sha1) or.push({ hash: item.sha1 });

    const where = { propertyId };
    if (or.length) where.OR = or;

    const ex = await del.findFirst({ where });
    if (ex) await del.update({ where: { id: ex.id }, data });
    else await del.create({ data });

    count++;
  }

  return { model: modelName, count };
};

`;

  // Insert before findFiles so overridden function is used by main().
  s = s.replace(/\nfunction findFiles\(root\) \{/, patch + "\nfunction findFiles(root) {");
}

fs.writeFileSync(target, s, "utf8");
console.log("patched", target);
console.log("");
console.log("Run dry first:");
console.log("  $env:ZVG_DRY_RUN='1'");
console.log("  node .\\scripts\\import_normalized_zvg_to_db.cjs --input=.\\normalized --limit=3 --dry-run");
console.log("");
console.log("Then real import:");
console.log("  Remove-Item Env:ZVG_DRY_RUN -ErrorAction SilentlyContinue");
console.log("  node .\\scripts\\import_normalized_zvg_to_db.cjs --input=.\\normalized");
