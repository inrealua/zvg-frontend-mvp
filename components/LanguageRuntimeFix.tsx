"use client";

import { useEffect } from "react";

type Locale = "de" | "ru" | "en";

type TranslationMap = Record<string, { de: string; ru: string; en: string }>;

const translations: TranslationMap = {
  // Homepage / hero / quick search
  "Schnellsuche": { de: "Schnellsuche", ru: "Быстрый поиск", en: "Quick Search" },
  "Starten Sie mit den wichtigsten Kriterien. Die vollständige Suche finden Sie auf der Kartenseite.": {
    de: "Starten Sie mit den wichtigsten Kriterien. Die vollständige Suche finden Sie auf der Kartenseite.",
    ru: "Начните с основных критериев. Полный поиск доступен на странице расширенного поиска.",
    en: "Start with the most important criteria. Full search is available on the advanced search page.",
  },
  "Ort, PLZ, Adresse oder Gericht": { de: "Ort, PLZ, Adresse oder Gericht", ru: "Город, индекс, адрес или суд", en: "City, ZIP, address or court" },
  "z. B. Chemnitz, 09111, Amtsgericht Dresden": { de: "z. B. Chemnitz, 09111, Amtsgericht Dresden", ru: "например: Chemnitz, 09111, Amtsgericht Dresden", en: "e.g. Chemnitz, 09111, Amtsgericht Dresden" },
  "Bundesland": { de: "Bundesland", ru: "Федеральная земля", en: "Federal state" },
  "Alle Bundesländer": { de: "Alle Bundesländer", ru: "Все земли", en: "All states" },
  "Objektart": { de: "Objektart", ru: "Тип объекта", en: "Property type" },
  "Alle Typen": { de: "Alle Typen", ru: "Все типы", en: "All types" },
  "Все типы": { de: "Alle Typen", ru: "Все типы", en: "All types" },
  "Verkehrswert bis": { de: "Verkehrswert bis", ru: "Оценочная стоимость до", en: "Market value up to" },
  "Beliebig": { de: "Beliebig", ru: "Любая", en: "Any" },
  "Schnell suchen": { de: "Schnell suchen", ru: "Быстрый поиск", en: "Quick search" },
  "Erweiterte Suche": { de: "Erweiterte Suche", ru: "Расширенный поиск", en: "Advanced Search" },

  // Home map block
  "Versteigerungen auf der Karte": { de: "Versteigerungen auf der Karte", ru: "Аукционы на карте", en: "Auctions on the map" },
  "Ein schneller Überblick. Die große Karte mit allen Filtern finden Sie im Bereich Karte.": {
    de: "Ein schneller Überblick. Die große Karte mit allen Filtern finden Sie im Bereich Karte.",
    ru: "Краткий обзор. Большая карта со всеми фильтрами находится в разделе Карта.",
    en: "A quick overview. The large map with all filters is available in the Map section.",
  },
  "Große Karte öffnen": { de: "Große Karte öffnen", ru: "Открыть большую карту", en: "Open large map" },
  "große Karte öffnen": { de: "Große Karte öffnen", ru: "Открыть большую карту", en: "Open large map" },

  // Map card / map page
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

  // Stats
  "Seite": { de: "Seite", ru: "Страница", en: "Page" },
  "Gefunden": { de: "Gefunden", ru: "Найдено", en: "Found" },
  "Aktiv": { de: "Aktiv", ru: "Активно", en: "Active" },
  "Aufgehoben": { de: "Aufgehoben", ru: "Отменено", en: "Cancelled" },
  "Archiv": { de: "Archiv", ru: "Архив", en: "Archive" },
  "Max. Wert": { de: "Max. Wert", ru: "Макс. стоимость", en: "Max. value" },

  // Trust / hero stats
  "Geprüfte Quellen": { de: "Geprüfte Quellen", ru: "Проверенные источники", en: "Verified sources" },
  "Täglich aktualisiert": { de: "Täglich aktualisiert", ru: "Ежедневное обновление", en: "Updated daily" },
  "Deutschlandweit": { de: "Deutschlandweit", ru: "По всей Германии", en: "Germany-wide" },
  "Immobilien in der Datenbank": { de: "Immobilien in der Datenbank", ru: "объектов в базе", en: "properties in database" },
  "Objekte in der Datenbank": { de: "Objekte in der Datenbank", ru: "объектов в базе", en: "properties in database" },
  "auf der Karte": { de: "auf der Karte", ru: "на карте", en: "on the map" },
  "Ø Verkehrswert": { de: "Ø Verkehrswert", ru: "Ø оценочная стоимость", en: "Ø market value" },
  "kostenlos suchen": { de: "kostenlos suchen", ru: "бесплатный поиск", en: "free search" },
  "Bundesländer": { de: "Bundesländer", ru: "федеральных земель", en: "federal states" },

  // Results list
  "Top 12 aktuelle Objekte": { de: "Top 12 aktuelle Objekte", ru: "Топ-12 актуальных объектов", en: "Top 12 current properties" },
  "Kurze Auswahl für die Startseite. Die vollständige Recherche finden Sie in der erweiterten Suche.": {
    de: "Kurze Auswahl für die Startseite. Die vollständige Recherche finden Sie in der erweiterten Suche.",
    ru: "Короткая подборка для главной страницы. Полный поиск доступен в расширенном поиске.",
    en: "A short selection for the homepage. Full research is available in Advanced Search.",
  },
  "Zur erweiterten Suche": { de: "Zur erweiterten Suche", ru: "К расширенному поиску", en: "Go to advanced search" },
  "Go to advanced search": { de: "Zur erweiterten Suche", ru: "К расширенному поиску", en: "Go to advanced search" },
  "Suche speichern": { de: "Suche speichern", ru: "Сохранить поиск", en: "Save search" },

  // Pagination
  "Показано": { de: "Gezeigt", ru: "Показано", en: "Shown" },
  "Gezeigt": { de: "Gezeigt", ru: "Показано", en: "Shown" },
  "von": { de: "von", ru: "из", en: "of" },
  "Назад": { de: "Zurück", ru: "Назад", en: "Previous" },
  "Zurück": { de: "Zurück", ru: "Назад", en: "Previous" },
  "Вперёд": { de: "Weiter", ru: "Вперёд", en: "Next" },
  "Weiter": { de: "Weiter", ru: "Вперёд", en: "Next" },

  // FilterBar fallback / options
  "Поиск": { de: "Suche", ru: "Поиск", en: "Search" },
  "Город": { de: "Ort", ru: "Город", en: "City" },
  "Индекс": { de: "PLZ", ru: "Индекс", en: "ZIP" },
  "Радиус": { de: "Umkreis", ru: "Радиус", en: "Radius" },
  "Суд": { de: "Amtsgericht", ru: "Суд", en: "Court" },
  "Статус": { de: "Status", ru: "Статус", en: "Status" },
  "Все города": { de: "Alle Orte", ru: "Все города", en: "All cities" },
  "например: 091": { de: "z. B. 091", ru: "например: 091", en: "e.g. 091" },
  "Без радиуса": { de: "Kein Radius", ru: "Без радиуса", en: "No radius" },
  "Kein Radius": { de: "Kein Radius", ru: "Без радиуса", en: "No radius" },
  "Alle Orte": { de: "Alle Orte", ru: "Все города", en: "All cities" },
  "Alle Gerichte": { de: "Alle Gerichte", ru: "Все суды", en: "All courts" },

  // Property cards / labels
  "RESIDENTIAL HOUSES · RESIDENTIAL HOUSE": { de: "WOHNHÄUSER · WOHNHAUS", ru: "ЖИЛЫЕ ДОМА · ЖИЛОЙ ДОМ", en: "RESIDENTIAL HOUSES · RESIDENTIAL HOUSE" },
  "Residential houses · Residential house": { de: "Wohnhäuser · Wohnhaus", ru: "Жилые дома · Жилой дом", en: "Residential houses · Residential house" },
  "Market value": { de: "Verkehrswert", ru: "Оценочная стоимость", en: "Market value" },
  "Source: Testdaten / DB": { de: "Quelle: Testdaten / DB", ru: "Источник: тестовые данные / DB", en: "Source: test data / DB" },
  "View details": { de: "Details ansehen", ru: "Подробнее", en: "View details" },
  "Auction date": { de: "Termin", ru: "Дата торгов", en: "Auction date" },
  "Living area": { de: "Wohnfläche", ru: "Жилая площадь", en: "Living area" },
  "Plot size": { de: "Grundstück", ru: "Участок", en: "Plot size" },
  "Auction no.": { de: "Termin-Nr.", ru: "№ термина", en: "Auction no." },
  "Unknown": { de: "Unbekannt", ru: "Неизвестно", en: "Unknown" },
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
      if (!text || text.length > 180) return NodeFilter.FILTER_REJECT;
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

export function LanguageRuntimeFix() {
  useEffect(() => {
    let locale = getCookieLocale();
    let queued = false;

    const run = () => {
      queued = false;
      locale = getCookieLocale();
      translateDom(locale);
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
