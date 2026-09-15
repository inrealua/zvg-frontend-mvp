import { NextResponse } from "next/server";
import { getProjectState } from "@/lib/zvg-ai-queue";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json(await getProjectState(), { headers: { "Cache-Control": "no-store" } });
}
