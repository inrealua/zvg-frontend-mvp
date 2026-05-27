export type LatLngTuple = [number, number];

export type LeafletBounds = {
  getSouth: () => number;
  getNorth: () => number;
  getWest: () => number;
  getEast: () => number;
};

export type LeafletMapInstance = {
  setView: (center: LatLngTuple, zoom: number) => LeafletMapInstance;
  fitBounds: (bounds: unknown, options?: Record<string, unknown>) => LeafletMapInstance;
  getBounds: () => LeafletBounds;
  remove: () => void;
};

export type LeafletLayer = {
  addTo: (map: LeafletMapInstance) => LeafletLayer;
  bindPopup?: (content: string) => LeafletLayer;
};

export type LeafletNamespace = {
  map: (element: HTMLElement, options?: Record<string, unknown>) => LeafletMapInstance;
  tileLayer: (url: string, options?: Record<string, unknown>) => LeafletLayer;
  divIcon: (options?: Record<string, unknown>) => unknown;
  marker: (coordinates: LatLngTuple, options?: Record<string, unknown>) => LeafletLayer;
  latLngBounds: (coordinates: LatLngTuple[]) => unknown;
};

declare global {
  interface Window {
    L?: LeafletNamespace;
    __zvgLeafletPromise?: Promise<LeafletNamespace>;
  }
}

const LEAFLET_JS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

export function loadLeaflet(): Promise<LeafletNamespace> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Leaflet can only be loaded in the browser"));
  }

  if (window.L) {
    return Promise.resolve(window.L);
  }

  if (!window.__zvgLeafletPromise) {
    window.__zvgLeafletPromise = new Promise<LeafletNamespace>((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${LEAFLET_JS_URL}"]`);

      if (existingScript) {
        existingScript.addEventListener("load", () => {
          if (window.L) resolve(window.L);
          else reject(new Error("Leaflet script loaded, but window.L is missing"));
        });
        existingScript.addEventListener("error", () => reject(new Error("Failed to load Leaflet")));
        return;
      }

      const script = document.createElement("script");
      script.src = LEAFLET_JS_URL;
      script.async = true;
      script.onload = () => {
        if (window.L) resolve(window.L);
        else reject(new Error("Leaflet script loaded, but window.L is missing"));
      };
      script.onerror = () => reject(new Error("Failed to load Leaflet"));
      document.body.appendChild(script);
    });
  }

  return window.__zvgLeafletPromise;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
