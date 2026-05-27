# Stage 8 — пагинация списка объектов

Этот пакет добавляет нормальную пагинацию на главную страницу.

## Что меняется

- список объектов делится на страницы;
- добавлен выбор количества объектов на странице: 10 / 20 / 50 / 100;
- фильтры продолжают работать через URL;
- при изменении фильтров номер страницы сбрасывается;
- карта показывает все найденные объекты, а не только объекты текущей страницы;
- база данных не меняется.

## Как установить

1. Сделать backup:

```powershell
Copy-Item -Recurse D:\Projects\zvg_frontend_mvp D:\Projects\zvg_frontend_mvp_backup_stage8
```

2. Распаковать архив `zvg_stage8_pagination_update_files.zip`.

3. Скопировать папки `app`, `components`, `lib` в проект:

```txt
D:\Projects\zvg_frontend_mvp
```

4. Проверить сборку:

```powershell
cd D:\Projects\zvg_frontend_mvp
npm run build
```

5. Проверить локально:

```powershell
npm run dev
```

Открыть:

```txt
http://localhost:3000
```

6. Отправить на GitHub:

```powershell
git add .
git commit -m "Add property list pagination"
git push
```

После `git push` Vercel сам начнёт деплой.

## Важно

`npm run db:push` не нужен, потому что таблицы и поля базы не меняются.
