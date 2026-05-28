# Stage 28 — стабилизация расширенного поиска, немецкий язык, карточки главной

## Что исправлено

- Расширенный фильтр на странице `/map` больше не сжимает поля в узкие кривые колонки.
- В сайдбаре карты фильтры идут нормальной вертикальной сеткой и скроллятся вместе со страницей.
- Ползунки цены, жилой площади и участка выровнены и больше не накладываются на текст.
- На главной странице карточки объектов стали прямоугольными grid-карточками, а не длинными горизонтальными строками.
- Публичные тексты, которые были на русском, заменены на немецкие.
- Маркеры карты стали спокойными, но более различимыми между типами объектов.
- Popup-карточка на карте стала шире и аккуратнее.

## Как установить

1. Сделать backup:

```powershell
Copy-Item -Recurse D:\Projects\zvg_frontend_mvp D:\Projects\zvg_frontend_mvp_backup_stage28
```

2. Распаковать архив `zvg_stage28_layout_language_cards_fix.zip`.

3. Скопировать папки `app` и `components` поверх проекта:

```txt
D:\Projects\zvg_frontend_mvp
```

4. Проверить локально:

```powershell
cd D:\Projects\zvg_frontend_mvp
npm run build
npm run dev
```

5. Проверить страницы:

```txt
http://localhost:3000
http://localhost:3000/map
http://localhost:3000/archive
```

6. Отправить на GitHub:

```powershell
git add .
git commit -m "Fix advanced search layout language and home cards"
git push
```

`npm run db:push` не нужен — база данных не менялась.
