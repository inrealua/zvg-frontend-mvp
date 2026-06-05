# Stage 50 — Filter UX corrections + full Germany postal codes

## Что исправляет

1. Английская версия:
   - активные фильтры переводятся через runtime-fix:
     - `Активные фильтры:` → `Active filters:`
     - `Очистить всё` → `Clear all`
   - `Все типы` / `All states` в фильтре исправляются уже на уровне нового `FilterBar`.

2. Даты:
   - `input type="date"` заменён на `type="text"`.
   - Placeholder теперь:
     - DE: `JJJJ-MM-TT`
     - EN: `YYYY-MM-DD`
     - RU: `ГГГГ-ММ-ДД`
   - Формат значения остаётся `YYYY-MM-DD`, чтобы backend не ломался.

3. Радиус:
   - убран кривой select/slider вид;
   - радиус теперь slider 0–1000 км;
   - автоприменение отключено.

4. Автофильтрация:
   - убрана.
   - фильтр применяется только по кнопке `Show results / Ergebnisse anzeigen / Показать результаты`.

5. Ползунки:
   - новый CSS Stage 50.
   - точки находятся на краях трека, а не с большим внутренним отступом.

6. Полная база индексов:
   - добавлен PowerShell-скрипт загрузки полного `DE.zip` с GeoNames.
   - конвертирует `DE.txt` в `prisma/postal_codes_de_full.csv`.
   - импортирует в таблицу `PostalCode`.

## Установка

### 1. Backup

```powershell
Copy-Item -Recurse D:\Projects\zvg_frontend_mvp D:\Projects\zvg_frontend_mvp_backup_stage50
```

### 2. Скопировать из архива

```txt
components
scripts
```

в проект:

```txt
D:\Projects\zvg_frontend_mvp
```

### 3. Запустить patch

```powershell
cd D:\Projects\zvg_frontend_mvp
node .\scripts\stage50_patch_filter_ux.mjs
```

### 4. Если таблица PostalCode уже создана на Stage 49

Просто загрузить полную базу:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\download-import-de-postal-codes.ps1
```

### 5. Если PostalCode ещё не создана

Сначала:

```powershell
npm run db:push
```

Потом:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\download-import-de-postal-codes.ps1
```

### 6. Проверка

```powershell
npm run build
npm run dev
```

### 7. Commit

```powershell
git add .
git commit -m "Fix filter UX and import full postal codes"
git push
```

## Источник индексов

Скрипт скачивает Germany postal codes из GeoNames `DE.zip`. Это полный файл Германии из набора GeoNames Postal Code download.
