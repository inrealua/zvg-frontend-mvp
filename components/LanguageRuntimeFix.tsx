"use client";

import { useEffect } from "react";

type Locale = "de" | "ru" | "en";

type T = { de: string; ru: string; en: string };
type TranslationMap = Record<string, T>;

const entries: Array<[string, T]> = [
  // Polygon drawing panel
  ["Нарисовать область", { de: "Region zeichnen", ru: "Нарисовать область", en: "Draw region" }],
  ["Region zeichnen", { de: "Region zeichnen", ru: "Нарисовать область", en: "Draw region" }],
  ["Draw region", { de: "Region zeichnen", ru: "Нарисовать область", en: "Draw region" }],
  ["Klicken Sie auf die Karte, um Punkte zu setzen. Mindestens 3 Punkte.", { de: "Klicken Sie auf die Karte, um Punkte zu setzen. Mindestens 3 Punkte.", ru: "Кликните по карте, чтобы поставить точки. Минимум 3 точки.", en: "Click on the map to set points. At least 3 points." }],
  ["Кликните по карте, чтобы поставить точки. Минимум 3 точки.", { de: "Klicken Sie auf die Karte, um Punkte zu setzen. Mindestens 3 Punkte.", ru: "Кликните по карте, чтобы поставить точки. Минимум 3 точки.", en: "Click on the map to set points. At least 3 points." }],
  ["Click on the map to set points. At least 3 points.", { de: "Klicken Sie auf die Karte, um Punkte zu setzen. Mindestens 3 Punkte.", ru: "Кликните по карте, чтобы поставить точки. Минимум 3 точки.", en: "Click on the map to set points. At least 3 points." }],
  ["Polygon anwenden", { de: "Polygon anwenden", ru: "Применить полигон", en: "Apply polygon" }],
  ["Применить полигон", { de: "Polygon anwenden", ru: "Применить полигон", en: "Apply polygon" }],
  ["Apply polygon", { de: "Polygon anwenden", ru: "Применить полигон", en: "Apply polygon" }],
  ["Punkte löschen", { de: "Punkte löschen", ru: "Удалить точки", en: "Clear points" }],
  ["Удалить точки", { de: "Punkte löschen", ru: "Удалить точки", en: "Clear points" }],
  ["Clear points", { de: "Punkte löschen", ru: "Удалить точки", en: "Clear points" }],
  ["Abbrechen", { de: "Abbrechen", ru: "Отмена", en: "Cancel" }],
  ["Отмена", { de: "Abbrechen", ru: "Отмена", en: "Cancel" }],
  ["Cancel", { de: "Abbrechen", ru: "Отмена", en: "Cancel" }],

  // Filter labels
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

  // Main filter labels
  ["Schnellsuche", { de: "Schnellsuche", ru: "Быстрый поиск", en: "Quick Search" }],
  ["Быстрый поиск", { de: "Schnellsuche", ru: "Быстрый поиск", en: "Quick Search" }],
  ["Quick Search", { de: "Schnellsuche", ru: "Быстрый поиск", en: "Quick Search" }],
  ["Erweiterte Suche", { de: "Erweiterte Suche", ru: "Расширенный поиск", en: "Advanced Search" }],
  ["Расширенный поиск", { de: "Erweiterte Suche", ru: "Расширенный поиск", en: "Advanced Search" }],
  ["Advanced Search", { de: "Erweiterte Suche", ru: "Расширенный поиск", en: "Advanced Search" }],
  ["Suche", { de: "Suche", ru: "Поиск", en: "Search" }],
  ["Поиск", { de: "Suche", ru: "Поиск", en: "Search" }],
  ["Search", { de: "Suche", ru: "Поиск", en: "Search" }],
  ["Ort", { de: "Ort", ru: "Город", en: "City" }],
  ["Город", { de: "Ort", ru: "Город", en: "City" }],
  ["City", { de: "Ort", ru: "Город", en: "City" }],
  ["PLZ", { de: "PLZ", ru: "Индекс", en: "ZIP" }],
  ["Индекс", { de: "PLZ", ru: "Индекс", en: "ZIP" }],
  ["ZIP", { de: "PLZ", ru: "Индекс", en: "ZIP" }],
  ["Umkreis", { de: "Umkreis", ru: "Радиус", en: "Radius" }],
  ["Радиус", { de: "Umkreis", ru: "Радиус", en: "Radius" }],
  ["Radius", { de: "Umkreis", ru: "Радиус", en: "Radius" }],
  ["Amtsgericht", { de: "Amtsgericht", ru: "Суд", en: "Court" }],
  ["Суд", { de: "Amtsgericht", ru: "Суд", en: "Court" }],
  ["Court", { de: "Amtsgericht", ru: "Суд", en: "Court" }],
  ["Status", { de: "Status", ru: "Статус", en: "Status" }],
  ["Статус", { de: "Status", ru: "Статус", en: "Status" }],
  ["Bundesland", { de: "Bundesland", ru: "Федеральная земля", en: "Federal state" }],
  ["Федеральная земля", { de: "Bundesland", ru: "Федеральная земля", en: "Federal state" }],
  ["Federal state", { de: "Bundesland", ru: "Федеральная земля", en: "Federal state" }],
  ["Objektart", { de: "Objektart", ru: "Тип объекта", en: "Property type" }],
  ["Тип объекта", { de: "Objektart", ru: "Тип объекта", en: "Property type" }],
  ["Property type", { de: "Objektart", ru: "Тип объекта", en: "Property type" }],
  ["Verkehrswert bis", { de: "Verkehrswert bis", ru: "Оценочная стоимость до", en: "Market value up to" }],
  ["Оценочная стоимость до", { de: "Verkehrswert bis", ru: "Оценочная стоимость до", en: "Market value up to" }],
  ["Market value up to", { de: "Verkehrswert bis", ru: "Оценочная стоимость до", en: "Market value up to" }],

  // Select values: common
  ["Egal", { de: "Egal", ru: "Не важно", en: "Any" }],
  ["Не важно", { de: "Egal", ru: "Не важно", en: "Any" }],
  ["Any", { de: "Egal", ru: "Не важно", en: "Any" }],
  ["Beliebig", { de: "Beliebig", ru: "Любая", en: "Any" }],
  ["Любая", { de: "Beliebig", ru: "Любая", en: "Any" }],
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
  ["Не сняты / неизвестно", { de: "Nicht weggefallen / unbekannt", ru: "Не сняты / неизвестно", en: "Not removed / unknown" }],
  ["Not removed / unknown", { de: "Nicht weggefallen / unbekannt", ru: "Не сняты / неизвестно", en: "Not removed / unknown" }],
  ["Nicht weggefallen", { de: "Nicht weggefallen", ru: "Не сняты", en: "Not removed" }],
  ["Не сняты", { de: "Nicht weggefallen", ru: "Не сняты", en: "Not removed" }],
  ["Not removed", { de: "Nicht weggefallen", ru: "Не сняты", en: "Not removed" }],

  // Select values: auction attempt
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

  // Select values: sorting / page size
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
  ["50 pro Seite", { de: "50 pro Seite", ru: "50 на странице", en: "50 per page" }],
  ["50 на странице", { de: "50 pro Seite", ru: "50 на странице", en: "50 per page" }],
  ["50 per page", { de: "50 pro Seite", ru: "50 на странице", en: "50 per page" }],
  ["100 pro Seite", { de: "100 pro Seite", ru: "100 на странице", en: "100 per page" }],
  ["100 на странице", { de: "100 pro Seite", ru: "100 на странице", en: "100 per page" }],
  ["100 per page", { de: "100 pro Seite", ru: "100 на странице", en: "100 per page" }],

  // Select values: cities/radius/court/status/type groups
  ["Alle Orte", { de: "Alle Orte", ru: "Все города", en: "All cities" }],
  ["Все города", { de: "Alle Orte", ru: "Все города", en: "All cities" }],
  ["All cities", { de: "Alle Orte", ru: "Все города", en: "All cities" }],
  ["Kein Radius", { de: "Kein Radius", ru: "Без радиуса", en: "No radius" }],
  ["Без радиуса", { de: "Kein Radius", ru: "Без радиуса", en: "No radius" }],
  ["No radius", { de: "Kein Radius", ru: "Без радиуса", en: "No radius" }],
  ["Alle Gerichte", { de: "Alle Gerichte", ru: "Все суды", en: "All courts" }],
  ["Все суды", { de: "Alle Gerichte", ru: "Все суды", en: "All courts" }],
  ["All courts", { de: "Alle Gerichte", ru: "Все суды", en: "All courts" }],
  ["Alle aktuellen", { de: "Alle aktuellen", ru: "Все актуальные", en: "All current" }],
  ["Все актуальные", { de: "Alle aktuellen", ru: "Все актуальные", en: "All current" }],
  ["All current", { de: "Alle aktuellen", ru: "Все актуальные", en: "All current" }],
  ["Alle Bundesländer", { de: "Alle Bundesländer", ru: "Все земли", en: "All states" }],
  ["Все земли", { de: "Alle Bundesländer", ru: "Все земли", en: "All states" }],
  ["All states", { de: "Alle Bundesländer", ru: "Все земли", en: "All states" }],
  ["Alle Typen", { de: "Alle Typen", ru: "Все типы", en: "All types" }],
  ["Все типы", { de: "Alle Typen", ru: "Все типы", en: "All types" }],
  ["All types", { de: "Alle Typen", ru: "Все типы", en: "All types" }],
  ["Wohnhäuser", { de: "Wohnhäuser", ru: "Жилые дома", en: "Residential houses" }],
  ["Жилые дома", { de: "Wohnhäuser", ru: "Жилые дома", en: "Residential houses" }],
  ["Residential houses", { de: "Wohnhäuser", ru: "Жилые дома", en: "Residential houses" }],
  ["Wohnungen", { de: "Wohnungen", ru: "Квартиры", en: "Apartments" }],
  ["Квартиры", { de: "Wohnungen", ru: "Квартиры", en: "Apartments" }],
  ["Apartments", { de: "Wohnungen", ru: "Квартиры", en: "Apartments" }],
  ["Gewerbe", { de: "Gewerbe", ru: "Коммерция", en: "Commercial" }],
  ["Коммерция", { de: "Gewerbe", ru: "Коммерция", en: "Commercial" }],
  ["Commercial", { de: "Gewerbe", ru: "Коммерция", en: "Commercial" }],
  ["Grundstücke", { de: "Grundstücke", ru: "Участки", en: "Land plots" }],
  ["Участки", { de: "Grundstücke", ru: "Участки", en: "Land plots" }],
  ["Land plots", { de: "Grundstücke", ru: "Участки", en: "Land plots" }],
  ["Land / Wald", { de: "Land / Wald", ru: "Земля / лес", en: "Land / forest" }],
  ["Земля / лес", { de: "Land / Wald", ru: "Земля / лес", en: "Land / forest" }],
  ["Land / forest", { de: "Land / Wald", ru: "Земля / лес", en: "Land / forest" }],
  ["Garagen / Parken", { de: "Garagen / Parken", ru: "Гаражи / парковки", en: "Garages / parking" }],
  ["Гаражи / парковки", { de: "Garagen / Parken", ru: "Гаражи / парковки", en: "Garages / parking" }],
  ["Garages / parking", { de: "Garagen / Parken", ru: "Гаражи / парковки", en: "Garages / parking" }],
  ["Sonstige", { de: "Sonstige", ru: "Прочее", en: "Other" }],
  ["Прочее", { de: "Sonstige", ru: "Прочее", en: "Other" }],
  ["Other", { de: "Sonstige", ru: "Прочее", en: "Other" }],

  // Placeholders
  ["z. B. 091", { de: "z. B. 091", ru: "например: 091", en: "e.g. 091" }],
  ["например: 091", { de: "z. B. 091", ru: "например: 091", en: "e.g. 091" }],
  ["e.g. 091", { de: "z. B. 091", ru: "например: 091", en: "e.g. 091" }],
  ["z. B. Chemnitz, 09111, Amtsgericht Dresden", { de: "z. B. Chemnitz, 09111, Amtsgericht Dresden", ru: "например: Chemnitz, 09111, Amtsgericht Dresden", en: "e.g. Chemnitz, 09111, Amtsgericht Dresden" }],
  ["например: Chemnitz, 09111, Amtsgericht Dresden", { de: "z. B. Chemnitz, 09111, Amtsgericht Dresden", ru: "например: Chemnitz, 09111, Amtsgericht Dresden", en: "e.g. Chemnitz, 09111, Amtsgericht Dresden" }],
  ["e.g. Chemnitz, 09111, Amtsgericht Dresden", { de: "z. B. Chemnitz, 09111, Amtsgericht Dresden", ru: "например: Chemnitz, 09111, Amtsgericht Dresden", en: "e.g. Chemnitz, 09111, Amtsgericht Dresden" }],

  // Map / results / cabinet basics
  ["Karte der Objekte", { de: "Karte der Objekte", ru: "Карта объектов", en: "Property map" }],
  ["Карта объектов", { de: "Karte der Objekte", ru: "Карта объектов", en: "Property map" }],
  ["Property map", { de: "Karte der Objekte", ru: "Карта объектов", en: "Property map" }],
  ["In diesem Kartenausschnitt suchen", { de: "In diesem Kartenausschnitt suchen", ru: "Искать в этой области карты", en: "Search this map area" }],
  ["Искать в этой области карты", { de: "In diesem Kartenausschnitt suchen", ru: "Искать в этой области карты", en: "Search this map area" }],
  ["Search this map area", { de: "In diesem Kartenausschnitt suchen", ru: "Искать в этой области карты", en: "Search this map area" }],
  ["Suche speichern", { de: "Suche speichern", ru: "Сохранить поиск", en: "Save search" }],
  ["Сохранить поиск", { de: "Suche speichern", ru: "Сохранить поиск", en: "Save search" }],
  ["Save search", { de: "Suche speichern", ru: "Сохранить поиск", en: "Save search" }],
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
      if (!text || text.length > 260) return NodeFilter.FILTER_REJECT;
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
