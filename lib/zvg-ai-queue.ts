import { prisma } from "@/lib/prisma";

export type AiTaskRow = {
  taskId: string;
  type: string;
  courtId: string | null;
  status: string;
  sortOrder: number;
  payloadJson: string | null;
  resultKey: string | null;
  resultSha256: string | null;
  createdAt: Date;
  completedAt: Date | null;
};

export async function aiTablesReady() {
  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      "SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name='zvg_ai_project'"
    );
    return Number(rows?.[0]?.c || 0) > 0;
  } catch {
    return false;
  }
}

function isoDateBerlin() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const obj: Record<string,string> = {};
  for (const p of parts) obj[p.type] = p.value;
  return `${obj.year}-${obj.month}-${obj.day}`;
}

export async function ensureMonitoringTasks() {
  if (!(await aiTablesReady())) return;
  const projectRows = await prisma.$queryRawUnsafe<any[]>("SELECT * FROM zvg_ai_project WHERE id='default' LIMIT 1");
  const project = projectRows?.[0];
  if (!project || project.mode !== "MONITORING") return;

  const day = isoDateBerlin();
  const existing = await prisma.$queryRawUnsafe<any[]>(
    "SELECT COUNT(*) AS c FROM zvg_ai_task WHERE type='COURT_MONITOR' AND monitorDate=?",
    day
  );
  if (Number(existing?.[0]?.c || 0) > 0) return;

  const courts = await prisma.$queryRawUnsafe<any[]>(
    "SELECT courtId,courtName,sortOrder FROM zvg_ai_court WHERE baseStatus='BASE_READY' AND monitorEnabled=1 ORDER BY sortOrder,courtName"
  );
  if (!courts.length) return;

  await prisma.$transaction(async (tx) => {
    let n = 0;
    for (const c of courts) {
      const taskId = `monitor-${c.courtId}-${day.replaceAll("-","")}`;
      const status = n === 0 ? "READY" : "WAITING";
      await tx.$executeRawUnsafe(
        `INSERT IGNORE INTO zvg_ai_task
          (taskId,type,courtId,status,sortOrder,payloadJson,monitorDate,createdAt,updatedAt)
         VALUES (?,?,?,?,?,?,?,NOW(),NOW())`,
        taskId, "COURT_MONITOR", c.courtId, status, Number(c.sortOrder || 0), JSON.stringify({
          courtId: c.courtId, courtName: c.courtName, monitorDate: day
        }), day
      );
      n++;
    }
  });
}

export async function getProjectState() {
  if (!(await aiTablesReady())) {
    return {
      installed: false,
      mode: "NOT_INSTALLED",
      nextTask: null,
      stats: {},
      courts: [],
      recentResults: [],
    };
  }

  await ensureMonitoringTasks();

  const [projectRows, nextRows, statRows, courts, recent] = await Promise.all([
    prisma.$queryRawUnsafe<any[]>("SELECT * FROM zvg_ai_project WHERE id='default' LIMIT 1"),
    prisma.$queryRawUnsafe<any[]>(
      "SELECT t.*,c.courtName,c.state FROM zvg_ai_task t LEFT JOIN zvg_ai_court c ON c.courtId=t.courtId WHERE t.status='READY' ORDER BY t.sortOrder,t.createdAt LIMIT 1"
    ),
    prisma.$queryRawUnsafe<any[]>(
      `SELECT
        SUM(status='READY') AS readyCount,
        SUM(status='WAITING') AS waitingCount,
        SUM(status='DONE') AS doneCount,
        SUM(type='COURT_BASE' AND status='DONE') AS baseDone,
        SUM(type='ANALYSIS_BATCH' AND status='DONE') AS analysisDone,
        SUM(type='COURT_MONITOR' AND status='DONE') AS monitorDone
       FROM zvg_ai_task`
    ),
    prisma.$queryRawUnsafe<any[]>(
      `SELECT courtId,courtName,state,sortOrder,baseStatus,baseVersion,baseCaseCount,
              officialTermCount,activeTermCount,cancelledTermCount,enumeratedOfficialRows,
              reconciliationStatus,officialCountCheckedAt,
              analysisDoneCount,analysisTotalCount,lastMonitorAt,monitorEnabled
       FROM zvg_ai_court
       ORDER BY sortOrder,courtName`
    ),
    prisma.$queryRawUnsafe<any[]>(
      `SELECT r.resultId,r.taskId,r.taskType,r.courtId,r.fileName,r.sha256,r.objectCount,r.createdAt
       FROM zvg_ai_result r ORDER BY r.createdAt DESC LIMIT 12`
    ),
  ]);

  const project = projectRows?.[0] || {};
  const next = nextRows?.[0] || null;
  const stats = statRows?.[0] || {};
  return {
    installed: true,
    mode: project.mode,
    registryStatus: project.registryStatus,
    registryCourtCount: Number(project.registryCourtCount || 0),
    promptVersion: project.promptVersion,
    nextTask: next ? {
      taskId: next.taskId,
      type: next.type,
      courtId: next.courtId,
      courtName: next.courtName,
      state: next.state,
      status: next.status,
      taskUrl: `/api/ai/tasks/${encodeURIComponent(next.taskId)}`,
    } : null,
    stats: {
      ready: Number(stats.readyCount || 0),
      waiting: Number(stats.waitingCount || 0),
      done: Number(stats.doneCount || 0),
      baseDone: Number(stats.baseDone || 0),
      analysisDone: Number(stats.analysisDone || 0),
      monitorDone: Number(stats.monitorDone || 0),
    },
    courts: courts.map((c:any) => ({
      ...c,
      baseCaseCount: Number(c.baseCaseCount || 0),
      officialTermCount: c.officialTermCount == null ? null : Number(c.officialTermCount),
      activeTermCount: c.activeTermCount == null ? null : Number(c.activeTermCount),
      cancelledTermCount: c.cancelledTermCount == null ? null : Number(c.cancelledTermCount),
      enumeratedOfficialRows: c.enumeratedOfficialRows == null ? null : Number(c.enumeratedOfficialRows),
      reconciliationStatus: c.reconciliationStatus || null,
      officialCountCheckedAt: c.officialCountCheckedAt || null,
      analysisDoneCount: Number(c.analysisDoneCount || 0),
      analysisTotalCount: Number(c.analysisTotalCount || 0),
      monitorEnabled: Boolean(c.monitorEnabled),
    })),
    recentResults: recent.map((r:any) => ({...r, objectCount:Number(r.objectCount||0)})),
  };
}

export async function getNextTaskPayload() {
  const state = await getProjectState();
  if (!state.installed || !state.nextTask) return { ...state, task: null };
  const task = await getTaskPayload(state.nextTask.taskId);
  return { projectMode: state.mode, task };
}

export async function getTaskPayload(taskId: string) {
  if (!(await aiTablesReady())) return null;
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT t.*,c.courtName,c.state,c.baseVersion,c.baseCaseCount,c.lastMonitorAt
     FROM zvg_ai_task t LEFT JOIN zvg_ai_court c ON c.courtId=t.courtId
     WHERE t.taskId=? LIMIT 1`, taskId
  );
  const t = rows?.[0];
  if (!t) return null;

  let payload:any = {};
  try { payload = t.payloadJson ? JSON.parse(t.payloadJson) : {}; } catch {}

  const common = {
    taskId: t.taskId,
    type: t.type,
    status: t.status,
    courtId: t.courtId,
    courtName: t.courtName,
    state: t.state,
    promptUrl: "https://zvg-de.com/ai/MASTER_PROMPT.md",
    resultNaming: `ZVG_TASK_RESULT_${t.taskId}.zip`,
  };

  if (t.type === "COURT_BASE") {
    return {
      ...common,
      objective: "Create a lightweight primary court BASE. Discover current cases across required sources, cross-source deduplicate, establish core facts/structure/geo/source URLs. Do NOT perform market, rent, renovation or investment analysis.",
      requiredSources: ["zvg-portal.de","zvsachsen.de where applicable","zvg.com","versteigerungspool.de"],
      maxScope: "one court",
      mediaPolicy: "Record original document/photo URLs and provenance. Physical binaries may be included when already available, but deep photo-condition analysis belongs to ANALYSIS_BATCH.",
      outputRequired: {
        rootManifest: "task_result_manifest.json",
        courtManifest: "court_manifest.json",
        objects: "objects/<canonicalId>/base_record.json",
        taskId: t.taskId,
      },
      payload,
    };
  }

  if (t.type === "ANALYSIS_BATCH") {
    const ids:string[] = Array.isArray(payload.canonicalIds) ? payload.canonicalIds : [];
    const caseRows:any[] = [];
    for (const id of ids) {
      const cr = await prisma.$queryRawUnsafe<any[]>(
        `SELECT canonicalId,courtId,aktenzeichen,baseVersion,baseGate,baseJson,artifactBaseUrl
         FROM zvg_ai_case WHERE canonicalId=? LIMIT 1`, id
      );
      if (cr[0]) {
        let base:any = null;
        try { base = JSON.parse(cr[0].baseJson); } catch {}
        caseRows.push({
          canonicalId: cr[0].canonicalId,
          courtId: cr[0].courtId,
          aktenzeichen: cr[0].aktenzeichen,
          baseVersion: cr[0].baseVersion,
          baseGate: cr[0].baseGate,
          artifactBaseUrl: cr[0].artifactBaseUrl,
          base,
        });
      }
    }
    return {
      ...common,
      objective: "Perform full detailed analysis for this small batch only: original evidence review, legal/construction risks, 4 renovation scenarios, current market/rent research, investment model, maximumBid, score, DE/EN/RU.",
      maxObjects: 5,
      canonicalIds: ids,
      cases: caseRows,
      outputRequired: {
        rootManifest: "task_result_manifest.json",
        batchManifest: "batch_result_manifest.json",
        objects: "objects/<canonicalId>/analysis_result.json",
        taskId: t.taskId,
      },
    };
  }

  if (t.type === "COURT_MONITOR") {
    const summaries = await prisma.$queryRawUnsafe<any[]>(
      `SELECT canonicalId,aktenzeichen,auctionDateTime,caseStatus,baseVersion
       FROM zvg_ai_case WHERE courtId=? ORDER BY auctionDateTime,aktenzeichen`,
      t.courtId
    );
    return {
      ...common,
      objective: "Daily lightweight delta check for this court. Return only NEW / UPDATED / CANCELLED / TERMIN_CHANGED / NEW_DOCUMENT / UNCHANGED summary. Do not redo full analysis.",
      previousBaseVersion: t.baseVersion,
      previousCaseCount: Number(t.baseCaseCount || 0),
      lastMonitorAt: t.lastMonitorAt,
      existingCases: summaries,
      outputRequired: {
        rootManifest: "task_result_manifest.json",
        monitorResult: "monitor_result.json",
        taskId: t.taskId,
      },
      payload,
    };
  }

  return {...common, payload};
}
