import Link from "next/link";

type MapProperty = {
  id: string;
  title: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
  propertyTypeGroup: string;
  city: string;
  marketValue: number | null;
};

function markerClass(property: MapProperty): string {
  if (property.status === "CANCELLED") return "map-marker cancelled";
  if (property.propertyTypeGroup === "GEWERBE") return "map-marker gewerbe";
  if (property.propertyTypeGroup === "GRUNDSTUECKE" || property.propertyTypeGroup === "LAND_WALD") return "map-marker grund";
  if (property.propertyTypeGroup === "WOHNUNGEN") return "map-marker wohnung";
  return "map-marker";
}

function position(property: MapProperty): { left: string; top: string } {
  const lat = property.latitude ?? 51;
  const lon = property.longitude ?? 11;
  const minLat = 47.2;
  const maxLat = 55.2;
  const minLon = 5.8;
  const maxLon = 15.2;
  const left = ((lon - minLon) / (maxLon - minLon)) * 100;
  const top = 100 - ((lat - minLat) / (maxLat - minLat)) * 100;
  return {
    left: `${Math.min(96, Math.max(4, left))}%`,
    top: `${Math.min(96, Math.max(4, top))}%`
  };
}

export function PropertyMap({ properties }: { properties: MapProperty[] }) {
  return (
    <aside className="map-panel">
      <h2 style={{ margin: "0 0 6px" }}>Карта объектов</h2>
      <p className="meta" style={{ marginTop: 0 }}>MVP-карта без внешних библиотек. На следующем этапе можно заменить на Leaflet/OpenStreetMap.</p>
      <div className="fake-map" aria-label="Карта объектов">
        {properties.map((property) => (
          <Link
            key={property.id}
            href={`/properties/${property.id}`}
            className={markerClass(property)}
            style={position(property)}
            title={`${property.title}, ${property.city}`}
          />
        ))}
      </div>
      <p className="meta" style={{ marginBottom: 0 }}>Показано маркеров: {properties.length}</p>
    </aside>
  );
}
