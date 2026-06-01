import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromRequest } from "@/lib/user-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

function noStoreJson(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
      Vary: "Cookie",
      ...(init?.headers || {}),
    },
  });
}

function formatPrice(value: string | null) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return null;
  return new Intl.NumberFormat("de-DE").format(number) + " €";
}

function generateSearchName(filtersUrl: string, summary: string) {
  try {
    const url = new URL(filtersUrl, "https://zvg-de.com");
    const params = url.searchParams;

    const cityOrPlz = params.get("city") || params.get("postalCode") || params.get("q") || "";
    const radius = params.get("radius") || params.get("radiusKm") || "";
    const priceMax = params.get("priceMax") || params.get("marketValueMax") || "";
    const state = params.getAll("state").join(", ");
    const type = params.getAll("propertyTypeGroup").join(", ");

    const parts: string[] = [];

    if (cityOrPlz) {
      parts.push(radius ? `${cityOrPlz} +${radius} km` : cityOrPlz);
    } else if (state) {
      parts.push(state);
    } else if (type) {
      parts.push(type);
    }

    const formattedPrice = formatPrice(priceMax);
    if (formattedPrice) parts.push(`bis ${formattedPrice}`);

    if (parts.length > 0) return parts.join(" ");

    const cleanSummary = summary.replace(/\s+/g, " ").trim();
    if (cleanSummary && cleanSummary !== "Alle Objekte") {
      return cleanSummary.slice(0, 80);
    }
  } catch {
    // ignore invalid URL
  }

  return "Gespeicherte Suche";
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) return noStoreJson({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as {
    filtersUrl?: string;
    summary?: string;
    name?: string;
  } | null;

  const filtersUrl =
    typeof body?.filtersUrl === "string" && body.filtersUrl.startsWith("/")
      ? body.filtersUrl.slice(0, 2000)
      : "/";

  const humanReadableSummary =
    typeof body?.summary === "string" && body.summary.trim()
      ? body.summary.trim().slice(0, 1000)
      : "Alle Objekte";

  const filtersHash = crypto.createHash("sha256").update(filtersUrl).digest("hex");

  const existing = await prisma.savedSearch.findUnique({
    where: { userId_filtersHash: { userId: user.id, filtersHash } },
  });

  if (existing) return noStoreJson({ error: "Already saved" }, { status: 409 });

  const rawName = typeof body?.name === "string" ? body.name.trim() : "";
  const name = (rawName || generateSearchName(filtersUrl, humanReadableSummary)).slice(0, 120);

  const savedSearch = await prisma.savedSearch.create({
    data: {
      userId: user.id,
      name,
      filtersUrl,
      filtersHash,
      humanReadableSummary,
    },
  });

  return noStoreJson({ success: true, id: savedSearch.id, name });
}
