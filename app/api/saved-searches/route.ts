import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromRequest } from "@/lib/user-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null) as { filtersUrl?: string; summary?: string } | null;
  const filtersUrl = typeof body?.filtersUrl === "string" && body.filtersUrl.startsWith("/") ? body.filtersUrl.slice(0, 2000) : "/";
  const humanReadableSummary = typeof body?.summary === "string" && body.summary.trim() ? body.summary.trim().slice(0, 1000) : "Все объекты";
  const filtersHash = crypto.createHash("sha256").update(filtersUrl).digest("hex");

  const existing = await prisma.savedSearch.findUnique({ where: { userId_filtersHash: { userId: user.id, filtersHash } } });
  if (existing) return NextResponse.json({ error: "Already saved" }, { status: 409 });

  const savedSearch = await prisma.savedSearch.create({
    data: {
      userId: user.id,
      filtersUrl,
      filtersHash,
      humanReadableSummary
    }
  });

  return NextResponse.json({ success: true, id: savedSearch.id });
}
