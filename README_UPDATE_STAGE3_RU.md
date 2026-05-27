# Stage 3 — Admin MVP: ручное управление объектами

Этот пакет добавляет первую рабочую админ-панель без авторизации. Это промежуточный этап: позже мы закроем `/admin` логином и ролью ADMIN.

## Что появится

- `/admin` — список объектов из базы.
- Поиск в админке по названию, адресу, городу, суду и Aktenzeichen.
- Фильтр по статусу.
- Создание нового объекта вручную.
- Редактирование объекта.
- Удаление объекта.
- Управление фото через список URL: первое фото автоматически становится главным.
- Данные сохраняются напрямую в MySQL через Prisma.

## Что НЕ меняется

- `prisma/schema.prisma` не меняется.
- Новые npm-пакеты не нужны.
- `DATABASE_URL` не меняется.
- `npm run db:push` запускать не нужно.
- `npm run db:seed` запускать не нужно, иначе тестовые данные будут перезаписаны.

## Как установить

1. Сделай backup проекта:

```powershell
Copy-Item -Recurse D:\Projects\zvg_frontend_mvp D:\Projects\zvg_frontend_mvp_backup_stage3
```

2. Распакуй архив `zvg_stage3_admin_update_files.zip`.

3. Скопируй папки из архива в проект:

```txt
app
components
lib
```

в:

```txt
D:\Projects\zvg_frontend_mvp
```

Windows спросит заменить файлы — нажми **Да**.

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
http://localhost:3000/admin
```

6. Если всё работает, отправь на GitHub:

```powershell
git add .
git commit -m "Add admin property management MVP"
git push
```

После `git push` Vercel сам запустит новый деплой.

## Важно по безопасности

Сейчас `/admin` открыт без логина. Это сделано специально для быстрого этапа разработки. Следующий этап должен быть: авторизация + роли USER/ADMIN + закрытие админки.
