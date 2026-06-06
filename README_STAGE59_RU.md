# Stage 59 — рабочий фикс фильтра, карты и количества объектов

В этот пакет включены уже готовые файлы, а не только regex-patch.

## Что исправлено

1. `components/PublicPropertiesPage.tsx`
   - убран старый блок над картой: `Аукционы на карте / Краткий обзор...`;
   - `perPage` и `sort` больше не попадают в активные фильтры;
   - пагинация больше не зависит от старого default 20;
   - разрешены размеры страницы: `12 / 24 / 48 / 96`.

2. `components/FilterBar.tsx`
   - фильтр реально становится сеткой 4×5;
   - кнопки стоят в 19 и 20 месте;
   - радиус находится в 3 ряду, 1 место;
   - вся строка ползунков: радиус / цена / жилая площадь / участок;
   - нет растягивания фильтра в одну колонку.

3. CSS patch
   - добавляет стили `.search-filter-v59`;
   - скрывает ссылку `/map` в меню, если она ещё осталась;
   - убирает старые teaser-блоки карты.

## Установка

### 1. Backup

```powershell
Copy-Item -Recurse D:\Projects\zvg_frontend_mvp D:\Projects\zvg_frontend_mvp_backup_stage59
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
components/PublicPropertiesPage.tsx
```

### 3. Запустить CSS/menu patch

```powershell
cd D:\Projects\zvg_frontend_mvp
node .\scripts\stage59_patch_css_nav.mjs
```

### 4. Build

```powershell
npm run build
```

Если memory issue:

```powershell
$env:NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

## Проверка

- Старый текст `Аукционы на карте / Краткий обзор...` исчез.
- Остался только блок `Карта объектов`.
- `На странице: 24` не отображается как активный фильтр.
- При выборе `24` должно показывать 24 карточки, не 20.
- Фильтр должен быть компактной сеткой 4×5, не вертикальной простынёй.
