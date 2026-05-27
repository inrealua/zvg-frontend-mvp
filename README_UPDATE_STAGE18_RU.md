# Stage 18 — шаблоны импорта и проверка данных перед импортом

Этот пакет добавляет удобные инструменты для импорта объектов напрямую в MySQL, но без парсеров и без AI.

## Что добавляется

- `/admin/import/templates` — страница с описанием всех полей импорта.
- `/admin/import/templates/csv` — скачивание CSV-шаблона.
- `/admin/import/templates/json` — скачивание JSON-шаблона.
- `/admin/import/validate` — проверка CSV/JSON без записи в базу.
- В `/admin/import` добавлены ссылки на шаблоны и проверку.

## Важно

Этот этап **не меняет схему базы данных**.

Команду `npm run db:push` выполнять не нужно.

## Установка

1. Сделай backup:

```powershell
Copy-Item -Recurse D:\Projects\zvg_frontend_mvp D:\Projects\zvg_frontend_mvp_backup_stage18
```

2. Распакуй архив `zvg_stage18_import_templates_validation_update_files.zip`.

3. Скопируй папки `app` и `lib` поверх проекта:

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

6. Открой:

```txt
http://localhost:3000/admin/import/templates
http://localhost:3000/admin/import/validate
http://localhost:3000/admin/import
```

7. Отправь на GitHub:

```powershell
git add .
git commit -m "Add import templates and validation"
git push
```

После `git push` Vercel сам начнёт новый деплой.
