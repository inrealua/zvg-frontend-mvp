import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromRequest } from "@/lib/user-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

type FavoriteRouteContext = {
  params: Promise<{ propertyId: string }>;
};

function noStoreJson(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
      Vary: "Cookie",
      ...(init?.headers || {}),
    },
  });
}

export async function POST(request: NextRequest, context: FavoriteRouteContext) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) return noStoreJson({ error: "Unauthorized" }, { status: 401 });

  const { propertyId } = await context.params;
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { id: true },
  });

  if (!property) return noStoreJson({ error: "Property not found" }, { status: 404 });

  await prisma.favorite.upsert({
    where: { userId_propertyId: { userId: user.id, propertyId } },
    update: {},
    create: { userId: user.id, propertyId },
  });

  return noStoreJson({ success: true });
}

export async function PATCH(request: NextRequest, context: FavoriteRouteContext) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) return noStoreJson({ error: "Unauthorized" }, { status: 401 });

  const { propertyId } = await context.params;
  const body = (await request.json().catch(() => null)) as { note?: string } | null;
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 2000) : "";

  await prisma.favorite.updateMany({
    where: {
      userId: user.id,
      propertyId,
    },
    data: {
      note: note || null,
    },
  });

  return noStoreJson({ success: true, note });
}

export async function DELETE(request: NextRequest, context: FavoriteRouteContext) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) return noStoreJson({ error: "Unauthorized" }, { status: 401 });

  const { propertyId } = await context.params;
  await prisma.favorite.deleteMany({ where: { userId: user.id, propertyId } });
  return noStoreJson({ success: true });
}
