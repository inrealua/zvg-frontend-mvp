"use client";

import { useEffect } from "react";

type Locale = "de" | "ru" | "en";

type T = { de: string; ru: string; en: string };
type TranslationMap = Record<string, T>;

const entries: Array<[string, T]> = [
  // Quick search titles/subtitles/labels/buttons
  ["Schnellsuche", { de: "Schnellsuche", ru: "Быстрый поиск", en: "Quick Search" }],
  ["Быстрый поиск", { de: "Schnellsuche", ru: "Быстрый поиск", en: "Quick Search" }],
  ["Quick Search", { de: "Schnellsuche", ru: "Быстрый поиск", en: "Quick Search" }],

  ["Starten Sie mit den wichtigsten Kriterien. Die vollständige Suche finden Sie auf der Kartenseite.", {
    de: "Starten Sie mit den wichtigsten Kriterien. Die vollständige Suche finden Sie auf der Kartenseite.",
    ru: "Начните с основных критериев. Полный поиск доступен на странице расширенного поиска.",
    en: "Start with the most important criteria. Full search is available on the advanced search page.",
  }],
  ["Начните с основных критериев. Полный поиск доступен на странице расширенного поиска.", {
    de: "Starten Sie mit den wichtigsten Kriterien. Die vollständige Suche finden Sie auf der Kartenseite.",
    ru: "Начните с основных критериев. Полный поиск доступен на странице расширенного поиска.",
    en: "Start with the most important criteria. Full search is available on the advanced search page.",
  }],
  ["Start with the most important criteria. Full search is available on the advanced search page.", {
    de: "Starten Sie mit den wichtigsten Kriterien. Die vollständige Suche finden Sie auf der Kartenseite.",
    ru: "Начните с основных критериев. Полный поиск доступен на странице расширенного поиска.",
    en: "Start with the most important criteria. Full search is available on the advanced search page.",
  }],

  ["Ort, PLZ, Adresse oder Gericht", { de: "Ort, PLZ, Adresse oder Gericht", ru: "Город, индекс, адрес или суд", en: "City, ZIP, address or court" }],
  ["Город, индекс, адрес или суд", { de: "Ort, PLZ, Adresse oder Gericht", ru: "Город, индекс, адрес или суд", en: "City, ZIP, address or court" }],
  ["City, ZIP, address or court", { de: "Ort, PLZ, Adresse oder Gericht", ru: "Город, индекс, адрес или суд", en: "City, ZIP, address or court" }],

  ["Bundesland", { de: "Bundesland", ru: "Федеральная земля", en: "Federal state" }],
  ["Федеральная земля", { de: "Bundesland", ru: "Федеральная земля", en: "Federal state" }],
  ["Federal state", { de: "Bundesland", ru: "Федеральная земля", en: "Federal state" }],

  ["Objektart", { de: "Objektart", ru: "Тип объекта", en: "Property type" }],
  ["Тип объекта", { de: "Objektart", ru: "Тип объекта", en: "Property type" }],
  ["Property type", { de: "Objektart", ru: "Тип объекта", en: "Property type" }],

  ["Verkehrswert bis", { de: "Verkehrswert bis", ru: "Оценочная стоимость до", en: "Market value up to" }],
  ["Оценочная стоимость до", { de: "Verkehrswert bis", ru: "Оценочная стоимость до", en: "Market value up to" }],
  ["Market value up to", { de: "Verkehrswert bis", ru: "Оценочная стоимость до", en: "Market value up to" }],

  ["Schnell suchen", { de: "Schnell suchen", ru: "Быстрый поиск", en: "Quick search" }],
  ["Quick search", { de: "Schnell suchen", ru: "Быстрый поиск", en: "Quick search" }],

  ["Erweiterte Suche", { de: "Erweiterte Suche", ru: "Расширенный поиск", en: "Advanced Search" }],
  ["Расширенный поиск", { de: "Erweiterte Suche", ru: "Расширенный поиск", en: "Advanced Search" }],
  ["Advanced Search", { de: "Erweiterte Suche", ru: "Расширенный поиск", en: "Advanced Search" }],

  // Select common values
  ["Alle Bundesländer", { de: "Alle Bundesländer", ru: "Все земли", en: "All states" }],
  ["Все земли", { de: "Alle Bundesländer", ru: "Все земли", en: "All states" }],
  ["All states", { de: "Alle Bundesländer", ru: "Все земли", en: "All states" }],

  ["Alle Typen", { de: "Alle Typen", ru: "Все типы", en: "All types" }],
  ["Все типы", { de: "Alle Typen", ru: "Все типы", en: "All types" }],
  ["All types", { de: "Alle Typen", ru: "Все типы", en: "All types" }],

  ["Beliebig", { de: "Beliebig", ru: "Любая", en: "Any" }],
  ["Любая", { de: "Beliebig", ru: "Любая", en: "Any" }],
  ["Any", { de: "Beliebig", ru: "Любая", en: "Any" }],

  ["Egal", { de: "Egal", ru: "Не важно", en: "Any" }],
  ["Не важно", { de: "Egal", ru: "Не важно", en: "Any" }],

  ["Ja", { de: "Ja", ru: "Да", en: "Yes" }],
  ["Да", { de: "Ja", ru: "Да", en: "Yes" }],
  ["Yes", { de: "Ja", ru: "Да", en: "Yes" }],

  ["Nein", { de: "Nein", ru: "Нет", en: "No" }],
  ["Нет", { de: "Nein", ru: "Нет", en: "No" }],
  ["No", { de: "Nein", ru: "Нет", en: "No" }],

  ["Weggefallen", { de: "Weggefallen", ru: "Сняты", en: "Removed" }],
  ["Сняты", { de: "Weggefallen", ru: "Сняты", en: "Removed" }],
  ["Removed", { de: "Weggefallen", ru: "Сняты", en: "Removed" }],

  ["Nicht weggefallen / unbekannt", { de: "Nicht weggefallen / unbekannt", ru: "Не сняты / неизвестно", en: "Not removed / unknown" }],
  ["nicht weggefallen / unbekannt", { de: "Nicht weggefallen / unbekannt", ru: "Не сняты / неизвестно", en: "Not removed / unknown" }],
  ["Не сняты / неизвестно", { de: "Nicht weggefallen / unbekannt", ru: "Не сняты / неизвестно", en: "Not removed / unknown" }],
  ["Not removed / unknown", { de: "Nicht weggefallen / unbekannt", ru: "Не сняты / неизвестно", en: "Not removed / unknown" }],

  ["Nicht weggefallen", { de: "Nicht weggefallen", ru: "Не сняты", en: "Not removed" }],
  ["Не сняты", { de: "Nicht weggefallen", ru: "Не сняты", en: "Not removed" }],
  ["Not removed", { de: "Nicht weggefallen", ru: "Не сняты", en: "Not removed" }],

  ["Jeder Termin", { de: "Jeder Termin", ru: "Любой термин", en: "Any auction" }],
  ["Любой термин", { de: "Jeder Termin", ru: "Любой термин", en: "Any auction" }],
  ["Any auction", { de: "Jeder Termin", ru: "Любой термин", en: "Any auction" }],

  ["1-й термин", { de: "1. Termin", ru: "1-й термин", en: "1st auction" }],
  ["1. Termin", { de: "1. Termin", ru: "1-й термин", en: "1st auction" }],
  ["1st auction", { de: "1. Termin", ru: "1-й термин", en: "1st auction" }],

  ["2-й термин", { de: "2. Termin", ru: "2-й термин", en: "2nd auction" }],
  ["2. Termin", { de: "2. Termin", ru: "2-й термин", en: "2nd auction" }],
  ["2nd auction", { de: "2. Termin", ru: "2-й термин", en: "2nd auction" }],

  ["3-й и больше", { de: "3. und weitere", ru: "3-й и больше", en: "3rd and later" }],
  ["3. und weitere", { de: "3. und weitere", ru: "3-й и больше", en: "3rd and later" }],
  ["3rd and later", { de: "3. und weitere", ru: "3-й и больше", en: "3rd and later" }],

  ["Termin aufsteigend", { de: "Termin aufsteigend", ru: "Дата торгов по возрастанию", en: "Auction date ascending" }],
  ["Дата торгов по возрастанию", { de: "Termin aufsteigend", ru: "Дата торгов по возрастанию", en: "Auction date ascending" }],
  ["Auction date ascending", { de: "Termin aufsteigend", ru: "Дата торгов по возрастанию", en: "Auction date ascending" }],

  ["Termin absteigend", { de: "Termin absteigend", ru: "Дата торгов по убыванию", en: "Auction date descending" }],
  ["Дата торгов по убыванию", { de: "Termin absteigend", ru: "Дата торгов по убыванию", en: "Auction date descending" }],
  ["Auction date descending", { de: "Termin absteigend", ru: "Дата торгов по убыванию", en: "Auction date descending" }],

  ["Preis aufsteigend", { de: "Preis aufsteigend", ru: "Цена по возрастанию", en: "Price ascending" }],
  ["Цена по возрастанию", { de: "Preis aufsteigend", ru: "Цена по возрастанию", en: "Price ascending" }],
  ["Price ascending", { de: "Preis aufsteigend", ru: "Цена по возрастанию", en: "Price ascending" }],

  ["Preis absteigend", { de: "Preis absteigend", ru: "Цена по убыванию", en: "Price descending" }],
  ["Цена по убыванию", { de: "Preis absteigend", ru: "Цена по убыванию", en: "Price descending" }],
  ["Price descending", { de: "Preis absteigend", ru: "Цена по убыванию", en: "Price descending" }],

  ["20 pro Seite", { de: "20 pro Seite", ru: "20 на странице", en: "20 per page" }],
  ["20 на странице", { de: "20 pro Seite", ru: "20 на странице", en: "20 per page" }],
  ["20 per page", { de: "20 pro Seite", ru: "20 на странице", en: "20 per page" }],

  // Filter labels / buttons
  ["Termin ab", { de: "Termin ab", ru: "Торги от", en: "Auction from" }],
  ["Торги от", { de: "Termin ab", ru: "Торги от", en: "Auction from" }],
  ["Auction from", { de: "Termin ab", ru: "Торги от", en: "Auction from" }],

  ["Termin bis", { de: "Termin bis", ru: "Торги до", en: "Auction to" }],
  ["Торги до", { de: "Termin bis", ru: "Торги до", en: "Auction to" }],
  ["Auction to", { de: "Termin bis", ru: "Торги до", en: "Auction to" }],

  ["Denkmalschutz", { de: "Denkmalschutz", ru: "Памятник архитектуры", en: "Listed monument" }],
  ["Памятник архитектуры", { de: "Denkmalschutz", ru: "Памятник архитектуры", en: "Listed monument" }],
  ["Listed monument", { de: "Denkmalschutz", ru: "Памятник архитектуры", en: "Listed monument" }],

  ["Wertgrenzen", { de: "Wertgrenzen", ru: "Ценовые границы", en: "Value limits" }],
  ["Ценовые границы", { de: "Wertgrenzen", ru: "Ценовые границы", en: "Value limits" }],
  ["Value limits", { de: "Wertgrenzen", ru: "Ценовые границы", en: "Value limits" }],

  ["Termin-Nr.", { de: "Termin-Nr.", ru: "№ термина", en: "Auction no." }],
  ["№ термина", { de: "Termin-Nr.", ru: "№ термина", en: "Auction no." }],
  ["Auction no.", { de: "Termin-Nr.", ru: "№ термина", en: "Auction no." }],

  ["Sortierung", { de: "Sortierung", ru: "Сортировка", en: "Sorting" }],
  ["Сортировка", { de: "Sortierung", ru: "Сортировка", en: "Sorting" }],
  ["Sorting", { de: "Sortierung", ru: "Сортировка", en: "Sorting" }],

  ["Anzeigen", { de: "Anzeigen", ru: "Показывать", en: "Show" }],
  ["Показывать", { de: "Anzeigen", ru: "Показывать", en: "Show" }],
  ["Show", { de: "Anzeigen", ru: "Показывать", en: "Show" }],

  ["Objekte finden", { de: "Objekte finden", ru: "Найти объекты", en: "Find properties" }],
  ["Найти объекты", { de: "Objekte finden", ru: "Найти объекты", en: "Find properties" }],
  ["Find properties", { de: "Objekte finden", ru: "Найти объекты", en: "Find properties" }],

  ["Filter zurücksetzen", { de: "Filter zurücksetzen", ru: "Сбросить фильтр", en: "Reset filters" }],
  ["Сбросить фильтр", { de: "Filter zurücksetzen", ru: "Сбросить фильтр", en: "Reset filters" }],
  ["Reset filters", { de: "Filter zurücksetzen", ru: "Сбросить фильтр", en: "Reset filters" }],

  // Placeholders
  ["z. B. Chemnitz, 09111, Amtsgericht Dresden", { de: "z. B. Chemnitz, 09111, Amtsgericht Dresden", ru: "например: Chemnitz, 09111, Amtsgericht Dresden", en: "e.g. Chemnitz, 09111, Amtsgericht Dresden" }],
  ["например: Chemnitz, 09111, Amtsgericht Dresden", { de: "z. B. Chemnitz, 09111, Amtsgericht Dresden", ru: "например: Chemnitz, 09111, Amtsgericht Dresden", en: "e.g. Chemnitz, 09111, Amtsgericht Dresden" }],
  ["e.g. Chemnitz, 09111, Amtsgericht Dresden", { de: "z. B. Chemnitz, 09111, Amtsgericht Dresden", ru: "например: Chemnitz, 09111, Amtsgericht Dresden", en: "e.g. Chemnitz, 09111, Amtsgericht Dresden" }],

  // Property detail / buttons
  ["Startseite", { de: "Startseite", ru: "Главная", en: "Home" }],
  ["Главная", { de: "Startseite", ru: "Главная", en: "Home" }],
  ["Home", { de: "Startseite", ru: "Главная", en: "Home" }],

  ["WOHNHÄUSER", { de: "WOHNHÄUSER", ru: "ЖИЛЫЕ ДОМА", en: "RESIDENTIAL HOUSES" }],
  ["ЖИЛЫЕ ДОМА", { de: "WOHNHÄUSER", ru: "ЖИЛЫЕ ДОМА", en: "RESIDENTIAL HOUSES" }],
  ["RESIDENTIAL HOUSES", { de: "WOHNHÄUSER", ru: "ЖИЛЫЕ ДОМА", en: "RESIDENTIAL HOUSES" }],

  ["Verkehrswert", { de: "Verkehrswert", ru: "Оценочная стоимость", en: "Market value" }],
  ["Оценочная стоимость", { de: "Verkehrswert", ru: "Оценочная стоимость", en: "Market value" }],
  ["Market value", { de: "Verkehrswert", ru: "Оценочная стоимость", en: "Market value" }],

  ["Скопировать ссылку", { de: "Link kopieren", ru: "Скопировать ссылку", en: "Copy link" }],
  ["Link kopieren", { de: "Link kopieren", ru: "Скопировать ссылку", en: "Copy link" }],
  ["Copy link", { de: "Link kopieren", ru: "Скопировать ссылку", en: "Copy link" }],

  ["Поделиться", { de: "Teilen", ru: "Поделиться", en: "Share" }],
  ["Teilen", { de: "Teilen", ru: "Поделиться", en: "Share" }],
  ["Share", { de: "Teilen", ru: "Поделиться", en: "Share" }],

  ["Печать / PDF", { de: "Drucken / PDF", ru: "Печать / PDF", en: "Print / PDF" }],
  ["Drucken / PDF", { de: "Drucken / PDF", ru: "Печать / PDF", en: "Print / PDF" }],
  ["Print / PDF", { de: "Drucken / PDF", ru: "Печать / PDF", en: "Print / PDF" }],

  ["Fotos", { de: "Fotos", ru: "Фото", en: "Photos" }],
  ["Фото", { de: "Fotos", ru: "Фото", en: "Photos" }],
  ["Photos", { de: "Fotos", ru: "Фото", en: "Photos" }],

  ["Objektbeschreibung", { de: "Objektbeschreibung", ru: "Описание объекта", en: "Property description" }],
  ["Описание объекта", { de: "Objektbeschreibung", ru: "Описание объекта", en: "Property description" }],
  ["Property description", { de: "Objektbeschreibung", ru: "Описание объекта", en: "Property description" }],

  ["Versteigerung", { de: "Versteigerung", ru: "Торги", en: "Auction" }],
  ["Торги", { de: "Versteigerung", ru: "Торги", en: "Auction" }],
  ["Auction", { de: "Versteigerung", ru: "Торги", en: "Auction" }],

  ["Merkmale", { de: "Merkmale", ru: "Характеристики", en: "Characteristics" }],
  ["Характеристики", { de: "Merkmale", ru: "Характеристики", en: "Characteristics" }],
  ["Characteristics", { de: "Merkmale", ru: "Характеристики", en: "Characteristics" }],

  ["Karte", { de: "Karte", ru: "Карта", en: "Map" }],
  ["Карта", { de: "Karte", ru: "Карта", en: "Map" }],
  ["Map", { de: "Karte", ru: "Карта", en: "Map" }],

  ["Dokumente", { de: "Dokumente", ru: "Документы", en: "Documents" }],
  ["Документы", { de: "Dokumente", ru: "Документы", en: "Documents" }],
  ["Documents", { de: "Dokumente", ru: "Документы", en: "Documents" }],

  ["Termin", { de: "Termin", ru: "Дата торгов", en: "Auction date" }],
  ["Дата торгов", { de: "Termin", ru: "Дата торгов", en: "Auction date" }],
  ["Auction date", { de: "Termin", ru: "Дата торгов", en: "Auction date" }],

  ["Wohnfläche", { de: "Wohnfläche", ru: "Жилая площадь", en: "Living area" }],
  ["Жилая площадь", { de: "Wohnfläche", ru: "Жилая площадь", en: "Living area" }],
  ["Living area", { de: "Wohnfläche", ru: "Жилая площадь", en: "Living area" }],

  ["Grundstück", { de: "Grundstück", ru: "Участок", en: "Plot size" }],
  ["Участок", { de: "Grundstück", ru: "Участок", en: "Plot size" }],
  ["Plot size", { de: "Grundstück", ru: "Участок", en: "Plot size" }],

  ["Nutzung", { de: "Nutzung", ru: "Использование", en: "Use" }],
  ["Использование", { de: "Nutzung", ru: "Использование", en: "Use" }],
  ["Use", { de: "Nutzung", ru: "Использование", en: "Use" }],

  ["Сдан в аренду", { de: "Vermietet", ru: "Сдан в аренду", en: "Rented" }],
  ["Vermietet", { de: "Vermietet", ru: "Сдан в аренду", en: "Rented" }],
  ["Rented", { de: "Vermietet", ru: "Сдан в аренду", en: "Rented" }],

  ["Ort der Versteigerung", { de: "Ort der Versteigerung", ru: "Место торгов", en: "Auction location" }],
  ["Место торгов", { de: "Ort der Versteigerung", ru: "Место торгов", en: "Auction location" }],
  ["Auction location", { de: "Ort der Versteigerung", ru: "Место торгов", en: "Auction location" }],

  ["Gericht", { de: "Gericht", ru: "Суд", en: "Court" }],
  ["Aktenzeichen", { de: "Aktenzeichen", ru: "Номер дела", en: "Case number" }],
  ["Номер дела", { de: "Aktenzeichen", ru: "Номер дела", en: "Case number" }],
  ["Case number", { de: "Aktenzeichen", ru: "Номер дела", en: "Case number" }],

  // Map/list leftovers
  ["Karte der Objekte", { de: "Karte der Objekte", ru: "Карта объектов", en: "Property map" }],
  ["Карта объектов", { de: "Karte der Objekte", ru: "Карта объектов", en: "Property map" }],
  ["Property map", { de: "Karte der Objekte", ru: "Карта объектов", en: "Property map" }],
];

const translations: TranslationMap = Object.fromEntries(entries);

function getCookieLocale(): Locale {
  const match = document.cookie.match(/(?:^|;\s*)zvg_locale=(de|ru|en)(?:;|$)/);
  return (match?.[1] as Locale) || "de";
}

function applyDynamicPatterns(text: string, locale: Locale): string | null {
  const trimmed = text.trim();

  const polygon = trimmed.match(/^(?:Polygon anwenden|Применить полигон|Apply polygon)\s*\((\d+)\)$/);
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

  const pageSize = trimmed.match(/^(\d+)\s+(на странице|pro Seite|per page)$/);
  if (pageSize) {
    const value = pageSize[1];
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
      if (!text || text.length > 280) return NodeFilter.FILTER_REJECT;
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
