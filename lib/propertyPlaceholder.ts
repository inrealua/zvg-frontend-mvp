export function getPropertyPlaceholder(propertyType?: string | null, propertyTypeGroup?: string | null) {
  const value = `${propertyType || ""} ${propertyTypeGroup || ""}`
    .toUpperCase()
    .replace(/Ä/g, "AE")
    .replace(/Ö/g, "OE")
    .replace(/Ü/g, "UE")
    .replace(/ß/g, "SS");

  if (
    value.includes("WOHNUNGEN") ||
    value.includes("WOHNUNG") ||
    value.includes("EIGENTUMSWOHNUNG") ||
    value.includes("APARTMENT")
  ) {
    return "/images/placeholders/placeholder_eigentumswohnung.png";
  }

  if (
    value.includes("MEHRFAMILIENHAUS") ||
    value.includes("MFH") ||
    value.includes("ZWEIFAMILIENHAUS") ||
    value.includes("DREIFAMILIENHAUS")
  ) {
    return "/images/placeholders/placeholder_mehrfamilienhaus.png";
  }

  if (
    value.includes("EINFAMILIENHAUS") ||
    value.includes("WOHNHAEUSER") ||
    value.includes("WOHNHAUS") ||
    value.includes("REIHENHAUS") ||
    value.includes("DOPPELHAUS") ||
    value.includes("HAUS")
  ) {
    return "/images/placeholders/placeholder_einfamilienhaus.png";
  }

  if (
    value.includes("GEWERBE") ||
    value.includes("LADEN") ||
    value.includes("RETAIL") ||
    value.includes("GESCHAEFT") ||
    value.includes("PRAXIS")
  ) {
    return "/images/placeholders/placeholder_gewerbe.png";
  }

  if (
    value.includes("BUERO") ||
    value.includes("BÜRO") ||
    value.includes("OFFICE")
  ) {
    return "/images/placeholders/placeholder_buero.png";
  }

  if (
    value.includes("INDUSTRIE") ||
    value.includes("LAGER") ||
    value.includes("HALLE") ||
    value.includes("PRODUKTION") ||
    value.includes("WERKSTATT")
  ) {
    return "/images/placeholders/placeholder_industrie_lager_halle.png";
  }

  if (
    value.includes("GRUNDSTUECKE") ||
    value.includes("GRUNDSTÜCKE") ||
    value.includes("GRUNDSTUECK") ||
    value.includes("GRUNDSTÜCK") ||
    value.includes("BAUGRUND") ||
    value.includes("LAND_WALD") ||
    value.includes("LAND") ||
    value.includes("WALD")
  ) {
    return "/images/placeholders/placeholder_grundstueck.png";
  }

  if (
    value.includes("GARAGEN") ||
    value.includes("GARAGE") ||
    value.includes("STELLPLATZ") ||
    value.includes("PARKEN") ||
    value.includes("PARKING")
  ) {
    return "/images/placeholders/placeholder_garage_stellplatz.png";
  }

  if (
    value.includes("LANDWIRTSCHAFT") ||
    value.includes("BAUERNHOF") ||
    value.includes("HOFSTELLE") ||
    value.includes("AGRAR")
  ) {
    return "/images/placeholders/placeholder_landwirtschaft.png";
  }

  if (
    value.includes("HOTEL") ||
    value.includes("GASTRONOMIE") ||
    value.includes("PENSION") ||
    value.includes("RESTAURANT") ||
    value.includes("GASTHAUS")
  ) {
    return "/images/placeholders/placeholder_hotel_gastronomie.png";
  }

  return "/images/placeholders/placeholder_einfamilienhaus.png";
}
