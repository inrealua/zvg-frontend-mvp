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

function writeFile(rel, content) {
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, "utf8");
  console.log("written", rel);
}

/**
 * Stage 76
 *
 * Цель:
 * 1) Вернуть нормальное отображение фото на карточках главной.
 * 2) Убрать сломанные ${stage75...} тексты из popup карты.
 * 3) В popup карты НЕ трогать галерею и не ломать старую структуру.
 * 4) Убрать "Professionelles Werkzeug / Профессиональный инструмент / Professional tool" из popup title.
 *
 * Причина:
 * Stage 75 пытался вставить React-галерею и JS-переводы слишком агрессивно.
 */

/* -------------------------------------------------------------------------- */
/* 1. Safe card gallery component for main cards                               */
/* -------------------------------------------------------------------------- */

const safeGallery = `"use client";

import { MouseEvent, useMemo, useState } from "react";

type ImageLike = {
  url?: string | null;
  src?: string | null;
  imageUrl?: string | null;
  path?: string | null;
};

type MainCardGalleryProps = {
  images?: ImageLike[] | string[] | null;
  fallbackSrc?: string | null;
  alt?: string;
};

function getUrl(item: ImageLike | string | null | undefined): string | null {
  if (!item) return null;
  if (typeof item === "string") return item;
  return item.url || item.src || item.imageUrl || item.path || null;
}

export function MainCardGallery({ images, fallbackSrc, alt = "" }: MainCardGalleryProps) {
  const urls = useMemo(() => {
    const list = Array.isArray(images) ? images.map(getUrl).filter(Boolean) as string[] : [];
    if (fallbackSrc && !list.includes(fallbackSrc)) list.unshift(fallbackSrc);
    return Array.from(new Set(list.filter(Boolean)));
  }, [images, fallbackSrc]);

  const [index, setIndex] = useState(0);
  const src = urls[index] || fallbackSrc || "";

  function move(delta: number, event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!urls.length) return;
    setIndex((current) => (current + delta + urls.length) % urls.length);
  }

  if (!src) {
    return <div className="main-card-gallery-v76 main-card-gallery-empty-v76" aria-label={alt} />;
  }

  return (
    <div className="main-card-gallery-v76">
      <img src={src} alt={alt} className="main-card-gallery-img-v76" loading="lazy" />

      {urls.length > 1 ? (
        <>
          <button type="button" className="main-card-gallery-nav-v76 main-card-gallery-prev-v76" aria-label="Previous photo" onClick={(event) => move(-1, event)}>
            ‹
          </button>
          <button type="button" className="main-card-gallery-nav-v76 main-card-gallery-next-v76" aria-label="Next photo" onClick={(event) => move(1, event)}>
            ›
          </button>
          <span className="main-card-gallery-count-v76">{index + 1}/{urls.length}</span>
        </>
      ) : null}
    </div>
  );
}

export default MainCardGallery;
`;

writeFile("components/MainCardGallery.tsx", safeGallery);

/* -------------------------------------------------------------------------- */
/* 2. PropertyCard: replace broken gallery/image markup with safe gallery       */
/* -------------------------------------------------------------------------- */

for (const rel of ["components/PropertyCard.tsx", "app/components/PropertyCard.tsx"]) {
  patchFile(rel, (s) => {
    // Remove older gallery imports.
    s = s.replace(/import\s+\{\s*PropertyGalleryImage\s*\}\s+from\s+["']@\/components\/PropertyGalleryImage["'];?\s*\n/g, "");
    s = s.replace(/import\s+\{\s*MainCardGallery\s*\}\s+from\s+["']@\/components\/MainCardGallery["'];?\s*\n/g, "");

    // Add safe gallery import.
    s = `import { MainCardGallery } from "@/components/MainCardGallery";\n` + s.trimStart();

    // Replace Stage 75B gallery if already inserted.
    s = s.replace(
      /<MainCardGallery\s+[^>]*?\/>/g,
      `<MainCardGallery
              images={(property as any).images || (property as any).photos}
              fallbackSrc={(property as any).imageUrl || (property as any).mainImage || (property as any).coverImage || (property as any).photoUrl || (property as any).images?.[0]?.url || (property as any).images?.[0]?.src || (property as any).images?.[0]?.imageUrl}
              alt={(property as any).title || (property as any).address || ""}
            />`
    );

    // Replace Next Image with safe gallery. Keep broad but only property card file.
    s = s.replace(
      /<Image\s+([^>]*?)src=\{([^}]*?(?:imageUrl|mainImage|coverImage|photoUrl)[^}]*)\}([^>]*?)\/>/g,
      `<MainCardGallery
              images={(property as any).images || (property as any).photos}
              fallbackSrc={$2}
              alt={(property as any).title || (property as any).address || ""}
            />`
    );

    // Replace native img with safe gallery.
    s = s.replace(
      /<img\s+([^>]*?)src=\{([^}]*?(?:imageUrl|mainImage|coverImage|photoUrl)[^}]*)\}([^>]*?)\/>/g,
      `<MainCardGallery
              images={(property as any).images || (property as any).photos}
              fallbackSrc={$2}
              alt={(property as any).title || (property as any).address || ""}
            />`
    );

    return s;
  });
}

/* -------------------------------------------------------------------------- */
/* 3. PublicPropertiesPage: make sure images relation is included only where OK */
/* -------------------------------------------------------------------------- */

patchFile("components/PublicPropertiesPage.tsx", (s) => {
  // Remove invalid relation if still present.
  s = s.replace(/\n\s*propertyImages:\s*true,\s*/g, "\n");

  // Remove include images from select-only queries.
  s = s.replace(
    /prisma\.property\.findMany\(\{\s*include:\s*\{\s*images:\s*true,\s*\},\s*select:/g,
    "prisma.property.findMany({ select:"
  );

  // If main findMany already has include with translationInclude, ensure images are there.
  s = s.replace(
    /include:\s*\{\s*\.\.\.translationInclude\(locale\),\s*(?!images:)/g,
    `include: {
        ...translationInclude(locale),
        images: {
          orderBy: [{ isMain: "desc" }, { sortOrder: "asc" }],
        },`
  );

  return s;
});

/* -------------------------------------------------------------------------- */
/* 4. PropertyMap: undo broken literal ${stage75...} in popup                  */
/* -------------------------------------------------------------------------- */

patchFile("components/PropertyMap.tsx", (s) => {
  // Keep use client first.
  s = s.replace(/import\s+\{\s*PropertyGalleryImage\s*\}\s+from\s+["']@\/components\/PropertyGalleryImage["'];?\s*\n/g, "");
  s = s.replace(/["']use client["'];\s*\n?/g, "");
  s = `"use client";\n\n` + s.trimStart();

  // Replace escaped literal placeholders in HTML template strings with safe static/old values.
  // This avoids displaying ${stage75...} to users.
  s = s.replace(/\$?\{stage75StatusLabel\([^}]*\)\}/g, "${escapeHtml(statusText)}");
  s = s.replace(/\$?\{stage75PropertyTypeLabel\([^}]*\)\}/g, "${escapeHtml(groupText)}");
  s = s.replace(/\$?\{stage75PopupT\(stage75ReadClientLocale\(\)\)\.details\}/g, "${escapeHtml(detailsText)}");
  s = s.replace(/\$?\{stage75PopupT\(stage75ReadClientLocale\(\)\)\.marketValue\}/g, "${escapeHtml(valueText)}");
  s = s.replace(/\$?\{escapeHtml\(stage75BestTitle\(property,\s*stage75ReadClientLocale\(\)\)\)\}/g, "${escapeHtml(titleText)}");

  // If raw text still appears.
  s = s.replace(/Professionelles Werkzeug/g, "${escapeHtml(titleText)}");
  s = s.replace(/Профессиональный инструмент/g, "${escapeHtml(titleText)}");
  s = s.replace(/Professional tool/g, "${escapeHtml(titleText)}");

  // Add simple popup text variables near popup HTML generation.
  // We search for common html builder map property callback.
  if (!s.includes("const detailsText = stage76PopupDetails")) {
    const helper = `
function stage76PopupLocale() {
  if (typeof window === "undefined") return "de";
  const first = window.location.pathname.split("/").filter(Boolean)[0];
  if (first === "ru" || first === "de" || first === "en") return first;
  const cookie = document.cookie.match(/(?:^|;\\s*)zvg_locale=(ru|de|en)(?:;|$)/);
  return cookie?.[1] || "de";
}

function stage76PopupDetails() {
  const locale = stage76PopupLocale();
  if (locale === "ru") return "Подробнее";
  if (locale === "en") return "View details";
  return "Details ansehen";
}

function stage76PopupValue() {
  const locale = stage76PopupLocale();
  if (locale === "ru") return "Оценочная стоимость";
  if (locale === "en") return "Market value";
  return "Verkehrswert";
}

function stage76PopupTitle(property: any) {
  return property?.title || property?.headline || property?.address || property?.street || "";
}
`;
    // Insert after imports.
    const lastImport = [...s.matchAll(/^import[\s\S]*?;\s*$/gm)].pop();
    if (lastImport) {
      const idx = lastImport.index + lastImport[0].length;
      s = s.slice(0, idx) + "\n" + helper + s.slice(idx);
    } else {
      s = helper + "\n" + s;
    }
  }

  // Inject variables if a popup function has `const html = ` or similar and variables are absent.
  // These variables are harmless if already named groupText/statusText in your code.
  s = s.replace(
    /(const\s+html\s*=\s*`)/g,
    `const titleText = stage76PopupTitle(property);
      const detailsText = stage76PopupDetails();
      const valueText = stage76PopupValue();
      $1`
  );

  s = s.replace(
    /(marker\.bindPopup\(\s*`)/g,
    `const titleText = stage76PopupTitle(property);
      const detailsText = stage76PopupDetails();
      const valueText = stage76PopupValue();
      $1`
  );

  return s;
});

/* -------------------------------------------------------------------------- */
/* 5. CSS: restore card photo area                                             */
/* -------------------------------------------------------------------------- */

patchFile("app/globals.css", (s) => {
  if (s.includes("/* Stage 76 restore main cards and map popup */")) return s;

  return s + `

/* Stage 76 restore main cards and map popup */

.main-card-gallery-v76 {
  position: relative !important;
  width: 100% !important;
  height: 220px !important;
  min-height: 220px !important;
  overflow: hidden !important;
  background: #edf3ef !important;
}

.main-card-gallery-img-v76 {
  width: 100% !important;
  height: 100% !important;
  display: block !important;
  object-fit: cover !important;
}

.main-card-gallery-empty-v76 {
  background: #edf3ef !important;
}

.main-card-gallery-nav-v76 {
  position: absolute !important;
  top: 50% !important;
  z-index: 6 !important;
  width: 34px !important;
  height: 34px !important;
  transform: translateY(-50%) !important;
  border: 1px solid rgba(255,255,255,0.9) !important;
  border-radius: 999px !important;
  background: rgba(13, 38, 28, 0.72) !important;
  color: #fff !important;
  font-size: 25px !important;
  font-weight: 800 !important;
  line-height: 28px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  cursor: pointer !important;
  box-shadow: 0 4px 14px rgba(0,0,0,0.22) !important;
  opacity: 0 !important;
  transition: opacity 0.15s ease, background 0.15s ease !important;
}

.property-card:hover .main-card-gallery-nav-v76,
.card:hover .main-card-gallery-nav-v76,
[class*="card"]:hover .main-card-gallery-nav-v76 {
  opacity: 1 !important;
}

.main-card-gallery-prev-v76 {
  left: 10px !important;
}

.main-card-gallery-next-v76 {
  right: 10px !important;
}

.main-card-gallery-count-v76 {
  position: absolute !important;
  right: 10px !important;
  bottom: 10px !important;
  z-index: 6 !important;
  padding: 4px 8px !important;
  border-radius: 999px !important;
  background: rgba(13, 38, 28, 0.72) !important;
  color: #fff !important;
  font-size: 12px !important;
  font-weight: 800 !important;
}

/* Old broken gallery wrappers should not add blank space over image */
.main-card-gallery-v75b,
.property-gallery-image-v74 {
  min-height: unset;
}
`;
});

console.log("Stage 76 patch completed.");
