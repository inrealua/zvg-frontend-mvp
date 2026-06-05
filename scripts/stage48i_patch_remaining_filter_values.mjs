import fs from "node:fs";
import path from "node:path";

const filePath = path.join(process.cwd(), "components", "LanguageRuntimeFix.tsx");

if (!fs.existsSync(filePath)) {
  console.error("components/LanguageRuntimeFix.tsx not found");
  process.exit(1);
}

let source = fs.readFileSync(filePath, "utf8");
const original = source;

const additions = String.raw`
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
`;

if (source.includes("Stage 48I: remaining advanced filter labels/values")) {
  console.log("Stage 48I additions already present.");
} else {
  const marker = "];\n\nconst translations:";
  if (!source.includes(marker)) {
    console.error("Could not find pairs array end marker. Please send components/LanguageRuntimeFix.tsx");
    process.exit(1);
  }
  source = source.replace(marker, additions + "\n];\n\nconst translations:");
}

// Make runtime more reliable for native select repaint.
source = source.replace(
  /const timer = window\.setInterval\(run,\s*\d+\);/,
  "const timer = window.setInterval(run, 150);"
);

if (source !== original) {
  fs.writeFileSync(filePath, source, "utf8");
  console.log("Patched LanguageRuntimeFix.tsx with Stage 48I translations.");
} else {
  console.log("No changes made.");
}

console.log("Now run: npm run build");
