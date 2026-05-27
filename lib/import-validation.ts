import { parseImportPayload } from "@/lib/import-utils";

type ImportMode = "JSON" | "CSV";
type RawRow = Record<string, unknown>;

type ValidationIssue = {
  row: number;
  level: "error" | "warning";
  field: string;
  message: string;
};

const ALIASES = {
  aktenzeichen: ["aktenzeichen", "Aktenzeichen", "caseNumber", "az"],
  court: ["court", "gericht", "Gericht", "amtsgericht", "Amtsgericht"],
  title: ["title", "titel", "Titel", "objectTitle", "objekt"],
  address: ["address", "adresse", "Adresse", "lage", "Lage"],
  city: ["city", "ort", "Ort", "stadt", "Stadt"],
  postalCode: ["postalCode", "plz", "PLZ", "zip"],
  street: ["street", "strasse", "straße", "Straße", "str"],
  propertyTypeGroup: ["propertyTypeGroup", "typeGroup", "gruppe", "Gruppe"],
  status: ["status", "Status"],
  occupancyStatus: ["occupancyStatus", "nutzung", "Nutzung", "bezugsstatus"],
  auctionDate: ["auctionDate", "terminDatum", "datum", "Datum", "date"],
  marketValue: ["marketValue", "verkehrswert", "Verkehrswert", "price"],
  latitude: ["latitude", "lat", "Latitude", "geoLat"],
  longitude: ["longitude", "lng", "lon", "Longitude", "geoLng"],
  imageUrls: ["imageUrls", "images", "bilder", "photos", "fotoUrls"],
  documentUrls: ["documentUrls", "documents", "dokumente", "docs"]
} as const;

const GROUPS = ["WOHNHAEUSER", "WOHNUNGEN", "GEWERBE", "GRUNDSTUECKE", "LAND_WALD", "GARAGEN", "SONSTIGE"];
const STATUSES = ["ACTIVE", "CANCELLED", "ARCHIVED", "SOLD", "UNKNOWN"];
const OCCUPANCIES = ["VACANT", "RENTED", "OWNER_OCCUPIED", "UNKNOWN"];

function pick(row: RawRow, aliases: readonly string[]): unknown {
  for (const key of aliases) {
    if (Object.prototype.hasOwnProperty.call(row, key)) return row[key];
  }
  return undefined;
}

function text(row: RawRow, field: keyof typeof ALIASES): string {
  const value = pick(row, ALIASES[field]);
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function hasAddressParts(row: RawRow) {
  return Boolean(text(row, "city") && text(row, "postalCode") && text(row, "street"));
}

function isNumberLike(value: string) {
  if (!value) return true;
  const normalized = value.replace(/\./g, "").replace(",", ".");
  return Number.isFinite(Number.parseFloat(normalized));
}

function isDateLike(value: string) {
  if (!value) return true;
  const normalized = value.includes(".") ? value.split(".").reverse().join("-") : value;
  const date = new Date(`${normalized}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime());
}

function listCount(value: unknown) {
  if (Array.isArray(value)) return value.filter(Boolean).length;
  if (value === null || value === undefined) return 0;
  return String(value).split(/[\n|;,]+/).map((item) => item.trim()).filter(Boolean).length;
}

export function validateImportPayload(mode: ImportMode, payload: string) {
  const rows = parseImportPayload(mode, payload) as RawRow[];
  const issues: ValidationIssue[] = [];
  const duplicates = new Map<string, number[]>();
  let readyRows = 0;
  let imageCount = 0;
  let documentCount = 0;

  rows.forEach((row, index) => {
    const rowNumber = index + 1;
    const rowErrorsBefore = issues.filter((issue) => issue.row === rowNumber && issue.level === "error").length;
    const aktenzeichen = text(row, "aktenzeichen");
    const court = text(row, "court");
    const title = text(row, "title");
    const address = text(row, "address");
    const status = text(row, "status").toUpperCase();
    const group = text(row, "propertyTypeGroup").toUpperCase();
    const occupancy = text(row, "occupancyStatus").toUpperCase();

    if (!aktenzeichen) issues.push({ row: rowNumber, level: "error", field: "aktenzeichen", message: "Обязательное поле отсутствует." });
    if (!court) issues.push({ row: rowNumber, level: "error", field: "court", message: "Обязательное поле отсутствует." });
    if (!title) issues.push({ row: rowNumber, level: "error", field: "title", message: "Обязательное поле отсутствует." });
    if (!address && !hasAddressParts(row)) {
      issues.push({ row: rowNumber, level: "error", field: "address", message: "Нужен address или набор city + postalCode + street." });
    }

    if (status && !STATUSES.includes(status)) {
      issues.push({ row: rowNumber, level: "error", field: "status", message: `Недопустимый статус: ${status}.` });
    }
    if (group && !GROUPS.includes(group)) {
      issues.push({ row: rowNumber, level: "error", field: "propertyTypeGroup", message: `Недопустимая группа: ${group}.` });
    }
    if (occupancy && !OCCUPANCIES.includes(occupancy)) {
      issues.push({ row: rowNumber, level: "error", field: "occupancyStatus", message: `Недопустимый статус использования: ${occupancy}.` });
    }

    for (const numericField of ["marketValue", "latitude", "longitude"] as const) {
      const value = text(row, numericField);
      if (!isNumberLike(value)) {
        issues.push({ row: rowNumber, level: "error", field: numericField, message: `Ожидалось число, получено: ${value}.` });
      }
    }

    const auctionDate = text(row, "auctionDate");
    if (!isDateLike(auctionDate)) {
      issues.push({ row: rowNumber, level: "error", field: "auctionDate", message: `Неверная дата: ${auctionDate}. Используй YYYY-MM-DD.` });
    }

    if (!text(row, "latitude") || !text(row, "longitude")) {
      issues.push({ row: rowNumber, level: "warning", field: "coordinates", message: "Нет координат: объект не появится на карте." });
    }
    if (!pick(row, ALIASES.imageUrls)) {
      issues.push({ row: rowNumber, level: "warning", field: "imageUrls", message: "Нет фото: карточка будет без реального изображения." });
    }
    if (!pick(row, ALIASES.documentUrls)) {
      issues.push({ row: rowNumber, level: "warning", field: "documentUrls", message: "Нет документов." });
    }

    const key = `${aktenzeichen.replace(/\s+/g, "").toUpperCase()}__${court.toUpperCase()}`;
    if (aktenzeichen && court) {
      const existing = duplicates.get(key) ?? [];
      existing.push(rowNumber);
      duplicates.set(key, existing);
    }

    imageCount += listCount(pick(row, ALIASES.imageUrls));
    documentCount += listCount(pick(row, ALIASES.documentUrls));

    const rowErrorsAfter = issues.filter((issue) => issue.row === rowNumber && issue.level === "error").length;
    if (rowErrorsAfter === rowErrorsBefore) readyRows += 1;
  });

  for (const duplicateRows of duplicates.values()) {
    if (duplicateRows.length > 1) {
      issues.push({
        row: duplicateRows[0],
        level: "warning",
        field: "aktenzeichen/court",
        message: `В импортируемом файле есть повтор этого же дела в строках: ${duplicateRows.join(", ")}. При импорте оно будет обновляться по Aktenzeichen + Gericht.`
      });
    }
  }

  const errorCount = issues.filter((issue) => issue.level === "error").length;
  const warningCount = issues.filter((issue) => issue.level === "warning").length;

  return {
    rows,
    issues,
    summary: {
      totalRows: rows.length,
      readyRows,
      errorCount,
      warningCount,
      imageCount,
      documentCount,
      canImport: errorCount === 0
    }
  };
}
