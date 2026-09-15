import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export async function GET(_req: Request, ctx: { params: Promise<{ canonicalId: string }> }) {
  const { canonicalId } = await ctx.params;
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT canonicalId,courtId,aktenzeichen,auctionDateTime,caseStatus,baseVersion,baseGate,baseJson,artifactBaseUrl,
            analysisStatus,analysisVersion,analysisJson
     FROM zvg_ai_case WHERE canonicalId=? LIMIT 1`, canonicalId
  );
  if (!rows[0]) return NextResponse.json({ error: "case_not_found" }, { status: 404 });
  const r = rows[0];
  let base = null, analysis = null;
  try { base = r.baseJson ? JSON.parse(r.baseJson) : null; } catch {}
  try { analysis = r.analysisJson ? JSON.parse(r.analysisJson) : null; } catch {}
  return NextResponse.json({
    canonicalId:r.canonicalId,courtId:r.courtId,aktenzeichen:r.aktenzeichen,
    auctionDateTime:r.auctionDateTime,caseStatus:r.caseStatus,
    baseVersion:r.baseVersion,baseGate:r.baseGate,artifactBaseUrl:r.artifactBaseUrl,base,
    analysisStatus:r.analysisStatus,analysisVersion:r.analysisVersion,analysis
  }, { headers: { "Cache-Control": "no-store" } });
}
