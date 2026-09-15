import { prisma } from "@/lib/prisma";
import crypto from "node:crypto";

export const SAXONY_PILOT_COURTS = [
  "ag-chemnitz",
  "ag-zwickau",
  "ag-leipzig",
  "ag-dresden",
  "ag-bautzen",
  "ag-gorlitz",
];

function jsonParse<T=any>(value:any, fallback:T):T {
  try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
}

function nowIso(v:any) {
  if (!v) return null;
  try { return new Date(v).toISOString(); } catch { return String(v); }
}

export async function getAnalysisState() {
  const [projectRows, countRows, workerRows, courtRows, objects] = await Promise.all([
    prisma.$queryRawUnsafe<any[]>(
      "SELECT id,mode,promptVersion,registryCourtCount,updatedAt FROM zvg_ai_project WHERE id='default' LIMIT 1"
    ),
    prisma.$queryRawUnsafe<any[]>(
      `SELECT
         COUNT(*) AS total,
         SUM(analysisStatus='ANALYSIS_REQUIRED') AS requiredCount,
         SUM(analysisStatus='ASSIGNED') AS assignedCount,
         SUM(analysisStatus='ANALYZED') AS analyzedCount,
         SUM(analysisStatus='STALE') AS staleCount,
         SUM(analysisStatus='BLOCKED') AS blockedCount,
         SUM(analysisStatus='NOT_REQUIRED') AS notRequiredCount
       FROM zvg_ai_case
       WHERE courtId IN (${SAXONY_PILOT_COURTS.map(()=>"?").join(",")})`,
      ...SAXONY_PILOT_COURTS
    ),
    prisma.$queryRawUnsafe<any[]>(
      `SELECT workerId,workerName,workerToken,enabled,maxBatchSize,currentTaskId,lastSeenAt,createdAt
       FROM zvg_ai_worker ORDER BY workerId`
    ),
    prisma.$queryRawUnsafe<any[]>(
      `SELECT courtId,courtName,baseStatus,baseCaseCount,
              officialTermCount,activeTermCount,cancelledTermCount,
              reconciliationStatus,officialCountCheckedAt,
              analysisDoneCount,analysisTotalCount
       FROM zvg_ai_court
       WHERE courtId IN (${SAXONY_PILOT_COURTS.map(()=>"?").join(",")})
       ORDER BY sortOrder`,
      ...SAXONY_PILOT_COURTS
    ),
    prisma.$queryRawUnsafe<any[]>(
      `SELECT canonicalId,courtId,aktenzeichen,auctionDateTime,caseStatus,
              baseGate,baseVersion,analysisStatus,analysisVersion,
              analysisWorkerId,analysisTaskId,analysisAssignedAt,analysisCompletedAt,
              publicStatus
       FROM zvg_ai_case
       WHERE courtId IN (${SAXONY_PILOT_COURTS.map(()=>"?").join(",")})
       ORDER BY
         CASE analysisStatus
           WHEN 'STALE' THEN 0
           WHEN 'ANALYSIS_REQUIRED' THEN 1
           WHEN 'ASSIGNED' THEN 2
           WHEN 'BLOCKED' THEN 3
           WHEN 'ANALYZED' THEN 4
           ELSE 5
         END,
         CASE WHEN auctionDateTime IS NULL THEN 1 ELSE 0 END,
         auctionDateTime,
         courtId,aktenzeichen`,
      ...SAXONY_PILOT_COURTS
    ),
  ]);

  const c=countRows?.[0]||{};
  return {
    project: projectRows?.[0] || null,
    counts: {
      total: Number(c.total||0),
      required: Number(c.requiredCount||0),
      assigned: Number(c.assignedCount||0),
      analyzed: Number(c.analyzedCount||0),
      stale: Number(c.staleCount||0),
      blocked: Number(c.blockedCount||0),
      notRequired: Number(c.notRequiredCount||0),
    },
    workers: workerRows.map((w:any)=>({
      workerId:w.workerId,
      workerName:w.workerName,
      workerToken:w.workerToken,
      enabled:Boolean(w.enabled),
      maxBatchSize:Number(w.maxBatchSize||3),
      currentTaskId:w.currentTaskId,
      lastSeenAt:nowIso(w.lastSeenAt),
      url:`https://zvg-de.com/ai/workers/${encodeURIComponent(w.workerToken)}/next-task.json`,
    })),
    courts: courtRows.map((c:any)=>({
      ...c,
      baseCaseCount:Number(c.baseCaseCount||0),
      officialTermCount:c.officialTermCount==null?null:Number(c.officialTermCount),
      activeTermCount:c.activeTermCount==null?null:Number(c.activeTermCount),
      cancelledTermCount:c.cancelledTermCount==null?null:Number(c.cancelledTermCount),
      analysisDoneCount:Number(c.analysisDoneCount||0),
      analysisTotalCount:Number(c.analysisTotalCount||0),
    })),
    objects: objects.map((o:any)=>({
      ...o,
      auctionDateTime:nowIso(o.auctionDateTime),
      analysisAssignedAt:nowIso(o.analysisAssignedAt),
      analysisCompletedAt:nowIso(o.analysisCompletedAt),
    })),
  };
}

async function loadAssignedTask(worker:any) {
  if (!worker.currentTaskId) return null;
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT taskId,type,courtId,status,workerId,payloadJson,createdAt,assignedAt,completedAt
     FROM zvg_ai_task WHERE taskId=? LIMIT 1`, worker.currentTaskId
  );
  const task=rows?.[0];
  if (!task || task.status!=="ASSIGNED") return null;
  return task;
}

function buildTaskId(workerId:string) {
  const ts = new Date().toISOString().replace(/[-:.TZ]/g,"").slice(0,14);
  return `analysis-saxony-${ts}-${workerId}-${crypto.randomBytes(3).toString("hex")}`;
}

async function hydrateTask(task:any, worker:any) {
  const payload:any=jsonParse<any>(task.payloadJson,{});
  const ids:string[]=Array.isArray(payload.canonicalIds)?payload.canonicalIds:[];
  const cases=[];
  for (const id of ids) {
    const rows=await prisma.$queryRawUnsafe<any[]>(
      `SELECT canonicalId,courtId,aktenzeichen,auctionDateTime,caseStatus,baseVersion,baseGate,
              baseJson,artifactBaseUrl,analysisStatus
       FROM zvg_ai_case WHERE canonicalId=? LIMIT 1`, id
    );
    const r=rows?.[0];
    if(!r) continue;
    const base=jsonParse(r.baseJson,null);
    cases.push({
      canonicalId:r.canonicalId,
      courtId:r.courtId,
      aktenzeichen:r.aktenzeichen,
      auctionDateTime:nowIso(r.auctionDateTime),
      caseStatus:r.caseStatus,
      baseVersion:r.baseVersion,
      baseGate:r.baseGate,
      artifactBaseUrl:r.artifactBaseUrl,
      base,
    });
  }
  return {
    schema:"zvg-de.analysis-worker-task.v1",
    taskId:task.taskId,
    taskType:"ANALYSIS_BATCH",
    status:task.status,
    worker:{
      workerId:worker.workerId,
      workerName:worker.workerName,
    },
    promptUrl:"https://zvg-de.com/ai/MASTER_PROMPT.md",
    objectCount:cases.length,
    maxObjects:Number(worker.maxBatchSize||3),
    cases,
    requiredWork:[
      "Read all available original documents; if not stored in artifactBaseUrl, retrieve them from source portals using Aktenzeichen/address and preserve provenance.",
      "Review all relevant original photos.",
      "Resolve BASE conflicts using the evidence hierarchy; do not silently overwrite uncertain facts.",
      "Perform current market and rent research.",
      "Assess construction and legal risks.",
      "Calculate minimal / standard / full / worstCase renovation scenarios.",
      "Build investment model, maximumBid and recommendation.",
      "Prepare public text in DE / EN / RU.",
    ],
    resultContract:{
      zipName:`ZVG_TASK_RESULT_${task.taskId}.zip`,
      rootManifest:"task_result_manifest.json",
      batchManifest:"batch_result_manifest.json",
      objectResult:"objects/<canonicalId>/analysis_result.json",
      exactCanonicalIds:ids,
      taskId:task.taskId,
      taskType:"ANALYSIS_BATCH",
    },
    important:[
      "Do not analyze objects outside exactCanonicalIds.",
      "Do not mark the task done yourself. The task becomes DONE only after the result ZIP is imported.",
      "If evidence is insufficient, use UNKNOWN / VERIFY rather than inventing facts.",
    ]
  };
}

export async function getOrClaimWorkerTask(token:string) {
  const workerRows=await prisma.$queryRawUnsafe<any[]>(
    `SELECT workerId,workerName,workerToken,enabled,maxBatchSize,currentTaskId,lastSeenAt
     FROM zvg_ai_worker WHERE workerToken=? LIMIT 1`, token
  );
  const worker=workerRows?.[0];
  if(!worker || !worker.enabled) return {error:"worker_not_found_or_disabled",status:404};

  await prisma.$executeRawUnsafe(
    "UPDATE zvg_ai_worker SET lastSeenAt=NOW() WHERE workerId=?",worker.workerId
  );

  const existing=await loadAssignedTask(worker);
  if(existing) return {status:200,task:await hydrateTask(existing,worker)};

  // Clear stale currentTaskId pointers before claiming.
  if(worker.currentTaskId){
    await prisma.$executeRawUnsafe(
      "UPDATE zvg_ai_worker SET currentTaskId=NULL WHERE workerId=?",worker.workerId
    );
    worker.currentTaskId=null;
  }

  const result=await prisma.$transaction(async tx=>{
    // Lock worker to prevent duplicate claims from the same token.
    const lockedWorkers=await tx.$queryRawUnsafe<any[]>(
      "SELECT workerId,workerName,workerToken,enabled,maxBatchSize,currentTaskId FROM zvg_ai_worker WHERE workerId=? FOR UPDATE",
      worker.workerId
    );
    const w=lockedWorkers?.[0];
    if(!w || !w.enabled) throw new Error("worker_disabled");

    if(w.currentTaskId){
      const tr=await tx.$queryRawUnsafe<any[]>(
        "SELECT * FROM zvg_ai_task WHERE taskId=? AND status='ASSIGNED' LIMIT 1",w.currentTaskId
      );
      if(tr[0]) return {existingTaskId:w.currentTaskId};
      await tx.$executeRawUnsafe("UPDATE zvg_ai_worker SET currentTaskId=NULL WHERE workerId=?",w.workerId);
    }

    const max=Math.max(1,Math.min(5,Number(w.maxBatchSize||3)));
    const candidates=await tx.$queryRawUnsafe<any[]>(
      `SELECT canonicalId,courtId,auctionDateTime,analysisStatus
       FROM zvg_ai_case
       WHERE courtId IN (${SAXONY_PILOT_COURTS.map(()=>"?").join(",")})
         AND analysisStatus IN ('ANALYSIS_REQUIRED','STALE')
         AND (caseStatus IS NULL OR caseStatus NOT IN ('CANCELLED','AUFGEHOBEN'))
       ORDER BY
         CASE analysisStatus WHEN 'STALE' THEN 0 ELSE 1 END,
         CASE WHEN auctionDateTime IS NULL THEN 1 ELSE 0 END,
         auctionDateTime,
         canonicalId
       LIMIT ?
       FOR UPDATE SKIP LOCKED`,
      ...SAXONY_PILOT_COURTS,max
    );
    if(!candidates.length) return {empty:true};

    const ids=candidates.map((x:any)=>x.canonicalId);
    const courtIds=[...new Set(candidates.map((x:any)=>x.courtId))];
    const taskId=buildTaskId(w.workerId);
    const payload={
      canonicalIds:ids,
      courtIds,
      pilot:"SAXONY",
      assignedTo:w.workerId,
      maxBatchSize:max,
    };
    await tx.$executeRawUnsafe(
      `INSERT INTO zvg_ai_task
       (taskId,type,courtId,status,sortOrder,payloadJson,workerId,assignedAt,createdAt,updatedAt)
       VALUES (?,'ANALYSIS_BATCH',?,'ASSIGNED',0,?,?,NOW(),NOW(),NOW())`,
      taskId,courtIds.length===1?courtIds[0]:null,JSON.stringify(payload),w.workerId
    );

    for(const id of ids){
      await tx.$executeRawUnsafe(
        `UPDATE zvg_ai_case
         SET analysisStatus='ASSIGNED',analysisWorkerId=?,analysisTaskId=?,analysisAssignedAt=NOW(),updatedAt=NOW()
         WHERE canonicalId=?`,
        w.workerId,taskId,id
      );
    }
    await tx.$executeRawUnsafe(
      "UPDATE zvg_ai_worker SET currentTaskId=?,lastSeenAt=NOW() WHERE workerId=?",
      taskId,w.workerId
    );
    return {taskId};
  },{maxWait:10000,timeout:30000});

  if((result as any).empty) return {status:200,task:null,message:"No ANALYSIS_REQUIRED or STALE Saxony objects are currently available."};

  const taskId=(result as any).existingTaskId || (result as any).taskId;
  const tr=await prisma.$queryRawUnsafe<any[]>("SELECT * FROM zvg_ai_task WHERE taskId=? LIMIT 1",taskId);
  const wr=await prisma.$queryRawUnsafe<any[]>(
    `SELECT workerId,workerName,workerToken,enabled,maxBatchSize,currentTaskId,lastSeenAt
     FROM zvg_ai_worker WHERE workerId=? LIMIT 1`,worker.workerId
  );
  return {status:200,task:await hydrateTask(tr[0],wr[0])};
}

export async function releaseAnalysisTask(taskId:string) {
  return await prisma.$transaction(async tx=>{
    const rows=await tx.$queryRawUnsafe<any[]>(
      "SELECT taskId,status,workerId,payloadJson FROM zvg_ai_task WHERE taskId=? FOR UPDATE",taskId
    );
    const t=rows?.[0];
    if(!t) return {ok:false,error:"task_not_found"};
    if(t.status==="DONE") return {ok:false,error:"task_already_done"};
    const payload:any=jsonParse<any>(t.payloadJson,{});
    const ids:string[]=Array.isArray(payload.canonicalIds)?payload.canonicalIds:[];
    for(const id of ids){
      await tx.$executeRawUnsafe(
        `UPDATE zvg_ai_case SET
           analysisStatus=CASE WHEN analysisJson IS NOT NULL THEN 'STALE' ELSE 'ANALYSIS_REQUIRED' END,
           analysisWorkerId=NULL,analysisTaskId=NULL,analysisAssignedAt=NULL,updatedAt=NOW()
         WHERE canonicalId=? AND analysisTaskId=?`,
        id,taskId
      );
    }
    if(t.workerId){
      await tx.$executeRawUnsafe(
        "UPDATE zvg_ai_worker SET currentTaskId=NULL WHERE workerId=? AND currentTaskId=?",
        t.workerId,taskId
      );
    }
    await tx.$executeRawUnsafe(
      "UPDATE zvg_ai_task SET status='RELEASED',updatedAt=NOW() WHERE taskId=?",
      taskId
    );
    return {ok:true,released:ids.length};
  },{maxWait:10000,timeout:30000});
}
