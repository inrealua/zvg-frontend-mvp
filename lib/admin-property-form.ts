import { DocumentType, OccupancyStatus, PropertyStatus, PropertyTypeGroup } from "@prisma/client";

export const PROPERTY_STATUS_OPTIONS = [
  ["ACTIVE", "Активен"],
  ["CANCELLED", "Торги отменены"],
  ["ARCHIVED", "Архив"],
  ["SOLD", "Продан"],
  ["UNKNOWN", "Неизвестно"]
] as const;

export const PROPERTY_GROUP_OPTIONS = [
  ["WOHNHAEUSER", "Жилые дома"],
  ["WOHNUNGEN", "Квартиры"],
  ["GEWERBE", "Коммерция"],
  ["GRUNDSTUECKE", "Участки"],
  ["LAND_WALD", "Земля / лес"],
  ["GARAGEN", "Гаражи / парковки"],
  ["SONSTIGE", "Прочее"]
] as const;

export const OCCUPANCY_OPTIONS = [
  ["VACANT", "Свободен"],
  ["RENTED", "Сдан в аренду"],
  ["OWNER_OCCUPIED", "Используется собственником"],
  ["UNKNOWN", "Неизвестно"]
] as const;

export function normalizeAktenzeichen(value: string) {
  return value
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9/]/g, "");
}

function str(formData: FormData, key: string, fallback = "") {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : fallback;
}

function nullableStr(formData: FormData, key: string) {
  const value = str(formData, key);
  return value.length > 0 ? value : null;
}

function intOrNull(formData: FormData, key: string) {
  const value = str(formData, key);
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function floatOrNull(formData: FormData, key: string) {
  const value = str(formData, key).replace(",", ".");
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function dateOrNull(formData: FormData, key: string) {
  const value = str(formData, key);
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function enumValue<T extends string>(value: string, allowed: readonly T[], fallback: T) {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export function parseImageUrls(formData: FormData) {
  const raw = str(formData, "imageUrls");
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((url, index) => ({
      url,
      alt: index === 0 ? "Главное фото объекта" : `Фото объекта ${index + 1}`,
      isMain: index === 0,
      sortOrder: index
    }));
}

type ParsedDocument = {
  url: string;
  filename: string;
  documentType: DocumentType;
  sourceUrl: string | null;
};

function filenameFromUrl(url: string, fallbackPrefix: string, index: number) {
  try {
    const parsed = new URL(url);
    const pathnameName = parsed.pathname.split("/").filter(Boolean).pop();
    if (pathnameName) return decodeURIComponent(pathnameName).slice(0, 180);
  } catch {
    // оставляем fallback ниже
  }

  return `${fallbackPrefix}_${index + 1}.pdf`;
}

function parseDocumentLines(raw: string, documentType: DocumentType, fallbackPrefix: string): ParsedDocument[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [urlPart, filenamePart] = line.split("|").map((part) => part.trim());
      const url = urlPart;
      const filename = filenamePart || filenameFromUrl(url, fallbackPrefix, index);

      return {
        url,
        filename,
        documentType,
        sourceUrl: url
      };
    });
}

export function parseDocumentUrls(formData: FormData): ParsedDocument[] {
  const gutachten = parseDocumentLines(str(formData, "gutachtenUrls"), DocumentType.GUTACHTEN, "gutachten");
  const bekanntmachung = parseDocumentLines(
    str(formData, "bekanntmachungUrls"),
    DocumentType.BEKANNTMACHUNG,
    "bekanntmachung"
  );
  const expose = parseDocumentLines(str(formData, "exposeUrls"), DocumentType.EXPOSE, "expose");
  const other = parseDocumentLines(str(formData, "otherDocumentUrls"), DocumentType.OTHER, "dokument");

  return [...gutachten, ...bekanntmachung, ...expose, ...other];
}

export function propertyDataFromForm(formData: FormData) {
  const aktenzeichen = str(formData, "aktenzeichen");
  const normalizedAktenzeichen = normalizeAktenzeichen(aktenzeichen);
  const street = str(formData, "street");
  const houseNumber = nullableStr(formData, "houseNumber");
  const postalCode = str(formData, "postalCode");
  const city = str(formData, "city");
  const address = str(
    formData,
    "address",
    `${street}${houseNumber ? ` ${houseNumber}` : ""}, ${postalCode} ${city}`.trim()
  );

  const statusRaw = str(formData, "status", "ACTIVE");
  const groupRaw = str(formData, "propertyTypeGroup", "WOHNHAEUSER");
  const occupancyRaw = str(formData, "occupancyStatus", "UNKNOWN");

  return {
    aktenzeichen,
    normalizedAktenzeichen,
    court: str(formData, "court"),
    state: str(formData, "state"),
    city,
    postalCode,
    street,
    houseNumber,
    address,
    latitude: floatOrNull(formData, "latitude"),
    longitude: floatOrNull(formData, "longitude"),
    title: str(formData, "title"),
    propertyType: str(formData, "propertyType"),
    propertyTypeGroup: enumValue(groupRaw, Object.values(PropertyTypeGroup), PropertyTypeGroup.WOHNHAEUSER),
    status: enumValue(statusRaw, Object.values(PropertyStatus), PropertyStatus.ACTIVE),
    occupancyStatus: enumValue(occupancyRaw, Object.values(OccupancyStatus), OccupancyStatus.UNKNOWN),
    auctionDate: dateOrNull(formData, "auctionDate"),
    auctionTime: nullableStr(formData, "auctionTime"),
    auctionLocation: nullableStr(formData, "auctionLocation"),
    marketValue: intOrNull(formData, "marketValue"),
    livingArea: floatOrNull(formData, "livingArea"),
    usableArea: floatOrNull(formData, "usableArea"),
    totalArea: floatOrNull(formData, "totalArea"),
    plotArea: floatOrNull(formData, "plotArea"),
    yearBuilt: intOrNull(formData, "yearBuilt"),
    hasDenkmalschutz: formData.get("hasDenkmalschutz") === "on",
    wertgrenzenWeggefallen: formData.get("wertgrenzenWeggefallen") === "on",
    auctionAttempt: intOrNull(formData, "auctionAttempt") ?? 1,
    description: str(formData, "description"),
    locationDescription: nullableStr(formData, "locationDescription"),
    cancellationText: nullableStr(formData, "cancellationText"),
    source: str(formData, "source", "MANUAL_ADMIN"),
    sourceUrl: nullableStr(formData, "sourceUrl"),
    lastSourceUpdate: new Date()
  };
}

export function dateInputValue(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}
