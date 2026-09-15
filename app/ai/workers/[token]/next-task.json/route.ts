import { NextResponse } from "next/server";
import { getOrClaimWorkerTask } from "@/lib/zvg-ai-analysis";

export const dynamic="force-dynamic";

export async function GET(_req:Request,ctx:{params:Promise<{token:string}>}){
  const {token}=await ctx.params;
  const result:any=await getOrClaimWorkerTask(token);
  if(result?.error){
    return NextResponse.json({error:result.error},{status:result.status||400,headers:{"Cache-Control":"no-store"}});
  }
  return NextResponse.json(result,{headers:{
    "Cache-Control":"no-store",
    "Access-Control-Allow-Origin":"*"
  }});
}
