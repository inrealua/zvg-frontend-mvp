# Stage 48C — runtime cleanup for remaining untranslated UI text

Этот пакет исправляет оставшиеся немецкие/русские hardcoded-тексты без изменения изображений.

## Что делает

Добавляет клиентский компонент:

```txt
components/LanguageRuntimeFix.tsx
```

Он после загрузки страницы смотрит cookie `zvg_locale` и переводит оставшиеся видимые UI-тексты:
- Quick Search / Schnellsuche / Быстрый поиск
- Karte der Objekte / Карта объектов / Property map
- In diesem Kartenausschnitt suchen
- Region zeichnen
- legend: Häuser / Wohnungen / Grundstücke / Gewerbe / aufgehoben
- stats: Seite / Gefunden / Aktiv / Aufgehoben / Archiv / Max. Wert
- pagination: Показано / Назад / Вперёд
- filter leftovers: Без радиуса / Alle Bundesländer / Все типы
- card labels: Market value / Auction date / Source / View details

Адреса, города, федеральные земли, номера дел и названия судов не переводятся.

## Установка

1. Backup:

```powershell
Copy-Item -Recurse D:\Projects\zvg_frontend_mvp D:\Projects\zvg_frontend_mvp_backup_stage48c
```

2. Скопировать из архива папки:

```txt
components
scripts
```

в проект:

```txt
D:\Projects\zvg_frontend_mvp
```

3. Запустить patch layout:

```powershell
cd D:\Projects\zvg_frontend_mvp
node .\scripts\stage48c_add_language_runtime_fix.mjs
```

4. Проверить:

```powershell
npm run build
npm run dev
```

5. Если build прошёл:

```powershell
git add .
git commit -m "Add runtime translation cleanup"
git push
```

## Почему так

У тебя часть переводов уже идёт через словари, но часть старых компонентов всё ещё печатает немецкий/русский текст напрямую. Этот компонент закрывает остаточные hardcoded места, не ломая логику карты, фильтров и карточек.
