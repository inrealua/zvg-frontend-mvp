# Stage 14 — Admin Quality Center

Этот пакет добавляет страницу контроля качества базы:

- `/admin/quality` — проверки данных;
- объекты без координат;
- объекты без фото;
- объекты без документов;
- объекты без даты торгов;
- объекты без Verkehrswert;
- отменённые объекты без текста отмены;
- возможные дубли по `normalizedAktenzeichen + court`.

Схема базы данных не меняется.

## Как установить

1. Сделай backup:

```powershell
Copy-Item -Recurse D:\Projects\zvg_frontend_mvp D:\Projects\zvg_frontend_mvp_backup_stage14
```

2. Распакуй архив `zvg_stage14_quality_update_files.zip`.

3. Скопируй папки `app` и `components` поверх проекта:

```txt
D:\Projects\zvg_frontend_mvp
```

4. Проверь сборку:

```powershell
cd D:\Projects\zvg_frontend_mvp
npm run build
```

5. Запусти локально:

```powershell
npm run dev
```

6. Открой:

```txt
http://localhost:3000/admin/quality
```

Если админка закрыта паролем, сначала войди:

```txt
http://localhost:3000/admin/login
```

7. Отправь на GitHub:

```powershell
git add .
git commit -m "Add admin data quality checks"
git push
```

`npm run db:push` для этого этапа не нужен.
