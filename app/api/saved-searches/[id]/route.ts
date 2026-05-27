import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-auth";

type SavedSearchRouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: NextRequest, context: SavedSearchRouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  await prisma.savedSearch.deleteMany({ where: { id, userId: user.id } });
  return NextResponse.json({ success: true });
}
