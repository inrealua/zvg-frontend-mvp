import { NextResponse } from "next/server";
import { getProjectState } from "@/lib/zvg-ai-queue";

export const dynamic = "force-dynamic";

export async function GET() {
  const state: any = await getProjectState();

  const body = {
    schema: "zvg-de.next-task.v1",
    generatedAt: new Date().toISOString(),
    projectMode: state?.mode || null,
    registryCourtCount: state?.registryCourtCount ?? null,
    task: state?.nextTask ? {
      taskId: state.nextTask.taskId,
      type: state.nextTask.type,
      courtId: state.nextTask.courtId,
      courtName: state.nextTask.courtName,
      status: "READY",
      taskUrl: `https://zvg-de.com${state.nextTask.taskUrl}`,
      machineTaskUrl: `https://zvg-de.com/api/ai/tasks/${encodeURIComponent(state.nextTask.taskId)}`
    } : null
  };

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=30",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
