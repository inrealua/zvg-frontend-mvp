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
  "Кликните по карте, чтобы поставить точки. Минимум 3 точки.": {
    de: "Klicken Sie auf die Karte, um Punkte zu setzen. Mindestens 3 Punkte.",
    ru: "Кликните по карте, чтобы поставить точки. Минимум 3 точки.",
    en: "Click on the map to set points. At least 3 points.",
  },
  "Polygon anwenden": { de: "Polygon anwenden", ru: "Применить полигон", en: "Apply polygon" },
  "Применить полигон": { de: "Polygon anwenden", ru: "Применить полигон", en: "Apply polygon" },
  "Punkte löschen": { de: "Punkte löschen", ru: "Удалить точки", en: "Clear points" },
  "Удалить точки": { de: "Punkte löschen", ru: "Удалить точки", en: "Clear points" },
  "Abbrechen": { de: "Abbrechen", ru: "Отмена", en: "Cancel" },
  "Отмена": { de: "Abbrechen", ru: "Отмена", en: "Cancel" },

  // FilterBar: RU/DE/EN hardcoded leftovers
  "Termin ab": { de: "Termin ab", ru: "Торги от", en: "Auction from" },
  "Termin bis": { de: "Termin bis", ru: "Торги до", en: "Auction to" },
  "Denkmalschutz": { de: "Denkmalschutz", ru: "Памятник архитектуры", en: "Listed monument" },
  "Wertgrenzen": { de: "Wertgrenzen", ru: "Ценовые границы", en: "Value limits" },
  "Termin-Nr.": { de: "Termin-Nr.", ru: "№ термина", en: "Auction no." },
  "Sortierung": { de: "Sortierung", ru: "Сортировка", en: "Sorting" },
  "Anzeigen": { de: "Anzeigen", ru: "Показывать", en: "Show" },
  "Objekte finden": { de: "Objekte finden", ru: "Найти объекты", en: "Find properties" },
  "Filter zurücksetzen": { de: "Filter zurücksetzen", ru: "Сбросить фильтр", en: "Reset filters" },
  "Termin aufsteigend": { de: "Termin aufsteigend", ru: "Дата торгов по возрастанию", en: "Auction date ascending" },
  "Termin absteigend": { de: "Termin absteigend", ru: "Дата торгов по убыванию", en: "Auction date descending" },
  "Preis aufsteigend": { de: "Preis aufsteigend", ru: "Цена по возрастанию", en: "Price ascending" },
  "Preis absteigend": { de: "Preis absteigend", ru: "Цена по убыванию", en: "Price descending" },
  "Не важно": { de: "Egal", ru: "Не важно", en: "Any" },
  "Любой термин": { de: "Jeder Termin", ru: "Любой термин", en: "Any auction" },
  "20 на странице": { de: "20 pro Seite", ru: "20 на странице", en: "20 per page" },
  "50 на странице": { de: "50 pro Seite", ru: "50 на странице", en: "50 per page" },
  "100 на странице": { de: "100 pro Seite", ru: "100 на странице", en: "100 per page" },
  "Все актуальные": { de: "Alle aktuellen", ru: "Все актуальные", en: "All current" },
  "Alle aktuellen": { de: "Alle aktuellen", ru: "Все актуальные", en: "All current" },
  "Все города": { de: "Alle Orte", ru: "Все города", en: "All cities" },
  "Alle Orte": { de: "Alle Orte", ru: "Все города", en: "All cities" },
  "z. B. 091": { de: "z. B. 091", ru: "например: 091", en: "e.g. 091" },
  "например: 091": { de: "z. B. 091", ru: "например: 091", en: "e.g. 091" },
  "Kein Radius": { de: "Kein Radius", ru: "Без радиуса", en: "No radius" },
  "Без радиуса": { de: "Kein Radius", ru: "Без радиуса", en: "No radius" },
  "Amtsgericht": { de: "Amtsgericht", ru: "Суд", en: "Court" },
  "Alle Gerichte": { de: "Alle Gerichte", ru: "Все суды", en: "All courts" },
  "Суд": { de: "Amtsgericht", ru: "Суд", en: "Court" },
  "Поиск": { de: "Suche", ru: "Поиск", en: "Search" },
  "Город": { de: "Ort", ru: "Город", en: "City" },
  "Индекс": { de: "PLZ", ru: "Индекс", en: "ZIP" },
  "Участок": { de: "Grundstück", ru: "Участок", en: "Plot size" },
  "Радиус": { de: "Umkreis", ru: "Радиус", en: "Radius" },
  "Федеральная земля": { de: "Bundesland", ru: "Федеральная земля", en: "Federal state" },
  "Alle Bundesländer": { de: "Alle Bundesländer", ru: "Все земли", en: "All states" },
  "Все земли": { de: "Alle Bundesländer", ru: "Все земли", en: "All states" },

  // Cabinet / saved searches / calendar
  "Gespeicherte Suchen": { de: "Gespeicherte Suchen", ru: "Сохранённые поиски", en: "Saved searches" },
  "Сохранённые поиски": { de: "Gespeicherte Suchen", ru: "Сохранённые поиски", en: "Saved searches" },
  "Benennen Sie Ihre Suchaufträge für spätere E-Mail-Benachrichtigungen.": {
    de: "Benennen Sie Ihre Suchaufträge für spätere E-Mail-Benachrichtigungen.",
    ru: "Назовите ваши поиски для будущих уведомлений по e-mail.",
    en: "Name your saved searches for future email notifications.",
  },
  "Suchname": { de: "Suchname", ru: "Название поиска", en: "Search name" },
  "Speichern": { de: "Speichern", ru: "Сохранить", en: "Save" },
  "Suche öffnen": { de: "Suche öffnen", ru: "Открыть поиск", en: "Open search" },
  "Удалить": { de: "Löschen", ru: "Удалить", en: "Delete" },
  "Löschen": { de: "Löschen", ru: "Удалить", en: "Delete" },
  "Город: Berlin": { de: "Ort: Berlin", ru: "Город: Berlin", en: "City: Berlin" },
  "Auktionskalender": { de: "Auktionskalender", ru: "Календарь аукционов", en: "Auction calendar" },
  "Ihre favorisierten Objekte nach Auktionstermin.": {
    de: "Ihre favorisierten Objekte nach Auktionstermin.",
    ru: "Ваши избранные объекты по дате торгов.",
    en: "Your favorite properties by auction date.",
  },
  "Zurück": { de: "Zurück", ru: "Назад", en: "Previous" },
  "Weiter": { de: "Weiter", ru: "Вперёд", en: "Next" },
  "Juni 2026": { de: "Juni 2026", ru: "Июнь 2026", en: "June 2026" },
  "MO": { de: "MO", ru: "ПН", en: "MON" },
  "DI": { de: "DI", ru: "ВТ", en: "TUE" },
  "MI": { de: "MI", ru: "СР", en: "WED" },
  "DO": { de: "DO", ru: "ЧТ", en: "THU" },
  "FR": { de: "FR", ru: "ПТ", en: "FRI" },
  "SA": { de: "SA", ru: "СБ", en: "SAT" },
  "SO": { de: "SO", ru: "ВС", en: "SUN" },

  // Favorite cards
  "Meine Notiz": { de: "Meine Notiz", ru: "Моя заметка", en: "My note" },
  "Моя заметка": { de: "Meine Notiz", ru: "Моя заметка", en: "My note" },
  "Ihre persönliche Notiz zu diesem Objekt...": {
    de: "Ihre persönliche Notiz zu diesem Objekt...",
    ru: "Ваша личная заметка по этому объекту...",
    en: "Your personal note for this property...",
  },
  "Ваша личная заметка по этому объекту...": {
    de: "Ihre persönliche Notiz zu diesem Objekt...",
    ru: "Ваша личная заметка по этому объекту...",
    en: "Your personal note for this property...",
  },
  "Подробнее": { de: "Details ansehen", ru: "Подробнее", en: "View details" },
  "Entfernen": { de: "Entfernen", ru: "Удалить", en: "Remove" },

  // Property map / legend
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

  // Property detail page
  "Характеристики": { de: "Merkmale", ru: "Характеристики", en: "Characteristics" },
  "Адрес": { de: "Adresse", ru: "Адрес", en: "Address" },
  "PLZ / Ort": { de: "PLZ / Ort", ru: "Индекс / город", en: "ZIP / City" },
  "Жилая площадь": { de: "Wohnfläche", ru: "Жилая площадь", en: "Living area" },
  "Nutzfläche": { de: "Nutzfläche", ru: "Полезная площадь", en: "Usable area" },
  "Gesamtfläche": { de: "Gesamtfläche", ru: "Общая площадь", en: "Total area" },
  "Год постройки": { de: "Baujahr", ru: "Год постройки", en: "Year built" },
  "Использование": { de: "Nutzung", ru: "Использование", en: "Use" },
  "Памятник архитектуры": { de: "Denkmalschutz", ru: "Памятник архитектуры", en: "Listed monument" },
  "Торги": { de: "Versteigerung", ru: "Торги", en: "Auction" },
  "Место торгов": { de: "Ort der Versteigerung", ru: "Место торгов", en: "Auction location" },
  "Aktenzeichen": { de: "Aktenzeichen", ru: "Номер дела", en: "Case number" },
  "№ термина": { de: "Termin-Nr.", ru: "№ термина", en: "Auction no." },
  "Ценовые границы": { de: "Wertgrenzen", ru: "Ценовые границы", en: "Value limits" },
};

function getCookieLocale(): Locale {
  const match = document.cookie.match(/(?:^|;\s*)zvg_locale=(de|ru|en)(?:;|$)/);
  return (match?.[1] as Locale) || "de";
}

function applyDynamicPatterns(text: string, locale: Locale): string | null {
  const trimmed = text.trim();

  const polygon = trimmed.match(/^Polygon anwenden\s*\((\d+)\)$/);
  if (polygon) {
    const count = polygon[1];
    if (locale === "ru") return `Применить полигон (${count})`;
    if (locale === "en") return `Apply polygon (${count})`;
    return `Polygon anwenden (${count})`;
  }

  const city = trimmed.match(/^(Город|Ort|City):\s*(.+)$/);
  if (city) {
    const value = city[2];
    if (locale === "ru") return `Город: ${value}`;
    if (locale === "en") return `City: ${value}`;
    return `Ort: ${value}`;
  }

  const perPage = trimmed.match(/^(\d+)\s+(на странице|pro Seite|per page)$/);
  if (perPage) {
    const value = perPage[1];
    if (locale === "ru") return `${value} на странице`;
    if (locale === "en") return `${value} per page`;
    return `${value} pro Seite`;
  }

  return null;
}

function targetText(original: string, locale: Locale): string | null {
  const trimmed = original.trim();
  const dynamic = applyDynamicPatterns(trimmed, locale);
  if (dynamic) return dynamic;

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
      if (!text || text.length > 240) return NodeFilter.FILTER_REJECT;
      return targetText(text, locale) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
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
    }, 400);

    return () => {
      observer.disconnect();
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
