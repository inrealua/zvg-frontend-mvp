import { NextResponse } from "next/server";
import { getTaskPayload } from "@/lib/zvg-ai-queue";
export const dynamic = "force-dynamic";
export async function GET(_req: Request, ctx: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await ctx.params;
  const task = await getTaskPayload(taskId);
  if (!task) return NextResponse.json({ error: "task_not_found" }, { status: 404 });
  return NextResponse.json(task, { headers: { "Cache-Control": "no-store" } });
}
