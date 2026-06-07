const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();

function full(rel) {
  return path.join(root, rel);
}

function patch(rel, fn) {
  const file = full(rel);
  if (!fs.existsSync(file)) {
    console.log("skip missing", rel);
    return;
  }
  const before = fs.readFileSync(file, "utf8");
  const after = fn(before);
  if (after !== before) {
    fs.writeFileSync(file, after, "utf8");
    console.log("patched", rel);
  } else {
    console.log("unchanged", rel);
  }
}

function write(rel, content) {
  const file = full(rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
  console.log("written", rel);
}

function replaceFunction(source, functionName, replacement) {
  const marker = `function ${functionName}`;
  const start = source.indexOf(marker);
  if (start === -1) return source;

  const open = source.indexOf("{", start);
  if (open === -1) return source;

  let depth = 0;
  let quote = null;
  let escaped = false;

  for (let i = open; i < source.length; i++) {
    const ch = source[i];

    if (quote) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }

    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      continue;
    }

    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) {
        return source.slice(0, start) + replacement + source.slice(i + 1);
      }
    }
  }

  return source;
}

/**
 * Stage 81
 *
 * We now have the real PropertyMap snippet.
 * The bug is exactly here:
 *
 * const statusLabel = property.status === "CANCELLED"
 *   ? "${escapeHtml(stage77PopupStatus(property))}"
 *   : "${escapeHtml(stage77PopupStatus(property))}";
 *
 * Also the title inside popup is using property.title, and some seeded objects have
 * "Professionelles Werkzeug" as title. We need to use a safe title/address.
 *
 * This stage replaces the whole popupHtml(property) function directly.
 */

/* -------------------------------------------------------------------------- */
/* 1. Replace popupHtml exactly                                                */
/* -------------------------------------------------------------------------- */

patch("components/PropertyMap.tsx", (s) => {
  // Keep "use client" first, but do not duplicate.
  s = s.replace(/["']use client["'];\s*\n?/g, "");
  s = `"use client";\n\n` + s.trimStart();

  const helper = `
function popupLocaleStage81() {
  if (typeof window === "undefined") return "de";
  const first = window.location.pathname.split("/").filter(Boolean)[0];
  if (first === "ru" || first === "de" || first === "en") return first;
  const cookie = document.cookie.match(/(?:^|;\\s*)zvg_locale=(ru|de|en)(?:;|$)/);
  return cookie?.[1] || "de";
}

function popupTextStage81(key: "active" | "cancelled" | "archive" | "details" | "value" | "noPhoto") {
  const locale = popupLocaleStage81();
  const dict = {
    de: {
      active: "Aktuell",
      cancelled: "Termin aufgehoben",
      archive: "Archiv",
      details: "Details ansehen",
      value: "Verkehrswert",
      noPhoto: "Kein Foto",
    },
    ru: {
      active: "Активно",
      cancelled: "Термин отменён",
      archive: "Архив",
      details: "Подробнее",
      value: "Оценочная стоимость",
      noPhoto: "Нет фото",
    },
    en: {
      active: "Active",
      cancelled: "Auction cancelled",
      archive: "Archive",
      details: "View details",
      value: "Market value",
      noPhoto: "No photo",
    },
  } as const;

  return (dict as any)[locale]?.[key] || dict.de[key];
}

function popupStatusStage81(property: MapProperty) {
  const raw = String(property.status || "").toUpperCase();
  if (raw.includes("CANCEL")) return popupTextStage81("cancelled");
  if (raw.includes("ARCHIV")) return popupTextStage81("archive");
  return popupTextStage81("active");
}

function popupTitleStage81(property: MapProperty) {
  const bad = new Set(["Professionelles Werkzeug", "Профессиональный инструмент", "Professional tool", ""]);
  const title = String(property.title || "").trim();

  if (title && !bad.has(title)) return title;
  if (property.address) return property.address;
  if (property.city) return property.city;
  return "";
}

function popupAddressStage81(property: MapProperty) {
  const title = popupTitleStage81(property).trim();
  const address = String(property.address || "").trim();
  return address && address !== title ? address : "";
}
`;

  if (!s.includes("function popupLocaleStage81")) {
    const imports = [...s.matchAll(/^import[\s\S]*?;\s*$/gm)];
    if (imports.length) {
      const last = imports[imports.length - 1];
      const idx = last.index + last[0].length;
      s = s.slice(0, idx) + "\n" + helper + s.slice(idx);
    } else {
      s = helper + "\n" + s;
    }
  }

  const newPopupHtml = `function popupHtml(property: MapProperty): string {
  const title = popupTitleStage81(property);
  const address = popupAddressStage81(property);

  const image = property.imageUrl
    ? \`<img src="\${escapeHtml(property.imageUrl)}" alt="\${escapeHtml(title)}" />\`
    : \`<div class="osm-popup-placeholder">\${escapeHtml(popupTextStage81("noPhoto"))}</div>\`;

  const statusLabel = popupStatusStage81(property);
  const typeLabel = translateGroup(property.propertyTypeGroup, popupLocaleStage81() as "de" | "ru" | "en");

  const addressLine = address ? \`<p>\${escapeHtml(address)}</p>\` : "";

  return \`
    <div class="osm-popup-card osm-popup-card-redesigned osm-popup-card-balanced">
      \${image}
      <div class="osm-popup-body">
        <div class="osm-popup-topline">
          <span>\${escapeHtml(typeLabel)}</span>
          <span>\${escapeHtml(statusLabel)}</span>
        </div>
        <h3>\${escapeHtml(title)}</h3>
        \${addressLine}
        <div class="osm-popup-facts">
          <small>Termin<br><strong>\${escapeHtml(formatDate(property.auctionDate))}</strong></small>
          <small>\${escapeHtml(popupTextStage81("value"))}<br><strong>\${escapeHtml(formatEuro(property.marketValue))}</strong></small>
        </div>
        <a href="/properties/\${encodeURIComponent(property.id)}">\${escapeHtml(popupTextStage81("details"))}</a>
      </div>
    </div>
  \`;
}`;

  s = replaceFunction(s, "popupHtml", newPopupHtml);

  // Remove broken Stage75/77/78 helpers only if they are not needed elsewhere? Keep them harmless.
  // But remove literal broken status if it exists outside popupHtml.
  s = s.replace(/\$\{escapeHtml\(stage77PopupStatus\(property\)\)\}/g, "${escapeHtml(popupStatusStage81(property))}");
  s = s.replace(/\$\{escapeHtml\(stage78PopupStatus\(property\)\)\}/g, "${escapeHtml(popupStatusStage81(property))}");
  s = s.replace(/\$\{escapeHtml\(stage79PopupStatus\(property\)\)\}/g, "${escapeHtml(popupStatusStage81(property))}");

  // Fix broken encoded arrows in popup gallery if that helper remains.
  s = s.replace(/вЂ№/g, "‹").replace(/вЂє/g, "›");

  return s;
});

/* -------------------------------------------------------------------------- */
/* 2. Cabinet source and runtime cleanup                                       */
/* -------------------------------------------------------------------------- */

const runtime = `"use client";

import { useEffect } from "react";

type Locale = "de" | "ru" | "en";

function runtimeLocaleStage81(): Locale {
  const first = window.location.pathname.split("/").filter(Boolean)[0];
  if (first === "ru" || first === "de" || first === "en") return first;
  const cookie = document.cookie.match(/(?:^|;\\s*)zvg_locale=(ru|de|en)(?:;|$)/);
  return (cookie?.[1] as Locale) || "de";
}

const runtimeTextStage81 = {
  de: {
    saved: "Gespeicherte Suchen",
    hint: "Benennen Sie Ihre Suchaufträge, damit spätere Benachrichtigungen verständliche Namen haben.",
    name: "Suchname",
    save: "Speichern",
    open: "Suche öffnen",
    delete: "Löschen",
    city: "Ort",
  },
  ru: {
    saved: "Сохранённые поиски",
    hint: "Переименуйте поиски, чтобы позже получать уведомления с понятными названиями.",
    name: "Название поиска",
    save: "Сохранить",
    open: "Открыть поиск",
    delete: "Удалить",
    city: "Город",
  },
  en: {
    saved: "Saved searches",
    hint: "Name your searches so future notifications have clear names.",
    name: "Search name",
    save: "Save",
    open: "Open search",
    delete: "Delete",
    city: "City",
  },
} as const;

function walkTextStage81(root: ParentNode, replace: (text: string) => string) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Node[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  for (const node of nodes) {
    const before = node.textContent || "";
    const after = replace(before);
    if (after !== before) node.textContent = after;
  }
}

function fixCabinetTextStage81(locale: Locale) {
  const t = runtimeTextStage81[locale];

  walkTextStage81(document.body, (text) => {
    return text
      .replace(/Saved Searches|Saved searches|Gespeicherte Suchen|Сохранённые поиски|Сохраненные поиски/g, t.saved)
      .replace(/Name your searches so future email notifications are easy to understand\\.|Name your searches so future notifications have clear names\\.|Переименуйте поиски, чтобы позже получать уведомления с понятными названиями\\.|Benennen Sie Ihre Suchaufträge[^.]*\\./g, t.hint)
      .replace(/Suchname|Search name|Название поиска/g, t.name)
      .replace(/Speichern|Save|Сохранить/g, t.save)
      .replace(/Suche öffnen|Open search|Открыть поиск/g, t.open)
      .replace(/Löschen|Delete|Удалить/g, t.delete)
      .replace(/Город:|City:|Ort:/g, t.city + ":");
  });

  const all = Array.from(document.querySelectorAll<HTMLElement>("section, article, div"));
  for (const el of all) {
    const text = el.innerText || "";
    if (
      text.includes(t.saved) ||
      text.includes("Saved searches") ||
      text.includes("Gespeicherte Suchen") ||
      text.includes("Сохранённые поиски")
    ) {
      el.classList.add("saved-search-compact-stage81");
      const nearestCard = el.closest<HTMLElement>("section, article, .card, [class*='card'], [class*='section']");
      nearestCard?.classList.add("saved-search-compact-stage81");
    }
  }
}

export function RuntimeUiCleanup() {
  useEffect(() => {
    const apply = () => fixCabinetTextStage81(runtimeLocaleStage81());

    apply();

    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    const timer = window.setInterval(apply, 1000);

    return () => {
      observer.disconnect();
      window.clearInterval(timer);
    };
  }, []);

  return null;
}
`;

write("components/RuntimeUiCleanup.tsx", runtime);

function mountLayout(rel) {
  patch(rel, (s) => {
    if (!s.includes("RuntimeUiCleanup")) {
      s = `import { RuntimeUiCleanup } from "@/components/RuntimeUiCleanup";\n` + s;
    }
    if (!s.includes("<RuntimeUiCleanup />")) {
      s = s.replace(/<body([^>]*)>/, `<body$1>\n        <RuntimeUiCleanup />`);
      if (!s.includes("<RuntimeUiCleanup />")) {
        s = s.replace(/\{children\}/, `<RuntimeUiCleanup />\n        {children}`);
      }
    }
    return s;
  });
}

if (fs.existsSync(full("app/layout.tsx"))) mountLayout("app/layout.tsx");
if (fs.existsSync(full("app/[locale]/layout.tsx"))) mountLayout("app/[locale]/layout.tsx");

/* -------------------------------------------------------------------------- */
/* 3. Strong CSS for cabinet spacing                                           */
/* -------------------------------------------------------------------------- */

patch("app/globals.css", (s) => {
  if (s.includes("/* Stage 81 exact popup and compact saved searches */")) return s;

  return s + `

/* Stage 81 exact popup and compact saved searches */

/* Saved searches compact — stronger than previous stages */
.saved-search-compact-stage81 {
  padding-top: 10px !important;
  padding-bottom: 10px !important;
  margin-top: 8px !important;
  margin-bottom: 8px !important;
  min-height: 0 !important;
}

.saved-search-compact-stage81 > * {
  margin-top: 4px !important;
  margin-bottom: 4px !important;
}

.saved-search-compact-stage81 section,
.saved-search-compact-stage81 article,
.saved-search-compact-stage81 div {
  min-height: 0 !important;
}

.saved-search-compact-stage81 input {
  height: 38px !important;
  min-height: 38px !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}

.saved-search-compact-stage81 button,
.saved-search-compact-stage81 a,
.saved-search-compact-stage81 .btn {
  height: 38px !important;
  min-height: 38px !important;
  padding: 0 14px !important;
  border-radius: 13px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
}

/* If the saved search row has a huge right-side action area */
.saved-search-compact-stage81 [class*="actions"],
.saved-search-compact-stage81 [class*="Actions"] {
  gap: 8px !important;
  align-items: center !important;
}

.saved-search-compact-stage81 [class*="item"],
.saved-search-compact-stage81 [class*="card"],
.saved-search-compact-stage81 article {
  padding: 10px 12px !important;
}

/* Popup title/address cleanup */
.osm-popup-card h3:empty,
.leaflet-popup-content h3:empty {
  display: none !important;
}
`;
});

console.log("Stage 81 completed.");
