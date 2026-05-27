import Link from "next/link";
import { formatEuro, translateGroup } from "@/lib/format";

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
  if (property.propertyTypeGroup === "GARAGEN") return "map-marker garage";
  return "map-marker wohnhaus";
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
  const withCoordinates = properties.filter((property) => property.latitude !== null && property.longitude !== null);

  return (
    <aside className="map-panel" id="map">
      <div className="map-head">
        <div>
          <h2>Карта объектов</h2>
          <p className="meta">MVP-карта без Leaflet. Следующим этапом заменим на OpenStreetMap.</p>
        </div>
        <span className="map-count">{withCoordinates.length}</span>
      </div>

      <div className="fake-map" aria-label="Карта объектов">
        <div className="map-label north">DE</div>
        {withCoordinates.map((property) => (
          <Link
            key={property.id}
            href={`/properties/${property.id}`}
            className={markerClass(property)}
            style={position(property)}
            title={`${property.title} · ${property.city} · ${formatEuro(property.marketValue)}`}
          >
            <span className="marker-tooltip">
              <b>{property.city}</b><br />
              {translateGroup(property.propertyTypeGroup)}<br />
              {formatEuro(property.marketValue)}
            </span>
          </Link>
        ))}
      </div>

      <div className="map-legend">
        <span><i className="legend-dot wohnhaus" /> Häuser</span>
        <span><i className="legend-dot wohnung" /> Wohnungen</span>
        <span><i className="legend-dot grund" /> Grundstücke</span>
        <span><i className="legend-dot gewerbe" /> Gewerbe</span>
        <span><i className="legend-dot cancelled" /> aufgehoben</span>
      </div>
    </aside>
  );
}
