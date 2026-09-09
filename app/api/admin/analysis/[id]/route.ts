import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/admin-auth";

const ALLOWED = new Set(["IMPORTED", "REVIEW", "READY", "PUBLISHED", "ARCHIVED"]);

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const publicationStatus = String(body?.publicationStatus || "").toUpperCase();

  if (!ALLOWED.has(publicationStatus)) {
    return NextResponse.json({ ok: false, error: "Invalid publicationStatus" }, { status: 400 });
  }

  const existing = await prisma.property.findUnique({ where: { id }, select: { id: true, canonicalId: true } });
  if (!existing?.canonicalId) {
    return NextResponse.json({ ok: false, error: "AI/canonical property not found" }, { status: 404 });
  }

  const property = await prisma.property.update({
    where: { id },
    data: { publicationStatus: publicationStatus as any },
    select: { id: true, canonicalId: true, publicationStatus: true },
  });

  return NextResponse.json({ ok: true, property });
}
