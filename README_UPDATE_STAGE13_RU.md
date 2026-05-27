# Stage 13 — Admin Dashboard и контроль качества базы

Этот пакет добавляет новую страницу:

```txt
/admin/dashboard
```

## Что появится

- общая статистика по объектам;
- статистика по статусам;
- статистика по Bundesland;
- статистика по группам недвижимости;
- блок качества данных: без координат, без фото, без документов, без даты торгов;
- список последних изменённых объектов;
- список последних импортов;
- ссылки на быстрые действия: объекты, импорт, создание объекта.

## Важно

Схема базы данных не меняется. `npm run db:push` не нужен.

## Установка

1. Сделай backup:

```powershell
Copy-Item -Recurse D:\Projects\zvg_frontend_mvp D:\Projects\zvg_frontend_mvp_backup_stage13
```

2. Распакуй архив `zvg_stage13_admin_dashboard_update_files.zip`.

3. Скопируй папки `app` и `components` поверх проекта:

```txt
D:\Projects\zvg_frontend_mvp
```

4. Проверь сборку:

```powershell
npm run build
```

5. Проверь локально:

```powershell
npm run dev
```

Открой:

```txt
http://localhost:3000/admin/dashboard
```

Если админка защищена паролем, сначала войди:

```txt
http://localhost:3000/admin/login
```

6. Отправь на GitHub:

```powershell
git add .
git commit -m "Add admin dashboard"
git push
```
