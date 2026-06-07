const fs = require("node:fs");
const path = require("node:path");

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

function addAfterImports(source, helper) {
  if (source.includes(helper.split("\n")[1]?.trim() || "__never__")) return source;
  const imports = [...source.matchAll(/^import[\s\S]*?;\s*$/gm)];
  if (!imports.length) return helper + "\n" + source;
  const last = imports[imports.length - 1];
  const idx = last.index + last[0].length;
  return source.slice(0, idx) + "\n" + helper + source.slice(idx);
}

/**
 * Stage 77
 *
 * 1) Map popup:
 *    - remove literal ${escapeHtml(statusText)}
 *    - remove Professionelles Werkzeug from title
 * 2) Main cards:
 *    - fetch all images, not only take: 1
 *    - make card gallery robust and visible
 * 3) Cabinet:
 *    - translate saved searches labels/buttons
 *    - compact oversized saved search layout
 */

/* -------------------------------------------------------------------------- */
/* PublicPropertiesPage: fetch all images                                      */
/* -------------------------------------------------------------------------- */

patchFile("components/PublicPropertiesPage.tsx", (s) => {
  // Remove `take: 1` only from image include blocks.
  s = s.replace(/images:\s*\{([\s\S]*?orderBy:\s*\[\{ isMain: "desc" \}, \{ sortOrder: "asc" \}\],[\s\S]*?)take:\s*1,\s*([\s\S]*?)\}/g, (m, a, b) => {
    return `images: {${a}${b}}`;
  });

  // Remove invalid relation if it came back.
  s = s.replace(/\n\s*propertyImages:\s*true,\s*/g, "\n");

  // Remove duplicate adjacent images blocks with a scanner.
  function findMatchingBrace(text, openIndex) {
    let depth = 0;
    let inString = null;
    let escaped = false;

    for (let i = openIndex; i < text.length; i++) {
      const ch = text[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === "\\") escaped = true;
        else if (ch === inString) inString = null;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === "`") {
        inString = ch;
        continue;
      }
      if (ch === "{") depth++;
      if (ch === "}") {
        depth--;
        if (depth === 0) return i;
      }
    }
    return -1;
  }

  let pos = 0;
  while (true) {
    const firstKey = s.indexOf("images:", pos);
    if (firstKey === -1) break;
    const firstBrace = s.indexOf("{", firstKey);
    if (firstBrace === -1) break;
    const firstEnd = findMatchingBrace(s, firstBrace);
    if (firstEnd === -1) break;

    let next = firstEnd + 1;
    while (/\s/.test(s[next] || "")) next++;
    if (s[next] === ",") next++;
    while (/\s/.test(s[next] || "")) next++;

    if (s.slice(next, next + 7) === "images:") {
      s = s.slice(0, firstKey) + s.slice(next);
      pos = Math.max(0, firstKey - 20);
      continue;
    }
    pos = firstEnd + 1;
  }

  return s;
});

/* -------------------------------------------------------------------------- */
/* MainCardGallery component                                                   */
/* -------------------------------------------------------------------------- */

const gallery = `"use client";

import { MouseEvent, useMemo, useState } from "react";

type ImageLike = {
  url?: string | null;
  src?: string | null;
  imageUrl?: string | null;
  path?: string | null;
  href?: string | null;
  fileUrl?: string | null;
};

type MainCardGalleryProps = {
  images?: ImageLike[] | string[] | null;
  fallbackSrc?: string | null;
  alt?: string;
};

function getUrl(item: ImageLike | string | null | undefined): string | null {
  if (!item) return null;
  if (typeof item === "string") return item;
  return item.url || item.src || item.imageUrl || item.path || item.href || item.fileUrl || null;
}

export function MainCardGallery({ images, fallbackSrc, alt = "" }: MainCardGalleryProps) {
  const urls = useMemo(() => {
    const list = Array.isArray(images) ? (images.map(getUrl).filter(Boolean) as string[]) : [];
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
    return <div className="main-card-gallery-v77 main-card-gallery-empty-v77" aria-label={alt} />;
  }

  return (
    <div className="main-card-gallery-v77">
      <img src={src} alt={alt} className="main-card-gallery-img-v77" loading="lazy" />

      {urls.length > 1 ? (
        <>
          <button type="button" className="main-card-gallery-nav-v77 main-card-gallery-prev-v77" aria-label="Previous photo" onClick={(event) => move(-1, event)}>
            ‹
          </button>
          <button type="button" className="main-card-gallery-nav-v77 main-card-gallery-next-v77" aria-label="Next photo" onClick={(event) => move(1, event)}>
            ›
          </button>
          <span className="main-card-gallery-count-v77">{index + 1}/{urls.length}</span>
        </>
      ) : null}
    </div>
  );
}

export default MainCardGallery;
`;

fs.mkdirSync(path.join(root, "components"), { recursive: true });
fs.writeFileSync(path.join(root, "components", "MainCardGallery.tsx"), gallery, "utf8");
console.log("written components/MainCardGallery.tsx");

/* -------------------------------------------------------------------------- */
/* PropertyCard: use robust gallery                                            */
/* -------------------------------------------------------------------------- */

for (const rel of ["components/PropertyCard.tsx", "app/components/PropertyCard.tsx"]) {
  patchFile(rel, (s) => {
    s = s.replace(/import\s+\{\s*MainCardGallery\s*\}\s+from\s+["']@\/components\/MainCardGallery["'];?\s*\n/g, "");
    s = s.replace(/import\s+\{\s*PropertyGalleryImage\s*\}\s+from\s+["']@\/components\/PropertyGalleryImage["'];?\s*\n/g, "");
    s = `import { MainCardGallery } from "@/components/MainCardGallery";\n` + s.trimStart();

    const galleryCall = `<MainCardGallery
              images={(property as any).images || (property as any).photos}
              fallbackSrc={(property as any).imageUrl || (property as any).mainImage || (property as any).coverImage || (property as any).photoUrl || (property as any).images?.[0]?.url || (property as any).images?.[0]?.src || (property as any).images?.[0]?.imageUrl}
              alt={(property as any).title || (property as any).headline || (property as any).address || ""}
            />`;

    s = s.replace(/<MainCardGallery[\s\S]*?\/>/g, galleryCall);
    s = s.replace(/<PropertyGalleryImage[\s\S]*?\/>/g, galleryCall);

    s = s.replace(
      /<Image\s+([^>]*?)src=\{([^}]*?(?:imageUrl|mainImage|coverImage|photoUrl)[^}]*)\}([^>]*?)\/>/g,
      galleryCall
    );

    s = s.replace(
      /<img\s+([^>]*?)src=\{([^}]*?(?:imageUrl|mainImage|coverImage|photoUrl)[^}]*)\}([^>]*?)\/>/g,
      galleryCall
    );

    return s;
  });
}

/* -------------------------------------------------------------------------- */
/* PropertyMap popup cleanup                                                   */
/* -------------------------------------------------------------------------- */

patchFile("components/PropertyMap.tsx", (s) => {
  s = s.replace(/["']use client["'];\s*\n?/g, "");
  s = `"use client";\n\n` + s.trimStart();

  const helper = `
function stage77PopupLocale() {
  if (typeof window === "undefined") return "de";
  const first = window.location.pathname.split("/").filter(Boolean)[0];
  if (first === "ru" || first === "de" || first === "en") return first;
  const cookie = document.cookie.match(/(?:^|;\\s*)zvg_locale=(ru|de|en)(?:;|$)/);
  return cookie?.[1] || "de";
}

function stage77PopupDetails() {
  const locale = stage77PopupLocale();
  if (locale === "ru") return "Подробнее";
  if (locale === "en") return "View details";
  return "Details ansehen";
}

function stage77PopupValue() {
  const locale = stage77PopupLocale();
  if (locale === "ru") return "Оценочная стоимость";
  if (locale === "en") return "Market value";
  return "Verkehrswert";
}

function stage77PopupStatus(property: any) {
  const locale = stage77PopupLocale();
  const raw = String(property?.status || "").toLowerCase();
  if (raw.includes("cancel") || raw.includes("aufgeh") || raw.includes("отмен")) {
    if (locale === "ru") return "Термин отменён";
    if (locale === "en") return "Auction cancelled";
    return "Termin aufgehoben";
  }
  if (raw.includes("archiv") || raw.includes("archive") || raw.includes("архив")) {
    if (locale === "ru") return "Архив";
    if (locale === "en") return "Archive";
    return "Archiv";
  }
  if (locale === "ru") return "Активно";
  if (locale === "en") return "Active";
  return "Aktuell";
}

function stage77PopupTitle(property: any) {
  const title = property?.title || property?.headline || property?.address || property?.street || "";
  const bad = ["Professionelles Werkzeug", "Профессиональный инструмент", "Professional tool"];
  if (bad.includes(String(title).trim())) {
    return property?.address || property?.street || property?.city || "";
  }
  return title;
}
`;

  if (!s.includes("function stage77PopupLocale")) {
    s = addAfterImports(s, helper);
  }

  // Replace visible literal placeholders and previous staged placeholders.
  s = s.replace(/\\?\$\{escapeHtml\(statusText\)\}/g, "${escapeHtml(stage77PopupStatus(property))}");
  s = s.replace(/\\?\$\{escapeHtml\(valueText\)\}/g, "${escapeHtml(stage77PopupValue())}");
  s = s.replace(/\\?\$\{escapeHtml\(detailsText\)\}/g, "${escapeHtml(stage77PopupDetails())}");
  s = s.replace(/\\?\$\{escapeHtml\(titleText\)\}/g, "${escapeHtml(stage77PopupTitle(property))}");

  s = s.replace(/\\?\$\{stage75StatusLabel\([^}]*\)\}/g, "${escapeHtml(stage77PopupStatus(property))}");
  s = s.replace(/\\?\$\{stage75PopupT\(stage75ReadClientLocale\(\)\)\.details\}/g, "${escapeHtml(stage77PopupDetails())}");
  s = s.replace(/\\?\$\{stage75PopupT\(stage75ReadClientLocale\(\)\)\.marketValue\}/g, "${escapeHtml(stage77PopupValue())}");

  // Replace hero title text in popup.
  s = s.replace(/Professionelles Werkzeug/g, "${escapeHtml(stage77PopupTitle(property))}");
  s = s.replace(/Профессиональный инструмент/g, "${escapeHtml(stage77PopupTitle(property))}");
  s = s.replace(/Professional tool/g, "${escapeHtml(stage77PopupTitle(property))}");

  return s;
});

/* -------------------------------------------------------------------------- */
/* Cabinet saved searches translations/compact                                 */
/* -------------------------------------------------------------------------- */

for (const rel of ["app/cabinet/page.tsx", "components/CabinetPage.tsx", "app/components/CabinetPage.tsx"]) {
  patchFile(rel, (s) => {
    // Direct server-side replacements are safer than client helpers in server page.
    s = s
      .replace(/Gespeicherte Suchen/g, "Сохранённые поиски")
      .replace(/Benennen Sie Ihre Suchaufträge für spätere E-Mail-Benachrichtigungen\./g, "Переименуйте поиски, чтобы позже получать уведомления с понятными названиями.")
      .replace(/Suchname/g, "Название поиска")
      .replace(/Speichern/g, "Сохранить")
      .replace(/Suche öffnen/g, "Открыть поиск")
      .replace(/Löschen/g, "Удалить");

    return s;
  });
}

/* -------------------------------------------------------------------------- */
/* CSS                                                                         */
/* -------------------------------------------------------------------------- */

patchFile("app/globals.css", (s) => {
  if (s.includes("/* Stage 77 final card popup cabinet cleanup */")) return s;

  return s + `

/* Stage 77 final card popup cabinet cleanup */

.main-card-gallery-v77,
.main-card-gallery-v76,
.main-card-gallery-v75b {
  position: relative !important;
  width: 100% !important;
  height: 220px !important;
  min-height: 220px !important;
  overflow: hidden !important;
  background: #edf3ef !important;
}

.main-card-gallery-img-v77,
.main-card-gallery-img-v76,
.main-card-gallery-image-v75b {
  width: 100% !important;
  height: 100% !important;
  display: block !important;
  object-fit: cover !important;
}

.main-card-gallery-nav-v77,
.main-card-gallery-nav-v76,
.main-card-gallery-nav-v75b {
  opacity: 1 !important;
  position: absolute !important;
  top: 50% !important;
  z-index: 8 !important;
  width: 34px !important;
  height: 34px !important;
  transform: translateY(-50%) !important;
  border: 1px solid rgba(255,255,255,0.9) !important;
  border-radius: 999px !important;
  background: rgba(13, 38, 28, 0.72) !important;
  color: #fff !important;
  font-size: 25px !important;
  font-weight: 800 !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  cursor: pointer !important;
}

.main-card-gallery-prev-v77,
.main-card-gallery-prev-v76,
.main-card-gallery-prev-v75b {
  left: 10px !important;
}

.main-card-gallery-next-v77,
.main-card-gallery-next-v76,
.main-card-gallery-next-v75b {
  right: 10px !important;
}

.main-card-gallery-count-v77,
.main-card-gallery-count-v76,
.main-card-gallery-count-v75b {
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

/* Cabinet saved searches compact */
.saved-search-card,
.saved-search-item,
.cabinet-saved-search,
[class*="saved-search"] {
  min-height: unset !important;
}

.saved-search-card,
.saved-search-item,
.cabinet-saved-search {
  padding: 14px 16px !important;
}

.saved-search-actions,
[class*="saved-search"] [class*="actions"] {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
}

.saved-search-actions .btn,
[class*="saved-search"] [class*="actions"] .btn,
[class*="saved-search"] button,
[class*="saved-search"] a.btn {
  min-height: 42px !important;
  height: 42px !important;
  padding: 0 18px !important;
  border-radius: 14px !important;
}

[class*="saved-search"] input {
  height: 44px !important;
  min-height: 44px !important;
}

[class*="saved-search"] .danger,
[class*="saved-search"] .btn-danger {
  min-width: 96px !important;
}

.cabinet-section,
.account-section,
.saved-searches-section {
  padding-top: 20px !important;
  padding-bottom: 20px !important;
}
`;
});

console.log("Stage 77 completed.");
