import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function model(name: string) {
  return Prisma.dmmf.datamodel.models.find((item) => item.name === name);
}

function delegate(name: string) {
  return name.charAt(0).toLowerCase() + name.slice(1);
}

function hasField(modelName: string, fieldName: string) {
  return Boolean(model(modelName)?.fields?.some((field) => field.name === fieldName));
}

async function safeDeleteMany(tx: any, modelName: string, propertyId: string) {
  const delegateName = delegate(modelName);

  if (!model(modelName)) return;
  if (!tx[delegateName]) return;
  if (!hasField(modelName, "propertyId")) return;

  try {
    await tx[delegateName].deleteMany({ where: { propertyId } });
  } catch {}
}

function removeAssetFolders(property: any) {
  const keys = [property?.externalId, property?.sourceExternalId, property?.sourceId].filter(Boolean);

  for (const key of keys) {
    const folder = path.join(process.cwd(), "public", "imports", "zvg-normalized", String(key));
    if (fs.existsSync(folder)) fs.rmSync(folder, { recursive: true, force: true });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const property = await prisma.property.findUnique({ where: { id } });

  if (!property) {
    return NextResponse.json({ ok: false, error: "Object not found" }, { status: 404 });
  }

  await prisma.$transaction(async (tx: any) => {
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
      await safeDeleteMany(tx, relationModel, id);
    }

    await tx.property.delete({ where: { id } });
  });

  removeAssetFolders(property);

  return NextResponse.json({ ok: true });
}
