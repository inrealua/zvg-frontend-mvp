import { NextRequest } from "next/server";

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
