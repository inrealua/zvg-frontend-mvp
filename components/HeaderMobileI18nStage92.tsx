"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

type Locale = "de" | "ru" | "en";

function getLocale(): Locale {
  const first = window.location.pathname.split("/").filter(Boolean)[0];
  if (first === "ru" || first === "de" || first === "en") return first;
  const select = document.querySelector<HTMLSelectElement>("select");
  const value = select?.value?.toLowerCase();
  if (value === "ru" || value === "de" || value === "en") return value;
  return "de";
}

const labels = {
  de: { home: "Startseite", archive: "Archiv", account: "Mein Konto", logout: "Abmelden" },
  ru: { home: "Главная", archive: "Архив", account: "Кабинет", logout: "Выйти" },
  en: { home: "Home", archive: "Archive", account: "My account", logout: "Logout" },
} as const;

function replaceExactText(root: ParentNode, from: string[], to: string) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Node[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  for (const node of nodes) {
    const text = node.textContent?.trim();
    if (text && from.includes(text)) node.textContent = to;
  }
}

function updateHeaderTexts() {
  const locale = getLocale();
  const header = document.querySelector("header");
  if (!header) return;

  replaceExactText(header, ["Startseite", "Главная", "Home"], labels[locale].home);
  replaceExactText(header, ["Archiv", "Архив", "Archive"], labels[locale].archive);
  replaceExactText(header, ["Mein Konto", "Кабинет", "My account", "My Account"], labels[locale].account);
  replaceExactText(header, ["Abmelden", "Выйти", "Logout"], labels[locale].logout);
}

export function HeaderMobileI18nStage92() {
  const pathname = usePathname();

  useEffect(() => {
    updateHeaderTexts();
    const id = window.setTimeout(updateHeaderTexts, 300);
    return () => window.clearTimeout(id);
  }, [pathname]);

  return null;
}
