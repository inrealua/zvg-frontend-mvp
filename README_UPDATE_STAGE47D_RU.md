# Stage 47D — исправление смеси языков + мягкий переключатель языка

Этот пакет исправляет проблему, которую видно на скрине:
- меню уже на DE;
- но карточки всё ещё показывают русские группы типа `ЖИЛЫЕ ДОМА`;
- часть подписей остаётся немецкой;
- переключатель языка слишком жирный и выбивается.

## Что меняется

- `components/PropertyCard.tsx` больше не использует старые `translateGroup`, `translateStatus`, `translateOccupancy`.
- Добавлен `lib/i18n/property-labels.ts` с переводами групп, статусов и использования для DE/RU/EN.
- Добавлен патч для `components/PublicPropertiesPage.tsx`, чтобы заголовки главной тоже брались из словаря.
- Переключатель языка визуально становится легче.

## Установка

1. Backup:

```powershell
Copy-Item -Recurse D:\Projects\zvg_frontend_mvp D:\Projects\zvg_frontend_mvp_backup_stage47d
```

2. Скопировать из архива папки:

```txt
components
lib
scripts
```

в:

```txt
D:\Projects\zvg_frontend_mvp
```

3. Добавить содержимое `STAGE47D_CSS_APPEND.css` в конец:

```txt
app/globals.css
```

4. Запустить патч главной страницы:

```powershell
node .\scripts\stage47d_patch_public_properties_page.mjs
```

5. Проверить:

```powershell
npm run build
npm run dev
```

6. Deploy:

```powershell
git add .
git commit -m "Polish localized labels and language switcher"
git push
```

## Проверка

В DE должно быть:
- `Wohnhäuser · Wohnhaus`
- `Aktiv`
- `Verkehrswert`
- `Termin`
- `Wohnfläche`

В RU:
- `Жилые дома · Жилой дом`
- `Активно`
- `Оценочная стоимость`
- `Торги`
- `Жилая площадь`

В EN:
- `Residential houses · Residential house`
- `Active`
- `Market value`
- `Auction date`
- `Living area`

Если build упадёт на `PublicPropertiesPage.tsx`, пришли ошибку и файл:

```powershell
Get-Content .\components\PublicPropertiesPage.tsx
```
