export type GeoPoint = {
  latitude: number;
  longitude: number;
  label: string;
};

const KNOWN_LOCATIONS: GeoPoint[] = [
  { label: "Chemnitz", latitude: 50.8278, longitude: 12.9214 },
  { label: "Dresden", latitude: 51.0504, longitude: 13.7373 },
  { label: "Leipzig", latitude: 51.3397, longitude: 12.3731 },
  { label: "Zwickau", latitude: 50.7189, longitude: 12.4961 },
  { label: "Plauen", latitude: 50.4973, longitude: 12.1378 },
  { label: "Erfurt", latitude: 50.9848, longitude: 11.0299 },
  { label: "Jena", latitude: 50.9271, longitude: 11.5892 },
  { label: "Gera", latitude: 50.8772, longitude: 12.0796 },
  { label: "Weimar", latitude: 50.9795, longitude: 11.3235 },
  { label: "Halle", latitude: 51.4828, longitude: 11.9699 },
  { label: "Magdeburg", latitude: 52.1205, longitude: 11.6276 },
  { label: "Berlin", latitude: 52.52, longitude: 13.405 },
  { label: "Potsdam", latitude: 52.3906, longitude: 13.0645 },
  { label: "Cottbus", latitude: 51.7563, longitude: 14.3329 },
  { label: "München", latitude: 48.1351, longitude: 11.582 },
  { label: "Nürnberg", latitude: 49.4521, longitude: 11.0767 },
  { label: "Frankfurt am Main", latitude: 50.1109, longitude: 8.6821 },
  { label: "Kassel", latitude: 51.3127, longitude: 9.4797 },
  { label: "Köln", latitude: 50.9375, longitude: 6.9603 },
  { label: "Düsseldorf", latitude: 51.2277, longitude: 6.7735 },
  { label: "Dortmund", latitude: 51.5136, longitude: 7.4653 },
  { label: "Hamburg", latitude: 53.5511, longitude: 9.9937 },
  { label: "Hannover", latitude: 52.3759, longitude: 9.732 },
  { label: "Bremen", latitude: 53.0793, longitude: 8.8017 },
  { label: "Stuttgart", latitude: 48.7758, longitude: 9.1829 }
];

function normalizeLocation(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function findKnownLocation(value: string): GeoPoint | null {
  const normalized = normalizeLocation(value);
  if (!normalized) return null;

  return (
    KNOWN_LOCATIONS.find((location) => normalizeLocation(location.label) === normalized) ??
    KNOWN_LOCATIONS.find((location) => normalizeLocation(location.label).includes(normalized)) ??
    null
  );
}

export function distanceKm(from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }): number {
  const earthRadiusKm = 6371;
  const toRad = (value: number) => (value * Math.PI) / 180;

  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const RADIUS_OPTIONS = [
  { value: "", label: "Без радиуса" },
  { value: "5", label: "5 км" },
  { value: "10", label: "10 км" },
  { value: "25", label: "25 км" },
  { value: "50", label: "50 км" },
  { value: "100", label: "100 км" }
];
