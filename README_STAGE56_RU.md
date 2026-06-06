# Stage 56 — compact multiselect filters, sorting auto-apply, no /map

## Исправляет

1. Возвращает мультивыбор:
   - федеральные земли;
   - города;
   - типы недвижимости;
   - использование.

2. Сортировка:
   - `SortControls` обновляется сразу при выборе.
   - Кнопка "применить" для сортировки не нужна.
   - Page size: 12 / 24 / 48 / 96.

3. Компактная сетка фильтров:
   - фильтры занимают меньше места;
   - мультивыборы открываются как dropdown;
   - основные фильтры размещены по 3–4 в строку.

4. Ползунки:
   - оценочная стоимость: от–до;
   - жилая площадь: от–до;
   - участок: от–до;
   - радиус остаётся одиночным 0–1000 км.

5. `/map`:
   - больше не нужен;
   - route редиректит на `/`.

## Установка

### 1. Backup

```powershell
Copy-Item -Recurse D:\Projects\zvg_frontend_mvp D:\Projects\zvg_frontend_mvp_backup_stage56
```

### 2. Скопировать из архива

```txt
components
app
scripts
```

в проект:

```txt
D:\Projects\zvg_frontend_mvp
```

с заменой.

### 3. Запустить CSS/logic patch

```powershell
cd D:\Projects\zvg_frontend_mvp
node .\scripts\stage56_patch_compact_filters_sort_map.mjs
```

### 4. Build

```powershell
npm run build
```

Если будет memory issue:

```powershell
$env:NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

### 5. Проверка

- `/` — главная поисковая страница.
- `/map` — редирект на `/`.
- сортировка меняет URL сразу после выбора.
- показывать: 12 / 24 / 48 / 96.
- фильтр `state`, `city`, `typeGroup`, `occupancy` отправляет несколько значений.

### 6. Commit

```powershell
git add .
git commit -m "Compact filters and sorting controls"
git push
```
