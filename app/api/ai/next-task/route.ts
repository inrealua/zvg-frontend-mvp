import { NextResponse } from "next/server";
import { getNextTaskPayload } from "@/lib/zvg-ai-queue";
export const dynamic = "force-dynamic";
export async function GET() {
  const data = await getNextTaskPayload();
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
