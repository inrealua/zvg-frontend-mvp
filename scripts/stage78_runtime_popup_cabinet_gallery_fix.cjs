const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();

function p(rel){ return path.join(root, rel); }
function patch(rel, fn){
  const file = p(rel);
  if(!fs.existsSync(file)){ console.log("skip missing", rel); return; }
  const before = fs.readFileSync(file, "utf8");
  const after = fn(before);
  if(after !== before){ fs.writeFileSync(file, after, "utf8"); console.log("patched", rel); }
  else console.log("unchanged", rel);
}
function write(rel, content){
  const file = p(rel);
  fs.mkdirSync(path.dirname(file), {recursive:true});
  fs.writeFileSync(file, content, "utf8");
  console.log("written", rel);
}

/*
 Stage 78:
 - runtime-fix Leaflet popup text because popup is generated outside React
 - runtime-fix cabinet saved searches mixed language and oversized controls
 - remove images.take=1 so card gallery can receive multiple images
*/

const runtime = `"use client";

import { useEffect } from "react";

type Locale = "de" | "ru" | "en";

function locale(): Locale {
  const first = window.location.pathname.split("/").filter(Boolean)[0];
  if (first === "ru" || first === "de" || first === "en") return first;
  const cookie = document.cookie.match(/(?:^|;\\\\s*)zvg_locale=(ru|de|en)(?:;|$)/);
  return (cookie?.[1] as Locale) || "de";
}

const dict = {
  de: {
    active: "Aktuell",
    cancelled: "Termin aufgehoben",
    details: "Details ansehen",
    value: "Verkehrswert",
    saved: "Gespeicherte Suchen",
    hint: "Benennen Sie Ihre Suchaufträge für spätere Benachrichtigungen.",
    name: "Suchname",
    save: "Speichern",
    open: "Suche öffnen",
    del: "Löschen",
    city: "Ort",
  },
  ru: {
    active: "Активно",
    cancelled: "Термин отменён",
    details: "Подробнее",
    value: "Оценочная стоимость",
    saved: "Сохранённые поиски",
    hint: "Переименуйте поиски, чтобы позже получать уведомления с понятными названиями.",
    name: "Название поиска",
    save: "Сохранить",
    open: "Открыть поиск",
    del: "Удалить",
    city: "Город",
  },
  en: {
    active: "Active",
    cancelled: "Auction cancelled",
    details: "View details",
    value: "Market value",
    saved: "Saved searches",
    hint: "Name your searches so future email notifications are easy to understand.",
    name: "Search name",
    save: "Save",
    open: "Open search",
    del: "Delete",
    city: "City",
  },
} as const;

function replaceText(text: string, l: Locale) {
  const t = dict[l];

  if (/\\\\$\\\\{.*status|stage\\\\d+PopupStat|escapeHtml\\\\(statusText\\\\)/i.test(text)) return t.active;
  if (/Professionelles Werkzeug|Профессиональный инструмент|Professional tool/.test(text)) return "";

  return text
    .replace(/Details ansehen|Подробнее|View details|\\\\$\\\\{stage\\\\d+PopupT[^}]+details\\\\}/g, t.details)
    .replace(/Verkehrswert|Оценочная стоимость|Market value|\\\\$\\\\{stage\\\\d+PopupT[^}]+marketValue\\\\}/g, t.value)
    .replace(/Gespeicherte Suchen|Сохранённые поиски|Сохраненные поиски|Saved Searches|Saved searches/g, t.saved)
    .replace(/Benennen Sie Ihre Suchaufträge für spätere E-Mail-Benachrichtigungen\\\\.|Benennen Sie Ihre Suchaufträge für spätere Benachrichtigungen\\\\.|Переименуйте поиски, чтобы позже получать уведомления по понятным названиям\\\\.|Name your searches so future email notifications are easy to understand\\\\./g, t.hint)
    .replace(/Suchname|Название поиска|Search name/g, t.name)
    .replace(/Speichern|Сохранить|Save/g, t.save)
    .replace(/Suche öffnen|Открыть поиск|Open search/g, t.open)
    .replace(/Удалить|Löschen|Delete/g, t.del)
    .replace(/Город:|Ort:|City:/g, t.city + ":");
}

function walk(root: ParentNode, l: Locale) {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Node[] = [];
  while (w.nextNode()) nodes.push(w.currentNode);
  for (const n of nodes) {
    const old = n.textContent || "";
    const next = replaceText(old, l);
    if (next !== old) n.textContent = next;
  }
}

function fixPopup(l: Locale) {
  document.querySelectorAll<HTMLElement>(".leaflet-popup-content, .osm-popup-card, [class*='popup']").forEach((popup) => {
    walk(popup, l);

    popup.querySelectorAll<HTMLElement>("h1,h2,h3,h4,b,strong").forEach((el) => {
      const txt = (el.textContent || "").trim();
      if (!txt || txt === "Professionelles Werkzeug" || txt === "Профессиональный инструмент" || txt === "Professional tool") {
        const addr = popup.querySelector<HTMLElement>("p, .address, [class*='address']")?.textContent?.trim();
        if (addr) el.textContent = addr;
        else if (!txt) el.style.display = "none";
      }
    });

    popup.querySelectorAll<HTMLElement>("span,small,b,strong,.badge,[class*='badge'],[class*='status']").forEach((el) => {
      if (/\\\\$\\\\{|stage\\\\d+PopupStat|escapeHtml\\\\(statusText\\\\)/i.test(el.textContent || "")) {
        el.textContent = dict[l].active;
      }
    });
  });
}

function fixCabinet(l: Locale) {
  walk(document.body, l);
  document.querySelectorAll<HTMLElement>("section,article,div").forEach((el) => {
    const text = el.innerText || "";
    if (text.includes(dict[l].saved) || text.includes("Saved Searches") || text.includes("Gespeicherte Suchen") || text.includes("Сохранённые поиски")) {
      el.classList.add("saved-search-compact-v78");
    }
  });
}

export function RuntimeUiCleanup() {
  useEffect(() => {
    const apply = () => {
      const l = locale();
      fixPopup(l);
      fixCabinet(l);
    };
    apply();
    const obs = new MutationObserver(apply);
    obs.observe(document.body, { childList: true, subtree: true, characterData: true });
    const timer = window.setInterval(apply, 1000);
    return () => { obs.disconnect(); window.clearInterval(timer); };
  }, []);
  return null;
}
`;

write("components/RuntimeUiCleanup.tsx", runtime);

function mountLayout(rel){
  patch(rel, (s) => {
    if(!s.includes('RuntimeUiCleanup')) s = 'import { RuntimeUiCleanup } from "@/components/RuntimeUiCleanup";\n' + s;
    if(!s.includes('<RuntimeUiCleanup />')) {
      s = s.replace(/<body([^>]*)>/, '<body$1>\n        <RuntimeUiCleanup />');
      if(!s.includes('<RuntimeUiCleanup />')) s = s.replace(/\{children\}/, '<RuntimeUiCleanup />\n        {children}');
    }
    return s;
  });
}
if(fs.existsSync(p("app/layout.tsx"))) mountLayout("app/layout.tsx");
if(fs.existsSync(p("app/[locale]/layout.tsx"))) mountLayout("app/[locale]/layout.tsx");

patch("components/PublicPropertiesPage.tsx", (s) => {
  s = s.replace(/images:\s*\{([\s\S]*?orderBy:\s*\[\{ isMain: "desc" \}, \{ sortOrder: "asc" \}\],[\s\S]*?)take:\s*1,\s*([\s\S]*?)\}/g, (m,a,b) => `images: {${a}${b}}`);
  s = s.replace(/\n\s*propertyImages:\s*true,\s*/g, "\n");
  return s;
});

patch("components/PropertyMap.tsx", (s) => {
  s = s.replace(/\\?\$\{escapeHtml\(statusText\)\}/g, "${escapeHtml(stage78PopupStatus(property))}");
  s = s.replace(/Professionelles Werkzeug|Профессиональный инструмент|Professional tool/g, "${escapeHtml(stage78PopupTitle(property))}");
  return s;
});

patch("app/globals.css", (s) => {
  if(s.includes("/* Stage 78 runtime cleanup */")) return s;
  return s + `

/* Stage 78 runtime cleanup */
.saved-search-compact-v78 {
  padding-top: 16px !important;
  padding-bottom: 16px !important;
}
.saved-search-compact-v78 button,
.saved-search-compact-v78 a,
.saved-search-compact-v78 .btn {
  min-height: 40px !important;
  height: 40px !important;
  padding: 0 16px !important;
  border-radius: 14px !important;
}
.saved-search-compact-v78 input {
  min-height: 42px !important;
  height: 42px !important;
}
.leaflet-popup-content h1:empty,
.leaflet-popup-content h2:empty,
.leaflet-popup-content h3:empty,
.leaflet-popup-content h4:empty {
  display: none !important;
}
.main-card-gallery-nav-v77,
.main-card-gallery-nav-v76,
.main-card-gallery-nav-v75b {
  opacity: 1 !important;
}
`;
});

console.log("Stage 78 completed.");
