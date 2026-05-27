import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromRequest } from "@/lib/user-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SavedSearchRouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(request: NextRequest, context: SavedSearchRouteContext) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  await prisma.savedSearch.deleteMany({ where: { id, userId: user.id } });
  return NextResponse.json({ success: true });
}
