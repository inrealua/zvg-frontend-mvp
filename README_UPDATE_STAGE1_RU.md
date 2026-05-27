# Обновление Stage 1 — публичный frontend и фильтры

Этот пакет приводит уже задеплоенный MVP ближе к ТЗ:

- нормальная шапка сайта;
- улучшенная главная страница;
- улучшенные карточки объектов;
- расширенные фильтры;
- активные фильтры-чипы с удалением одного фильтра;
- улучшенная страница объекта;
- улучшенная MVP-карта без внешних библиотек;
- без изменений схемы базы данных;
- без парсеров, AI, авторизации и админки.

## Какие файлы заменить / добавить

Замени в своём проекте файлы из этого архива с сохранением путей:

```txt
app/layout.tsx
app/page.tsx
app/globals.css
app/properties/[id]/page.tsx
components/Header.tsx
components/FilterBar.tsx
components/ActiveFilters.tsx
components/PropertyCard.tsx
components/PropertyMap.tsx
components/EmptyState.tsx
lib/format.ts
lib/filter-options.ts
lib/search-params.ts
```

Новые файлы, которых раньше могло не быть:

```txt
components/Header.tsx
components/ActiveFilters.tsx
components/EmptyState.tsx
lib/search-params.ts
```

## Порядок действий

1. Сделай копию текущей рабочей папки проекта на всякий случай.

Например:

```powershell
Copy-Item -Recurse D:\Projects\zvg_frontend_mvp D:\Projects\zvg_frontend_mvp_backup_stage1
```

2. Распакуй архив `zvg_stage1_update_files.zip`.

3. Скопируй папки `app`, `components`, `lib` из архива поверх твоего проекта:

```txt
D:\Projects\zvg_frontend_mvp
```

Windows спросит, заменить ли файлы — соглашайся.

4. Открой терминал в папке проекта:

```powershell
cd D:\Projects\zvg_frontend_mvp
```

5. Проверь сборку:

```powershell
npm run build
```

6. Если сборка прошла, запусти локально:

```powershell
npm run dev
```

Открой:

```txt
http://localhost:3000
```

7. Проверь:

- открывается главная страница;
- видны объекты из Aiven/MySQL;
- работают фильтры;
- активные фильтры удаляются по одному;
- открывается страница объекта;
- деплойная база не изменилась.

8. Отправь изменения на GitHub:

```powershell
git add .
git commit -m "Improve public frontend and filters"
git push
```

9. Vercel автоматически запустит новый deploy.

## Важно

Этот этап не меняет `prisma/schema.prisma`, поэтому миграции базы делать не нужно.

Не запускай `npm run db:seed`, если не хочешь заново перезаполнить тестовые объекты.
