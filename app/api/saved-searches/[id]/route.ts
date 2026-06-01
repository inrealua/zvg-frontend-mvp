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

export async function PATCH(request: NextRequest, context: SavedSearchRouteContext) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) return noStoreJson({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as { name?: string } | null;
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 120) : "";

  if (!name) {
    return noStoreJson({ error: "Name is required" }, { status: 400 });
  }

  const result = await prisma.savedSearch.updateMany({
    where: {
      id,
      userId: user.id,
    },
    data: {
      name,
    },
  });

  if (result.count === 0) {
    return noStoreJson({ error: "Saved search not found" }, { status: 404 });
  }

  return noStoreJson({ success: true, name });
}

export async function DELETE(request: NextRequest, context: SavedSearchRouteContext) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) return noStoreJson({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  await prisma.savedSearch.deleteMany({ where: { id, userId: user.id } });
  return noStoreJson({ success: true });
}
