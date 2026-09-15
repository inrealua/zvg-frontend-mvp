#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const statePath = path.join(root, "public", "ai", "project-state.json");
const tasksPath = path.join(root, "public", "ai", "tasks.json");

function read(p){ return JSON.parse(fs.readFileSync(p, "utf8")); }
function write(p,v){ fs.writeFileSync(p, JSON.stringify(v,null,2) + "\n", "utf8"); }

const [cmd, ...args] = process.argv.slice(2);
if (!cmd || cmd === "show") {
  const s = read(statePath);
  console.log(JSON.stringify({nextTask:s.nextTask,courts:s.courts}, null, 2));
  process.exit(0);
}

if (cmd === "set-next") {
  const [courtId, type="COURT_BASE"] = args;
  if (!courtId) throw new Error("Usage: node scripts/zvg_ai_control.mjs set-next <courtId> [type]");
  const s = read(statePath);
  const c = s.courts.find(x => x.id === courtId);
  if (!c) throw new Error(`Unknown courtId: ${courtId}`);
  s.nextTask = {
    taskId: `${type.toLowerCase()}-${courtId}-${Date.now()}`,
    type,
    courtId,
    status: "READY"
  };
  s.updatedAt = new Date().toISOString();
  write(statePath, s);
  console.log(`Next task: ${type} / ${courtId}`);
  process.exit(0);
}

if (cmd === "set-status") {
  const [courtId, status] = args;
  if (!courtId || !status) throw new Error("Usage: node scripts/zvg_ai_control.mjs set-status <courtId> <status>");
  const s = read(statePath);
  const c = s.courts.find(x => x.id === courtId);
  if (!c) throw new Error(`Unknown courtId: ${courtId}`);
  c.status = status;
  s.updatedAt = new Date().toISOString();
  write(statePath, s);
  console.log(`${courtId}: ${status}`);
  process.exit(0);
}

throw new Error(`Unknown command: ${cmd}`);
