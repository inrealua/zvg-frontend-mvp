import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function patchFile(rel, updater) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    console.log("skip missing", rel);
    return;
  }

  const before = fs.readFileSync(full, "utf8");
  const after = updater(before);

  if (after !== before) {
    fs.writeFileSync(full, after, "utf8");
    console.log("patched", rel);
  } else {
    console.log("unchanged", rel);
  }
}

/**
 * STAGE 75
 *
 * Fixes:
 * 1) Map popup mini-card i18n:
 *    - property type / status / labels / details button translated
 *    - title is object title, not hero text
 * 2) Language button style smaller and visually same as menu buttons
 * 3) Leaflet popup photo gallery:
 *    - React component gallery cannot work inside Leaflet HTML string.
 *    - add plain JS gallery for popup images with prev/next buttons.
 */

/* -------------------------------------------------------------------------- */
/* 1. PropertyMap popup dictionary and gallery helpers                         */
/* -------------------------------------------------------------------------- */

patchFile("components/PropertyMap.tsx", (s) => {
  // Ensure this file stays a client component and imports are not before directive.
  s = s.replace(/import\s+\{\s*PropertyGalleryImage\s*\}\s+from\s+["']@\/components\/PropertyGalleryImage["'];?\s*\n/g, "");
  s = s.replace(/["']use client["'];\s*\n?/g, "");
  s = `"use client";\n\n` + s.trimStart();

  // Add popup i18n/helper block once.
  if (!s.includes("stage75PopupText")) {
    const helper = `
type Stage75Locale = "de" | "ru" | "en";

const stage75PopupText = {
  de: {
    details: "Details ansehen",
    appointment: "Termin",
    marketValue: "Verkehrswert",
    active: "Aktuell",
    cancelled: "Termin aufgehoben",
    archive: "Archiv",
    unknown: "Unbekannt",
    propertyTypes: {
      residential: "Wohnhäuser",
      apartments: "Wohnungen",
      commercial: "Gewerbe",
      land: "Grundstücke",
      landForest: "Land / Wald",
      garages: "Garagen / Parken",
      other: "Sonstige",
    },
  },
  ru: {
    details: "Подробнее",
    appointment: "Термин",
    marketValue: "Оценочная стоимость",
    active: "Активно",
    cancelled: "Термин отменён",
    archive: "Архив",
    unknown: "Неизвестно",
    propertyTypes: {
      residential: "Жилые дома",
      apartments: "Квартиры",
      commercial: "Коммерция",
      land: "Участки",
      landForest: "Земля / лес",
      garages: "Гаражи / парковки",
      other: "Прочее",
    },
  },
  en: {
    details: "View details",
    appointment: "Auction date",
    marketValue: "Market value",
    active: "Active",
    cancelled: "Auction cancelled",
    archive: "Archive",
    unknown: "Unknown",
    propertyTypes: {
      residential: "Residential houses",
      apartments: "Apartments",
      commercial: "Commercial",
      land: "Plots",
      landForest: "Land / forest",
      garages: "Garages / parking",
      other: "Other",
    },
  },
} as const;

function stage75Locale(input?: string): Stage75Locale {
  return input === "ru" || input === "en" || input === "de" ? input : "de";
}

function stage75ReadClientLocale(): Stage75Locale {
  if (typeof document === "undefined") return "de";
  const pathLocale = window.location.pathname.split("/").filter(Boolean)[0];
  if (pathLocale === "ru" || pathLocale === "de" || pathLocale === "en") return pathLocale;
  const cookie = document.cookie.match(/(?:^|;\\s*)zvg_locale=(ru|de|en)(?:;|$)/);
  return stage75Locale(cookie?.[1]);
}

function stage75PopupT(locale?: string) {
  return stage75PopupText[stage75Locale(locale)];
}

function stage75Normalize(text: unknown) {
  return String(text ?? "")
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[._\\s/]+/g, "-");
}

function stage75PropertyTypeLabel(value: unknown, locale?: string) {
  const t = stage75PopupT(locale);
  const key = stage75Normalize(value);

  if (["wohnhauser", "wohnhäuser", "wohnhaus", "residential", "residential-houses", "houses", "hauser", "häuser", "жилые-дома", "жилой-дом"].includes(key)) return t.propertyTypes.residential;
  if (["wohnungen", "wohnung", "apartment", "apartments", "квартиры", "квартира"].includes(key)) return t.propertyTypes.apartments;
  if (["gewerbe", "commercial", "коммерция"].includes(key)) return t.propertyTypes.commercial;
  if (["grundstucke", "grundstücke", "grundstuecke", "plots", "land", "участки", "участок"].includes(key)) return t.propertyTypes.land;
  if (["land-wald", "land-forest", "земля-лес"].includes(key)) return t.propertyTypes.landForest;
  if (["garagen-parken", "garagen", "parking", "garages", "гаражи-парковки"].includes(key)) return t.propertyTypes.garages;
  if (["sonstige", "other", "прочее"].includes(key)) return t.propertyTypes.other;

  return String(value || t.propertyTypes.other);
}

function stage75StatusLabel(value: unknown, locale?: string) {
  const t = stage75PopupT(locale);
  const key = stage75Normalize(value);

  if (["active", "aktiv", "aktuell", "активно"].includes(key)) return t.active;
  if (["cancelled", "aufgehoben", "termin-aufgehoben", "отменено", "термин-отменен", "термин-отменён"].includes(key)) return t.cancelled;
  if (["archive", "archiv", "archived", "архив"].includes(key)) return t.archive;

  return t.unknown;
}

function stage75BestTitle(property: any, locale?: string) {
  const loc = stage75Locale(locale);
  return (
    property?.title ||
    property?.titleRu && loc === "ru" ? property.titleRu : null ||
    property?.titleDe && loc === "de" ? property.titleDe : null ||
    property?.titleEn && loc === "en" ? property.titleEn : null ||
    property?.headline ||
    property?.address ||
    property?.street ||
    stage75PropertyTypeLabel(property?.typeGroup || property?.propertyType || property?.type, locale)
  );
}

function stage75ImageUrls(property: any) {
  const raw = [
    ...(Array.isArray(property?.images) ? property.images : []),
    ...(Array.isArray(property?.photos) ? property.photos : []),
    ...(Array.isArray(property?.propertyImages) ? property.propertyImages : []),
    property?.imageUrl,
    property?.mainImage,
    property?.coverImage,
    property?.photoUrl,
  ];

  const urls = raw
    .map((item: any) => typeof item === "string" ? item : item?.url || item?.src || item?.imageUrl)
    .filter(Boolean);

  return Array.from(new Set(urls));
}

function stage75PopupGalleryHtml(property: any, fallback: string, alt: string) {
  const urls = stage75ImageUrls(property);
  if (fallback && !urls.includes(fallback)) urls.unshift(fallback);
  const safeUrls = urls.length ? urls : [fallback].filter(Boolean);

  if (!safeUrls.length) return "";

  const encoded = escapeHtml(JSON.stringify(safeUrls));
  const first = escapeHtml(safeUrls[0]);
  const safeAlt = escapeHtml(alt);

  const controls = safeUrls.length > 1
    ? \`<button type="button" class="popup-gallery-nav-v75 popup-gallery-prev-v75" data-popup-gallery-prev aria-label="Previous photo">‹</button>
       <button type="button" class="popup-gallery-nav-v75 popup-gallery-next-v75" data-popup-gallery-next aria-label="Next photo">›</button>
       <span class="popup-gallery-count-v75" data-popup-gallery-count>1/\${safeUrls.length}</span>\`
    : "";

  return \`<div class="popup-gallery-v75" data-popup-gallery data-images="\${encoded}" data-index="0">
    <img src="\${first}" alt="\${safeAlt}" />
    \${controls}
  </div>\`;
}

function stage75BindPopupGallery(root: ParentNode = document) {
  const galleries = Array.from(root.querySelectorAll<HTMLElement>("[data-popup-gallery]"));

  for (const gallery of galleries) {
    if (gallery.dataset.bound === "1") continue;
    gallery.dataset.bound = "1";

    let urls: string[] = [];
    try {
      urls = JSON.parse(gallery.dataset.images || "[]");
    } catch {
      urls = [];
    }

    if (urls.length < 2) continue;

    const img = gallery.querySelector<HTMLImageElement>("img");
    const count = gallery.querySelector<HTMLElement>("[data-popup-gallery-count]");

    function render(index: number) {
      const safeIndex = (index + urls.length) % urls.length;
      gallery.dataset.index = String(safeIndex);
      if (img) img.src = urls[safeIndex];
      if (count) count.textContent = \`\${safeIndex + 1}/\${urls.length}\`;
    }

    gallery.querySelector("[data-popup-gallery-prev]")?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      render(Number(gallery.dataset.index || "0") - 1);
    });

    gallery.querySelector("[data-popup-gallery-next]")?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      render(Number(gallery.dataset.index || "0") + 1);
    });
  }
}
`;
    // Put helper after imports block, but before component logic. Simpler: after last import.
    const lastImportMatch = [...s.matchAll(/^import[\s\S]*?;\s*$/gm)].pop();
    if (lastImportMatch) {
      const idx = lastImportMatch.index + lastImportMatch[0].length;
      s = s.slice(0, idx) + "\n" + helper + s.slice(idx);
    } else {
      s = helper + "\n" + s;
    }
  }

  // Make sure popup gallery is bound after map updates/opening.
  if (!s.includes("stage75BindPopupGallery();")) {
    // Add a periodic lightweight binding in existing useEffect if easy.
    s = s.replace(
      /useEffect\(\(\) => \{/,
      `useEffect(() => {
    const stage75GalleryTimer = window.setInterval(() => stage75BindPopupGallery(), 350);`
    );
    s = s.replace(
      /return\s*\(\)\s*=>\s*\{/,
      `return () => {
      window.clearInterval(stage75GalleryTimer);`
    );
  }

  // Replace obvious hardcoded popup labels generated in template strings.
  s = s
    .replace(/Wohnhäuser/g, '${stage75PropertyTypeLabel(property?.typeGroup || property?.propertyType || property?.type, locale)}')
    .replace(/Wohnungen/g, '${stage75PropertyTypeLabel(property?.typeGroup || property?.propertyType || property?.type, locale)}')
    .replace(/Termin aufgehoben/g, '${stage75StatusLabel(property?.status, locale)}')
    .replace(/Aktuell/g, '${stage75StatusLabel(property?.status, locale)}')
    .replace(/Details ansehen/g, '${stage75PopupT(locale).details}')
    .replace(/Verkehrswert/g, '${stage75PopupT(locale).marketValue}');

  // If the popup title accidentally uses hero title, replace common literal.
  s = s
    .replace(/Professionelles Werkzeug/g, '${escapeHtml(stage75BestTitle(property, locale))}')
    .replace(/Профессиональный инструмент/g, '${escapeHtml(stage75BestTitle(property, locale))}')
    .replace(/Professional tool/g, '${escapeHtml(stage75BestTitle(property, locale))}');

  // If there is a popup html image <img src=...>, wrap with gallery if possible.
  // This is deliberately broad for template strings.
  if (!s.includes("stage75PopupGalleryHtml(property")) {
    s = s.replace(
      /<img\s+src="\$\{([^}]+)\}"\s+alt="\$\{([^}]+)\}"\s*\/?>/g,
      '${stage75PopupGalleryHtml(property, $1, $2)}'
    );
  }

  return s;
});

/* -------------------------------------------------------------------------- */
/* 2. Language button size/style                                               */
/* -------------------------------------------------------------------------- */

patchFile("app/globals.css", (s) => {
  if (s.includes("/* Stage 75 popup i18n language size and gallery fixes */")) return s;

  return s + `

/* Stage 75 popup i18n language size and gallery fixes */

/* Make language switcher same size/weight as other menu buttons */
.language-switcher-shell-v74 {
  min-width: 78px !important;
  height: 40px !important;
  padding: 0 30px 0 14px !important;
  border-radius: 999px !important;
  font-size: 14px !important;
  font-weight: 700 !important;
  box-shadow: none !important;
}

.language-switcher-current-v74 {
  font-size: 13px !important;
  font-weight: 700 !important;
  letter-spacing: 0.01em !important;
}

.language-switcher-shell-v74::after {
  right: 12px !important;
  font-size: 13px !important;
}

/* Fallback if normal select style is still used somewhere */
.language-select:not(.language-select-v74) {
  min-width: 78px !important;
  height: 40px !important;
  padding: 0 30px 0 14px !important;
  border: 1px solid rgba(47, 79, 62, 0.22) !important;
  border-radius: 999px !important;
  background: #fff !important;
  color: #2f604f !important;
  font-size: 13px !important;
  font-weight: 700 !important;
}

/* Leaflet popup gallery */
.popup-gallery-v75 {
  position: relative !important;
  width: 100% !important;
  height: 150px !important;
  overflow: hidden !important;
  border-radius: 18px 18px 0 0 !important;
  background: #edf3ef !important;
}

.popup-gallery-v75 img {
  width: 100% !important;
  height: 100% !important;
  display: block !important;
  object-fit: cover !important;
}

.popup-gallery-nav-v75 {
  position: absolute !important;
  top: 50% !important;
  z-index: 8 !important;
  width: 32px !important;
  height: 32px !important;
  transform: translateY(-50%) !important;
  border: 1px solid rgba(255,255,255,0.86) !important;
  border-radius: 999px !important;
  background: rgba(13, 38, 28, 0.72) !important;
  color: #fff !important;
  font-size: 24px !important;
  font-weight: 800 !important;
  line-height: 28px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  cursor: pointer !important;
  box-shadow: 0 4px 14px rgba(0,0,0,0.22) !important;
}

.popup-gallery-prev-v75 {
  left: 10px !important;
}

.popup-gallery-next-v75 {
  right: 10px !important;
}

.popup-gallery-count-v75 {
  position: absolute !important;
  right: 10px !important;
  bottom: 10px !important;
  z-index: 8 !important;
  padding: 4px 8px !important;
  border-radius: 999px !important;
  background: rgba(13, 38, 28, 0.72) !important;
  color: #fff !important;
  font-size: 12px !important;
  font-weight: 800 !important;
}

/* Popup close button: keep obvious */
.leaflet-popup-close-button {
  width: 32px !important;
  height: 32px !important;
  right: 10px !important;
  top: 10px !important;
  border: 1px solid rgba(255,255,255,0.9) !important;
  border-radius: 999px !important;
  background: rgba(12, 31, 23, 0.80) !important;
  color: #fff !important;
  font-size: 22px !important;
  font-weight: 900 !important;
  line-height: 29px !important;
  box-shadow: 0 6px 18px rgba(0,0,0,0.24) !important;
  z-index: 30 !important;
  opacity: 1 !important;
}

.leaflet-popup-close-button:hover {
  background: rgba(12, 31, 23, 0.94) !important;
  color: #fff !important;
}
`;
});

console.log("Stage 75 patch completed.");
