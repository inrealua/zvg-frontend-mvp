import { NextRequest, NextResponse } from "next/server";

import { getCurrentUserFromRequest } from "@/lib/user-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

function stage106NoStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}


export async function GET(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);

  return stage106NoStoreJson(
    {
      user: user
        ? {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          }
        : null,
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
        Vary: "Cookie",
      },
    }
  );
}
