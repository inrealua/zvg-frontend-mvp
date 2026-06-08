const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();

function full(rel) {
  return path.join(root, rel);
}
function exists(rel) {
  return fs.existsSync(full(rel));
}
function write(rel, content) {
  const target = full(rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
  console.log("written", rel);
}

/**
 * Stage 108B
 *
 * Next.js does not allow re-exporting route segment config:
 *   export { dynamic, runtime, revalidate } from ...
 *
 * Fix:
 * Rewrite app/api/auth/logout-hard/route.ts with explicit static config exports
 * and local wrapper GET/POST/DELETE handlers.
 */

write("app/api/auth/logout-hard/route.ts", `import { NextRequest } from "next/server";

import {
  DELETE as logoutDelete,
  GET as logoutGet,
  POST as logoutPost,
} from "@/app/api/auth/logout/route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  return logoutGet(request);
}

export async function POST(request: NextRequest) {
  return logoutPost(request);
}

export async function DELETE(request: NextRequest) {
  return logoutDelete(request);
}
`);

console.log("Stage 108B completed.");
