import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromRequest } from "@/lib/user-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

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

export async function POST(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) return noStoreJson({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { filtersUrl?: string; summary?: string } | null;
  const filtersUrl = typeof body?.filtersUrl === "string" && body.filtersUrl.startsWith("/") ? body.filtersUrl.slice(0, 2000) : "/";
  const humanReadableSummary = typeof body?.summary === "string" && body.summary.trim() ? body.summary.trim().slice(0, 1000) : "Alle Objekte";
  const filtersHash = crypto.createHash("sha256").update(filtersUrl).digest("hex");

  const existing = await prisma.savedSearch.findUnique({
    where: { userId_filtersHash: { userId: user.id, filtersHash } },
  });

  if (existing) return noStoreJson({ error: "Already saved" }, { status: 409 });

  const savedSearch = await prisma.savedSearch.create({
    data: {
      userId: user.id,
      filtersUrl,
      filtersHash,
      humanReadableSummary,
    },
  });

  return noStoreJson({ success: true, id: savedSearch.id });
}
