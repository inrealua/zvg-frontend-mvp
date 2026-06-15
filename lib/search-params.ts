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
  removeHref?: string;
};

const allowedTypeGroups = new Set(Object.values(PropertyTypeGroup));
const allowedStatuses = new Set(Object.values(PropertyStatus));
const allowedOccupancy = new Set(Object.values(OccupancyStatus));

function stage141IsWertgrenzenRemovedFilter(value: string | undefined): boolean {
  return ["yes", "true", "1", "weggefallen", "removed", "aufgehoben", "entfallen"].includes(String(value || "").toLowerCase());
}

function stage141IsWertgrenzenActiveFilter(value: string | undefined): boolean {
  return ["no", "false", "0", "nicht_weggefallen", "not_removed", "notremoved", "active", "gelten"].includes(String(value || "").toLowerCase());
}

function stage141WertgrenzenChipLabel(value: string): string {
  if (stage141IsWertgrenzenRemovedFilter(value)) return "Wertgrenzen: aufgehoben";
  if (stage141IsWertgrenzenActiveFilter(value)) return "Wertgrenzen: gelten";
  return `Wertgrenzen: ${value}`;
}

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
  const cities = asStringArray(params.city);
  const city = cities[0] || "";
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
  if (stage141IsWertgrenzenRemovedFilter(wertgrenzen)) where.wertgrenzenWeggefallen = true;
  if (stage141IsWertgrenzenActiveFilter(wertgrenzen)) where.wertgrenzenWeggefallen = false;
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

  function makeRemoveHref(key: string, valueToRemove?: string): string {
    const next = new URLSearchParams();

    Object.entries(params).forEach(([paramKey, raw]) => {
      if (paramKey === "page") return;

      const values = Array.isArray(raw) ? raw : raw ? [raw] : [];
      for (const value of values) {
        const text = String(value || "").trim();
        if (!text) continue;

        if (paramKey === key) {
          if (valueToRemove === undefined) continue;
          if (text === valueToRemove) continue;
        }

        next.append(paramKey, text);
      }
    });

    const query = next.toString();
    return query ? `?${query}` : "?";
  }

  function addText(key: string, label: string) {
    const value = asString(params[key]);
    if (value) chips.push({ key, label, value, removeHref: makeRemoveHref(key) });
  }

  function addNumber(key: string, label: string, formatter = (value: number) => String(value)) {
    const value = asNumber(params[key]);
    if (typeof value === "number") chips.push({ key, label, value: formatter(value), removeHref: makeRemoveHref(key) });
  }

  function addMulti(key: string, label: string, values: string[], labeler = (value: string) => value) {
    values.forEach((value) => {
      chips.push({
        key,
        label,
        value: labeler(value),
        removeHref: makeRemoveHref(key, value),
      });
    });
  }

  const yesNo = (value: string) => {
    if (value === "true") return "Ja";
    if (value === "false") return "Nein";
    return value;
  };

  const statusLabel = (value: string) => {
    const labels: Record<string, string> = {
      ACTIVE: "Aktiv",
      CANCELLED: "Aufgehoben",
      ARCHIVED: "Archiv",
      SOLD: "Verkauft",
      UNKNOWN: "Unbekannt",
    };
    return labels[value] || optionLabel(STATUS_OPTIONS, value);
  };

  const occupancyLabel = (value: string) => {
    const normalized = String(value || "").trim().toLowerCase();

    const labels: Record<string, string> = {
      vacant: "Frei",
      free: "Frei",
      frei: "Frei",
      rented: "Vermietet",
      vermietet: "Vermietet",
      owner_occupied: "Eigennutzung",
      owneroccupied: "Eigennutzung",
      eigennutzung: "Eigennutzung",
      unknown: "Unbekannt",
      unbekannt: "Unbekannt",
      "неизвестно": "Unbekannt",
      "невідомо": "Unbekannt",
      "рќрµрёр·рірµсѓс‚рѕ": "Unbekannt",
      "рќрµрё": "Unbekannt",
    };

    return labels[normalized] || labels[value] || optionLabel(OCCUPANCY_OPTIONS, value) || "Unbekannt";
  }

  const wertgrenzenLabel = (value: string) => {
    if (value === "weggefallen") return "weggefallen";
    if (value === "nicht_weggefallen") return "gelten";
    return optionLabel(WERTGRENZEN_OPTIONS, value);
  };

  addText("q", "Suche");
  addMulti("state", "Bundesland", asStringArray(params.state));
  addMulti("city", "Ort", asStringArray(params.city));
  addText("postalCode", "PLZ");
  addNumber("radiusKm", "Umkreis", (value) => `${value} km`);
  addText("court", "Amtsgericht");

  addMulti("typeGroup", "Objektart", asStringArray(params.typeGroup), (value) => optionLabel(PROPERTY_GROUP_OPTIONS, value));
  addMulti("occupancy", "Nutzung", asStringArray(params.occupancy), occupancyLabel);

  addNumber("minPrice", "Verkehrswert ab", (value) => `${value.toLocaleString("de-DE")} €`);
  addNumber("maxPrice", "Verkehrswert bis", (value) => `${value.toLocaleString("de-DE")} €`);
  addNumber("minLivingArea", "Wohnfläche ab", (value) => `${value} m²`);
  addNumber("maxLivingArea", "Wohnfläche bis", (value) => `${value} m²`);
  addNumber("minPlotArea", "Grundstück ab", (value) => `${value} m²`);
  addNumber("maxPlotArea", "Grundstück bis", (value) => `${value} m²`);

  addText("dateFrom", "Termin ab");
  addText("dateTo", "Termin bis");
  addMulti("status", "Status", asStringArray(params.status), statusLabel);

  const denkmalschutz = asString(params.denkmalschutz);
  if (denkmalschutz) chips.push({ key: "denkmalschutz", label: "Denkmalschutz", value: yesNo(denkmalschutz), removeHref: makeRemoveHref("denkmalschutz") });

  const wertgrenzen = asString(params.wertgrenzen);
  if (wertgrenzen) chips.push({ key: "wertgrenzen", label: "Wertgrenzen", value: wertgrenzenLabel(wertgrenzen), removeHref: makeRemoveHref("wertgrenzen") });

  addNumber("auctionAttempt", "Termin-Nr.", (value) => value >= 3 ? "3. und weitere" : `${value}. Termin`);

  addText("sort", "Sortierung");
  addNumber("perPage", "Anzeigen", (value) => `${value} pro Seite`);

  return chips;
}
