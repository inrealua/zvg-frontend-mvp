# Stage 54 — Unified search homepage

## Что меняется

1. `/` становится основной рабочей страницей поиска.
2. Старый быстрый поиск и отдельная логика главной убираются.
3. Фильтр становится горизонтальным под hero.
4. Ниже фильтра идёт карта.
5. Ниже карты идёт статистика.
6. Ниже статистики — список объектов карточками в 3 столбца.
7. Сортировка вынесена над карточками в отдельный `SortControls`.
8. `/map` теперь делает redirect на `/`, чтобы не было двух конкурирующих страниц поиска.
9. Исправлена логика `PLZ + Radius`: если радиус задан, индекс используется как центр, а не как строгий фильтр объекта.

## Файлы

```txt
app/page.tsx
app/map/page.tsx
components/PublicPropertiesPage.tsx
components/FilterBar.tsx
components/SortControls.tsx
scripts/stage54_patch_css.mjs
```

## Установка

### 1. Backup

```powershell
Copy-Item -Recurse D:\Projects\zvg_frontend_mvp D:\Projects\zvg_frontend_mvp_backup_stage54
```

### 2. Скопируй из архива папки

```txt
app
components
scripts
```

в проект:

```txt
D:\Projects\zvg_frontend_mvp
```

с заменой файлов.

### 3. Добавь CSS

```powershell
cd D:\Projects\zvg_frontend_mvp
node .\scripts\stage54_patch_css.mjs
```

### 4. Build

```powershell
npm run build
```

Если снова memory error:

```powershell
$env:NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

### 5. Проверка

Открой:

```txt
/
```

Порядок должен быть:

```txt
Hero
Горизонтальный фильтр
Активные фильтры / уведомления
Карта
Статистика
Сортировка
Карточки 3 столбца
```

`/map` должен перекидывать на `/`.

### 6. Commit

```powershell
git add .
git commit -m "Make homepage the main search page"
git push
```

## Что ещё нужно для footer

Файла `app/layout.tsx` в переданных файлах нет. Поэтому этот пакет не трогает header/footer. Чтобы перенести `Über uns / Datenschutz` в footer и убрать их из меню корректно, пришли `app/layout.tsx` или компонент header/navigation.
