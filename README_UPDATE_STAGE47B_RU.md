# Stage 47B — база переводов объектов DE / RU / EN

Этот этап добавляет мультиязычную структуру для объектов недвижимости.

## Что делает пакет

- Добавляет enum `Locale`: `DE`, `RU`, `EN`
- Добавляет таблицу `PropertyTranslation`
- Добавляет связь `Property.translations`
- Добавляет backfill-скрипт, который создаёт тестовые переводы для всех текущих объектов на DE/RU/EN
- Добавляет helper `lib/i18n/property-translations.ts`

## Важно

Этот этап меняет базу данных. Не используйте `--force-reset`.

## Установка

### 1. Backup проекта

```powershell
Copy-Item -Recurse D:\Projects\zvg_frontend_mvp D:\Projects\zvg_frontend_mvp_backup_stage47b
```

### 2. Скопировать папки из архива

Скопируйте:

```txt
scripts
lib
prisma
```

в:

```txt
D:\Projects\zvg_frontend_mvp
```

### 3. Пропатчить schema.prisma

```powershell
node .\scripts\stage47b_patch_schema.mjs
```

После этого проверьте, что в `prisma/schema.prisma` появились:

```txt
enum Locale
model PropertyTranslation
Property.translations
```

### 4. Обновить базу

```powershell
npm run db:push
```

Если Prisma спросит подтверждение — соглашайтесь только если нет `force-reset` и нет удаления таблиц.

### 5. Перегенерировать Prisma Client

```powershell
npx prisma generate
```

### 6. Создать переводы для тестовых объектов

```powershell
node .\scripts\stage47b_backfill_translations.mjs
```

Ожидаемый вывод:

```txt
Found XX properties.
Created/updated XX translations.
```

### 7. Проверить build

```powershell
npm run build
```

### 8. Commit / Deploy

```powershell
git add .
git commit -m "Add property translations for multilingual site"
git push
```

## Что НЕ делает Stage 47B

Stage 47B готовит базу и данные, но ещё не переводит все страницы сайта.

Отображение переводов на карточках, странице объекта, архиве и расширенном поиске лучше делать отдельным этапом:

```txt
Stage 47C — use localized property translations in UI
```

Так безопаснее и меньше риск сломать текущий вывод объектов.

## Проверка в базе

После backfill в таблице `PropertyTranslation` должно быть по 3 записи на каждый объект:

```txt
DE
RU
EN
```

## Если patch script не сработал

Откройте:

```txt
prisma/stage47b/schema_fragment.prisma
```

и добавьте фрагменты вручную в `prisma/schema.prisma`.
