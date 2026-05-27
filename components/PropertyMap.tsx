"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatDate, formatEuro, translateGroup } from "@/lib/format";
import { escapeHtml, loadLeaflet, type LatLngTuple, type LeafletMapInstance } from "@/lib/leaflet-loader";

export type MapProperty = {
  id: string;
  title: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
  propertyTypeGroup: string;
  city: string;
  marketValue: number | null;
  auctionDate: string | null;
  imageUrl: string | null;
};

const DEFAULT_CENTER: LatLngTuple = [51.1657, 10.4515];

function markerClass(property: MapProperty): string {
  if (property.status === "CANCELLED") return "osm-marker osm-marker-cancelled";
  if (property.propertyTypeGroup === "GEWERBE") return "osm-marker osm-marker-gewerbe";
  if (property.propertyTypeGroup === "GRUNDSTUECKE" || property.propertyTypeGroup === "LAND_WALD") return "osm-marker osm-marker-grund";
  if (property.propertyTypeGroup === "WOHNUNGEN") return "osm-marker osm-marker-wohnung";
  if (property.propertyTypeGroup === "GARAGEN") return "osm-marker osm-marker-garage";
  return "osm-marker osm-marker-wohnhaus";
}

function popupHtml(property: MapProperty): string {
  const image = property.imageUrl
    ? `<img src="${escapeHtml(property.imageUrl)}" alt="${escapeHtml(property.title)}" />`
    : `<div class="osm-popup-placeholder">Нет фото</div>`;

  return `
    <div class="osm-popup-card">
      ${image}
      <div class="osm-popup-body">
        <b>${escapeHtml(property.city)}</b>
        <span>${escapeHtml(translateGroup(property.propertyTypeGroup))}</span>
        <span>${escapeHtml(formatEuro(property.marketValue))}</span>
        <small>${escapeHtml(formatDate(property.auctionDate))}</small>
        <a href="/properties/${encodeURIComponent(property.id)}">Подробнее</a>
      </div>
    </div>
  `;
}

export function PropertyMap({ properties }: { properties: MapProperty[] }) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<LeafletMapInstance | null>(null);
  const [error, setError] = useState<string | null>(null);

  const withCoordinates = useMemo(
    () => properties.filter((property) => property.latitude !== null && property.longitude !== null),
    [properties]
  );

  useEffect(() => {
    let cancelled = false;

    async function initMap() {
      if (!mapElementRef.current) return;

      try {
        setError(null);
        const L = await loadLeaflet();
        if (cancelled || !mapElementRef.current) return;

        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        const map = L.map(mapElementRef.current, {
          scrollWheelZoom: false,
          attributionControl: true
        }).setView(DEFAULT_CENTER, 6);

        mapInstanceRef.current = map;

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: "&copy; OpenStreetMap contributors"
        }).addTo(map);

        const bounds: LatLngTuple[] = [];

        withCoordinates.forEach((property) => {
          if (property.latitude === null || property.longitude === null) return;
          const coordinates: LatLngTuple = [property.latitude, property.longitude];
          bounds.push(coordinates);

          const icon = L.divIcon({
            className: markerClass(property),
            html: "<span></span>",
            iconSize: [28, 28],
            iconAnchor: [14, 14]
          });

          const marker = L.marker(coordinates, { icon }).addTo(map);
          marker.bindPopup?.(popupHtml(property));
        });

        if (bounds.length === 1) {
          map.setView(bounds[0], 11);
        } else if (bounds.length > 1) {
          map.fitBounds(L.latLngBounds(bounds), { padding: [28, 28], maxZoom: 11 });
        }
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
  }, [withCoordinates]);

  return (
    <aside className="map-panel" id="map">
      <div className="map-head">
        <div>
          <h2>Карта объектов</h2>
          <p className="meta">OpenStreetMap/Leaflet. Колесо мыши отключено, чтобы карта не мешала скроллу страницы.</p>
        </div>
        <span className="map-count">{withCoordinates.length}</span>
      </div>

      {error ? (
        <div className="map-error">
          <b>Карта не загрузилась</b>
          <span>{error}</span>
        </div>
      ) : (
        <div ref={mapElementRef} className="leaflet-map" aria-label="Карта объектов" />
      )}

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
