# Stage 11 — улучшенная страница объекта

Этот пакет улучшает страницу одного объекта `/properties/[id]`.

## Что добавляется

- большая галерея фотографий;
- миниатюры фото;
- просмотр фото в lightbox;
- переключение фото стрелками клавиатуры;
- кнопка «Скопировать ссылку»;
- кнопка «Поделиться»;
- кнопка «Печать / PDF»;
- быстрые якорные ссылки по разделам страницы;
- компактные карточки с ключевыми параметрами;
- более удобная таблица документов;
- блок источника данных;
- CSS для печати страницы объекта.

## Важно

Схема базы данных не меняется.
Миграции не нужны.
Новые npm-пакеты не нужны.

## Установка

1. Сделать backup:

```powershell
Copy-Item -Recurse D:\Projects\zvg_frontend_mvp D:\Projects\zvg_frontend_mvp_backup_stage11
```

2. Распаковать архив `zvg_stage11_detail_page_update_files.zip`.

3. Скопировать из архива папки:

```txt
app
components
```

в проект:

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

Открыть любой объект:

```txt
http://localhost:3000/properties/ID_ОБЪЕКТА
```

Или открыть главную и перейти в объект через кнопку «Подробнее».

6. Отправить на GitHub:

```powershell
git add .
git commit -m "Improve property detail page"
git push
```

После `git push` Vercel сам запустит новый деплой.
