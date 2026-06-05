"use client";

import { useEffect } from "react";

type Locale = "de" | "ru" | "en";
type T = { de: string; ru: string; en: string };

const pairs: Array<[string, T]> = [
  // ===== Quick search =====
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

  ["z. B. Chemnitz, 09111, Amtsgericht Dresden", { de: "z. B. Chemnitz, 09111, Amtsgericht Dresden", ru: "например: Chemnitz, 09111, Amtsgericht Dresden", en: "e.g. Chemnitz, 09111, Amtsgericht Dresden" }],
  ["например: Chemnitz, 09111, Amtsgericht Dresden", { de: "z. B. Chemnitz, 09111, Amtsgericht Dresden", ru: "например: Chemnitz, 09111, Amtsgericht Dresden", en: "e.g. Chemnitz, 09111, Amtsgericht Dresden" }],
  ["e.g. Chemnitz, 09111, Amtsgericht Dresden", { de: "z. B. Chemnitz, 09111, Amtsgericht Dresden", ru: "например: Chemnitz, 09111, Amtsgericht Dresden", en: "e.g. Chemnitz, 09111, Amtsgericht Dresden" }],

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

  // ===== Select values =====
  ["Alle Bundesländer", { de: "Alle Bundesländer", ru: "Все земли", en: "All states" }],
  ["Все земли", { de: "Alle Bundesländer", ru: "Все земли", en: "All states" }],
  ["All states", { de: "Alle Bundesländer", ru: "Все земли", en: "All states" }],

  ["Alle Typen", { de: "Alle Typen", ru: "Все типы", en: "All types" }],
  ["Все типы", { de: "Alle Typen", ru: "Все типы", en: "All types" }],
  ["All types", { de: "Alle Typen", ru: "Все типы", en: "All types" }],

  ["Beliebig", { de: "Beliebig", ru: "Любая", en: "Any" }],
  ["Любая", { de: "Beliebig", ru: "Любая", en: "Any" }],
  ["Any", { de: "Beliebig", ru: "Любая", en: "Any" }],

  ["Wohnhäuser", { de: "Wohnhäuser", ru: "Жилые дома", en: "Residential houses" }],
  ["Жилые дома", { de: "Wohnhäuser", ru: "Жилые дома", en: "Residential houses" }],
  ["Residential houses", { de: "Wohnhäuser", ru: "Жилые дома", en: "Residential houses" }],

  ["Wohnhaus", { de: "Wohnhaus", ru: "Жилой дом", en: "Residential house" }],
  ["Жилой дом", { de: "Wohnhaus", ru: "Жилой дом", en: "Residential house" }],
  ["Residential house", { de: "Wohnhaus", ru: "Жилой дом", en: "Residential house" }],

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

  // ===== Map block =====
  ["Versteigerungen auf der Karte", { de: "Versteigerungen auf der Karte", ru: "Аукционы на карте", en: "Auctions on the map" }],
  ["Аукционы на карте", { de: "Versteigerungen auf der Karte", ru: "Аукционы на карте", en: "Auctions on the map" }],
  ["Auctions on the map", { de: "Versteigerungen auf der Karte", ru: "Аукционы на карте", en: "Auctions on the map" }],

  ["Ein schneller Überblick. Die große Karte mit allen Filtern finden Sie im Bereich Karte.", {
    de: "Ein schneller Überblick. Die große Karte mit allen Filtern finden Sie im Bereich Karte.",
    ru: "Краткий обзор. Большая карта со всеми фильтрами находится в разделе Карта.",
    en: "A quick overview. The large map with all filters is available in the Map section.",
  }],
  ["Краткий обзор. Большая карта со всеми фильтрами находится в разделе Карта.", {
    de: "Ein schneller Überblick. Die große Karte mit allen Filtern finden Sie im Bereich Karte.",
    ru: "Краткий обзор. Большая карта со всеми фильтрами находится в разделе Карта.",
    en: "A quick overview. The large map with all filters is available in the Map section.",
  }],

  ["Große Karte öffnen", { de: "Große Karte öffnen", ru: "Открыть большую карту", en: "Open large map" }],
  ["Открыть большую карту", { de: "Große Karte öffnen", ru: "Открыть большую карту", en: "Open large map" }],
  ["Open large map", { de: "Große Karte öffnen", ru: "Открыть большую карту", en: "Open large map" }],

  ["Karte der Objekte", { de: "Karte der Objekte", ru: "Карта объектов", en: "Property map" }],
  ["Карта объектов", { de: "Karte der Objekte", ru: "Карта объектов", en: "Property map" }],
  ["Property map", { de: "Karte der Objekte", ru: "Карта объектов", en: "Property map" }],

  ["Suchen Sie in der sichtbaren Kartenfläche oder zeichnen Sie eine eigene Suchregion.", {
    de: "Suchen Sie in der sichtbaren Kartenfläche oder zeichnen Sie eine eigene Suchregion.",
    ru: "Ищите в видимой области карты или нарисуйте собственную область поиска.",
    en: "Search within the visible map area or draw your own search region.",
  }],
  ["Ищите в видимой области карты или нарисуйте собственную область поиска.", {
    de: "Suchen Sie in der sichtbaren Kartenfläche oder zeichnen Sie eine eigene Suchregion.",
    ru: "Ищите в видимой области карты или нарисуйте собственную область поиска.",
    en: "Search within the visible map area or draw your own search region.",
  }],

  ["In diesem Kartenausschnitt suchen", { de: "In diesem Kartenausschnitt suchen", ru: "Искать в этой области карты", en: "Search this map area" }],
  ["Искать в этой области карты", { de: "In diesem Kartenausschnitt suchen", ru: "Искать в этой области карты", en: "Search this map area" }],
  ["Search this map area", { de: "In diesem Kartenausschnitt suchen", ru: "Искать в этой области карты", en: "Search this map area" }],

  ["Region zeichnen", { de: "Region zeichnen", ru: "Нарисовать область", en: "Draw region" }],
  ["Нарисовать область", { de: "Region zeichnen", ru: "Нарисовать область", en: "Draw region" }],
  ["Draw region", { de: "Region zeichnen", ru: "Нарисовать область", en: "Draw region" }],

  // ===== Extended search labels =====
  ["Alle Filter auf einer Seite. Der Filterbereich scrollt normal mit der Seite.", {
    de: "Alle Filter auf einer Seite. Der Filterbereich scrollt normal mit der Seite.",
    ru: "Все фильтры на одной странице. Блок фильтров прокручивается вместе со страницей.",
    en: "All filters on one page. The filter area scrolls normally with the page.",
  }],
  ["Все фильтры на одной странице. Блок фильтров прокручивается вместе со страницей.", {
    de: "Alle Filter auf einer Seite. Der Filterbereich scrollt normal mit der Seite.",
    ru: "Все фильтры на одной странице. Блок фильтров прокручивается вместе со страницей.",
    en: "All filters on one page. The filter area scrolls normally with the page.",
  }],
  ["Zurücksetzen", { de: "Zurücksetzen", ru: "Сбросить", en: "Reset" }],
  ["Сбросить", { de: "Zurücksetzen", ru: "Сбросить", en: "Reset" }],
  ["Reset", { de: "Zurücksetzen", ru: "Сбросить", en: "Reset" }],

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

  ["Alle Orte", { de: "Alle Orte", ru: "Все города", en: "All cities" }],
  ["Все города", { de: "Alle Orte", ru: "Все города", en: "All cities" }],
  ["All cities", { de: "Alle Orte", ru: "Все города", en: "All cities" }],

  ["Kein Radius", { de: "Kein Radius", ru: "Без радиуса", en: "No radius" }],
  ["Без радиуса", { de: "Kein Radius", ru: "Без радиуса", en: "No radius" }],
  ["No radius", { de: "Kein Radius", ru: "Без радиуса", en: "No radius" }],

  ["Alle Gerichte", { de: "Alle Gerichte", ru: "Все суды", en: "All courts" }],
  ["Все суды", { de: "Alle Gerichte", ru: "Все суды", en: "All courts" }],
  ["All courts", { de: "Alle Gerichte", ru: "Все суды", en: "All courts" }],

  // ===== Property detail page =====
  ["Startseite", { de: "Startseite", ru: "Главная", en: "Home" }],
  ["Главная", { de: "Startseite", ru: "Главная", en: "Home" }],
  ["Home", { de: "Startseite", ru: "Главная", en: "Home" }],

  ["WOHNHÄUSER", { de: "WOHNHÄUSER", ru: "ЖИЛЫЕ ДОМА", en: "RESIDENTIAL HOUSES" }],
  ["ЖИЛЫЕ ДОМА", { de: "WOHNHÄUSER", ru: "ЖИЛЫЕ ДОМА", en: "RESIDENTIAL HOUSES" }],
  ["RESIDENTIAL HOUSES", { de: "WOHNHÄUSER", ru: "ЖИЛЫЕ ДОМА", en: "RESIDENTIAL HOUSES" }],

  ["Активен", { de: "Aktiv", ru: "Активен", en: "Active" }],
  ["Aktiv", { de: "Aktiv", ru: "Активен", en: "Active" }],
  ["Active", { de: "Aktiv", ru: "Активен", en: "Active" }],

  ["Verkehrswert", { de: "Verkehrswert", ru: "Оценочная стоимость", en: "Market value" }],
  ["Оценочная стоимость", { de: "Verkehrswert", ru: "Оценочная стоимость", en: "Market value" }],
  ["Market value", { de: "Verkehrswert", ru: "Оценочная стоимость", en: "Market value" }],

  ["Скопировать ссылку", { de: "Link kopieren", ru: "Скопировать ссылку", en: "Copy link" }],
  ["Ссылка скопирована", { de: "Link kopiert", ru: "Ссылка скопирована", en: "Link copied" }],
  ["Link kopieren", { de: "Link kopieren", ru: "Скопировать ссылку", en: "Copy link" }],
  ["Link kopiert", { de: "Link kopiert", ru: "Ссылка скопирована", en: "Link copied" }],
  ["Copy link", { de: "Link kopieren", ru: "Скопировать ссылку", en: "Copy link" }],
  ["Link copied", { de: "Link kopiert", ru: "Ссылка скопирована", en: "Link copied" }],

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

  ["Termin-Nr.", { de: "Termin-Nr.", ru: "№ термина", en: "Auction no." }],
  ["№ термина", { de: "Termin-Nr.", ru: "№ термина", en: "Auction no." }],
  ["Auction no.", { de: "Termin-Nr.", ru: "№ термина", en: "Auction no." }],

  ["Wertgrenzen", { de: "Wertgrenzen", ru: "Ценовые границы", en: "Value limits" }],
  ["Ценовые границы", { de: "Wertgrenzen", ru: "Ценовые границы", en: "Value limits" }],
  ["Value limits", { de: "Wertgrenzen", ru: "Ценовые границы", en: "Value limits" }],

  // ===== Stage 48I: remaining advanced filter labels/values =====
  ["Status", { de: "Status", ru: "Статус", en: "Status" }],
  ["Статус", { de: "Status", ru: "Статус", en: "Status" }],

  ["Alle aktuellen", { de: "Alle aktuellen", ru: "Все актуальные", en: "All current" }],
  ["Все актуальные", { de: "Alle aktuellen", ru: "Все актуальные", en: "All current" }],
  ["All current", { de: "Alle aktuellen", ru: "Все актуальные", en: "All current" }],

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

  ["Nicht wichtig", { de: "Egal", ru: "Не важно", en: "Any" }],
  ["Не важно", { de: "Egal", ru: "Не важно", en: "Any" }],
  ["Egal", { de: "Egal", ru: "Не важно", en: "Any" }],
  ["Any", { de: "Egal", ru: "Не важно", en: "Any" }],

  ["Jeder Termin", { de: "Jeder Termin", ru: "Любой термин", en: "Any auction" }],
  ["Любой термин", { de: "Jeder Termin", ru: "Любой термин", en: "Any auction" }],
  ["Any auction", { de: "Jeder Termin", ru: "Любой термин", en: "Any auction" }],

  ["20 pro Seite", { de: "20 pro Seite", ru: "20 на странице", en: "20 per page" }],
  ["20 на странице", { de: "20 pro Seite", ru: "20 на странице", en: "20 per page" }],
  ["20 per page", { de: "20 pro Seite", ru: "20 на странице", en: "20 per page" }],

  ["Objekte finden", { de: "Objekte finden", ru: "Найти объекты", en: "Find properties" }],
  ["Найти объекты", { de: "Objekte finden", ru: "Найти объекты", en: "Find properties" }],
  ["Find properties", { de: "Objekte finden", ru: "Найти объекты", en: "Find properties" }],

  ["Filter zurücksetzen", { de: "Filter zurücksetzen", ru: "Сбросить фильтр", en: "Reset filters" }],
  ["Сбросить фильтр", { de: "Filter zurücksetzen", ru: "Сбросить фильтр", en: "Reset filters" }],
  ["Reset filters", { de: "Filter zurücksetzen", ru: "Сбросить фильтр", en: "Reset filters" }],

  ["Filter nach sichtbarer Kartenfläche ist aktiv. Karte verschieben oder zoomen und erneut anwenden.", {
    de: "Filter nach sichtbarer Kartenfläche ist aktiv. Karte verschieben oder zoomen und erneut anwenden.",
    ru: "Активен фильтр по видимой области карты. Переместите или приблизьте карту и примените снова.",
    en: "The visible map area filter is active. Move or zoom the map and apply it again."
  }],
  ["Активен фильтр по видимой области карты. Переместите или приблизьте карту и примените снова.", {
    de: "Filter nach sichtbarer Kartenfläche ist aktiv. Karte verschieben oder zoomen und erneut anwenden.",
    ru: "Активен фильтр по видимой области карты. Переместите или приблизьте карту и примените снова.",
    en: "The visible map area filter is active. Move or zoom the map and apply it again."
  }],
  ["The visible map area filter is active. Move or zoom the map and apply it again.", {
    de: "Filter nach sichtbarer Kartenfläche ist aktiv. Karte verschieben oder zoomen und erneut anwenden.",
    ru: "Активен фильтр по видимой области карты. Переместите или приблизьте карту и примените снова.",
    en: "The visible map area filter is active. Move or zoom the map and apply it again."
  }],

];

const translations: Record<string, T> = Object.fromEntries(pairs);

function getCookieLocale(): Locale {
  const match = document.cookie.match(/(?:^|;\s*)zvg_locale=(de|ru|en)(?:;|$)/);
  return (match?.[1] as Locale) || "de";
}

function translateValue(value: string, locale: Locale): string | null {
  const trimmed = value.trim();
  const hit = translations[trimmed];
  if (!hit) return null;
  return hit[locale] ?? null;
}

function replaceTextNode(node: Text, locale: Locale) {
  const original = node.nodeValue ?? "";
  const replacement = translateValue(original, locale);
  if (!replacement || replacement === original.trim()) return;

  const leading = original.match(/^\s*/)?.[0] ?? "";
  const trailing = original.match(/\s*$/)?.[0] ?? "";
  node.nodeValue = `${leading}${replacement}${trailing}`;
}

function translateSelects(locale: Locale) {
  document.querySelectorAll("select").forEach((select) => {
    select.querySelectorAll("option").forEach((option) => {
      const replacement = translateValue(option.textContent ?? "", locale);
      if (replacement) {
        option.textContent = replacement;
        option.label = replacement;
      }
    });

    // Force Chrome to repaint current visible select text.
    const current = select.options[select.selectedIndex];
    if (current) {
      const replacement = translateValue(current.textContent ?? "", locale);
      if (replacement) {
        current.textContent = replacement;
        current.label = replacement;
      }
    }
  });
}

function translateAttributes(locale: Locale) {
  document.querySelectorAll("input[placeholder], textarea[placeholder], [aria-label], [title]").forEach((element) => {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      const replacement = translateValue(element.placeholder, locale);
      if (replacement) element.placeholder = replacement;
    }

    const aria = element.getAttribute("aria-label");
    const ariaReplacement = aria ? translateValue(aria, locale) : null;
    if (ariaReplacement) element.setAttribute("aria-label", ariaReplacement);

    const title = element.getAttribute("title");
    const titleReplacement = title ? translateValue(title, locale) : null;
    if (titleReplacement) element.setAttribute("title", titleReplacement);
  });
}

function translateTextNodes(locale: Locale) {
  const root = document.body;
  if (!root) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      const tag = parent.tagName.toLowerCase();
      if (["script", "style", "noscript", "textarea", "input", "option"].includes(tag)) return NodeFilter.FILTER_REJECT;
      const text = node.nodeValue?.trim();
      if (!text || text.length > 300) return NodeFilter.FILTER_REJECT;
      return translateValue(text, locale) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    },
  });

  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  nodes.forEach((node) => replaceTextNode(node, locale));
}

function translateDuplicateKicker(locale: Locale) {
  document.querySelectorAll(".eyebrow").forEach((element) => {
    let text = element.textContent?.trim();
    if (!text) return;

    if (text.includes("·")) {
      const [left, right] = text.split("·").map((part) => part.trim());
      const leftNorm = left.toLowerCase();
      const rightNorm = right.toLowerCase();

      const isDuplicate =
        leftNorm.includes(rightNorm) ||
        rightNorm.includes(leftNorm.replace(/s$/, "")) ||
        (leftNorm.includes("жилые дома") && rightNorm.includes("жилой дом")) ||
        (leftNorm.includes("wohnhäuser") && rightNorm.includes("wohnhaus")) ||
        (leftNorm.includes("residential houses") && rightNorm.includes("residential house"));

      if (isDuplicate) text = left;
    }

    const replacement = translateValue(text, locale);
    element.textContent = replacement ?? text;
  });
}

function runTranslations(locale: Locale) {
  translateTextNodes(locale);
  translateSelects(locale);
  translateAttributes(locale);
  translateDuplicateKicker(locale);
}

export function LanguageRuntimeFix() {
  useEffect(() => {
    let locale = getCookieLocale();
    let queued = false;

    const run = () => {
      queued = false;
      locale = getCookieLocale();
      runTranslations(locale);
    };

    const schedule = () => {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(run);
    };

    run();
    const timer = window.setInterval(run, 150);

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["placeholder", "aria-label", "title"],
    });

    document.addEventListener("change", schedule, true);
    document.addEventListener("click", schedule, true);

    return () => {
      observer.disconnect();
      window.clearInterval(timer);
      document.removeEventListener("change", schedule, true);
      document.removeEventListener("click", schedule, true);
    };
  }, []);

  return null;
}
