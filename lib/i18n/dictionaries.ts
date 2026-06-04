import type { Locale } from "@/lib/i18n/config";

export const dictionaries = {
  de: {
    languageName: "Deutsch",
    nav: {
      aria: "Hauptnavigation", home: "Startseite", advancedSearch: "Erweiterte Suche", archive: "Archiv",
      account: "Mein Konto", login: "Anmelden", register: "Registrieren", logout: "Abmelden", admin: "Admin",
      dashboard: "Dashboard", objects: "Objekte", import: "Import", quality: "Quality", export: "Export", duplicates: "Duplicates", bulk: "Bulk"
    },
    footer: {
      navigation: "Footer-Navigation", tagline: "Alle gerichtlichen Immobilienauktionen an einem Ort.",
      home: "Startseite", advancedSearch: "Erweiterte Suche", archive: "Archiv", about: "Über uns", privacy: "Datenschutz", copyright: "Alle Rechte vorbehalten."
    },
    locale: { label: "Sprache", de: "Deutsch", ru: "Русский", en: "English" }
  },
  ru: {
    languageName: "Русский",
    nav: {
      aria: "Главная навигация", home: "Главная", advancedSearch: "Расширенный поиск", archive: "Архив",
      account: "Кабинет", login: "Войти", register: "Регистрация", logout: "Выйти", admin: "Админ",
      dashboard: "Панель", objects: "Объекты", import: "Импорт", quality: "Качество", export: "Экспорт", duplicates: "Дубли", bulk: "Массово"
    },
    footer: {
      navigation: "Навигация внизу сайта", tagline: "Все судебные аукционы недвижимости в одном месте.",
      home: "Главная", advancedSearch: "Расширенный поиск", archive: "Архив", about: "О проекте", privacy: "Конфиденциальность", copyright: "Все права защищены."
    },
    locale: { label: "Язык", de: "Deutsch", ru: "Русский", en: "English" }
  },
  en: {
    languageName: "English",
    nav: {
      aria: "Main navigation", home: "Home", advancedSearch: "Advanced Search", archive: "Archive",
      account: "My Account", login: "Login", register: "Register", logout: "Logout", admin: "Admin",
      dashboard: "Dashboard", objects: "Objects", import: "Import", quality: "Quality", export: "Export", duplicates: "Duplicates", bulk: "Bulk"
    },
    footer: {
      navigation: "Footer navigation", tagline: "All judicial real estate auctions in one place.",
      home: "Home", advancedSearch: "Advanced Search", archive: "Archive", about: "About us", privacy: "Privacy Policy", copyright: "All rights reserved."
    },
    locale: { label: "Language", de: "Deutsch", ru: "Русский", en: "English" }
  }
} as const;

export type Dictionary = (typeof dictionaries)[Locale];

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
