"use client";

import { useEffect, useRef, useState } from "react";
import { formatEuro, translateGroup } from "@/lib/format";
import { escapeHtml, loadLeaflet, type LatLngTuple, type LeafletMapInstance } from "@/lib/leaflet-loader";

type DetailMapProperty = {
  id: string;
  title: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
  propertyTypeGroup: string;
  city: string;
  marketValue: number | null;
};

function markerClass(property: DetailMapProperty): string {
  if (property.status === "CANCELLED") return "osm-marker osm-marker-cancelled";
  if (property.propertyTypeGroup === "GEWERBE") return "osm-marker osm-marker-gewerbe";
  if (property.propertyTypeGroup === "GRUNDSTUECKE" || property.propertyTypeGroup === "LAND_WALD") return "osm-marker osm-marker-grund";
  if (property.propertyTypeGroup === "WOHNUNGEN") return "osm-marker osm-marker-wohnung";
  if (property.propertyTypeGroup === "GARAGEN") return "osm-marker osm-marker-garage";
  return "osm-marker osm-marker-wohnhaus";
}

export function PropertyDetailMap({ property }: { property: DetailMapProperty }) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<LeafletMapInstance | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function initMap() {
      if (!mapElementRef.current || property.latitude === null || property.longitude === null) return;

      try {
        setError(null);
        const L = await loadLeaflet();
        if (cancelled || !mapElementRef.current || property.latitude === null || property.longitude === null) return;

        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        const coordinates: LatLngTuple = [property.latitude, property.longitude];
        const map = L.map(mapElementRef.current, {
          scrollWheelZoom: true,
          attributionControl: true
        }).setView(coordinates, 14);

        mapInstanceRef.current = map;

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: "&copy; OpenStreetMap contributors"
        }).addTo(map);

        const icon = L.divIcon({
          className: markerClass(property),
          html: "<span></span>",
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });

        const marker = L.marker(coordinates, { icon }).addTo(map);
        marker.bindPopup?.(`
          <div class="osm-popup-body compact">
            <b>${escapeHtml(property.city)}</b>
            <span>${escapeHtml(translateGroup(property.propertyTypeGroup))}</span>
            <span>${escapeHtml(formatEuro(property.marketValue))}</span>
          </div>
        `);
      } catch (mapError) {
        const message = mapError instanceof Error ? mapError.message : "Map loading failed";
        setError(message);
      }
    }

    initMap();

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [property]);

  if (property.latitude === null || property.longitude === null) {
    return <div className="mini-map empty">Koordinaten des Objekts sind noch nicht vorhanden</div>;
  }

  if (error) {
    return (
      <div className="mini-map empty">
        <b>Karte konnte nicht geladen werden</b>
        <span>{error}</span>
      </div>
    );
  }

  return <div ref={mapElementRef} className="detail-leaflet-map" aria-label={`Карта объекта ${property.title}`} />;
}
