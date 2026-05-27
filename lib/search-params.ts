import { OccupancyStatus, Prisma, PropertyStatus, PropertyTypeGroup } from "@prisma/client";
import {
  AUCTION_ATTEMPT_OPTIONS,
  BOOLEAN_OPTIONS,
  OCCUPANCY_OPTIONS,
  optionLabel,
  PROPERTY_GROUP_OPTIONS,
  SORT_OPTIONS,
  PAGE_SIZE_OPTIONS,
  STATUS_OPTIONS,
  WERTGRENZEN_OPTIONS
} from "@/lib/filter-options";
import { formatArea, formatEuro } from "@/lib/format";

export type SearchParamRecord = Record<string, string | string[] | undefined>;

export type ActiveFilterChip = {
  key: string;
  label: string;
  value?: string;
  removeKeys?: string[];
};

const allowedTypeGroups = new Set(Object.values(PropertyTypeGroup));
const allowedStatuses = new Set(Object.values(PropertyStatus));
const allowedOccupancy = new Set(Object.values(OccupancyStatus));

export function asString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export function asStringArray(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) return value.map((item) => item.trim()).filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

export function asNumber(value: string | string[] | undefined): number | undefined {
  const text = asString(value);
  if (!text) return undefined;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function validCoordinate(value: number | undefined, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function getMapBounds(params: SearchParamRecord) {
  const minLatRaw = asNumber(params.minLat);
  const maxLatRaw = asNumber(params.maxLat);
  const minLngRaw = asNumber(params.minLng);
  const maxLngRaw = asNumber(params.maxLng);

  if (
    !validCoordinate(minLatRaw, -90, 90) ||
    !validCoordinate(maxLatRaw, -90, 90) ||
    !validCoordinate(minLngRaw, -180, 180) ||
    !validCoordinate(maxLngRaw, -180, 180)
  ) {
    return null;
  }

  return {
    minLat: Math.min(minLatRaw, maxLatRaw),
    maxLat: Math.max(minLatRaw, maxLatRaw),
    minLng: Math.min(minLngRaw, maxLngRaw),
    maxLng: Math.max(minLngRaw, maxLngRaw)
  };
}

export type ParsedPolygonPoint = {
  latitude: number;
  longitude: number;
};

export function parsePolygonParam(value: string | string[] | undefined): ParsedPolygonPoint[] {
  const text = asString(value);
  if (!text) return [];

  const points = text
    .split(";")
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const [latText, lngText] = pair.split(",");
      const latitude = Number(latText);
      const longitude = Number(lngText);

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;

      return { latitude, longitude };
    })
    .filter((point): point is ParsedPolygonPoint => point !== null);

  return points.length >= 3 ? points.slice(0, 80) : [];
}

function asDate(value: string | string[] | undefined): Date | undefined {
  const text = asString(value);
  if (!text) return undefined;
  const date = new Date(`${text}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function validValues<T extends string>(values: string[], allowed: Set<T>): T[] {
  return values.filter((value): value is T => allowed.has(value as T));
}

export function buildPropertyWhere(params: SearchParamRecord): Prisma.PropertyWhereInput {
  const q = asString(params.q);
  const states = asStringArray(params.state);
  const city = asString(params.city);
  const postalCode = asString(params.postalCode);
  const court = asString(params.court);
  const typeGroups = validValues(asStringArray(params.typeGroup), allowedTypeGroups as Set<PropertyTypeGroup>);
  const statuses = validValues(asStringArray(params.status), allowedStatuses as Set<PropertyStatus>);
  const occupancies = validValues(asStringArray(params.occupancy), allowedOccupancy as Set<OccupancyStatus>);
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
  const mapBounds = getMapBounds(params);

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

  if (states.length === 1) where.state = states[0];
  if (states.length > 1) where.state = { in: states };
  if (city) where.city = city;
  if (postalCode) where.postalCode = { startsWith: postalCode };
  if (court) where.court = court;
  if (typeGroups.length === 1) where.propertyTypeGroup = typeGroups[0];
  if (typeGroups.length > 1) where.propertyTypeGroup = { in: typeGroups };
  if (statuses.length === 1) where.status = statuses[0];
  if (statuses.length > 1) where.status = { in: statuses };
  if (occupancies.length === 1) where.occupancyStatus = occupancies[0];
  if (occupancies.length > 1) where.occupancyStatus = { in: occupancies };

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

  if (mapBounds) {
    where.latitude = { gte: mapBounds.minLat, lte: mapBounds.maxLat };
    where.longitude = { gte: mapBounds.minLng, lte: mapBounds.maxLng };
  }

  return where;
}

export function buildPropertyOrderBy(params: SearchParamRecord): Prisma.PropertyOrderByWithRelationInput[] {
  const sort = asString(params.sort) || "auctionDateAsc";

  if (sort === "auctionDateDesc") return [{ auctionDate: "desc" }, { marketValue: "asc" }];
  if (sort === "priceAsc") return [{ marketValue: "asc" }, { auctionDate: "asc" }];
  if (sort === "priceDesc") return [{ marketValue: "desc" }, { auctionDate: "asc" }];

  return [{ status: "asc" }, { auctionDate: "asc" }, { marketValue: "asc" }];
}

function addMultiChips(chips: ActiveFilterChip[], key: string, prefix: string, values: string[], labeler = (value: string) => value) {
  values.forEach((value) => {
    chips.push({ key, value, label: `${prefix}: ${labeler(value)}` });
  });
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
  addMultiChips(chips, "state", "Земля", asStringArray(params.state));
  addText("city", "Город");
  addText("postalCode", "PLZ");
  addNumber("radiusKm", "Radius", (value) => `${value} км`);
  addText("court", "Суд");

  addMultiChips(chips, "typeGroup", "Тип", asStringArray(params.typeGroup), (value) => optionLabel(PROPERTY_GROUP_OPTIONS, value));
  addMultiChips(chips, "status", "Статус", asStringArray(params.status), (value) => optionLabel(STATUS_OPTIONS, value));
  addMultiChips(chips, "occupancy", "Использование", asStringArray(params.occupancy), (value) => optionLabel(OCCUPANCY_OPTIONS, value));

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

  const perPage = asString(params.perPage);
  if (perPage && perPage !== "20") chips.push({ key: "perPage", label: `На странице: ${optionLabel(PAGE_SIZE_OPTIONS, perPage)}` });

  const mapBounds = getMapBounds(params);
  if (mapBounds) {
    chips.push({ key: "mapBounds", label: "Область карты", removeKeys: ["minLat", "maxLat", "minLng", "maxLng"] });
  }

  const polygonPoints = parsePolygonParam(params.poly);
  if (polygonPoints.length >= 3) {
    chips.push({ key: "poly", label: `Polygon-Suche: ${polygonPoints.length} Punkte` });
  }

  return chips;
}
