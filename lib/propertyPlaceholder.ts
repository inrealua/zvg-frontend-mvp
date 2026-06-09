export function getPropertyPlaceholder(
  propertyType?: string | null,
  propertyTypeGroup?: string | null
) {
  const value = `${propertyType || ""} ${propertyTypeGroup || ""}`.toUpperCase();

  if (value.includes("WOHNUNG") || value.includes("EIGENTUMSWOHNUNG")) {
    return "/placeholders/apartment-photo.jpg";
  }

  if (value.includes("GRUND") || value.includes("LAND") || value.includes("WALD")) {
    return "/placeholders/land-photo.jpg";
  }

  if (
    value.includes("GEWERBE") ||
    value.includes("BÜRO") ||
    value.includes("BUERO") ||
    value.includes("LADEN") ||
    value.includes("GESCHÄFT") ||
    value.includes("GESCHAEFT")
  ) {
    return "/placeholders/commercial-photo.jpg";
  }

  if (value.includes("GARAGE") || value.includes("STELLPLATZ")) {
    return "/placeholders/garage-photo.jpg";
  }

  if (
    value.includes("HAUS") ||
    value.includes("WOHNHAEUSER") ||
    value.includes("WOHNHÄUSER") ||
    value.includes("DOPPEL") ||
    value.includes("REIHEN")
  ) {
    return "/placeholders/house-photo.jpg";
  }

  return "/placeholders/other-photo.jpg";
}
