import { getProjectState } from "@/lib/zvg-ai-queue";

export const dynamic = "force-dynamic";

const card: React.CSSProperties = {
  border: "1px solid #d9e2dc",
  borderRadius: 16,
  padding: 20,
  background: "#fff",
  boxShadow: "0 8px 30px rgba(30,60,45,.06)",
};

const pill = (status:string):React.CSSProperties => ({
  display:"inline-block", padding:"4px 9px", borderRadius:999,
  background: status === "READY" ? "#e8f6ed" : status === "DONE" || status === "BASE_READY" ? "#eef3ff" : "#f4f5f4",
  fontSize:12, fontWeight:800, letterSpacing:".03em",
});

export default async function AiControlPage() {
  const s:any = await getProjectState();

  return (
    <main style={{maxWidth:1180,margin:"0 auto",padding:"44px 20px 80px"}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:22,alignItems:"flex-end",flexWrap:"wrap",marginBottom:26}}>
        <div>
          <div style={{fontSize:13,letterSpacing:".12em",textTransform:"uppercase",fontWeight:800,color:"#527162"}}>ZVG-DE · AI task queue</div>
          <h1 style={{fontSize:38,lineHeight:1.1,margin:"8px 0"}}>AI Control</h1>
          <div style={{color:"#65756d"}}>Mode: <strong>{s.mode}</strong> · Prompt {s.promptVersion || "—"}</div>
        </div>
        <div style={{...card,minWidth:320}}>
          <div style={{fontSize:12,textTransform:"uppercase",fontWeight:800,color:"#718078"}}>Next task</div>
          {s.nextTask ? <>
            <div style={{fontSize:22,fontWeight:850,marginTop:5}}>{s.nextTask.type}</div>
            <div style={{marginTop:4}}>{s.nextTask.courtName || s.nextTask.courtId}</div>
            <div style={{marginTop:7}}><span style={pill("READY")}>READY</span></div>
            <div style={{marginTop:12}}><a href={s.nextTask.taskUrl}>Open machine task JSON</a></div>
          </> : <div style={{marginTop:8}}>No READY task.</div>}
        </div>
      </div>

      {!s.installed ? <section style={card}>
        <h2>Queue database is not installed</h2>
        <p>Run the included installer before using this page.</p>
      </section> : <>
        <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:14,marginBottom:28}}>
          <div style={card}><b>Registry</b><div style={{fontSize:28,fontWeight:850,marginTop:6}}>{s.registryCourtCount}</div><div style={{color:"#6f7c75"}}>courts</div></div>
          <div style={card}><b>BASE done</b><div style={{fontSize:28,fontWeight:850,marginTop:6}}>{s.stats.baseDone}</div></div>
          <div style={card}><b>Analysis batches</b><div style={{fontSize:28,fontWeight:850,marginTop:6}}>{s.stats.analysisDone}</div></div>
          <div style={card}><b>Queue waiting</b><div style={{fontSize:28,fontWeight:850,marginTop:6}}>{s.stats.waiting}</div></div>
        </section>

        <section style={{...card,marginBottom:28}}>
          <h2 style={{marginTop:0}}>Workflow</h2>
          <p style={{lineHeight:1.65}}>
            <b>1. INITIAL_BASE:</b> one lightweight COURT_BASE task per court → import result ZIP → next court becomes READY.
            {" "}<b>2. ANALYSIS:</b> the site creates batches of max. 5 BASE-ready cases for deep analysis.
            {" "}<b>3. MONITORING:</b> one lightweight daily delta task per court.
          </p>
          <p style={{marginBottom:0}}><b>Task lifecycle:</b> READY → result ZIP imported → DONE. There is no fragile “IN_PROGRESS” state.</p>
        </section>

        <section style={{...card,marginBottom:28}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}>
            <h2 style={{margin:0}}>Court queue</h2>
            <span style={{color:"#6f7c75"}}>{s.courts.length} courts</span>
          </div>
          <div style={{overflowX:"auto",marginTop:12,maxHeight:620}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead style={{position:"sticky",top:0,background:"#fff"}}>
                <tr>{["#","Amtsgericht","BASE","Official Termine","Active","Aufgehoben","Cases","Reconciliation","Analysis","Monitor"].map(x=><th key={x} style={{textAlign:"left",padding:"10px 8px",borderBottom:"1px solid #dfe7e2"}}>{x}</th>)}</tr>
              </thead>
              <tbody>
                {s.courts.map((c:any,i:number)=><tr key={c.courtId}>
                  <td style={{padding:"9px 8px",borderBottom:"1px solid #edf2ef"}}>{i+1}</td>
                  <td style={{padding:"9px 8px",borderBottom:"1px solid #edf2ef"}}><b>{c.courtName}</b><div style={{fontSize:12,color:"#7b8982"}}>{c.courtId} · {c.state || ""}</div></td>
                  <td style={{padding:"9px 8px",borderBottom:"1px solid #edf2ef"}}><span style={pill(c.baseStatus)}>{c.baseStatus}</span></td>
                  <td style={{padding:"9px 8px",borderBottom:"1px solid #edf2ef"}}>{c.officialTermCount ?? "—"}</td>
                  <td style={{padding:"9px 8px",borderBottom:"1px solid #edf2ef"}}>{c.activeTermCount ?? "—"}</td>
                  <td style={{padding:"9px 8px",borderBottom:"1px solid #edf2ef"}}>{c.cancelledTermCount ?? "—"}</td>
                  <td style={{padding:"9px 8px",borderBottom:"1px solid #edf2ef"}}>{c.baseCaseCount || "—"}</td>
                  <td style={{padding:"9px 8px",borderBottom:"1px solid #edf2ef"}}>
                    <div><span style={pill(c.reconciliationStatus === "MATCHED" || String(c.reconciliationStatus||"").startsWith("MATCHED") ? "DONE" : "WAITING")}>{c.reconciliationStatus || "VERIFY"}</span></div>
                    <div style={{fontSize:11,color:"#7b8982",marginTop:4}}>{c.officialCountCheckedAt ? String(c.officialCountCheckedAt).slice(0,10) : "not audited"}</div>
                  </td>
                  <td style={{padding:"9px 8px",borderBottom:"1px solid #edf2ef"}}>{c.analysisDoneCount}/{c.analysisTotalCount || 0}</td>
                  <td style={{padding:"9px 8px",borderBottom:"1px solid #edf2ef"}}>{c.lastMonitorAt ? String(c.lastMonitorAt).slice(0,10) : "—"}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
        </section>

        <section style={{...card,marginBottom:28}}>
          <h2 style={{marginTop:0}}>Machine endpoints</h2>
          <ul style={{lineHeight:1.9,marginBottom:0}}>
            <li><a href="/ai/MASTER_PROMPT.md">MASTER_PROMPT.md</a></li>
            <li><a href="/api/ai/project-state">/api/ai/project-state</a></li>
            <li><a href="/ai/next-task.json"><strong>/ai/next-task.json</strong></a> — minimal public READY task</li>\n            <li><a href="/api/ai/next-task">/api/ai/next-task</a></li>
            {s.nextTask ? <li><a href={s.nextTask.taskUrl}>{s.nextTask.taskUrl}</a></li> : null}
          </ul>
        </section>

        <section style={card}>
          <h2 style={{marginTop:0}}>Canonical command</h2>
          <pre style={{whiteSpace:"pre-wrap",background:"#f4f7f5",padding:14,borderRadius:10}}>Открой https://zvg-de.com/ai/ и выполни следующее задание ZVG-DE.</pre>
          <p style={{marginBottom:0,color:"#66766e"}}>After ChatGPT returns the result ZIP, import it. Only a successful import closes the task and activates the next one.</p>
        </section>
      </>}
    </main>
  );
}
