import { OccupancyStatus, PropertyStatus, PropertyTypeGroup } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type RawImportRow = Record<string, unknown>;

type ImportMode = "JSON" | "CSV";

type ImportSummary = {
  totalItems: number;
  createdItems: number;
  updatedItems: number;
  skippedItems: number;
  failedItems: number;
  errors: string[];
};

const STATUS_VALUES = Object.values(PropertyStatus);
const GROUP_VALUES = Object.values(PropertyTypeGroup);
const OCCUPANCY_VALUES = Object.values(OccupancyStatus);

const FIELD_ALIASES = {
  aktenzeichen: ["aktenzeichen", "Aktenzeichen", "caseNumber", "az"],
  court: ["court", "gericht", "Gericht", "amtsgericht", "Amtsgericht"],
  state: ["state", "bundesland", "Bundesland", "land"],
  city: ["city", "ort", "Ort", "stadt", "Stadt"],
  postalCode: ["postalCode", "plz", "PLZ", "zip"],
  street: ["street", "strasse", "straße", "Straße", "str"],
  houseNumber: ["houseNumber", "hausnummer", "Hausnummer", "nr"],
  address: ["address", "adresse", "Adresse", "lage", "Lage"],
  latitude: ["latitude", "lat", "Latitude", "geoLat"],
  longitude: ["longitude", "lng", "lon", "Longitude", "geoLng"],
  title: ["title", "titel", "Titel", "objectTitle", "objekt"],
  propertyType: ["propertyType", "objektart", "Objektart", "type"],
  propertyTypeGroup: ["propertyTypeGroup", "typeGroup", "gruppe", "Gruppe"],
  status: ["status", "Status"],
  occupancyStatus: ["occupancyStatus", "nutzung", "Nutzung", "bezugsstatus"],
  auctionDate: ["auctionDate", "terminDatum", "datum", "Datum", "date"],
  auctionTime: ["auctionTime", "terminZeit", "uhrzeit", "Uhrzeit", "time"],
  auctionLocation: ["auctionLocation", "terminOrt", "versteigerungsort", "Versteigerungsort"],
  marketValue: ["marketValue", "verkehrswert", "Verkehrswert", "price"],
  livingArea: ["livingArea", "wohnflaeche", "wohnfläche", "Wohnfläche"],
  usableArea: ["usableArea", "nutzflaeche", "nutzfläche", "Nutzfläche"],
  totalArea: ["totalArea", "gesamtflaeche", "gesamtfläche", "Gesamtfläche"],
  plotArea: ["plotArea", "grundstueck", "grundstück", "Grundstücksfläche"],
  yearBuilt: ["yearBuilt", "baujahr", "Baujahr"],
  hasDenkmalschutz: ["hasDenkmalschutz", "denkmalschutz", "Denkmalschutz"],
  wertgrenzenWeggefallen: ["wertgrenzenWeggefallen", "wertgrenzen", "Wertgrenzen"],
  auctionAttempt: ["auctionAttempt", "terminNummer", "versuch", "attempt"],
  description: ["description", "beschreibung", "Beschreibung", "kurzbeschreibung"],
  locationDescription: ["locationDescription", "lagebeschreibung", "Lagebeschreibung"],
  cancellationText: ["cancellationText", "aufgehobenText", "terminAufgehobenText"],
  source: ["source", "quelle", "Quelle"],
  sourceUrl: ["sourceUrl", "url", "link", "Link"],
  imageUrls: ["imageUrls", "images", "bilder", "photos", "fotoUrls"],
  documentUrls: ["documentUrls", "documents", "dokumente", "docs"]
} as const;

export function normalizeAktenzeichen(value: string) {
  return value
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9/]/g, "");
}

function pick(row: RawImportRow, aliases: readonly string[]) {
  for (const key of aliases) {
    if (Object.prototype.hasOwnProperty.call(row, key)) return row[key];
  }
  return undefined;
}

function stringValue(row: RawImportRow, key: keyof typeof FIELD_ALIASES, fallback = "") {
  const value = pick(row, FIELD_ALIASES[key]);
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
}

function nullableString(row: RawImportRow, key: keyof typeof FIELD_ALIASES) {
  const value = stringValue(row, key);
  return value.length > 0 ? value : null;
}

function numberValue(row: RawImportRow, key: keyof typeof FIELD_ALIASES) {
  const raw = stringValue(row, key).replace(/\./g, "").replace(",", ".");
  if (!raw) return null;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function intValue(row: RawImportRow, key: keyof typeof FIELD_ALIASES) {
  const value = numberValue(row, key);
  return value === null ? null : Math.round(value);
}

function booleanValue(row: RawImportRow, key: keyof typeof FIELD_ALIASES) {
  const raw = stringValue(row, key).toLowerCase();
  return ["1", "true", "yes", "ja", "да", "y"].includes(raw);
}

function dateValue(row: RawImportRow, key: keyof typeof FIELD_ALIASES) {
  const raw = stringValue(row, key);
  if (!raw) return null;
  const normalized = raw.includes(".")
    ? raw.split(".").reverse().join("-")
    : raw;
  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function enumValue<T extends string>(raw: string, allowed: readonly T[], fallback: T) {
  const upper = raw.trim().toUpperCase();
  return allowed.includes(upper as T) ? (upper as T) : fallback;
}

function splitList(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (value === null || value === undefined) return [];
  return String(value)
    .split(/[\n|;,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseCsvLine(line: string) {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && (char === ";" || char === ",")) {
      result.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
}

export function parseImportPayload(mode: ImportMode, payload: string) {
  if (mode === "JSON") {
    const parsed = JSON.parse(payload) as unknown;
    if (Array.isArray(parsed)) return parsed as RawImportRow[];
    if (parsed && typeof parsed === "object" && Array.isArray((parsed as { items?: unknown }).items)) {
      return (parsed as { items: RawImportRow[] }).items;
    }
    throw new Error("JSON должен быть массивом объектов или объектом вида { items: [...] }.");
  }

  const lines = payload
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) throw new Error("CSV должен содержать заголовок и минимум одну строку данных.");

  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: RawImportRow = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    return row;
  });
}

function propertyDataFromRow(row: RawImportRow) {
  const aktenzeichen = stringValue(row, "aktenzeichen");
  const court = stringValue(row, "court");
  const street = stringValue(row, "street", "unbekannte Straße");
  const houseNumber = nullableString(row, "houseNumber");
  const postalCode = stringValue(row, "postalCode", "00000");
  const city = stringValue(row, "city", "Unbekannt");
  const address = stringValue(
    row,
    "address",
    `${street}${houseNumber ? ` ${houseNumber}` : ""}, ${postalCode} ${city}`.trim()
  );
  const title = stringValue(row, "title", stringValue(row, "propertyType", "ZVG-Objekt"));
  const propertyType = stringValue(row, "propertyType", "Sonstiges");

  if (!aktenzeichen || !court || !title || !address) {
    throw new Error("Pflichtfelder fehlen: aktenzeichen, court/Gericht, title/Objekt, address/Adresse.");
  }

  return {
    aktenzeichen,
    normalizedAktenzeichen: normalizeAktenzeichen(aktenzeichen),
    court,
    state: stringValue(row, "state", "UNKNOWN"),
    city,
    postalCode,
    street,
    houseNumber,
    address,
    latitude: numberValue(row, "latitude"),
    longitude: numberValue(row, "longitude"),
    title,
    propertyType,
    propertyTypeGroup: enumValue(
      stringValue(row, "propertyTypeGroup", "SONSTIGE"),
      GROUP_VALUES,
      PropertyTypeGroup.SONSTIGE
    ),
    status: enumValue(stringValue(row, "status", "ACTIVE"), STATUS_VALUES, PropertyStatus.ACTIVE),
    occupancyStatus: enumValue(
      stringValue(row, "occupancyStatus", "UNKNOWN"),
      OCCUPANCY_VALUES,
      OccupancyStatus.UNKNOWN
    ),
    auctionDate: dateValue(row, "auctionDate"),
    auctionTime: nullableString(row, "auctionTime"),
    auctionLocation: nullableString(row, "auctionLocation"),
    marketValue: intValue(row, "marketValue"),
    livingArea: numberValue(row, "livingArea"),
    usableArea: numberValue(row, "usableArea"),
    totalArea: numberValue(row, "totalArea"),
    plotArea: numberValue(row, "plotArea"),
    yearBuilt: intValue(row, "yearBuilt"),
    hasDenkmalschutz: booleanValue(row, "hasDenkmalschutz"),
    wertgrenzenWeggefallen: booleanValue(row, "wertgrenzenWeggefallen"),
    auctionAttempt: intValue(row, "auctionAttempt") ?? 1,
    description: stringValue(row, "description", "Noch keine Beschreibung vorhanden."),
    locationDescription: nullableString(row, "locationDescription"),
    cancellationText: nullableString(row, "cancellationText"),
    source: stringValue(row, "source", "ADMIN_IMPORT"),
    sourceUrl: nullableString(row, "sourceUrl"),
    lastSourceUpdate: new Date()
  };
}

function mediaFromRow(row: RawImportRow) {
  const imageSource = pick(row, FIELD_ALIASES.imageUrls);
  const documentSource = pick(row, FIELD_ALIASES.documentUrls);
  const imageUrls = splitList(imageSource).map((url, index) => ({
    url,
    alt: index === 0 ? "Главное фото объекта" : `Фото объекта ${index + 1}`,
    isMain: index === 0,
    sortOrder: index
  }));
  const documents = splitList(documentSource).map((url, index) => ({
    url,
    filename: url.split("/").pop() || `document-${index + 1}.pdf`,
    documentType: "OTHER" as const,
    sourceUrl: url
  }));
  return { imageUrls, documents };
}

export async function importPayloadToDatabase(params: {
  mode: ImportMode;
  payload: string;
  source?: string;
}) {
  const startedAt = new Date();
  const log = await prisma.importLog.create({
    data: {
      source: params.source ?? "ADMIN_IMPORT",
      mode: params.mode,
      status: "SUCCESS",
      startedAt
    }
  });

  const summary: ImportSummary = {
    totalItems: 0,
    createdItems: 0,
    updatedItems: 0,
    skippedItems: 0,
    failedItems: 0,
    errors: []
  };

  try {
    const rows = parseImportPayload(params.mode, params.payload);
    summary.totalItems = rows.length;

    for (const [index, row] of rows.entries()) {
      try {
        const data = propertyDataFromRow(row);
        const media = mediaFromRow(row);

        const existing = await prisma.property.findFirst({
          where: {
            normalizedAktenzeichen: data.normalizedAktenzeichen,
            court: data.court
          },
          select: { id: true }
        });

        const property = existing
          ? await prisma.property.update({ where: { id: existing.id }, data })
          : await prisma.property.create({ data });

        if (existing) summary.updatedItems += 1;
        else summary.createdItems += 1;

        if (media.imageUrls.length > 0) {
          await prisma.propertyImage.deleteMany({ where: { propertyId: property.id } });
          await prisma.propertyImage.createMany({
            data: media.imageUrls.map((image) => ({ ...image, propertyId: property.id }))
          });
        }

        if (media.documents.length > 0) {
          await prisma.propertyDocument.deleteMany({ where: { propertyId: property.id } });
          await prisma.propertyDocument.createMany({
            data: media.documents.map((document) => ({ ...document, propertyId: property.id }))
          });
        }
      } catch (error) {
        summary.failedItems += 1;
        summary.errors.push(`Строка ${index + 1}: ${error instanceof Error ? error.message : "Неизвестная ошибка"}`);
      }
    }

    const status = summary.failedItems === 0 ? "SUCCESS" : summary.createdItems + summary.updatedItems > 0 ? "PARTIAL" : "FAILED";

    return prisma.importLog.update({
      where: { id: log.id },
      data: {
        status,
        totalItems: summary.totalItems,
        createdItems: summary.createdItems,
        updatedItems: summary.updatedItems,
        skippedItems: summary.skippedItems,
        failedItems: summary.failedItems,
        errorMessage: summary.errors.slice(0, 10).join("\n") || null,
        logJson: summary,
        finishedAt: new Date()
      }
    });
  } catch (error) {
    return prisma.importLog.update({
      where: { id: log.id },
      data: {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Неизвестная ошибка импорта",
        finishedAt: new Date()
      }
    });
  }
}
