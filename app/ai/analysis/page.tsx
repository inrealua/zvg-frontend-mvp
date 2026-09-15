import { getAnalysisState } from "@/lib/zvg-ai-analysis";

export const dynamic = "force-dynamic";

const card:React.CSSProperties={
  border:"1px solid #d9e2dc",borderRadius:16,padding:18,background:"#fff",
  boxShadow:"0 8px 30px rgba(30,60,45,.05)"
};
const cell:React.CSSProperties={padding:"9px 8px",borderBottom:"1px solid #edf2ef",verticalAlign:"top"};
const badge=(s:string):React.CSSProperties=>({
  display:"inline-block",padding:"4px 8px",borderRadius:999,fontSize:11,fontWeight:800,
  background:
    s==="ANALYZED"?"#e9f7ef":
    s==="ASSIGNED"?"#fff3d6":
    s==="STALE"?"#ffe8e8":
    s==="BLOCKED"?"#f2e8ff":
    s==="ANALYSIS_REQUIRED"?"#eaf0ff":"#f2f4f3"
});

export default async function AnalysisPage(){
  const s:any=await getAnalysisState();
  return <main style={{maxWidth:1500,margin:"0 auto",padding:"36px 20px 70px"}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:18,alignItems:"flex-end",flexWrap:"wrap"}}>
      <div>
        <div style={{fontSize:12,fontWeight:850,letterSpacing:".12em",color:"#557062"}}>ZVG-DE · SAXONY PILOT</div>
        <h1 style={{fontSize:36,margin:"7px 0"}}>Analysis queue</h1>
        <div style={{color:"#697970"}}>Project mode: <b>{s.project?.mode||"—"}</b> · batch default: 3 objects</div>
      </div>
      <a href="/ai/" style={{fontWeight:800}}>← AI Control</a>
    </div>

    <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:12,marginTop:24}}>
      {[
        ["Needs analysis",s.counts.required],
        ["Assigned",s.counts.assigned],
        ["Analyzed",s.counts.analyzed],
        ["Stale",s.counts.stale],
        ["Blocked",s.counts.blocked],
        ["Not required",s.counts.notRequired],
      ].map(([k,v])=><div key={String(k)} style={card}><div style={{fontSize:12,color:"#6c7a73",fontWeight:800}}>{k}</div><div style={{fontSize:28,fontWeight:900,marginTop:5}}>{v}</div></div>)}
    </section>

    <section style={{...card,marginTop:22}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}>
        <h2 style={{margin:0}}>Workers</h2>
        <div style={{color:"#697970"}}>Each successful import rotates that worker's URL</div>
      </div>
      <div style={{overflowX:"auto",marginTop:12}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr>{["Worker","Batch","Current task","Status","Current Worker URL"].map(x=><th key={x} style={{...cell,textAlign:"left"}}>{x}</th>)}</tr></thead>
          <tbody>{s.workers.map((w:any)=><tr key={w.workerId}>
            <td style={cell}><b>{w.workerName}</b><div style={{fontSize:11,color:"#77857d"}}>{w.workerId}</div></td>
            <td style={cell}>{w.maxBatchSize}</td>
            <td style={cell}>{w.currentTaskId||"—"}</td>
            <td style={cell}>{w.enabled?"ENABLED":"DISABLED"}</td>
            <td style={cell}><a href={w.url} style={{wordBreak:"break-all"}}>{w.url}</a></td>
          </tr>)}</tbody>
        </table>
      </div>
      <p style={{color:"#6b7972",marginBottom:0,fontSize:13}}>
        While a batch is ASSIGNED, reopening its URL returns the same task. After successful import or Release, the worker token rotates and this page shows a NEW URL for the next cycle. The previous URL becomes invalid.
      </p>
    </section>

    <section style={{...card,marginTop:22}}>
      <h2 style={{marginTop:0}}>Saxony courts</h2>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr>{["Court","BASE cases","Official","Active","Cancelled","Reconciliation","Analyzed"].map(x=><th key={x} style={{...cell,textAlign:"left"}}>{x}</th>)}</tr></thead>
          <tbody>{s.courts.map((c:any)=><tr key={c.courtId}>
            <td style={cell}><b>{c.courtName}</b><div style={{fontSize:11,color:"#77857d"}}>{c.courtId}</div></td>
            <td style={cell}>{c.baseCaseCount}</td>
            <td style={cell}>{c.officialTermCount??"—"}</td>
            <td style={cell}>{c.activeTermCount??"—"}</td>
            <td style={cell}>{c.cancelledTermCount??"—"}</td>
            <td style={cell}>{c.reconciliationStatus||"VERIFY"}</td>
            <td style={cell}>{c.analysisDoneCount}/{c.analysisTotalCount||0}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </section>

    <section style={{...card,marginTop:22}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}>
        <h2 style={{margin:0}}>Objects</h2>
        <div style={{color:"#697970"}}>{s.objects.length} BASE objects in Saxony pilot</div>
      </div>
      <div style={{overflow:"auto",maxHeight:760,marginTop:12}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead style={{position:"sticky",top:0,background:"#fff",zIndex:1}}>
            <tr>{["Court","Aktenzeichen","Termin","BASE","Analysis","Worker / task","Action"].map(x=><th key={x} style={{...cell,textAlign:"left"}}>{x}</th>)}</tr>
          </thead>
          <tbody>{s.objects.map((o:any)=><tr key={o.canonicalId}>
            <td style={cell}>{o.courtId.replace("ag-","")}</td>
            <td style={cell}><b>{o.aktenzeichen||"—"}</b><div style={{fontSize:10,color:"#849088"}}>{o.canonicalId}</div></td>
            <td style={cell}>{o.auctionDateTime?String(o.auctionDateTime).slice(0,16).replace("T"," "):"—"}<div style={{fontSize:10,color:"#849088"}}>{o.caseStatus||""}</div></td>
            <td style={cell}>{o.baseGate||"—"}</td>
            <td style={cell}><span style={badge(o.analysisStatus)}>{o.analysisStatus}</span></td>
            <td style={cell}>{o.analysisWorkerId||"—"}<div style={{fontSize:10,color:"#849088"}}>{o.analysisTaskId||""}</div></td>
            <td style={cell}>
              {o.analysisStatus==="ASSIGNED" && o.analysisTaskId ?
              <form action={`/api/ai/analysis/tasks/${encodeURIComponent(o.analysisTaskId)}/release`} method="post">
                <button type="submit" style={{padding:"5px 8px",border:"1px solid #ccd7d1",borderRadius:8,background:"#fff",cursor:"pointer"}}>Release batch</button>
              </form> : "—"}
            </td>
          </tr>)}</tbody>
        </table>
      </div>
    </section>
  </main>;
}
