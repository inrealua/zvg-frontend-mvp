# Stage 15 — Export CSV из админки

Этот пакет добавляет выгрузку объектов из MySQL в CSV.

## Что появится

- `/admin/export` — страница экспорта.
- `/admin/export/download` — route handler, который генерирует CSV-файл.
- Фильтры экспорта: поиск, статус, Bundesland, Gericht, Stadt, тип, дата торгов, цена, качество данных.
- Быстрые ссылки: активные, отменённые, без фото, без координат.
- CSV в формате `;`, чтобы его удобно открывать в немецком Excel.

## Установка

1. Сделай backup:

```powershell
Copy-Item -Recurse D:\Projects\zvg_frontend_mvp D:\Projects\zvg_frontend_mvp_backup_stage15
```

2. Распакуй архив `zvg_stage15_export_update_files.zip`.

3. Скопируй папки:

```txt
app
components
```

в проект:

```txt
D:\Projects\zvg_frontend_mvp
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
http://localhost:3000/admin/export
```

6. Отправь на GitHub:

```powershell
git add .
git commit -m "Add admin CSV export"
git push
```

## База данных

`npm run db:push` не нужен. Схема базы не меняется.
