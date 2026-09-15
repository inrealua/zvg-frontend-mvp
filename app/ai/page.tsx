import fs from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

async function readJson(name: string) {
  const p = path.join(process.cwd(), "public", "ai", name);
  return JSON.parse(await fs.readFile(p, "utf8"));
}

const card: React.CSSProperties = {
  border: "1px solid #d9e2dc",
  borderRadius: 16,
  padding: 20,
  background: "#fff",
  boxShadow: "0 8px 30px rgba(30,60,45,.06)"
};

const mono: React.CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontSize: 13
};

export default async function AiControlPage() {
  const [state, tasks, policy] = await Promise.all([
    readJson("project-state.json"),
    readJson("tasks.json"),
    readJson("project-policy.json")
  ]);

  const next = state.nextTask;
  const nextCourt = state.courts.find((c: any) => c.id === next?.courtId);

  return (
    <main style={{maxWidth: 1180, margin: "0 auto", padding: "44px 20px 80px"}}>
      <div style={{display:"flex", justifyContent:"space-between", gap:24, alignItems:"flex-end", marginBottom:28, flexWrap:"wrap"}}>
        <div>
          <div style={{fontSize:13, letterSpacing:".12em", textTransform:"uppercase", color:"#527162", fontWeight:700}}>ZVG-DE · internal machine-readable control</div>
          <h1 style={{fontSize:38, lineHeight:1.1, margin:"8px 0 8px"}}>AI Control</h1>
          <div style={{color:"#65756d"}}>Project {state.projectVersion} · Control {state.aiControlVersion}</div>
        </div>
        <div style={{...card, minWidth:280}}>
          <div style={{fontSize:12, color:"#718078", textTransform:"uppercase", fontWeight:700}}>Next task</div>
          <div style={{fontSize:21, fontWeight:800, marginTop:4}}>{next?.type || "—"}</div>
          <div style={{marginTop:3}}>{nextCourt?.name || next?.courtId || "—"}</div>
          <div style={{...mono, marginTop:7, color:"#527162"}}>{next?.status || "—"}</div>
        </div>
      </div>

      <section style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))", gap:14, marginBottom:28}}>
        <div style={card}><strong>Primary collector</strong><div style={{marginTop:7}}>{policy.primaryCollector}</div></div>
        <div style={card}><strong>Fact states</strong><div style={{marginTop:7, ...mono}}>{policy.factStatuses.join(" · ")}</div></div>
        <div style={card}><strong>Public languages</strong><div style={{marginTop:7}}>{policy.analysis.publicLanguages.join(" / ").toUpperCase()}</div></div>
        <div style={card}><strong>Legacy live inventory</strong><div style={{marginTop:7}}>{state.legacySite?.observedActiveProperties ?? "—"} active properties</div></div>
      </section>

      <section style={{...card, marginBottom:28}}>
        <h2 style={{marginTop:0}}>Court queue</h2>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%", borderCollapse:"collapse"}}>
            <thead><tr>
              {["Court","Status","BASE","Analysis"].map(x => <th key={x} style={{textAlign:"left", padding:"10px 8px", borderBottom:"1px solid #dfe7e2"}}>{x}</th>)}
            </tr></thead>
            <tbody>
              {state.courts.map((c:any) => (
                <tr key={c.id}>
                  <td style={{padding:"11px 8px", borderBottom:"1px solid #edf2ef"}}><a href={`/ai/courts/${c.id}.json`}>{c.name}</a><div style={{...mono,color:"#7b8982"}}>{c.id}</div></td>
                  <td style={{padding:"11px 8px", borderBottom:"1px solid #edf2ef"}}>{c.status}</td>
                  <td style={{padding:"11px 8px", borderBottom:"1px solid #edf2ef"}}>{c.baseVersion || "—"}</td>
                  <td style={{padding:"11px 8px", borderBottom:"1px solid #edf2ef"}}>{c.analysisVersion || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{...card, marginBottom:28}}>
        <h2 style={{marginTop:0}}>Machine-readable sources</h2>
        <ul style={{lineHeight:1.9, marginBottom:0}}>
          <li><a href="/ai/MASTER_PROMPT.md"><strong>MASTER_PROMPT.md</strong></a> — canonical AI instructions</li>\n          <li><a href="/ai/bootstrap.json">bootstrap.json</a></li>\n          <li><a href="/ai/ZVG_PROJECT_MASTER.md">ZVG_PROJECT_MASTER.md</a></li>
          <li><a href="/ai/project-state.json">project-state.json</a></li>
          <li><a href="/ai/project-policy.json">project-policy.json</a></li>
          <li><a href="/ai/tasks.json">tasks.json</a></li>
          <li><a href="/ai/schemas/court-base.schema.json">court-base.schema.json</a></li>
          <li><a href="/ai/schemas/base-record.schema.json">base-record.schema.json</a></li>
          <li><a href="/ai/schemas/analysis-result.schema.json">analysis-result.schema.json</a></li>
        </ul>
      </section>

      <section style={card}>
        <h2 style={{marginTop:0}}>Operating instruction</h2>
        <p style={{marginBottom:8}}>Canonical chat command:</p>
        <pre style={{whiteSpace:"pre-wrap", ...mono, background:"#f4f7f5", padding:14, borderRadius:10}}>
Открой https://zvg-de.com/ai/ и выполни следующее задание ZVG-DE.
        </pre>
        <p style={{color:"#66766e", marginBottom:0}}>This page is intentionally not linked from the public navigation and is marked noindex.</p>
      </section>
    </main>
  );
}
