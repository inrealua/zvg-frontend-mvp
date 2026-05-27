import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromRequest } from "@/lib/user-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type FavoriteRouteContext = {
  params: Promise<{ propertyId: string }>;
};

export async function POST(request: NextRequest, context: FavoriteRouteContext) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { propertyId } = await context.params;
  const property = await prisma.property.findUnique({ where: { id: propertyId }, select: { id: true } });
  if (!property) return NextResponse.json({ error: "Property not found" }, { status: 404 });

  await prisma.favorite.upsert({
    where: { userId_propertyId: { userId: user.id, propertyId } },
    update: {},
    create: { userId: user.id, propertyId }
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest, context: FavoriteRouteContext) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { propertyId } = await context.params;
  await prisma.favorite.deleteMany({ where: { userId: user.id, propertyId } });
  return NextResponse.json({ success: true });
}
