import { OccupancyStatus, Prisma, PropertyStatus, PropertyTypeGroup } from "@prisma/client";
import {
  AUCTION_ATTEMPT_OPTIONS,
  BOOLEAN_OPTIONS,
  OCCUPANCY_OPTIONS,
  optionLabel,
  PROPERTY_GROUP_OPTIONS,
  SORT_OPTIONS,
  STATUS_OPTIONS,
  WERTGRENZEN_OPTIONS
} from "@/lib/filter-options";
import { formatArea, formatEuro } from "@/lib/format";

export type SearchParamRecord = Record<string, string | string[] | undefined>;

export type ActiveFilterChip = {
  key: string;
  label: string;
};

const allowedTypeGroups = new Set(Object.values(PropertyTypeGroup));
const allowedStatuses = new Set(Object.values(PropertyStatus));
const allowedOccupancy = new Set(Object.values(OccupancyStatus));

export function asString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export function asNumber(value: string | string[] | undefined): number | undefined {
  const text = asString(value);
  if (!text) return undefined;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function asDate(value: string | string[] | undefined): Date | undefined {
  const text = asString(value);
  if (!text) return undefined;
  const date = new Date(`${text}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function buildPropertyWhere(params: SearchParamRecord): Prisma.PropertyWhereInput {
  const q = asString(params.q);
  const state = asString(params.state);
  const city = asString(params.city);
  const postalCode = asString(params.postalCode);
  const court = asString(params.court);
  const typeGroup = asString(params.typeGroup);
  const status = asString(params.status);
  const occupancy = asString(params.occupancy);
  const minPrice = asNumber(params.minPrice);
  const maxPrice = asNumber(params.maxPrice);
  const minLivingArea = asNumber(params.minLivingArea);
  const maxLivingArea = asNumber(params.maxLivingArea);
  const minPlotArea = asNumber(params.minPlotArea);
  const maxPlotArea = asNumber(params.maxPlotArea);
  const dateFrom = asDate(params.dateFrom);
  const dateToRaw = asDate(params.dateTo);
  const denkmalschutz = asString(params.denkmalschutz);
  const wertgrenzen = asString(params.wertgrenzen);
  const auctionAttempt = asNumber(params.auctionAttempt);

  const where: Prisma.PropertyWhereInput = {};

  if (q) {
    where.OR = [
      { title: { contains: q } },
      { address: { contains: q } },
      { city: { contains: q } },
      { postalCode: { contains: q } },
      { aktenzeichen: { contains: q } },
      { court: { contains: q } },
      { propertyType: { contains: q } }
    ];
  }

  if (state) where.state = state;
  if (city) where.city = city;
  if (postalCode) where.postalCode = { startsWith: postalCode };
  if (court) where.court = court;
  if (allowedTypeGroups.has(typeGroup as PropertyTypeGroup)) where.propertyTypeGroup = typeGroup as PropertyTypeGroup;
  if (allowedStatuses.has(status as PropertyStatus)) where.status = status as PropertyStatus;
  if (allowedOccupancy.has(occupancy as OccupancyStatus)) where.occupancyStatus = occupancy as OccupancyStatus;

  if (minPrice !== undefined || maxPrice !== undefined) {
    where.marketValue = {
      ...(minPrice !== undefined ? { gte: minPrice } : {}),
      ...(maxPrice !== undefined ? { lte: maxPrice } : {})
    };
  }

  if (minLivingArea !== undefined || maxLivingArea !== undefined) {
    where.livingArea = {
      ...(minLivingArea !== undefined ? { gte: minLivingArea } : {}),
      ...(maxLivingArea !== undefined ? { lte: maxLivingArea } : {})
    };
  }

  if (minPlotArea !== undefined || maxPlotArea !== undefined) {
    where.plotArea = {
      ...(minPlotArea !== undefined ? { gte: minPlotArea } : {}),
      ...(maxPlotArea !== undefined ? { lte: maxPlotArea } : {})
    };
  }

  if (dateFrom || dateToRaw) {
    const dateTo = dateToRaw ? new Date(dateToRaw) : undefined;
    if (dateTo) dateTo.setUTCDate(dateTo.getUTCDate() + 1);
    where.auctionDate = {
      ...(dateFrom ? { gte: dateFrom } : {}),
      ...(dateTo ? { lt: dateTo } : {})
    };
  }

  if (denkmalschutz === "yes") where.hasDenkmalschutz = true;
  if (denkmalschutz === "no") where.hasDenkmalschutz = false;
  if (wertgrenzen === "yes") where.wertgrenzenWeggefallen = true;
  if (wertgrenzen === "no") where.wertgrenzenWeggefallen = false;
  if (auctionAttempt === 1 || auctionAttempt === 2) where.auctionAttempt = auctionAttempt;
  if (auctionAttempt !== undefined && auctionAttempt >= 3) where.auctionAttempt = { gte: 3 };

  return where;
}

export function buildPropertyOrderBy(params: SearchParamRecord): Prisma.PropertyOrderByWithRelationInput[] {
  const sort = asString(params.sort) || "auctionDateAsc";

  if (sort === "auctionDateDesc") return [{ auctionDate: "desc" }, { marketValue: "asc" }];
  if (sort === "priceAsc") return [{ marketValue: "asc" }, { auctionDate: "asc" }];
  if (sort === "priceDesc") return [{ marketValue: "desc" }, { auctionDate: "asc" }];
  if (sort === "livingAreaDesc") return [{ livingArea: "desc" }, { auctionDate: "asc" }];
  if (sort === "updatedDesc") return [{ updatedAt: "desc" }, { auctionDate: "asc" }];

  return [{ status: "asc" }, { auctionDate: "asc" }, { marketValue: "asc" }];
}

export function buildActiveFilterChips(params: SearchParamRecord): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];
  const addText = (key: string, prefix: string) => {
    const value = asString(params[key]);
    if (value) chips.push({ key, label: `${prefix}: ${value}` });
  };
  const addNumber = (key: string, label: string, formatter = (value: number) => String(value)) => {
    const value = asNumber(params[key]);
    if (value !== undefined) chips.push({ key, label: `${label}: ${formatter(value)}` });
  };

  addText("q", "Поиск");
  addText("state", "Земля");
  addText("city", "Город");
  addText("postalCode", "PLZ");
  addText("location", "Umkreis-Ort/PLZ");
  addNumber("radiusKm", "Radius", (value) => `${value} км`);
  addText("court", "Суд");

  const typeGroup = asString(params.typeGroup);
  if (typeGroup) chips.push({ key: "typeGroup", label: `Тип: ${optionLabel(PROPERTY_GROUP_OPTIONS, typeGroup)}` });

  const status = asString(params.status);
  if (status) chips.push({ key: "status", label: `Статус: ${optionLabel(STATUS_OPTIONS, status)}` });

  const occupancy = asString(params.occupancy);
  if (occupancy) chips.push({ key: "occupancy", label: `Использование: ${optionLabel(OCCUPANCY_OPTIONS, occupancy)}` });

  addNumber("minPrice", "Цена от", formatEuro);
  addNumber("maxPrice", "Цена до", formatEuro);
  addNumber("minLivingArea", "Жилая от", formatArea);
  addNumber("maxLivingArea", "Жилая до", formatArea);
  addNumber("minPlotArea", "Участок от", formatArea);
  addNumber("maxPlotArea", "Участок до", formatArea);
  addText("dateFrom", "Торги от");
  addText("dateTo", "Торги до");

  const denkmalschutz = asString(params.denkmalschutz);
  if (denkmalschutz) chips.push({ key: "denkmalschutz", label: `Denkmalschutz: ${optionLabel(BOOLEAN_OPTIONS, denkmalschutz)}` });

  const wertgrenzen = asString(params.wertgrenzen);
  if (wertgrenzen) chips.push({ key: "wertgrenzen", label: `Wertgrenzen: ${optionLabel(WERTGRENZEN_OPTIONS, wertgrenzen)}` });

  const attempt = asString(params.auctionAttempt);
  if (attempt) chips.push({ key: "auctionAttempt", label: optionLabel(AUCTION_ATTEMPT_OPTIONS, attempt) });

  const sort = asString(params.sort);
  if (sort && sort !== "auctionDateAsc") chips.push({ key: "sort", label: `Сортировка: ${optionLabel(SORT_OPTIONS, sort)}` });

  return chips;
}
