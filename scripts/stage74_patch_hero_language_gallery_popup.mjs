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
 * Stage 74
 *
 * 1) Hero text:
 * RU: ZVG-DE.COM · ВСЕ СУДЕБНЫЕ АУКЦИОНЫ В ОДНОМ МЕСТЕ
 *     Профессиональный инструмент
 *     для поиска принудительных торгов в Германии
 *
 * DE/EN adapted:
 * DE: ZVG-DE.COM · ALLE GERICHTLICHEN VERSTEIGERUNGEN AN EINEM ORT
 *     Professionelles Werkzeug
 *     für die Suche nach Zwangsversteigerungen in Deutschland
 *
 * EN: ZVG-DE.COM · ALL JUDICIAL AUCTIONS IN ONE PLACE
 *     Professional tool
 *     for finding forced auctions in Germany
 *
 * 2) Language switcher visually matches menu buttons.
 * 3) Main/map object cards get gallery prev/next overlay if multiple photos exist.
 * 4) Map popup close button becomes visible on photo background.
 */

/* -------------------------------------------------------------------------- */
/* 1. HERO TEXT                                                               */
/* -------------------------------------------------------------------------- */

patchFile("components/PublicPropertiesPage.tsx", (s) => {
  // Replace Stage73 hero dictionary cleanly.
  const cleanBlock = `type Stage73HeroLocale = "de" | "ru" | "en";

const stage73HeroText: Record<Stage73HeroLocale, { kicker: string; title: string; subtitle: string }> = {
  de: {
    kicker: "ZVG-DE.COM · ALLE GERICHTLICHEN VERSTEIGERUNGEN AN EINEM ORT",
    title: "Professionelles Werkzeug",
    subtitle: "für die Suche nach Zwangsversteigerungen in Deutschland",
  },
  ru: {
    kicker: "ZVG-DE.COM · ВСЕ СУДЕБНЫЕ АУКЦИОНЫ В ОДНОМ МЕСТЕ",
    title: "Профессиональный инструмент",
    subtitle: "для поиска принудительных торгов в Германии",
  },
  en: {
    kicker: "ZVG-DE.COM · ALL JUDICIAL AUCTIONS IN ONE PLACE",
    title: "Professional tool",
    subtitle: "for finding forced auctions in Germany",
  },
};

function stage73Hero(locale: Stage73HeroLocale) {
  return stage73HeroText[locale] || stage73HeroText.de;
}
`;

  const blockRegex = /(?:type\s+Stage73HeroLocale[\s\S]*?)?const\s+stage73HeroText[\s\S]*?function\s+stage73Hero\([^)]*\)\s*\{[\s\S]*?\n\}/;

  if (blockRegex.test(s)) {
    s = s.replace(blockRegex, cleanBlock);
  } else {
    s = cleanBlock + "\n" + s;
  }

  // Direct text replacements from older versions.
  s = s
    .replace(/ZVG-DE\.COM · СУДЕБНЫЕ АУКЦИОНЫ/g, "ZVG-DE.COM · ВСЕ СУДЕБНЫЕ АУКЦИОНЫ В ОДНОМ МЕСТЕ")
    .replace(/для поиска недвижимости в Германии/g, "для поиска принудительных торгов в Германии")
    .replace(/für die Immobiliensuche in Deutschland/g, "für die Suche nach Zwangsversteigerungen in Deutschland")
    .replace(/for finding real estate in Germany/g, "for finding forced auctions in Germany");

  return s;
});

for (const rel of ["lib/i18n/ui-texts.ts", "lib/i18n/uiTexts.ts", "lib/i18n/texts.ts"]) {
  patchFile(rel, (s) => {
    return s
      .replace(/ZVG-DE\.COM · СУДЕБНЫЕ АУКЦИОНЫ/g, "ZVG-DE.COM · ВСЕ СУДЕБНЫЕ АУКЦИОНЫ В ОДНОМ МЕСТЕ")
      .replace(/для поиска недвижимости в Германии/g, "для поиска принудительных торгов в Германии")
      .replace(/ALLE GERICHTLICHEN AUKTIONEN AN EINEM ORT/g, "ALLE GERICHTLICHEN VERSTEIGERUNGEN AN EINEM ORT")
      .replace(/für die Immobiliensuche in Deutschland/g, "für die Suche nach Zwangsversteigerungen in Deutschland")
      .replace(/for finding real estate in Germany/g, "for finding forced auctions in Germany");
  });
}

/* -------------------------------------------------------------------------- */
/* 2. LANGUAGE SWITCHER STYLE + NAVIGATION                                    */
/* -------------------------------------------------------------------------- */

const languageSwitcher = `"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChangeEvent } from "react";

const LOCALES = ["ru", "de", "en"] as const;
type Locale = (typeof LOCALES)[number];

type LanguageSwitcherProps = {
  locale?: Locale;
  labels?: {
    label?: string;
    de?: string;
    ru?: string;
    en?: string;
  };
};

function isLocale(value: string | undefined): value is Locale {
  return value === "ru" || value === "de" || value === "en";
}

function stripLocale(pathname: string) {
  return pathname.replace(/^\\/(ru|de|en)(?=\\/|$)/, "") || "/";
}

function currentLocale(pathname: string, fallback?: Locale): Locale {
  if (isLocale(fallback)) return fallback;

  const first = pathname.split("/").filter(Boolean)[0];
  if (isLocale(first)) return first;

  if (typeof document !== "undefined") {
    const match = document.cookie.match(/(?:^|;\\s*)zvg_locale=(ru|de|en)(?:;|$)/);
    if (isLocale(match?.[1])) return match[1];
  }

  return "de";
}

export function LanguageSwitcher({ locale, labels }: LanguageSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selected = currentLocale(pathname, locale);

  function onChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextLocale = event.target.value as Locale;

    document.cookie = \`zvg_locale=\${nextLocale}; path=/; max-age=31536000; samesite=lax\`;

    const cleanPath = stripLocale(pathname);
    const query = searchParams.toString();
    const nextPath = \`/\${nextLocale}\${cleanPath === "/" ? "" : cleanPath}\${query ? \`?\${query}\` : ""}\`;

    router.push(nextPath);
    router.refresh();
  }

  const shortLabel = selected.toUpperCase();

  return (
    <label className="language-switcher-shell-v74" aria-label={labels?.label ?? "Language"}>
      <span className="language-switcher-current-v74">{shortLabel}</span>
      <select className="language-select language-select-v74" value={selected} onChange={onChange}>
        <option value="de">{labels?.de ?? "Deutsch"}</option>
        <option value="ru">{labels?.ru ?? "Русский"}</option>
        <option value="en">{labels?.en ?? "English"}</option>
      </select>
    </label>
  );
}

export default LanguageSwitcher;
`;

writeFile("components/LanguageSwitcher.tsx", languageSwitcher);

/* -------------------------------------------------------------------------- */
/* 3. GALLERY COMPONENT FOR CARDS/POPUPS                                      */
/* -------------------------------------------------------------------------- */

const galleryComponent = `"use client";

import Image from "next/image";
import { MouseEvent, useMemo, useState } from "react";

type ImageLike = {
  url?: string | null;
  src?: string | null;
  imageUrl?: string | null;
  alt?: string | null;
};

type PropertyGalleryImageProps = {
  images?: ImageLike[] | string[] | null;
  fallbackSrc?: string | null;
  alt?: string;
  className?: string;
  imageClassName?: string;
  sizes?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  priority?: boolean;
};

function getUrl(item: ImageLike | string | null | undefined): string | null {
  if (!item) return null;
  if (typeof item === "string") return item;
  return item.url || item.src || item.imageUrl || null;
}

export function PropertyGalleryImage({
  images,
  fallbackSrc,
  alt = "",
  className = "",
  imageClassName = "",
  sizes = "(max-width: 768px) 100vw, 33vw",
  fill = true,
  width,
  height,
  priority = false,
}: PropertyGalleryImageProps) {
  const urls = useMemo(() => {
    const list = Array.isArray(images) ? images.map(getUrl).filter(Boolean) as string[] : [];
    if (fallbackSrc && !list.includes(fallbackSrc)) list.unshift(fallbackSrc);
    return list.filter(Boolean);
  }, [images, fallbackSrc]);

  const [index, setIndex] = useState(0);
  const src = urls[index] || fallbackSrc || "/placeholder-property.jpg";
  const canSlide = urls.length > 1;

  function go(delta: number, event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIndex((current) => (current + delta + urls.length) % urls.length);
  }

  return (
    <div className={\`property-gallery-image-v74 \${className}\`}>
      {fill ? (
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={imageClassName} />
      ) : (
        <Image src={src} alt={alt} width={width ?? 640} height={height ?? 420} priority={priority} className={imageClassName} />
      )}

      {canSlide ? (
        <>
          <button type="button" className="gallery-nav-v74 gallery-prev-v74" aria-label="Previous photo" onClick={(event) => go(-1, event)}>
            ‹
          </button>
          <button type="button" className="gallery-nav-v74 gallery-next-v74" aria-label="Next photo" onClick={(event) => go(1, event)}>
            ›
          </button>
          <span className="gallery-count-v74">{index + 1}/{urls.length}</span>
        </>
      ) : null}
    </div>
  );
}

export default PropertyGalleryImage;
`;

writeFile("components/PropertyGalleryImage.tsx", galleryComponent);

/**
 * Try to patch PropertyCard and PropertyMap popup to use PropertyGalleryImage.
 * The patch is conservative; if exact image markup differs, CSS/close fixes still apply.
 */
for (const rel of ["components/PropertyCard.tsx", "app/components/PropertyCard.tsx"]) {
  patchFile(rel, (s) => {
    if (!s.includes("PropertyGalleryImage")) {
      s = s.replace(/import Image from ["']next\/image["'];?\n?/, "");
      s = `import { PropertyGalleryImage } from "@/components/PropertyGalleryImage";\n` + s;
    }

    // Common replacement: <Image ... src={property.imageUrl || property.mainImage ...} ... />
    s = s.replace(
      /<Image\s+([^>]*?)src=\{([^}]*?(?:imageUrl|mainImage|coverImage|photoUrl)[^}]*)\}([^>]*?)\/>/g,
      `<PropertyGalleryImage images={(property as any).images || (property as any).photos || (property as any).propertyImages} fallbackSrc={$2} alt={(property as any).title || ""} $1 $3 />`
    );

    return s;
  });
}

patchFile("components/PropertyMap.tsx", (s) => {
  if (!s.includes("PropertyGalleryImage")) {
    s = s.replace(/import Image from ["']next\/image["'];?\n?/, "");
    s = `import { PropertyGalleryImage } from "@/components/PropertyGalleryImage";\n` + s;
  }

  // Common popup image replacement.
  s = s.replace(
    /<img\s+([^>]*?)src=\{([^}]*?(?:imageUrl|mainImage|coverImage|photoUrl)[^}]*)\}([^>]*?)\/>/g,
    `<PropertyGalleryImage images={(selectedProperty as any)?.images || (selectedProperty as any)?.photos || (selectedProperty as any)?.propertyImages || (property as any)?.images || (property as any)?.photos || (property as any)?.propertyImages} fallbackSrc={$2} alt={(selectedProperty as any)?.title || (property as any)?.title || ""} />`
  );

  s = s.replace(
    /<Image\s+([^>]*?)src=\{([^}]*?(?:imageUrl|mainImage|coverImage|photoUrl)[^}]*)\}([^>]*?)\/>/g,
    `<PropertyGalleryImage images={(selectedProperty as any)?.images || (selectedProperty as any)?.photos || (selectedProperty as any)?.propertyImages || (property as any)?.images || (property as any)?.photos || (property as any)?.propertyImages} fallbackSrc={$2} alt={(selectedProperty as any)?.title || (property as any)?.title || ""} $1 $3 />`
  );

  return s;
});

/* -------------------------------------------------------------------------- */
/* 4. CSS                                                                     */
/* -------------------------------------------------------------------------- */

patchFile("app/globals.css", (s) => {
  if (s.includes("/* Stage 74 hero language gallery popup fixes */")) return s;

  return s + `

/* Stage 74 hero language gallery popup fixes */

/* Language switcher: same feeling as menu buttons */
.language-switcher-shell-v74 {
  position: relative !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  min-width: 96px !important;
  height: 44px !important;
  padding: 0 34px 0 16px !important;
  border: 1px solid rgba(47, 79, 62, 0.24) !important;
  border-radius: 999px !important;
  background: #fff !important;
  color: #2f604f !important;
  font-weight: 800 !important;
  line-height: 1 !important;
  cursor: pointer !important;
  box-shadow: 0 8px 20px rgba(17, 36, 27, 0.04) !important;
}

.language-switcher-shell-v74::after {
  content: "⌄" !important;
  position: absolute !important;
  right: 14px !important;
  top: 50% !important;
  transform: translateY(-54%) !important;
  font-size: 15px !important;
  color: #2f604f !important;
  pointer-events: none !important;
}

.language-switcher-current-v74 {
  pointer-events: none !important;
  font-size: 14px !important;
  letter-spacing: 0.02em !important;
}

.language-select-v74,
.language-switcher-shell-v74 select {
  position: absolute !important;
  inset: 0 !important;
  width: 100% !important;
  height: 100% !important;
  opacity: 0 !important;
  cursor: pointer !important;
  border: 0 !important;
}

.language-switcher-shell-v74:hover {
  background: #eef7f2 !important;
  border-color: rgba(47, 79, 62, 0.35) !important;
}

/* Gallery image wrapper */
.property-gallery-image-v74 {
  position: relative !important;
  width: 100% !important;
  height: 100% !important;
  min-height: inherit !important;
  overflow: hidden !important;
  background: #edf3ef !important;
}

.property-gallery-image-v74 img {
  object-fit: cover !important;
}

/* Gallery nav buttons */
.gallery-nav-v74 {
  position: absolute !important;
  top: 50% !important;
  z-index: 5 !important;
  width: 34px !important;
  height: 34px !important;
  transform: translateY(-50%) !important;
  border: 1px solid rgba(255,255,255,0.8) !important;
  border-radius: 999px !important;
  background: rgba(15, 35, 27, 0.62) !important;
  color: #fff !important;
  font-size: 25px !important;
  font-weight: 700 !important;
  line-height: 28px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  cursor: pointer !important;
  backdrop-filter: blur(4px) !important;
  opacity: 0 !important;
  transition: opacity 0.15s ease, background 0.15s ease !important;
}

.property-gallery-image-v74:hover .gallery-nav-v74,
.property-card:hover .gallery-nav-v74,
.map-popup-card:hover .gallery-nav-v74,
.leaflet-popup-content:hover .gallery-nav-v74 {
  opacity: 1 !important;
}

.gallery-nav-v74:hover {
  background: rgba(15, 35, 27, 0.82) !important;
}

.gallery-prev-v74 {
  left: 10px !important;
}

.gallery-next-v74 {
  right: 10px !important;
}

.gallery-count-v74 {
  position: absolute !important;
  right: 10px !important;
  bottom: 10px !important;
  z-index: 5 !important;
  padding: 4px 8px !important;
  border-radius: 999px !important;
  background: rgba(15, 35, 27, 0.65) !important;
  color: #fff !important;
  font-size: 12px !important;
  font-weight: 800 !important;
  backdrop-filter: blur(4px) !important;
}

/* Map popup close button: visible on photo */
.leaflet-popup-close-button,
.map-popup-close,
[class*="popup"] [aria-label="Close"],
[class*="popup"] [aria-label="Schließen"],
[class*="popup"] [aria-label="Закрыть"] {
  width: 32px !important;
  height: 32px !important;
  right: 10px !important;
  top: 10px !important;
  border: 1px solid rgba(255,255,255,0.9) !important;
  border-radius: 999px !important;
  background: rgba(12, 31, 23, 0.78) !important;
  color: #fff !important;
  font-size: 22px !important;
  font-weight: 900 !important;
  line-height: 29px !important;
  text-align: center !important;
  text-shadow: none !important;
  box-shadow: 0 6px 18px rgba(0,0,0,0.24) !important;
  z-index: 20 !important;
  opacity: 1 !important;
}

.leaflet-popup-close-button:hover,
.map-popup-close:hover,
[class*="popup"] [aria-label="Close"]:hover,
[class*="popup"] [aria-label="Schließen"]:hover,
[class*="popup"] [aria-label="Закрыть"]:hover {
  background: rgba(12, 31, 23, 0.92) !important;
  color: #fff !important;
}

/* Make sure map popup image can host gallery */
.leaflet-popup-content .property-gallery-image-v74 {
  min-height: 150px !important;
  border-radius: 18px 18px 0 0 !important;
}

/* If old image container exists, gallery fills it */
.property-card-image .property-gallery-image-v74,
.card-image .property-gallery-image-v74,
.object-card-image .property-gallery-image-v74,
.map-popup-image .property-gallery-image-v74 {
  min-height: inherit !important;
  height: 100% !important;
}
`;
});

console.log("Stage 74 patch completed.");
