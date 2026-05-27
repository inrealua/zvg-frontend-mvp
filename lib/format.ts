export function formatEuro(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(value);
}

export function formatArea(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(value)} m²`;
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

export function translateStatus(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: "Активен",
    CANCELLED: "Торги отменены",
    ARCHIVED: "Архив",
    SOLD: "Продан",
    UNKNOWN: "Неизвестно"
  };
  return map[status] ?? status;
}

export function translateGroup(group: string): string {
  const map: Record<string, string> = {
    WOHNHAEUSER: "Жилые дома",
    WOHNUNGEN: "Квартиры",
    GEWERBE: "Коммерция",
    GRUNDSTUECKE: "Участки",
    LAND_WALD: "Земля / лес",
    GARAGEN: "Гаражи / парковки",
    SONSTIGE: "Прочее"
  };
  return map[group] ?? group;
}

export function translateOccupancy(status: string): string {
  const map: Record<string, string> = {
    VACANT: "Свободен",
    RENTED: "Сдан в аренду",
    OWNER_OCCUPIED: "Используется собственником",
    UNKNOWN: "Неизвестно"
  };
  return map[status] ?? status;
}
