const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();

function file(rel) {
  return path.join(root, rel);
}

function patch(rel, fn) {
  const full = file(rel);
  if (!fs.existsSync(full)) {
    console.log("skip missing", rel);
    return;
  }
  const before = fs.readFileSync(full, "utf8");
  const after = fn(before);
  if (after !== before) {
    fs.writeFileSync(full, after, "utf8");
    console.log("patched", rel);
  } else {
    console.log("unchanged", rel);
  }
}

function write(rel, content) {
  const full = file(rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, "utf8");
  console.log("written", rel);
}

/**
 * Stage 79
 *
 * Fixes:
 * 1) Runtime cleanup removed "Professional tool" from the header/hero too.
 *    Now it removes that text ONLY inside Leaflet/map popup.
 *
 * 2) Popup still shows:
 *    ${escapeHtml(stage77PopupStatus(property))}
 *    Now runtime popup cleanup replaces any ${...status...} literal in popup.
 *
 * 3) Cabinet saved searches are translated, but vertical spaces are too large.
 *    Add stronger compact CSS and class marking.
 *
 * 4) Popup duplicates address: title line and address line can be the same.
 *    Hide duplicated address line only inside popup.
 */

/* -------------------------------------------------------------------------- */
/* 1. Replace RuntimeUiCleanup with scoped version                             */
/* -------------------------------------------------------------------------- */

const runtime = `"use client";

import { useEffect } from "react";

type Locale = "de" | "ru" | "en";

function getRuntimeLocale(): Locale {
  const first = window.location.pathname.split("/").filter(Boolean)[0];
  if (first === "ru" || first === "de" || first === "en") return first;
  const cookie = document.cookie.match(/(?:^|;\\s*)zvg_locale=(ru|de|en)(?:;|$)/);
  return (cookie?.[1] as Locale) || "de";
}

const ui = {
  de: {
    active: "Aktuell",
    cancelled: "Termin aufgehoben",
    archive: "Archiv",
    details: "Details ansehen",
    value: "Verkehrswert",
    saved: "Gespeicherte Suchen",
    hint: "Benennen Sie Ihre Suchaufträge für spätere Benachrichtigungen.",
    searchName: "Suchname",
    save: "Speichern",
    open: "Suche öffnen",
    delete: "Löschen",
    city: "Ort",
  },
  ru: {
    active: "Активно",
    cancelled: "Термин отменён",
    archive: "Архив",
    details: "Подробнее",
    value: "Оценочная стоимость",
    saved: "Сохранённые поиски",
    hint: "Переименуйте поиски, чтобы позже получать уведомления с понятными названиями.",
    searchName: "Название поиска",
    save: "Сохранить",
    open: "Открыть поиск",
    delete: "Удалить",
    city: "Город",
  },
  en: {
    active: "Active",
    cancelled: "Auction cancelled",
    archive: "Archive",
    details: "View details",
    value: "Market value",
    saved: "Saved searches",
    hint: "Name your searches so future email notifications are easy to understand.",
    searchName: "Search name",
    save: "Save",
    open: "Open search",
    delete: "Delete",
    city: "City",
  },
} as const;

function walkText(root: ParentNode, cb: (text: string) => string) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Node[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  for (const node of nodes) {
    const oldText = node.textContent || "";
    const newText = cb(oldText);
    if (newText !== oldText) node.textContent = newText;
  }
}

function translateGeneralText(text: string, locale: Locale) {
  const t = ui[locale];

  return text
    .replace(/Details ansehen|Подробнее|View details/g, t.details)
    .replace(/Verkehrswert|Оценочная стоимость|Market value/g, t.value)
    .replace(/Gespeicherte Suchen|Сохранённые поиски|Сохраненные поиски|Saved Searches|Saved searches/g, t.saved)
    .replace(/Benennen Sie Ihre Suchaufträge für spätere E-Mail-Benachrichtigungen\\.|Benennen Sie Ihre Suchaufträge für spätere Benachrichtigungen\\.|Переименуйте поиски, чтобы позже получать уведомления по понятным названиям\\.|Переименуйте поиски, чтобы позже получать уведомления с понятными названиями\\.|Name your searches so future email notifications are easy to understand\\./g, t.hint)
    .replace(/Suchname|Название поиска|Search name/g, t.searchName)
    .replace(/Speichern|Сохранить|Save/g, t.save)
    .replace(/Suche öffnen|Открыть поиск|Open search/g, t.open)
    .replace(/Удалить|Löschen|Delete/g, t.delete)
    .replace(/Город:|Ort:|City:/g, t.city + ":");
}

function popupStatusFromText(text: string, locale: Locale) {
  const t = ui[locale];
  const lower = text.toLowerCase();

  if (
    text.includes("${") ||
    lower.includes("stage77popupstatus") ||
    lower.includes("stage78popupstatus") ||
    lower.includes("escapehtml(statustext)") ||
    lower.includes("statustext")
  ) {
    return t.active;
  }

  if (lower.includes("cancel") || lower.includes("aufgeh") || lower.includes("отмен")) return t.cancelled;
  if (lower.includes("archiv") || lower.includes("archive") || lower.includes("архив")) return t.archive;
  if (lower.includes("active") || lower.includes("aktiv") || lower.includes("актив")) return t.active;

  return text;
}

function fixPopup(locale: Locale) {
  const t = ui[locale];

  document.querySelectorAll<HTMLElement>(".leaflet-popup-content, .osm-popup-card").forEach((popup) => {
    walkText(popup, (text) => {
      let next = text;

      if (
        next.includes("${") ||
        /stage\\d+Popup(Status|T|Value|Details)|escapeHtml\\((statusText|valueText|detailsText|titleText)/i.test(next)
      ) {
        if (/status/i.test(next)) return t.active;
        if (/detail/i.test(next)) return t.details;
        if (/value|market|verkehr/i.test(next)) return t.value;
      }

      // Remove wrong hero title ONLY in popup, never globally.
      if (/Professionelles Werkzeug|Профессиональный инструмент|Professional tool/.test(next)) {
        return "";
      }

      next = translateGeneralText(next, locale);
      return next;
    });

    // Fix badge/status elements explicitly.
    popup.querySelectorAll<HTMLElement>("span, small, b, strong, .badge, [class*='badge'], [class*='status']").forEach((el) => {
      const old = el.textContent || "";
      const next = popupStatusFromText(old, locale);
      if (next !== old) el.textContent = next;
    });

    // If title became empty after removing "Professional tool", use address.
    const possibleTitle = popup.querySelector<HTMLElement>("h1,h2,h3,h4,.popup-title,[class*='title']");
    if (possibleTitle && !possibleTitle.textContent?.trim()) {
      const address = popup.querySelector<HTMLElement>("p, .address, [class*='address']")?.textContent?.trim();
      if (address) possibleTitle.textContent = address;
    }

    // Hide duplicated address if title equals address.
    const title = popup.querySelector<HTMLElement>("h1,h2,h3,h4,.popup-title,[class*='title']");
    const address = popup.querySelector<HTMLElement>("p, .address, [class*='address']");
    if (title && address) {
      const titleText = title.textContent?.trim();
      const addressText = address.textContent?.trim();
      if (titleText && addressText && titleText === addressText) {
        address.style.display = "none";
      }
    }

    popup.querySelectorAll<HTMLAnchorElement | HTMLButtonElement>("a,button").forEach((el) => {
      if ((el.textContent || "").includes("${") || /Details ansehen|Подробнее|View details/.test(el.textContent || "")) {
        el.textContent = t.details;
      }
    });
  });
}

function fixCabinet(locale: Locale) {
  const t = ui[locale];

  // Translate whole body, but do NOT remove "Professional tool" here.
  walkText(document.body, (text) => translateGeneralText(text, locale));

  // Mark saved searches blocks for compact CSS.
  document.querySelectorAll<HTMLElement>("section, article, div").forEach((el) => {
    const text = el.innerText || "";
    if (
      text.includes(t.saved) ||
      text.includes("Saved Searches") ||
      text.includes("Saved searches") ||
      text.includes("Gespeicherte Suchen") ||
      text.includes("Сохранённые поиски")
    ) {
      el.classList.add("saved-search-compact-v79");
    }
  });
}

export function RuntimeUiCleanup() {
  useEffect(() => {
    const apply = () => {
      const locale = getRuntimeLocale();
      fixPopup(locale);
      fixCabinet(locale);
    };

    apply();

    const observer = new MutationObserver(apply);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    const timer = window.setInterval(apply, 1200);

    return () => {
      observer.disconnect();
      window.clearInterval(timer);
    };
  }, []);

  return null;
}
`;

write("components/RuntimeUiCleanup.tsx", runtime);

/* -------------------------------------------------------------------------- */
/* 2. Source-level popup cleanup in PropertyMap                                */
/* -------------------------------------------------------------------------- */

patch("components/PropertyMap.tsx", (s) => {
  // Do not remove hero text globally in source if it appears elsewhere in the file.
  // Only replace literal placeholders.
  s = s.replace(/\\?\\$\\{escapeHtml\\(statusText\\)\\}/g, "${escapeHtml(stage79PopupStatus(property))}");
  s = s.replace(/\\?\\$\\{escapeHtml\\(stage77PopupStatus\\(property\\)\\)\\}/g, "${escapeHtml(stage79PopupStatus(property))}");
  s = s.replace(/\\?\\$\\{escapeHtml\\(stage78PopupStatus\\(property\\)\\)\\}/g, "${escapeHtml(stage79PopupStatus(property))}");

  if (!s.includes("function stage79PopupStatus")) {
    const helper = `
function stage79PopupStatus(property: any) {
  const raw = String(property?.status || "").toLowerCase();
  if (raw.includes("cancel") || raw.includes("aufgeh") || raw.includes("отмен")) return "Termin aufgehoben";
  if (raw.includes("archiv") || raw.includes("archive") || raw.includes("архив")) return "Archiv";
  return "Aktuell";
}
`;
    const imports = [...s.matchAll(/^import[\\s\\S]*?;\\s*$/gm)];
    if (imports.length) {
      const last = imports[imports.length - 1];
      const idx = last.index + last[0].length;
      s = s.slice(0, idx) + "\n" + helper + s.slice(idx);
    } else {
      s = helper + "\n" + s;
    }
  }

  return s;
});

/* -------------------------------------------------------------------------- */
/* 3. Restore hero subtitle if runtime deleted it before                       */
/* -------------------------------------------------------------------------- */

patch("components/PublicPropertiesPage.tsx", (s) => {
  // Ensure RU hero subtitle remains desired. This does not affect popup.
  s = s.replace(/subtitle: ""/g, 'subtitle: "для поиска принудительных торгов в Германии"');

  // Remove take: 1 in image include to allow gallery images.
  s = s.replace(/images:\\s*\\{([\\s\\S]*?orderBy:\\s*\\[\\{ isMain: "desc" \\}, \\{ sortOrder: "asc" \\}\\],[\\s\\S]*?)take:\\s*1,\\s*([\\s\\S]*?)\\}/g, (m, a, b) => `images: {${a}${b}}`);

  return s;
});

/* -------------------------------------------------------------------------- */
/* 4. Strong cabinet spacing CSS                                               */
/* -------------------------------------------------------------------------- */

patch("app/globals.css", (s) => {
  if (s.includes("/* Stage 79 runtime scope popup cabinet spacing */")) return s;

  return s + `

/* Stage 79 runtime scope popup cabinet spacing */

/* Keep hero title intact; only popup blank titles hidden */
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

/* Cabinet saved searches: remove huge vertical empty spaces */
.saved-search-compact-v79 {
  padding-top: 14px !important;
  padding-bottom: 14px !important;
  margin-top: 10px !important;
  margin-bottom: 10px !important;
}

.saved-search-compact-v79 > * {
  margin-top: 8px !important;
  margin-bottom: 8px !important;
}

.saved-search-compact-v79 section,
.saved-search-compact-v79 article,
.saved-search-compact-v79 div {
  min-height: unset !important;
}

.saved-search-compact-v79 input {
  height: 42px !important;
  min-height: 42px !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}

.saved-search-compact-v79 button,
.saved-search-compact-v79 a,
.saved-search-compact-v79 .btn {
  min-height: 40px !important;
  height: 40px !important;
  padding: 0 16px !important;
  border-radius: 14px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
}

/* Common saved-search layouts */
[class*="saved-search"],
[class*="SavedSearch"],
[class*="savedSearch"] {
  min-height: unset !important;
}

[class*="saved-search"] button,
[class*="saved-search"] a,
[class*="savedSearch"] button,
[class*="savedSearch"] a {
  min-height: 40px !important;
  height: 40px !important;
  padding: 0 16px !important;
}

/* Shrink very tall card-like saved search rows */
.saved-search-compact-v79 [class*="card"],
.saved-search-compact-v79 [class*="item"],
.saved-search-compact-v79 article {
  padding: 12px 14px !important;
}
`;
});

console.log("Stage 79 completed.");
