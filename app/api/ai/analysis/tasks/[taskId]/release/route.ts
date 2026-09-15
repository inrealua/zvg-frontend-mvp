import { NextResponse } from "next/server";
import { releaseAnalysisTask } from "@/lib/zvg-ai-analysis";

export const dynamic="force-dynamic";

export async function POST(req:Request,ctx:{params:Promise<{taskId:string}>}){
  const {taskId}=await ctx.params;
  const result=await releaseAnalysisTask(taskId);
  const accept=req.headers.get("accept")||"";
  if(accept.includes("text/html")){
    return NextResponse.redirect(new URL("/ai/analysis",req.url),303);
  }
  return NextResponse.json(result,{status:result.ok?200:400});
}
