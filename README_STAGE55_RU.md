# Stage 55 — вернуть ползунки и расширенные фильтры

## Что исправляет

1. В фильтре снова есть ползунки:
   - `Оценочная стоимость до / Verkehrswert bis / Market value up to`
   - `Жилая площадь от / Wohnfläche ab / Living area from`

2. Возвращены исчезнувшие фильтры:
   - `Памятник архитектуры / Denkmalschutz / Listed monument`
   - `№ термина / Termin-Nr. / Auction no.`
   - `Ценовые границы / Wertgrenzen / Value limits`
   - также добавлен `Суд / Amtsgericht / Court`

3. Количество объектов на странице теперь кратно 3:
   - 12
   - 24
   - 48
   - 96

4. Значение по умолчанию для пагинации меняется на 12, чтобы сетка 3 столбца не заканчивалась неполным рядом.

## Установка

### 1. Backup

```powershell
Copy-Item -Recurse D:\Projects\zvg_frontend_mvp D:\Projects\zvg_frontend_mvp_backup_stage55
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

с заменой файлов:

```txt
components/FilterBar.tsx
components/SortControls.tsx
```

### 3. Запустить patch

```powershell
cd D:\Projects\zvg_frontend_mvp
node .\scripts\stage55_patch_filters_and_page_size.mjs
```

### 4. Проверить

```powershell
npm run build
npm run dev
```

Если опять memory issue:

```powershell
$env:NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

### 5. Commit

```powershell
git add .
git commit -m "Restore advanced filters and page size multiples"
git push
```
