#!/usr/bin/env node
/* eslint-disable no-console */

const { PrismaClient, Prisma } = require("@prisma/client");
const fs = require("node:fs");
const path = require("node:path");

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");

const models = Prisma.dmmf.datamodel.models;

function model(name) {
  return models.find((item) => item.name === name);
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

function addExact(whereOr, fieldName, value) {
  if (hasField("Property", fieldName)) whereOr.push({ [fieldName]: value });
}

function addStartsWith(whereOr, fieldName, value) {
  if (hasField("Property", fieldName)) whereOr.push({ [fieldName]: { startsWith: value } });
}

function addContains(whereOr, fieldName, value) {
  if (hasField("Property", fieldName)) whereOr.push({ [fieldName]: { contains: value } });
}

function propertySelect() {
  const select = { id: true };
  for (const fieldName of [
    "title",
    "address",
    "city",
    "externalId",
    "sourceExternalId",
    "sourceId",
    "source",
    "sourcePortal",
    "importSource",
    "slug",
  ]) {
    if (hasField("Property", fieldName)) select[fieldName] = true;
  }
  return select;
}

async function safeDeleteMany(modelName, propertyId) {
  const delegateName = delegate(modelName);
  if (!model(modelName)) return;
  if (!prisma[delegateName]) return;
  if (!hasField(modelName, "propertyId")) return;
  await prisma[delegateName].deleteMany({ where: { propertyId } }).catch(() => {});
}

function removeAssetFolders(property) {
  const keys = [property.externalId, property.sourceExternalId, property.sourceId].filter(Boolean);
  for (const key of keys) {
    const folder = path.join(process.cwd(), "public", "imports", "zvg-normalized", String(key));
    if (fs.existsSync(folder) && !DRY_RUN) fs.rmSync(folder, { recursive: true, force: true });
  }
}

async function main() {
  const whereOr = [];

  for (const fieldName of ["source", "sourcePortal", "importSource"]) {
    addExact(whereOr, fieldName, "demo");
    addExact(whereOr, fieldName, "seed");
    addExact(whereOr, fieldName, "test");
  }

  for (const fieldName of ["externalId", "sourceExternalId", "sourceId", "slug"]) {
    addStartsWith(whereOr, fieldName, "demo");
    addStartsWith(whereOr, fieldName, "seed");
    addStartsWith(whereOr, fieldName, "test");
    addStartsWith(whereOr, fieldName, "demo_");
    addStartsWith(whereOr, fieldName, "seed_");
    addStartsWith(whereOr, fieldName, "test_");
  }

  if (hasField("Property", "title")) {
    whereOr.push({
      title: {
        in: [
          "Einfamilienhaus mit Grundstück in Chemnitz",
          "Doppelhaushälfte in Wohnlage in Dresden",
          "Mehrfamilienhaus mit Sanierungsbedarf in Leipzig",
          "Eigentumswohnung im Mehrfamilienhaus in Zwickau",
          "Garage / Stellplatz in Berlin",
          "Einfamilienhaus mit Grundstück in Erfurt",
          "Doppelhaushälfte in Dresden",
          "Einfamilienhaus in Chemnitz",
          "Mehrfamilienhaus in Leipzig",
          "Wohnung in Zwickau",
        ],
      },
    });

    if (FORCE) {
      addContains(whereOr, "title", "Demo");
      addContains(whereOr, "title", "Testobjekt");
      addContains(whereOr, "title", "Musterobjekt");
    }
  }

  if (!whereOr.length) {
    console.log("No usable demo/test filters for this Prisma schema.");
    return;
  }

  const rows = await prisma.property.findMany({
    where: { OR: whereOr },
    select: propertySelect(),
  });

  console.log("Matched demo/test objects:", rows.length);

  for (const row of rows) {
    console.log(
      "-",
      row.id,
      row.title || "",
      row.city || "",
      row.externalId || row.sourceExternalId || row.sourceId || row.slug || ""
    );
  }

  if (DRY_RUN) {
    console.log("Dry run only. Nothing was deleted.");
    return;
  }

  for (const row of rows) {
    for (const relationModel of [
      "Favorite",
      "PropertyImage",
      "Image",
      "PropertyPhoto",
      "Photo",
      "PropertyDocument",
      "Document",
      "PropertyFile",
      "File",
      "PropertyTranslation",
      "PropertyStatusHistory",
      "PropertyStatusLog",
      "StatusHistory",
      "PropertyChangeLog",
      "PropertyHistory",
      "SavedProperty",
      "UserFavorite",
      "Note",
      "PropertyNote",
    ]) {
      await safeDeleteMany(relationModel, row.id);
    }

    await prisma.property
      .delete({ where: { id: row.id } })
      .catch(() => prisma.property.deleteMany({ where: { id: row.id } }));

    removeAssetFolders(row);
  }

  console.log("Deleted:", rows.length);
}

main().finally(async () => prisma.$disconnect());
