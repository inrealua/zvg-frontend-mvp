const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();

function p(rel) {
  return path.join(root, rel);
}

function exists(rel) {
  return fs.existsSync(p(rel));
}

function patch(rel, fn) {
  const file = p(rel);
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
  const file = p(rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
  console.log("written", rel);
}

/**
 * STAGE 80
 *
 * Previous runtime-only fix did not visibly change your deployed pages.
 * This stage does direct source fixes:
 *
 * 1) PropertyMap.tsx popup HTML:
 *    - no literal "${escapeHtml(stage77PopupStatus(property))}"
 *    - no "Professionelles Werkzeug"
 *    - no duplicated address line in popup
 *
 * 2) Cabinet saved-search block:
 *    - proper i18n dictionary for:
 *      "Переименуйте поиски, чтобы позже получать уведомления с понятными названиями."
 *    - compact CSS with common classes and DOM structure fallbacks
 *
 * 3) Still keeps a small runtime cleanup only as a fallback,
 *    but the main work is now source-level.
 */

/* -------------------------------------------------------------------------- */
/* 1. PropertyMap direct popup source cleanup                                  */
/* -------------------------------------------------------------------------- */

patch("components/PropertyMap.tsx", (s) => {
  // Keep use client at the top.
  s = s.replace(/["']use client["'];\s*\n?/g, "");
  s = `"use client";\n\n` + s.trimStart();

  // Add clean popup helpers once.
  if (!s.includes("function stage80PopupLocale")) {
    const helper = `
function stage80PopupLocale() {
  if (typeof window === "undefined") return "de";
  const first = window.location.pathname.split("/").filter(Boolean)[0];
  if (first === "ru" || first === "de" || first === "en") return first;
  const cookie = document.cookie.match(/(?:^|;\\s*)zvg_locale=(ru|de|en)(?:;|$)/);
  return cookie?.[1] || "de";
}

function stage80PopupText(key: "active" | "cancelled" | "archive" | "details" | "value") {
  const locale = stage80PopupLocale();
  const dict = {
    de: {
      active: "Aktuell",
      cancelled: "Termin aufgehoben",
      archive: "Archiv",
      details: "Details ansehen",
      value: "Verkehrswert",
    },
    ru: {
      active: "Активно",
      cancelled: "Термин отменён",
      archive: "Архив",
      details: "Подробнее",
      value: "Оценочная стоимость",
    },
    en: {
      active: "Active",
      cancelled: "Auction cancelled",
      archive: "Archive",
      details: "View details",
      value: "Market value",
    },
  } as const;

  return (dict as any)[locale]?.[key] || dict.de[key];
}

function stage80PopupStatus(property: any) {
  const raw = String(property?.status || property?.auctionStatus || "").toLowerCase();
  if (raw.includes("cancel") || raw.includes("aufgeh") || raw.includes("отмен")) {
    return stage80PopupText("cancelled");
  }
  if (raw.includes("archiv") || raw.includes("archive") || raw.includes("архив")) {
    return stage80PopupText("archive");
  }
  return stage80PopupText("active");
}

function stage80PopupTitle(property: any) {
  const candidates = [
    property?.title,
    property?.headline,
    property?.name,
    property?.address,
    property?.street,
    property?.city,
  ];

  const bad = new Set(["Professionelles Werkzeug", "Профессиональный инструмент", "Professional tool", ""]);
  const title = candidates.map((item) => String(item || "").trim()).find((item) => item && !bad.has(item));
  return title || "";
}

function stage80PopupAddress(property: any) {
  const address = String(property?.address || property?.street || "").trim();
  const title = stage80PopupTitle(property).trim();
  return address && address !== title ? address : "";
}
`;
    const imports = [...s.matchAll(/^import[\s\S]*?;\s*$/gm)];
    if (imports.length) {
      const last = imports[imports.length - 1];
      const idx = last.index + last[0].length;
      s = s.slice(0, idx) + "\n" + helper + s.slice(idx);
    } else {
      s = helper + "\n" + s;
    }
  }

  // Direct replacements for broken literal placeholders that ended up in popup HTML.
  const statusExpr = "${escapeHtml(stage80PopupStatus(property))}";
  const titleExpr = "${escapeHtml(stage80PopupTitle(property))}";
  const detailsExpr = "${escapeHtml(stage80PopupText(\"details\"))}";
  const valueExpr = "${escapeHtml(stage80PopupText(\"value\"))}";
  const addressExpr = "${stage80PopupAddress(property) ? `<p>${escapeHtml(stage80PopupAddress(property))}</p>` : \"\"}";

  // Broken placeholders from previous stages.
  s = s.replace(/\$\{escapeHtml\(stage77PopupStatus\(property\)\)\}/g, statusExpr);
  s = s.replace(/\$\{escapeHtml\(stage78PopupStatus\(property\)\)\}/g, statusExpr);
  s = s.replace(/\$\{escapeHtml\(stage79PopupStatus\(property\)\)\}/g, statusExpr);
  s = s.replace(/\$\{escapeHtml\(statusText\)\}/g, statusExpr);
  s = s.replace(/\$\{stage75StatusLabel\([^}]*\)\}/g, statusExpr);

  s = s.replace(/\$\{escapeHtml\(stage77PopupTitle\(property\)\)\}/g, titleExpr);
  s = s.replace(/\$\{escapeHtml\(stage78PopupTitle\(property\)\)\}/g, titleExpr);
  s = s.replace(/\$\{escapeHtml\(titleText\)\}/g, titleExpr);

  s = s.replace(/\$\{escapeHtml\(stage77PopupValue\(\)\)\}/g, valueExpr);
  s = s.replace(/\$\{escapeHtml\(stage78PopupValue\(\)\)\}/g, valueExpr);
  s = s.replace(/\$\{escapeHtml\(valueText\)\}/g, valueExpr);

  s = s.replace(/\$\{escapeHtml\(stage77PopupDetails\(\)\)\}/g, detailsExpr);
  s = s.replace(/\$\{escapeHtml\(stage78PopupDetails\(\)\)\}/g, detailsExpr);
  s = s.replace(/\$\{escapeHtml\(detailsText\)\}/g, detailsExpr);

  // Literal hero titles in popup template.
  s = s.replace(/Professionelles Werkzeug/g, titleExpr);
  s = s.replace(/Профессиональный инструмент/g, titleExpr);
  s = s.replace(/Professional tool/g, titleExpr);

  // Remove duplicated address paragraph if it is directly generated from property.address/street.
  // Replace common patterns with conditional address line.
  s = s.replace(/<p>\$\{escapeHtml\(property\.address\)\}<\/p>/g, addressExpr);
  s = s.replace(/<p>\$\{escapeHtml\(property\.street\)\}<\/p>/g, addressExpr);
  s = s.replace(/<p class="[^"]*address[^"]*">\$\{escapeHtml\(property\.address\)\}<\/p>/g, addressExpr);
  s = s.replace(/<p class="[^"]*address[^"]*">\$\{escapeHtml\(property\.street\)\}<\/p>/g, addressExpr);

  return s;
});

/* -------------------------------------------------------------------------- */
/* 2. Cabinet source-level i18n                                                */
/* -------------------------------------------------------------------------- */

const cabinetI18n = `
function stage80CabinetLocale() {
  const first = typeof window !== "undefined" ? window.location.pathname.split("/").filter(Boolean)[0] : "de";
  if (first === "ru" || first === "de" || first === "en") return first;
  if (typeof document !== "undefined") {
    const cookie = document.cookie.match(/(?:^|;\\s*)zvg_locale=(ru|de|en)(?:;|$)/);
    if (cookie?.[1]) return cookie[1];
  }
  return "de";
}

function stage80CabinetText(key: "saved" | "hint" | "name" | "save" | "open" | "delete" | "city") {
  const locale = stage80CabinetLocale();
  const dict = {
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

  return (dict as any)[locale]?.[key] || dict.de[key];
}
`;

for (const rel of [
  "components/CabinetPage.tsx",
  "app/components/CabinetPage.tsx",
  "components/SavedSearches.tsx",
  "app/components/SavedSearches.tsx",
  "components/SavedSearchList.tsx",
  "app/components/SavedSearchList.tsx",
  "app/cabinet/page.tsx",
  "app/[locale]/cabinet/page.tsx",
  "app/account/page.tsx",
  "app/[locale]/account/page.tsx",
]) {
  patch(rel, (s) => {
    if (
      !s.includes("Saved searches") &&
      !s.includes("Saved Searches") &&
      !s.includes("Gespeicherte Suchen") &&
      !s.includes("Сохранённые поиски") &&
      !s.includes("Suchname") &&
      !s.includes("Search name") &&
      !s.includes("Переименуйте поиски")
    ) {
      return s;
    }

    // If client component, we can use runtime function. If server component, literal replacements below still help.
    if (s.includes('"use client"') || s.includes("'use client'")) {
      if (!s.includes("function stage80CabinetText")) {
        const imports = [...s.matchAll(/^import[\s\S]*?;\s*$/gm)];
        if (imports.length) {
          const last = imports[imports.length - 1];
          const idx = last.index + last[0].length;
          s = s.slice(0, idx) + "\n" + cabinetI18n + s.slice(idx);
        } else {
          s = cabinetI18n + "\n" + s;
        }
      }

      // Replace JSX text with expressions.
      s = s.replace(/>Saved Searches</g, '>{stage80CabinetText("saved")}<');
      s = s.replace(/>Saved searches</g, '>{stage80CabinetText("saved")}<');
      s = s.replace(/>Gespeicherte Suchen</g, '>{stage80CabinetText("saved")}<');
      s = s.replace(/>Сохранённые поиски</g, '>{stage80CabinetText("saved")}<');

      s = s.replace(/>Name your searches so future email notifications are easy to understand\.</g, '>{stage80CabinetText("hint")}<');
      s = s.replace(/>Name your searches so future notifications have clear names\.</g, '>{stage80CabinetText("hint")}<');
      s = s.replace(/>Переименуйте поиски, чтобы позже получать уведомления с понятными названиями\.</g, '>{stage80CabinetText("hint")}<');
      s = s.replace(/>Benennen Sie Ihre Suchaufträge[^<]*</g, '>{stage80CabinetText("hint")}<');

      s = s.replace(/>Suchname</g, '>{stage80CabinetText("name")}<');
      s = s.replace(/>Search name</g, '>{stage80CabinetText("name")}<');
      s = s.replace(/>Название поиска</g, '>{stage80CabinetText("name")}<');

      s = s.replace(/>Speichern</g, '>{stage80CabinetText("save")}<');
      s = s.replace(/>Save</g, '>{stage80CabinetText("save")}<');
      s = s.replace(/>Сохранить</g, '>{stage80CabinetText("save")}<');

      s = s.replace(/>Suche öffnen</g, '>{stage80CabinetText("open")}<');
      s = s.replace(/>Open search</g, '>{stage80CabinetText("open")}<');
      s = s.replace(/>Открыть поиск</g, '>{stage80CabinetText("open")}<');

      s = s.replace(/>Löschen</g, '>{stage80CabinetText("delete")}<');
      s = s.replace(/>Delete</g, '>{stage80CabinetText("delete")}<');
      s = s.replace(/>Удалить</g, '>{stage80CabinetText("delete")}<');

      // Filter chips/summary labels.
      s = s.replace(/Город:/g, '{stage80CabinetText("city")}:');
      s = s.replace(/City:/g, '{stage80CabinetText("city")}:');
      s = s.replace(/Ort:/g, '{stage80CabinetText("city")}:');
    } else {
      // Server fallback: set to German? Runtime cleanup will translate based on URL after hydration.
      // Keep neutral English/Russian mixed text out as much as possible.
      s = s
        .replace(/Saved Searches/g, "Saved searches")
        .replace(/Gespeicherte Suchen/g, "Saved searches")
        .replace(/Сохранённые поиски/g, "Saved searches")
        .replace(/Name your searches so future email notifications are easy to understand\./g, "Name your searches so future notifications have clear names.")
        .replace(/Переименуйте поиски, чтобы позже получать уведомления с понятными названиями\./g, "Name your searches so future notifications have clear names.")
        .replace(/Benennen Sie Ihre Suchaufträge[^"]*Benachrichtigungen\./g, "Name your searches so future notifications have clear names.")
        .replace(/Suchname/g, "Search name")
        .replace(/Speichern/g, "Save")
        .replace(/Suche öffnen/g, "Open search")
        .replace(/Löschen/g, "Delete")
        .replace(/Удалить/g, "Delete")
        .replace(/Город:/g, "City:");
    }

    return s;
  });
}

/* -------------------------------------------------------------------------- */
/* 3. Runtime cleanup fallback but scoped                                      */
/* -------------------------------------------------------------------------- */

const runtime = `"use client";

import { useEffect } from "react";

type Locale = "de" | "ru" | "en";

function getLocale(): Locale {
  const first = window.location.pathname.split("/").filter(Boolean)[0];
  if (first === "ru" || first === "de" || first === "en") return first;
  const cookie = document.cookie.match(/(?:^|;\\s*)zvg_locale=(ru|de|en)(?:;|$)/);
  return (cookie?.[1] as Locale) || "de";
}

const t = {
  de: {
    active: "Aktuell",
    details: "Details ansehen",
    value: "Verkehrswert",
    saved: "Gespeicherte Suchen",
    hint: "Benennen Sie Ihre Suchaufträge, damit spätere Benachrichtigungen verständliche Namen haben.",
    name: "Suchname",
    save: "Speichern",
    open: "Suche öffnen",
    delete: "Löschen",
    city: "Ort",
  },
  ru: {
    active: "Активно",
    details: "Подробнее",
    value: "Оценочная стоимость",
    saved: "Сохранённые поиски",
    hint: "Переименуйте поиски, чтобы позже получать уведомления с понятными названиями.",
    name: "Название поиска",
    save: "Сохранить",
    open: "Открыть поиск",
    delete: "Удалить",
    city: "Город",
  },
  en: {
    active: "Active",
    details: "View details",
    value: "Market value",
    saved: "Saved searches",
    hint: "Name your searches so future notifications have clear names.",
    name: "Search name",
    save: "Save",
    open: "Open search",
    delete: "Delete",
    city: "City",
  },
} as const;

function walk(root: ParentNode, replace: (text: string) => string) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Node[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const oldText = node.textContent || "";
    const newText = replace(oldText);
    if (newText !== oldText) node.textContent = newText;
  }
}

function replaceCabinetText(text: string, locale: Locale) {
  const x = t[locale];
  return text
    .replace(/Saved Searches|Saved searches|Gespeicherte Suchen|Сохранённые поиски|Сохраненные поиски/g, x.saved)
    .replace(/Name your searches so future email notifications are easy to understand\\.|Name your searches so future notifications have clear names\\.|Переименуйте поиски, чтобы позже получать уведомления с понятными названиями\\.|Benennen Sie Ihre Suchaufträge[^.]*\\./g, x.hint)
    .replace(/Suchname|Search name|Название поиска/g, x.name)
    .replace(/Speichern|Save|Сохранить/g, x.save)
    .replace(/Suche öffnen|Open search|Открыть поиск/g, x.open)
    .replace(/Löschen|Delete|Удалить/g, x.delete)
    .replace(/Город:|City:|Ort:/g, x.city + ":");
}

function fixPopup(locale: Locale) {
  const x = t[locale];

  document.querySelectorAll<HTMLElement>(".leaflet-popup-content, .osm-popup-card").forEach((popup) => {
    walk(popup, (text) => {
      if (text.includes("${") || /stage\\d+PopupStatus|escapeHtml\\(statusText\\)/i.test(text)) return x.active;
      if (/Professionelles Werkzeug|Профессиональный инструмент|Professional tool/.test(text)) return "";
      return text
        .replace(/Details ansehen|Подробнее|View details/g, x.details)
        .replace(/Verkehrswert|Оценочная стоимость|Market value/g, x.value);
    });

    const title = popup.querySelector<HTMLElement>("h1,h2,h3,h4,.popup-title,[class*='title']");
    const address = popup.querySelector<HTMLElement>("p, .address, [class*='address']");
    if (title && !title.textContent?.trim() && address?.textContent?.trim()) {
      title.textContent = address.textContent.trim();
    }
    if (title && address && title.textContent?.trim() === address.textContent?.trim()) {
      address.style.display = "none";
    }
  });
}

function fixCabinet(locale: Locale) {
  walk(document.body, (text) => replaceCabinetText(text, locale));

  document.querySelectorAll<HTMLElement>("section, article, div").forEach((el) => {
    const text = el.innerText || "";
    if (
      text.includes(t[locale].saved) ||
      text.includes("Saved searches") ||
      text.includes("Gespeicherte Suchen") ||
      text.includes("Сохранённые поиски")
    ) {
      el.classList.add("saved-search-compact-v80");
    }
  });
}

export function RuntimeUiCleanup() {
  useEffect(() => {
    const apply = () => {
      const locale = getLocale();
      fixPopup(locale);
      fixCabinet(locale);
    };

    apply();

    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    const interval = window.setInterval(apply, 1000);

    return () => {
      observer.disconnect();
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
`;

write("components/RuntimeUiCleanup.tsx", runtime);

// Ensure runtime component is mounted.
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

if (exists("app/layout.tsx")) mountLayout("app/layout.tsx");
if (exists("app/[locale]/layout.tsx")) mountLayout("app/[locale]/layout.tsx");

/* -------------------------------------------------------------------------- */
/* 4. CSS compacting                                                           */
/* -------------------------------------------------------------------------- */

patch("app/globals.css", (s) => {
  if (s.includes("/* Stage 80 direct popup and cabinet fix */")) return s;

  return s + `

/* Stage 80 direct popup and cabinet fix */

/* Saved searches compact: stronger and more specific */
.saved-search-compact-v80,
.saved-search-compact-v79,
.saved-search-compact-v78 {
  padding-top: 12px !important;
  padding-bottom: 12px !important;
  margin-top: 8px !important;
  margin-bottom: 8px !important;
}

.saved-search-compact-v80 > *,
.saved-search-compact-v79 > *,
.saved-search-compact-v78 > * {
  margin-top: 6px !important;
  margin-bottom: 6px !important;
}

.saved-search-compact-v80 section,
.saved-search-compact-v80 article,
.saved-search-compact-v80 div,
.saved-search-compact-v79 section,
.saved-search-compact-v79 article,
.saved-search-compact-v79 div,
.saved-search-compact-v78 section,
.saved-search-compact-v78 article,
.saved-search-compact-v78 div {
  min-height: unset !important;
}

.saved-search-compact-v80 input,
.saved-search-compact-v79 input,
.saved-search-compact-v78 input {
  height: 40px !important;
  min-height: 40px !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}

.saved-search-compact-v80 button,
.saved-search-compact-v80 a,
.saved-search-compact-v80 .btn,
.saved-search-compact-v79 button,
.saved-search-compact-v79 a,
.saved-search-compact-v79 .btn,
.saved-search-compact-v78 button,
.saved-search-compact-v78 a,
.saved-search-compact-v78 .btn {
  min-height: 38px !important;
  height: 38px !important;
  padding: 0 14px !important;
  border-radius: 13px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
}

/* Target big saved-search cards by contents/classes too */
[class*="saved-search"],
[class*="savedSearch"],
[class*="SavedSearch"] {
  min-height: unset !important;
}

[class*="saved-search"] button,
[class*="saved-search"] a,
[class*="savedSearch"] button,
[class*="savedSearch"] a,
[class*="SavedSearch"] button,
[class*="SavedSearch"] a {
  min-height: 38px !important;
  height: 38px !important;
  padding: 0 14px !important;
}

/* Popup cleanup */
.leaflet-popup-content h1:empty,
.leaflet-popup-content h2:empty,
.leaflet-popup-content h3:empty,
.leaflet-popup-content h4:empty,
.osm-popup-card h1:empty,
.osm-popup-card h2:empty,
.osm-popup-card h3:empty,
.osm-popup-card h4:empty {
  display: none !important;
}
`;
});

console.log("Stage 80 completed.");
