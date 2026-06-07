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
 * Stage 75B
 *
 * Fixes:
 * 1) TypeScript error in PropertyMap stage75BestTitle caused by wrong precedence:
 *      property?.titleRu && loc === "ru" ? property.titleRu : null ||
 *
 * 2) Gallery should be on main page object cards, not only map popup.
 *    Leaflet popup gallery may stay, but main PropertyCard gets a client-side image carousel.
 */

/* -------------------------------------------------------------------------- */
/* 1. Fix PropertyMap stage75BestTitle                                         */
/* -------------------------------------------------------------------------- */

patchFile("components/PropertyMap.tsx", (s) => {
  // Fix exact broken function if present.
  s = s.replace(
    /function stage75BestTitle\(property: any, locale\?: string\) \{[\s\S]*?\n\}/,
    `function stage75BestTitle(property: any, locale?: string) {
  const loc = stage75Locale(locale);

  if (property?.title) return property.title;
  if (loc === "ru" && property?.titleRu) return property.titleRu;
  if (loc === "de" && property?.titleDe) return property.titleDe;
  if (loc === "en" && property?.titleEn) return property.titleEn;

  return (
    property?.headline ||
    property?.address ||
    property?.street ||
    stage75PropertyTypeLabel(property?.typeGroup || property?.propertyType || property?.type, locale)
  );
}`
  );

  // If regex did not match, fix the broken lines directly.
  s = s.replace(
    /property\?\.titleRu && loc === "ru" \? property\.titleRu : null \|\|/g,
    '(loc === "ru" && property?.titleRu ? property.titleRu : null) ||'
  );
  s = s.replace(
    /property\?\.titleDe && loc === "de" \? property\.titleDe : null \|\|/g,
    '(loc === "de" && property?.titleDe ? property.titleDe : null) ||'
  );
  s = s.replace(
    /property\?\.titleEn && loc === "en" \? property\.titleEn : null \|\|/g,
    '(loc === "en" && property?.titleEn ? property.titleEn : null) ||'
  );

  return s;
});

/* -------------------------------------------------------------------------- */
/* 2. Main card gallery component                                              */
/* -------------------------------------------------------------------------- */

const cardGallery = `"use client";

import Image from "next/image";
import { MouseEvent, useMemo, useState } from "react";

type ImageLike = {
  url?: string | null;
  src?: string | null;
  imageUrl?: string | null;
  alt?: string | null;
};

type MainCardGalleryProps = {
  images?: ImageLike[] | string[] | null;
  fallbackSrc?: string | null;
  alt?: string;
  priority?: boolean;
};

function readUrl(item: ImageLike | string | null | undefined): string | null {
  if (!item) return null;
  if (typeof item === "string") return item;
  return item.url || item.src || item.imageUrl || null;
}

export function MainCardGallery({
  images,
  fallbackSrc,
  alt = "",
  priority = false,
}: MainCardGalleryProps) {
  const urls = useMemo(() => {
    const list = Array.isArray(images) ? images.map(readUrl).filter(Boolean) as string[] : [];
    if (fallbackSrc && !list.includes(fallbackSrc)) list.unshift(fallbackSrc);
    return Array.from(new Set(list.filter(Boolean)));
  }, [images, fallbackSrc]);

  const [index, setIndex] = useState(0);
  const src = urls[index] || fallbackSrc || "/placeholder-property.jpg";
  const canSlide = urls.length > 1;

  function move(delta: number, event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIndex((current) => (current + delta + urls.length) % urls.length);
  }

  return (
    <div className="main-card-gallery-v75b">
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 900px) 100vw, 33vw"
        priority={priority}
        className="main-card-gallery-image-v75b"
      />

      {canSlide ? (
        <>
          <button type="button" className="main-card-gallery-nav-v75b main-card-gallery-prev-v75b" aria-label="Previous photo" onClick={(event) => move(-1, event)}>
            ‹
          </button>
          <button type="button" className="main-card-gallery-nav-v75b main-card-gallery-next-v75b" aria-label="Next photo" onClick={(event) => move(1, event)}>
            ›
          </button>
          <span className="main-card-gallery-count-v75b">{index + 1}/{urls.length}</span>
        </>
      ) : null}
    </div>
  );
}

export default MainCardGallery;
`;

writeFile("components/MainCardGallery.tsx", cardGallery);

/* -------------------------------------------------------------------------- */
/* 3. Patch PropertyCard to use MainCardGallery                                */
/* -------------------------------------------------------------------------- */

for (const rel of ["components/PropertyCard.tsx", "app/components/PropertyCard.tsx"]) {
  patchFile(rel, (s) => {
    // Ensure no "use client" order issue if the card is client. If it is server, importing a client component is allowed.
    if (!s.includes('from "@/components/MainCardGallery"')) {
      // Remove next/image import only if it becomes unused after replacement; safer to leave it.
      s = `import { MainCardGallery } from "@/components/MainCardGallery";\n` + s;
    }

    // Fix if Stage 74 inserted PropertyGalleryImage import into card.
    s = s.replace(/import\s+\{\s*PropertyGalleryImage\s*\}\s+from\s+["']@\/components\/PropertyGalleryImage["'];?\s*\n/g, "");

    // Common card image replacement:
    // <Image ... src={property.imageUrl...} ... />
    s = s.replace(
      /<Image\s+([^>]*?)src=\{([^}]*?(?:imageUrl|mainImage|coverImage|photoUrl)[^}]*)\}([^>]*?)\/>/g,
      `<MainCardGallery images={(property as any).images || (property as any).photos || (property as any).propertyImages} fallbackSrc={$2} alt={(property as any).title || ""} />`
    );

    // If Stage 74 inserted PropertyGalleryImage in the card, replace it with MainCardGallery.
    s = s.replace(
      /<PropertyGalleryImage\s+([^>]*?)fallbackSrc=\{([^}]*)\}([^>]*?)\/>/g,
      `<MainCardGallery images={(property as any).images || (property as any).photos || (property as any).propertyImages} fallbackSrc={$2} alt={(property as any).title || ""} />`
    );

    // If image is a normal <img>.
    s = s.replace(
      /<img\s+([^>]*?)src=\{([^}]*?(?:imageUrl|mainImage|coverImage|photoUrl)[^}]*)\}([^>]*?)\/>/g,
      `<MainCardGallery images={(property as any).images || (property as any).photos || (property as any).propertyImages} fallbackSrc={$2} alt={(property as any).title || ""} />`
    );

    return s;
  });
}

/* -------------------------------------------------------------------------- */
/* 4. If main card data does not include gallery arrays, include images in query */
/* -------------------------------------------------------------------------- */

patchFile("components/PublicPropertiesPage.tsx", (s) => {
  // Try to include property images where Prisma findMany is used.
  // This is conservative and only patches when no include/select for images exists nearby.
  if (!s.includes("propertyImages: true") && !s.includes("images: true") && s.includes("prisma.property.findMany")) {
    s = s.replace(
      /(prisma\.property\.findMany\(\{\s*)/g,
      `$1
      include: {
        images: true,
        propertyImages: true,
      },`
    );
  }
  return s;
});

/* -------------------------------------------------------------------------- */
/* 5. CSS for main page card gallery                                           */
/* -------------------------------------------------------------------------- */

patchFile("app/globals.css", (s) => {
  if (s.includes("/* Stage 75B main card gallery and map title fix */")) return s;

  return s + `

/* Stage 75B main card gallery and map title fix */

.main-card-gallery-v75b {
  position: relative !important;
  width: 100% !important;
  height: 220px !important;
  min-height: 220px !important;
  overflow: hidden !important;
  background: #edf3ef !important;
}

.main-card-gallery-image-v75b {
  object-fit: cover !important;
}

.main-card-gallery-nav-v75b {
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

.property-card:hover .main-card-gallery-nav-v75b,
.card:hover .main-card-gallery-nav-v75b,
[class*="card"]:hover .main-card-gallery-nav-v75b {
  opacity: 1 !important;
}

.main-card-gallery-prev-v75b {
  left: 10px !important;
}

.main-card-gallery-next-v75b {
  right: 10px !important;
}

.main-card-gallery-nav-v75b:hover {
  background: rgba(13, 38, 28, 0.9) !important;
}

.main-card-gallery-count-v75b {
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

/* Let gallery fill common existing card image wrappers */
.property-card-image:has(.main-card-gallery-v75b),
.card-image:has(.main-card-gallery-v75b),
.object-card-image:has(.main-card-gallery-v75b),
[class*="image"]:has(.main-card-gallery-v75b) {
  position: relative !important;
  height: 220px !important;
  min-height: 220px !important;
  overflow: hidden !important;
}
`;
});

console.log("Stage 75B patch completed.");
