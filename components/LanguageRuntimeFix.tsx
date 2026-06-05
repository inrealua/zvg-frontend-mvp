"use client";

import { useEffect } from "react";

type Locale = "de" | "ru" | "en";

type TranslationMap = Record<string, { de: string; ru: string; en: string }>;

const translations: TranslationMap = {
  // Polygon drawing panel
  "Нарисовать область": { de: "Region zeichnen", ru: "Нарисовать область", en: "Draw region" },
  "Klicken Sie auf die Karte, um Punkte zu setzen. Mindestens 3 Punkte.": {
    de: "Klicken Sie auf die Karte, um Punkte zu setzen. Mindestens 3 Punkte.",
    ru: "Кликните по карте, чтобы поставить точки. Минимум 3 точки.",
    en: "Click on the map to set points. At least 3 points.",
  },
  "Polygon anwenden (3)": { de: "Polygon anwenden (3)", ru: "Применить полигон (3)", en: "Apply polygon (3)" },
  "Polygon anwenden": { de: "Polygon anwenden", ru: "Применить полигон", en: "Apply polygon" },
  "Punkte löschen": { de: "Punkte löschen", ru: "Удалить точки", en: "Clear points" },
  "Abbrechen": { de: "Abbrechen", ru: "Отмена", en: "Cancel" },

  // Property detail — characteristics
  "Характеристики": { de: "Merkmale", ru: "Характеристики", en: "Characteristics" },
  "Адрес": { de: "Adresse", ru: "Адрес", en: "Address" },
  "Федеральная земля": { de: "Bundesland", ru: "Федеральная земля", en: "Federal state" },
  "PLZ / Ort": { de: "PLZ / Ort", ru: "Индекс / город", en: "ZIP / City" },
  "Жилая площадь": { de: "Wohnfläche", ru: "Жилая площадь", en: "Living area" },
  "Nutzfläche": { de: "Nutzfläche", ru: "Полезная площадь", en: "Usable area" },
  "Gesamtfläche": { de: "Gesamtfläche", ru: "Общая площадь", en: "Total area" },
  "Участок": { de: "Grundstück", ru: "Участок", en: "Plot size" },
  "Год постройки": { de: "Baujahr", ru: "Год постройки", en: "Year built" },
  "Использование": { de: "Nutzung", ru: "Использование", en: "Use" },
  "Памятник архитектуры": { de: "Denkmalschutz", ru: "Памятник архитектуры", en: "Listed monument" },

  // Property detail — auction
  "Торги": { de: "Versteigerung", ru: "Торги", en: "Auction" },
  "Место торгов": { de: "Ort der Versteigerung", ru: "Место торгов", en: "Auction location" },
  "Суд": { de: "Amtsgericht", ru: "Суд", en: "Court" },
  "Aktenzeichen": { de: "Aktenzeichen", ru: "Номер дела", en: "Case number" },
  "№ термина": { de: "Termin-Nr.", ru: "№ термина", en: "Auction no." },
  "Ценовые границы": { de: "Wertgrenzen", ru: "Ценовые границы", en: "Value limits" },

  // Favorite notes / cabinet cards
  "Meine Notiz": { de: "Meine Notiz", ru: "Моя заметка", en: "My note" },
  "Ihre persönliche Notiz zu diesem Objekt...": {
    de: "Ihre persönliche Notiz zu diesem Objekt...",
    ru: "Ваша личная заметка по этому объекту...",
    en: "Your personal note for this property...",
  },
  "Speichern": { de: "Speichern", ru: "Сохранить", en: "Save" },
  "Entfernen": { de: "Entfernen", ru: "Удалить", en: "Remove" },
  "Подробнее": { de: "Details ansehen", ru: "Подробнее", en: "View details" },

  // Property map / legend leftovers
  "Karte der Objekte": { de: "Karte der Objekte", ru: "Карта объектов", en: "Property map" },
  "Suchen Sie in der sichtbaren Kartenfläche oder zeichnen Sie eine eigene Suchregion.": {
    de: "Suchen Sie in der sichtbaren Kartenfläche oder zeichnen Sie eine eigene Suchregion.",
    ru: "Ищите в видимой области карты или нарисуйте собственную область поиска.",
    en: "Search within the visible map area or draw your own search region.",
  },
  "In diesem Kartenausschnitt suchen": { de: "In diesem Kartenausschnitt suchen", ru: "Искать в этой области карты", en: "Search this map area" },
  "Region zeichnen": { de: "Region zeichnen", ru: "Нарисовать область", en: "Draw region" },
  "Häuser": { de: "Häuser", ru: "Дома", en: "Houses" },
  "Wohnungen": { de: "Wohnungen", ru: "Квартиры", en: "Apartments" },
  "Grundstücke": { de: "Grundstücke", ru: "Участки", en: "Land plots" },
  "Gewerbe": { de: "Gewerbe", ru: "Коммерция", en: "Commercial" },
  "aufgehoben": { de: "aufgehoben", ru: "отменено", en: "cancelled" },

  // Common page/card labels
  "Оценочная стоимость": { de: "Verkehrswert", ru: "Оценочная стоимость", en: "Market value" },
  "Verkehrswert": { de: "Verkehrswert", ru: "Оценочная стоимость", en: "Market value" },
  "Market value": { de: "Verkehrswert", ru: "Оценочная стоимость", en: "Market value" },
  "Источник: тестовые данные / DB": { de: "Quelle: Testdaten / DB", ru: "Источник: тестовые данные / DB", en: "Source: test data / DB" },
  "Source: Testdaten / DB": { de: "Quelle: Testdaten / DB", ru: "Источник: тестовые данные / DB", en: "Source: test data / DB" },
  "View details": { de: "Details ansehen", ru: "Подробнее", en: "View details" },

  // Quick search leftovers
  "Schnellsuche": { de: "Schnellsuche", ru: "Быстрый поиск", en: "Quick Search" },
  "Starten Sie mit den wichtigsten Kriterien. Die vollständige Suche finden Sie auf der Kartenseite.": {
    de: "Starten Sie mit den wichtigsten Kriterien. Die vollständige Suche finden Sie auf der Kartenseite.",
    ru: "Начните с основных критериев. Полный поиск доступен на странице расширенного поиска.",
    en: "Start with the most important criteria. Full search is available on the advanced search page.",
  },
  "Ort, PLZ, Adresse oder Gericht": { de: "Ort, PLZ, Adresse oder Gericht", ru: "Город, индекс, адрес или суд", en: "City, ZIP, address or court" },
  "Bundesland": { de: "Bundesland", ru: "Федеральная земля", en: "Federal state" },
  "Objektart": { de: "Objektart", ru: "Тип объекта", en: "Property type" },
  "Verkehrswert bis": { de: "Verkehrswert bis", ru: "Оценочная стоимость до", en: "Market value up to" },
  "Alle Bundesländer": { de: "Alle Bundesländer", ru: "Все земли", en: "All states" },
  "Все типы": { de: "Alle Typen", ru: "Все типы", en: "All types" },
  "Beliebig": { de: "Beliebig", ru: "Любая", en: "Any" },
  "Schnell suchen": { de: "Schnell suchen", ru: "Быстрый поиск", en: "Quick search" },
  "Erweiterte Suche": { de: "Erweiterte Suche", ru: "Расширенный поиск", en: "Advanced Search" },
};

function getCookieLocale(): Locale {
  const match = document.cookie.match(/(?:^|;\s*)zvg_locale=(de|ru|en)(?:;|$)/);
  return (match?.[1] as Locale) || "de";
}

function targetText(original: string, locale: Locale): string | null {
  const trimmed = original.trim();
  const hit = translations[trimmed];
  if (!hit) return null;
  return hit[locale] ?? null;
}

function replaceTextNode(node: Text, locale: Locale) {
  const original = node.nodeValue ?? "";
  const replacement = targetText(original, locale);
  if (!replacement || replacement === original.trim()) return;

  const leading = original.match(/^\s*/)?.[0] ?? "";
  const trailing = original.match(/\s*$/)?.[0] ?? "";
  node.nodeValue = `${leading}${replacement}${trailing}`;
}

function translateDom(locale: Locale) {
  const root = document.body;
  if (!root) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      const tag = parent.tagName.toLowerCase();
      if (["script", "style", "noscript", "textarea", "input"].includes(tag)) return NodeFilter.FILTER_REJECT;
      const text = node.nodeValue?.trim();
      if (!text || text.length > 220) return NodeFilter.FILTER_REJECT;
      return translations[text] ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    },
  });

  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  nodes.forEach((node) => replaceTextNode(node, locale));

  document.querySelectorAll("option, input[placeholder], textarea[placeholder], [aria-label], [title]").forEach((element) => {
    if (element instanceof HTMLOptionElement) {
      const replacement = targetText(element.textContent ?? "", locale);
      if (replacement) element.textContent = replacement;
      return;
    }

    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      const replacement = targetText(element.placeholder, locale);
      if (replacement) element.placeholder = replacement;
    }

    const aria = element.getAttribute("aria-label");
    const ariaReplacement = aria ? targetText(aria, locale) : null;
    if (ariaReplacement) element.setAttribute("aria-label", ariaReplacement);

    const title = element.getAttribute("title");
    const titleReplacement = title ? targetText(title, locale) : null;
    if (titleReplacement) element.setAttribute("title", titleReplacement);
  });
}

function simplifyPropertyCardKickers() {
  // Убираем дубль "Жилые дома · Жилой дом" / "Residential houses · Residential house".
  // Оставляем только группу: "Жилые дома" / "Residential houses".
  document.querySelectorAll(".eyebrow").forEach((element) => {
    const text = element.textContent?.trim();
    if (!text || !text.includes("·")) return;

    const [left, right] = text.split("·").map((part) => part.trim());
    if (!left || !right) return;

    const leftNorm = left.toLowerCase();
    const rightNorm = right.toLowerCase();

    const isDuplicate =
      leftNorm.includes(rightNorm) ||
      rightNorm.includes(leftNorm.replace(/s$/, "")) ||
      (leftNorm.includes("жилые дома") && rightNorm.includes("жилой дом")) ||
      (leftNorm.includes("wohnhäuser") && rightNorm.includes("wohnhaus")) ||
      (leftNorm.includes("residential houses") && rightNorm.includes("residential house"));

    if (isDuplicate) element.textContent = left;
  });
}

export function LanguageRuntimeFix() {
  useEffect(() => {
    let locale = getCookieLocale();
    let queued = false;

    const run = () => {
      queued = false;
      locale = getCookieLocale();
      translateDom(locale);
      simplifyPropertyCardKickers();
    };

    const schedule = () => {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(run);
    };

    run();

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    const interval = window.setInterval(() => {
      const nextLocale = getCookieLocale();
      if (nextLocale !== locale) {
        locale = nextLocale;
        schedule();
      }
    }, 500);

    return () => {
      observer.disconnect();
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
