#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { PrismaClient, Prisma } = require("@prisma/client");
const { S3Client, PutObjectCommand, HeadObjectCommand } = require("@aws-sdk/client-s3");

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const FORCE = args.includes("--force");
const LIMIT_ARG = args.find((x) => x.startsWith("--limit="));
const LIMIT = LIMIT_ARG ? Number(LIMIT_ARG.split("=")[1]) || 0 : 0;

const LOCAL_ROOT = path.resolve(process.cwd(), "public", "imports", "zvg-normalized");

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || "";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || "";
const R2_BUCKET = process.env.R2_BUCKET || "";
const R2_PUBLIC_BASE_URL = (process.env.R2_PUBLIC_BASE_URL || "").replace(/\/+$/, "");

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !R2_PUBLIC_BASE_URL) {
  console.error("");
  console.error("Missing R2 env variables. Required:");
  console.error("  R2_ACCOUNT_ID");
  console.error("  R2_ACCESS_KEY_ID");
  console.error("  R2_SECRET_ACCESS_KEY");
  console.error("  R2_BUCKET");
  console.error("  R2_PUBLIC_BASE_URL");
  console.error("");
  process.exit(1);
}

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const dmmfModels = Prisma.dmmf.datamodel.models;

function model(name) {
  return dmmfModels.find((item) => item.name === name);
}

function delegate(name) {
  return name.charAt(0).toLowerCase() + name.slice(1);
}

function fields(modelName) {
  return new Set((model(modelName)?.fields || []).map((field) => field.name));
}

function hasField(modelName, fieldName) {
  return fields(modelName).has(fieldName);
}

function firstModel(names) {
  return names.find((name) => model(name) && prisma[delegate(name)]);
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  if (ext === ".svg") return "image/svg+xml";
  return "application/octet-stream";
}

function sha1File(filePath) {
  const hash = crypto.createHash("sha1");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

function walkFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) out.push(...walkFiles(full));
    else if (item.isFile()) out.push(full);
  }
  return out;
}

function r2KeyForFile(filePath) {
  return path.relative(path.join(process.cwd(), "public", "imports"), filePath).replace(/\\/g, "/");
}

function publicUrlForKey(key) {
  return `${R2_PUBLIC_BASE_URL}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

async function existsInR2(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function uploadFile(filePath, key) {
  const stat = fs.statSync(filePath);
  const type = contentType(filePath);

  if (!FORCE && await existsInR2(key)) {
    return { uploaded: false, skipped: true, size: stat.size };
  }

  if (DRY_RUN) {
    return { uploaded: false, dryRun: true, size: stat.size };
  }

  await s3.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: fs.createReadStream(filePath),
    ContentType: type,
    CacheControl: type.startsWith("image/") ? "public, max-age=31536000, immutable" : "public, max-age=86400",
  }));

  return { uploaded: true, size: stat.size };
}

async function updateMediaUrl(modelName, localUrl, remoteUrl, filePath) {
  if (!modelName) return { model: null, updated: 0 };
  const d = delegate(modelName);
  const f = fields(modelName);
  const whereOr = [];

  for (const field of ["url", "src", "path", "fileUrl", "imageUrl", "localPath"]) {
    if (f.has(field)) whereOr.push({ [field]: localUrl });
  }

  const filename = path.basename(filePath);
  if (f.has("filename")) whereOr.push({ filename });
  if (f.has("fileName")) whereOr.push({ fileName: filename });

  if (!whereOr.length) return { model: modelName, updated: 0, reason: "no-url-fields" };

  const data = {};
  for (const field of ["url", "src", "path", "fileUrl", "imageUrl"]) {
    if (f.has(field)) data[field] = remoteUrl;
  }
  if (f.has("localPath")) data.localPath = remoteUrl;

  const rows = await prisma[d].findMany({ where: { OR: whereOr }, select: { id: true } });
  if (!rows.length) return { model: modelName, updated: 0 };

  if (!DRY_RUN) {
    for (const row of rows) {
      await prisma[d].update({ where: { id: row.id }, data });
    }
  }

  return { model: modelName, updated: rows.length };
}

async function main() {
  if (!fs.existsSync(LOCAL_ROOT)) {
    console.error("Local folder does not exist:", LOCAL_ROOT);
    process.exit(1);
  }

  const imageModel = firstModel(["PropertyImage", "Image", "PropertyPhoto", "Photo"]);
  const documentModel = firstModel(["PropertyDocument", "Document", "PropertyFile", "File"]);

  const allFiles = walkFiles(LOCAL_ROOT);
  const files = LIMIT > 0 ? allFiles.slice(0, LIMIT) : allFiles;

  const report = {
    at: new Date().toISOString(),
    dryRun: DRY_RUN,
    force: FORCE,
    localRoot: LOCAL_ROOT,
    bucket: R2_BUCKET,
    publicBaseUrl: R2_PUBLIC_BASE_URL,
    totalFiles: files.length,
    uploaded: 0,
    skipped: 0,
    failed: 0,
    dbImageUpdates: 0,
    dbDocumentUpdates: 0,
    items: [],
  };

  console.log("[r2] files:", files.length, "dry:", DRY_RUN, "bucket:", R2_BUCKET);
  console.log("[db] image model:", imageModel || "-", "document model:", documentModel || "-");

  for (const filePath of files) {
    try {
      const key = r2KeyForFile(filePath);
      const remoteUrl = publicUrlForKey(key);
      const localUrl = "/" + path.relative(path.join(process.cwd(), "public"), filePath).replace(/\\/g, "/");
      const isDocument = /\/documents\//i.test(key) || /\.pdf$/i.test(filePath);
      const isImage = /\/images\//i.test(key) || /\.(jpe?g|png|webp|gif|svg)$/i.test(filePath);

      const upload = await uploadFile(filePath, key);

      if (upload.uploaded) report.uploaded++;
      else report.skipped++;

      let db = { updated: 0 };
      if (isDocument) {
        db = await updateMediaUrl(documentModel, localUrl, remoteUrl, filePath);
        report.dbDocumentUpdates += db.updated || 0;
      } else if (isImage) {
        db = await updateMediaUrl(imageModel, localUrl, remoteUrl, filePath);
        report.dbImageUpdates += db.updated || 0;
      }

      report.items.push({
        ok: true,
        key,
        localUrl,
        remoteUrl,
        size: upload.size,
        uploaded: upload.uploaded,
        skipped: upload.skipped,
        dryRun: upload.dryRun,
        db,
      });

      console.log("[ok]", key, "=>", remoteUrl, "db:", db.updated || 0);
    } catch (error) {
      report.failed++;
      report.items.push({ ok: false, filePath, error: error.message });
      console.error("[failed]", filePath, error.message);
    }
  }

  const reportPath = path.join(process.cwd(), "r2_upload_report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

  console.log("");
  console.log("[report]", reportPath);
  console.log("[uploaded]", report.uploaded);
  console.log("[skipped]", report.skipped);
  console.log("[failed]", report.failed);
  console.log("[db images updated]", report.dbImageUpdates);
  console.log("[db documents updated]", report.dbDocumentUpdates);
}

main().finally(async () => {
  await prisma.$disconnect();
});
