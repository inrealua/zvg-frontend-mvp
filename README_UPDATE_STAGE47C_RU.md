# Stage 47C — use localized property translations in UI

Этот пакет подключает `PropertyTranslation` к отображению объектов.

## Что меняется

- `components/PropertyCard.tsx` показывает `title`, `propertyType` из перевода.
- `app/properties/[id]/page.tsx` показывает описание, локацию и заголовок на текущем языке.
- `app/cabinet/page.tsx` показывает избранные и календарь на текущем языке.
- `components/PublicPropertiesPage.tsx` патчится отдельным скриптом, потому что его содержимое зависит от текущей версии проекта.
- Добавлен helper `lib/i18n/property-translations.ts`.

## Важно перед установкой

Сначала должен быть установлен Stage 47B и выполнено:

```powershell
npm run db:push
npx prisma generate
node .\scripts\stage47b_backfill_translations.mjs
```

В базе должна быть таблица `PropertyTranslation`.

## Установка

### 1. Backup

```powershell
Copy-Item -Recurse D:\Projects\zvg_frontend_mvp D:\Projects\zvg_frontend_mvp_backup_stage47c
```

### 2. Скопировать из архива папки

```txt
app
components
lib
scripts
```

в:

```txt
D:\Projects\zvg_frontend_mvp
```

### 3. Пропатчить PublicPropertiesPage

```powershell
node .\scripts\stage47c_patch_public_properties_page.mjs
```

Этот скрипт пытается:
- добавить `getI18n()`;
- добавить `translationInclude(locale)`;
- передать `locale` в `<PropertyCard />`.

### 4. Проверить сборку

```powershell
npm run build
```

Если ошибка будет в `components/PublicPropertiesPage.tsx`, пришлите ошибку и сам файл:

```powershell
Get-Content .\components\PublicPropertiesPage.tsx
```

### 5. Деплой

```powershell
git add .
git commit -m "Use localized property translations in UI"
git push
```

## Проверка

1. Переключить язык DE/RU/EN в меню.
2. Открыть главную.
3. Карточки должны показывать translated title/propertyType, если `PublicPropertiesPage` пропатчился.
4. Открыть страницу объекта `/properties/...`.
5. Описание и локация должны переключаться по языку.
6. Открыть кабинет.
7. Избранные и календарь должны использовать translated title.

## Что может остаться на следующую стадию

Некоторые словари из `lib/format.ts` — статусы, типы, использование — пока могут остаться немецкими/смешанными, если текущие функции `translateStatus`, `translateGroup`, `translateOccupancy` не принимают locale.

Это лучше вынести в Stage 47D:
- `translateStatus(status, locale)`
- `translateGroup(group, locale)`
- `translateOccupancy(occupancy, locale)`
- перевод фильтров расширенного поиска.
