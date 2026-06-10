export function getPropertyPlaceholder(propertyType?: string | null, propertyTypeGroup?: string | null) {
  const value = `${propertyType || ""} ${propertyTypeGroup || ""}`.toUpperCase();

  if (value.includes("WOHNUNG") || value.includes("EIGENTUMSWOHNUNG") || value.includes("APPART")) {
    return "/placeholders/apartment-photo.jpg";
  }

  if (value.includes("GEWERBE") || value.includes("BÜRO") || value.includes("BUERO") || value.includes("LADEN") || value.includes("GESCHÄFT") || value.includes("GESCHAEFT") || value.includes("HOTEL") || value.includes("HALLE")) {
    return "/placeholders/commercial-photo.jpg";
  }

  if (value.includes("GRUND") || value.includes("LAND") || value.includes("WALD") || value.includes("ACKER")) {
    return "/placeholders/land-photo.jpg";
  }

  if (value.includes("GARAGE") || value.includes("STELLPLATZ") || value.includes("PARK")) {
    return "/placeholders/garage-photo.jpg";
  }

  if (value.includes("HAUS") || value.includes("WOHNHAEUSER") || value.includes("WOHNHÄUSER") || value.includes("DOPPEL") || value.includes("REIHEN") || value.includes("EINFAMILIEN") || value.includes("MEHRFAMILIEN")) {
    return "/placeholders/house-photo.jpg";
  }

  return "/placeholders/other-photo.jpg";
}
