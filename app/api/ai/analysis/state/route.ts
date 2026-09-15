import { NextResponse } from "next/server";
import { getAnalysisState } from "@/lib/zvg-ai-analysis";
export const dynamic="force-dynamic";
export async function GET(){
  return NextResponse.json(await getAnalysisState(),{headers:{"Cache-Control":"no-store"}});
}
