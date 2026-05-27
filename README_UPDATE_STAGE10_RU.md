# Stage 10 — Polygon search на карте

Этот пакет добавляет поиск объектов внутри произвольно нарисованной области на карте.

## Что добавляется

- кнопка **Нарисовать область** на карте;
- постановка точек кликом по карте;
- применение polygon search после минимум 3 точек;
- координаты polygon сохраняются в URL в параметре `poly`;
- список объектов фильтруется по координатам `latitude` / `longitude`;
- polygon search работает вместе с другими фильтрами;
- при включении polygon search автоматически убирается фильтр видимой области карты, чтобы фильтры не конфликтовали;
- активный chip **Polygon-Suche** можно удалить через `×`;
- база данных не меняется.

## Установка

1. Сделай backup:

```powershell
Copy-Item -Recurse D:\Projects\zvg_frontend_mvp D:\Projects\zvg_frontend_mvp_backup_stage10
```

2. Распакуй архив `zvg_stage10_polygon_search_update_files.zip`.

3. Скопируй папки/файлы из архива поверх проекта:

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

## Как проверить

1. На карте нажми **Нарисовать область**.
2. Кликни по карте 3–6 раз, чтобы поставить точки.
3. Нажми **Применить polygon**.
4. Список должен показать только объекты внутри нарисованной области.
5. В активных фильтрах появится chip **Polygon-Suche**.
6. Удали chip через `×` — остальные фильтры должны остаться.

## Отправка на GitHub

```powershell
git add .
git commit -m "Add polygon map search"
git push
```

После `git push` Vercel сам запустит новый деплой.
