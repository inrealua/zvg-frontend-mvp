import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromRequest } from "@/lib/user-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

type SavedSearchRouteContext = {
  params: Promise<{ id: string }>;
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

export async function DELETE(request: NextRequest, context: SavedSearchRouteContext) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) return noStoreJson({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  await prisma.savedSearch.deleteMany({ where: { id, userId: user.id } });
  return noStoreJson({ success: true });
}
