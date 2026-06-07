"use client";

import { useEffect } from "react";

type Locale = "de" | "ru" | "en";

function runtimeLocaleStage81(): Locale {
  const first = window.location.pathname.split("/").filter(Boolean)[0];
  if (first === "ru" || first === "de" || first === "en") return first;
  const cookie = document.cookie.match(/(?:^|;\s*)zvg_locale=(ru|de|en)(?:;|$)/);
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
      .replace(/Name your searches so future email notifications are easy to understand\.|Name your searches so future notifications have clear names\.|Переименуйте поиски, чтобы позже получать уведомления с понятными названиями\.|Benennen Sie Ihre Suchaufträge[^.]*\./g, t.hint)
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
