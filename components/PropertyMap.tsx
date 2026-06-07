"use client";

type Stage61Locale = "de" | "ru" | "en";

function stage61ReadLocale(): Stage61Locale {
  if (typeof document === "undefined") return "de";
  const match = document.cookie.match(/(?:^|;\s*)zvg_locale=(de|ru|en)(?:;|$)/);
  return (match?.[1] as Stage61Locale) || "de";
}

const stage61MapLocaleText = {
  de: {
    houses: "Häuser",
    apartments: "Wohnungen",
    land: "Grundstücke",
    commercial: "Gewerbe",
    landForest: "Land / Wald",
    garages: "Garagen / Parken",
    other: "Sonstige",
    cancelled: "aufgehoben",
    drawTitle: "Bereich zeichnen",
    drawHelp: "Klicken Sie auf die Karte, um Punkte zu setzen. Mindestens 3 Punkte.",
    applyPolygon: "Polygon anwenden",
    clearPoints: "Punkte löschen",
    cancel: "Abbrechen",
    searchVisible: "In diesem Kartenausschnitt suchen",
    drawRegion: "Region zeichnen",
  },
  ru: {
    houses: "Дома",
    apartments: "Квартиры",
    land: "Участки",
    commercial: "Коммерция",
    landForest: "Земля / лес",
    garages: "Гаражи / парковки",
    other: "Прочее",
    cancelled: "отменено",
    drawTitle: "Нарисовать область",
    drawHelp: "Кликните по карте, чтобы поставить точки. Минимум 3 точки.",
    applyPolygon: "Применить полигон",
    clearPoints: "Удалить точки",
    cancel: "Отмена",
    searchVisible: "Искать в этой области карты",
    drawRegion: "Нарисовать область",
  },
  en: {
    houses: "Houses",
    apartments: "Apartments",
    land: "Land plots",
    commercial: "Commercial",
    landForest: "Land / forest",
    garages: "Garages / parking",
    other: "Other",
    cancelled: "cancelled",
    drawTitle: "Draw area",
    drawHelp: "Click on the map to place points. At least 3 points.",
    applyPolygon: "Apply polygon",
    clearPoints: "Clear points",
    cancel: "Cancel",
    searchVisible: "Search this map area",
    drawRegion: "Draw region",
  },
} as const;

function stage61MapT() {
  return stage61MapLocaleText[stage61ReadLocale()];
}


import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { formatDate, formatEuro, translateGroup } from "@/lib/format";
import { escapeHtml, loadLeaflet, type LatLngTuple, type LeafletLayer, type LeafletMapInstance } from "@/lib/leaflet-loader";

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

type DrawPoint = {
  lat: number;
  lng: number;
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
    : `<div class="osm-popup-placeholder">Kein Foto</div>`;

  const statusLabel = property.status === "CANCELLED" ? "Termin aufgehoben" : "Aktuell";

  return `
    <div class="osm-popup-card osm-popup-card-redesigned osm-popup-card-balanced">
      ${image}
      <div class="osm-popup-body">
        <div class="osm-popup-topline">
          <span class="osm-popup-type">${escapeHtml(translateGroup(property.propertyTypeGroup))}</span>
          <span class="osm-popup-status">${escapeHtml(statusLabel)}</span>
        </div>
        <b>${escapeHtml(property.title)}</b>
        <span class="osm-popup-address">${escapeHtml(property.address || property.city)}</span>
        <div class="osm-popup-facts">
          <small>Termin<br><strong>${escapeHtml(formatDate(property.auctionDate))}</strong></small>
          <small>Verkehrswert<br><strong>${escapeHtml(formatEuro(property.marketValue))}</strong></small>
        </div>
        <a href="/properties/${encodeURIComponent(property.id)}">Details ansehen</a>
      </div>
    </div>
  `;
}

function roundCoordinate(value: number): string {
  return value.toFixed(6);
}

function parsePolygonFromUrl(value: string | null): DrawPoint[] {
  if (!value) return [];

  const points = value
    .split(";")
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const [latText, lngText] = pair.split(",");
      const lat = Number(latText);
      const lng = Number(lngText);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

      return { lat, lng };
    })
    .filter((point): point is DrawPoint => point !== null);

  return points.length >= 3 ? points.slice(0, 80) : [];
}

function toLeafletCoordinates(points: DrawPoint[]): LatLngTuple[] {
  return points.map((point) => [point.lat, point.lng]);
}

export function PropertyMap({ properties, variant = "default" }: { properties: MapProperty[]; variant?: "default" | "wide" | "large" }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<LeafletMapInstance | null>(null);
  const drawnShapeRef = useRef<LeafletLayer | null>(null);
  const activePolygonRef = useRef<LeafletLayer | null>(null);
  const pointLayersRef = useRef<LeafletLayer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mapReadyTick, setMapReadyTick] = useState(0);
  const [drawingMode, setDrawingMode] = useState(false);
  const [drawPoints, setDrawPoints] = useState<DrawPoint[]>([]);

  const withCoordinates = useMemo(
    () => properties.filter((property) => property.latitude !== null && property.longitude !== null),
    [properties]
  );

  const mapBoundsActive =
    searchParams.has("minLat") &&
    searchParams.has("maxLat") &&
    searchParams.has("minLng") &&
    searchParams.has("maxLng");

  const polygonParam = searchParams.get("poly");
  const activePolygonPoints = useMemo(() => parsePolygonFromUrl(polygonParam), [polygonParam]);
  const polygonActive = activePolygonPoints.length >= 3;

  function applyVisibleMapArea() {
    const map = mapInstanceRef.current;
    if (!map) return;

    const bounds = map.getBounds();
    const next = new URLSearchParams(searchParams.toString());

    next.set("minLat", roundCoordinate(bounds.getSouth()));
    next.set("maxLat", roundCoordinate(bounds.getNorth()));
    next.set("minLng", roundCoordinate(bounds.getWest()));
    next.set("maxLng", roundCoordinate(bounds.getEast()));
    next.delete("poly");
    next.delete("page");

    router.push(`${pathname}?${next.toString()}`);
  }

  function clearVisibleMapArea() {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("minLat");
    next.delete("maxLat");
    next.delete("minLng");
    next.delete("maxLng");
    next.delete("page");

    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function startPolygonDrawing() {
    clearDraftPolygon();
    setDrawingMode(true);
  }

  function cancelPolygonDrawing() {
    setDrawingMode(false);
    clearDraftPolygon();
  }

  function clearDraftPolygon() {
    setDrawPoints([]);
  }

  function removePolygonFilter() {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("poly");
    next.delete("page");
    clearDraftPolygon();
    setDrawingMode(false);

    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function applyPolygonSearch() {
    if (drawPoints.length < 3) return;

    const next = new URLSearchParams(searchParams.toString());
    next.set("poly", drawPoints.map((point) => `${roundCoordinate(point.lat)},${roundCoordinate(point.lng)}`).join(";"));
    next.delete("minLat");
    next.delete("maxLat");
    next.delete("minLng");
    next.delete("maxLng");
    next.delete("page");

    setDrawingMode(false);
    router.push(`${pathname}?${next.toString()}`);
  }

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
          scrollWheelZoom: true,
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

        setMapReadyTick((value) => value + 1);
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

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !drawingMode) return;

    const handleClick = (event: { latlng: { lat: number; lng: number } }) => {
      setDrawPoints((currentPoints) => [...currentPoints, { lat: event.latlng.lat, lng: event.latlng.lng }]);
    };

    map.on("click", handleClick);

    return () => {
      map.off("click", handleClick);
    };
  }, [drawingMode, mapReadyTick]);

  useEffect(() => {
    let cancelled = false;

    async function renderDraftPolygon() {
      const map = mapInstanceRef.current;
      if (!map) return;
      const L = await loadLeaflet();
      if (cancelled) return;

      drawnShapeRef.current?.remove?.();
      drawnShapeRef.current = null;
      pointLayersRef.current.forEach((layer) => layer.remove?.());
      pointLayersRef.current = [];

      drawPoints.forEach((point, index) => {
        const pointLayer = L.circleMarker([point.lat, point.lng], {
          radius: 6,
          weight: 2,
          color: "#2f5e4e",
          fillColor: "#c9942e",
          fillOpacity: 0.9
        }).addTo(map);
        pointLayer.bindPopup?.(`Punkt ${index + 1}`);
        pointLayersRef.current.push(pointLayer);
      });

      if (drawPoints.length >= 3) {
        drawnShapeRef.current = L.polygon(toLeafletCoordinates(drawPoints), {
          color: "#c9942e",
          weight: 3,
          fillOpacity: 0.16
        }).addTo(map);
      } else if (drawPoints.length >= 2) {
        drawnShapeRef.current = L.polyline(toLeafletCoordinates(drawPoints), {
          color: "#c9942e",
          weight: 3,
          dashArray: "6 6"
        }).addTo(map);
      }
    }

    renderDraftPolygon();

    return () => {
      cancelled = true;
    };
  }, [drawPoints, mapReadyTick]);

  useEffect(() => {
    let cancelled = false;

    async function renderActivePolygon() {
      const map = mapInstanceRef.current;
      if (!map) return;
      const L = await loadLeaflet();
      if (cancelled) return;

      activePolygonRef.current?.remove?.();
      activePolygonRef.current = null;

      if (activePolygonPoints.length >= 3) {
        const coordinates = toLeafletCoordinates(activePolygonPoints);
        activePolygonRef.current = L.polygon(coordinates, {
          color: "#2f5e4e",
          weight: 3,
          fillOpacity: 0.12
        }).addTo(map);
      }
    }

    renderActivePolygon();

    return () => {
      cancelled = true;
    };
  }, [polygonParam, mapReadyTick]);

  return (
    <aside className={`map-panel ${variant === "wide" ? "map-panel-wide" : ""} ${variant === "large" ? "map-panel-large" : ""}`} id="map">
      <div className="map-head">
        <div>
          <div className="map-title-actions-row-v73"><h2>Karte der Objekte</h2>
          <p className="meta">Suchen Sie in der sichtbaren Kartenfläche oder zeichnen Sie eine eigene Suchregion.</p>
        </div>
        <span className="map-count">{withCoordinates.length}</span>
      </div>

      <div className="map-actions">
        <div className="map-title-actions-v73"><button type="button" className="btn btn-primary btn-small" onClick={applyVisibleMapArea} disabled={withCoordinates.length === 0 || Boolean(error)}>{stage61MapT().searchVisible}</button>
        {mapBoundsActive ? (
          <button type="button" className="btn btn-ghost btn-small" onClick={clearVisibleMapArea}>
            Kartenausschnitt entfernen
          </button>
        ) : null}
        <button type="button" className="btn btn-ghost btn-small" onClick={startPolygonDrawing} disabled={Boolean(error)}>{stage61MapT().drawRegion}</button></div><span className="map-title-actions-row-v73-closed" /></div>
        {polygonActive ? (
          <button type="button" className="btn btn-ghost btn-small" onClick={removePolygonFilter}>
            Polygon entfernen
          </button>
        ) : null}
      </div>

      {drawingMode ? (
        <div className="polygon-toolbar">
          <div>
            <b>{stage61MapT().drawRegion}</b>
            <span>{stage61MapT().drawHelp}</span>
          </div>
          <div className="polygon-toolbar-actions">
            <button type="button" className="btn btn-primary btn-small" onClick={applyPolygonSearch} disabled={drawPoints.length < 3}>{stage61MapT().applyPolygon} ({drawPoints.length})</button>
            <button type="button" className="btn btn-ghost btn-small" onClick={clearDraftPolygon} disabled={drawPoints.length === 0}>{stage61MapT().clearPoints}</button>
            <button type="button" className="btn btn-ghost btn-small" onClick={cancelPolygonDrawing}>{stage61MapT().cancel}</button>
          </div>
        </div>
      ) : null}

      {mapBoundsActive ? (
        <div className="map-area-note">Filter nach sichtbarer Kartenfläche ist aktiv. Karte verschieben oder zoomen und erneut anwenden.</div>
      ) : null}

      {polygonActive ? (
        <div className="map-area-note">Polygon-Suche ist aktiv. Die Objekte werden nach der gezeichneten Region gefiltert.</div>
      ) : null}

      {error ? (
        <div className="map-error">
          <b>Karte konnte nicht geladen werden</b>
          <span>{error}</span>
        </div>
      ) : (
        <div ref={mapElementRef} className={drawingMode ? "leaflet-map leaflet-map-drawing" : "leaflet-map"} aria-label="Karte der Objekte" />
      )}

      <div className="map-legend">
        <span><i className="legend-dot wohnhaus" />{stage61MapT().houses}</span>
        <span><i className="legend-dot wohnung" />{stage61MapT().apartments}</span>
        <span><i className="legend-dot grund" />{stage61MapT().land}</span>
        <span><i className="legend-dot gewerbe" />{stage61MapT().commercial}</span>
        <span><i className="legend-dot land-wald" />{stage61MapT().landForest}</span>
        <span><i className="legend-dot garagen" />{stage61MapT().garages}</span>
        <span><i className="legend-dot sonstige" />{stage61MapT().other}</span>
      </div>
    </aside>
  );
}
