# Stage 7 — Radius-Suche: поиск объектов по радиусу от города или PLZ

Этот пакет добавляет поиск по радиусу без изменения базы данных.

## Что добавлено

- Новые поля фильтра: `Ort/PLZ für Radius` и `Umkreis`.
- Радиусы: 5, 10, 25, 50, 100 км.
- Список объектов фильтруется по координатам `latitude` / `longitude` из базы.
- Если введён крупный город, которого нет среди объектов, система пытается найти его в локальном справочнике городов.
- Если введён PLZ или город, который есть в базе, система берёт координаты ближайшего объекта из базы как центр радиуса.
- При активном радиусе список сортируется по расстоянию от центра.
- Фильтр сохраняется в URL и работает вместе с другими фильтрами.

## Важно

Этот этап не меняет `prisma/schema.prisma`, поэтому `npm run db:push` не нужен.

## Установка

1. Сделай backup проекта:

```powershell
Copy-Item -Recurse D:\Projects\zvg_frontend_mvp D:\Projects\zvg_frontend_mvp_backup_stage7
```

2. Распакуй архив `zvg_stage7_radius_search_update_files.zip`.

3. Скопируй папки из архива поверх проекта:

```txt
app
components
lib
```

4. Проверь сборку:

```powershell
cd D:\Projects\zvg_frontend_mvp
npm run build
```

5. Проверь локально:

```powershell
npm run dev
```

Открой:

```txt
http://localhost:3000
```

Проверь примеры:

```txt
Ort/PLZ für Radius: Chemnitz
Umkreis: 25 км
```

или:

```txt
Ort/PLZ für Radius: Dresden
Umkreis: 50 км
```

6. Отправь на GitHub:

```powershell
git add .
git commit -m "Add radius search filters"
git push
```

После `git push` Vercel сам начнёт новый деплой.
