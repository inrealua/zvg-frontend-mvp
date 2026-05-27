import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const VALID_STATUSES = ["ACTIVE", "CANCELLED", "ARCHIVED", "SOLD", "UNKNOWN"] as const;
const VALID_GROUPS = ["WOHNHAEUSER", "WOHNUNGEN", "GEWERBE", "GRUNDSTUECKE", "LAND_WALD", "GARAGEN", "SONSTIGE"] as const;

type ExportRow = Prisma.PropertyGetPayload<{
  include: {
    _count: {
      select: {
        images: true;
        documents: true;
      };
    };
  };
}>;

function getString(value: string | null): string {
  return value?.trim() ?? "";
}

function getInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  const raw = String(value).replace(/\r?\n/g, " ").trim();
  return `"${raw.replace(/"/g, '""')}"`;
}

function buildWhere(searchParams: URLSearchParams): Prisma.PropertyWhereInput {
  const q = getString(searchParams.get("q"));
  const status = getString(searchParams.get("status"));
  const state = getString(searchParams.get("state"));
  const court = getString(searchParams.get("court"));
  const city = getString(searchParams.get("city"));
  const group = getString(searchParams.get("group"));
  const dateFrom = getString(searchParams.get("dateFrom"));
  const dateTo = getString(searchParams.get("dateTo"));
  const priceMin = getString(searchParams.get("priceMin"));
  const priceMax = getString(searchParams.get("priceMax"));
  const issue = getString(searchParams.get("issue"));

  const where: Prisma.PropertyWhereInput = {};

  if (q) {
    where.OR = [
      { title: { contains: q } },
      { aktenzeichen: { contains: q } },
      { normalizedAktenzeichen: { contains: q } },
      { court: { contains: q } },
      { state: { contains: q } },
      { city: { contains: q } },
      { postalCode: { contains: q } },
      { address: { contains: q } }
    ];
  }

  if (VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    where.status = status as Prisma.EnumPropertyStatusFilter["equals"];
  }

  if (VALID_GROUPS.includes(group as (typeof VALID_GROUPS)[number])) {
    where.propertyTypeGroup = group as Prisma.EnumPropertyTypeGroupFilter["equals"];
  }

  if (state) where.state = { contains: state };
  if (court) where.court = { contains: court };
  if (city) where.city = { contains: city };

  if (dateFrom || dateTo) {
    where.auctionDate = {};
    if (dateFrom) where.auctionDate.gte = new Date(`${dateFrom}T00:00:00.000Z`);
    if (dateTo) where.auctionDate.lte = new Date(`${dateTo}T23:59:59.999Z`);
  }

  if (priceMin || priceMax) {
    where.marketValue = {};
    if (priceMin) where.marketValue.gte = getInt(priceMin, 0);
    if (priceMax) where.marketValue.lte = getInt(priceMax, 0);
  }

  if (issue === "missing-coordinates") {
    where.AND = [...(Array.isArray(where.AND) ? where.AND : []), { OR: [{ latitude: null }, { longitude: null }] }];
  }
  if (issue === "missing-images") {
    where.images = { none: {} };
  }
  if (issue === "missing-documents") {
    where.documents = { none: {} };
  }
  if (issue === "missing-auction-date") {
    where.auctionDate = null;
  }
  if (issue === "missing-market-value") {
    where.marketValue = null;
  }

  return where;
}

function rowToCsv(row: ExportRow): string {
  const values = [
    row.id,
    row.aktenzeichen,
    row.normalizedAktenzeichen,
    row.court,
    row.state,
    row.city,
    row.postalCode,
    row.street,
    row.houseNumber,
    row.address,
    row.latitude,
    row.longitude,
    row.title,
    row.propertyType,
    row.propertyTypeGroup,
    row.status,
    row.occupancyStatus,
    row.auctionDate,
    row.auctionTime,
    row.auctionLocation,
    row.marketValue,
    row.livingArea,
    row.usableArea,
    row.totalArea,
    row.plotArea,
    row.yearBuilt,
    row.hasDenkmalschutz,
    row.wertgrenzenWeggefallen,
    row.auctionAttempt,
    row.description,
    row.locationDescription,
    row.cancellationText,
    row.source,
    row.sourceUrl,
    row.lastSourceUpdate,
    row._count.images,
    row._count.documents,
    row.createdAt,
    row.updatedAt
  ];
  return values.map(csvCell).join(";");
}

export async function GET(request: NextRequest) {
  const where = buildWhere(request.nextUrl.searchParams);
  const limit = Math.min(Math.max(getInt(request.nextUrl.searchParams.get("limit"), 5000), 1), 20000);

  const rows: ExportRow[] = await prisma.property.findMany({
    where,
    include: {
      _count: {
        select: {
          images: true,
          documents: true
        }
      }
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    take: limit
  });

  const header = [
    "id",
    "aktenzeichen",
    "normalizedAktenzeichen",
    "court",
    "state",
    "city",
    "postalCode",
    "street",
    "houseNumber",
    "address",
    "latitude",
    "longitude",
    "title",
    "propertyType",
    "propertyTypeGroup",
    "status",
    "occupancyStatus",
    "auctionDate",
    "auctionTime",
    "auctionLocation",
    "marketValue",
    "livingArea",
    "usableArea",
    "totalArea",
    "plotArea",
    "yearBuilt",
    "hasDenkmalschutz",
    "wertgrenzenWeggefallen",
    "auctionAttempt",
    "description",
    "locationDescription",
    "cancellationText",
    "source",
    "sourceUrl",
    "lastSourceUpdate",
    "imageCount",
    "documentCount",
    "createdAt",
    "updatedAt"
  ].map(csvCell).join(";");

  const csv = `\uFEFF${[header, ...rows.map(rowToCsv)].join("\n")}`;
  const date = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="zvg-properties-${date}.csv"`,
      "Cache-Control": "no-store"
    }
  });
}
