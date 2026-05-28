# Stage 26 — исправление дизайна фильтров, карты и позиционирования

## Что исправлено

- Многовыбор больше не использует `<details>`: dropdown закрывается по клику вне блока и по Escape.
- Dropdown больше не остается открытым поверх всей формы.
- Поля фильтра выровнены по 12-колоночной сетке.
- Цена, Wohnfläche и Grundstück остаются как двойные ползунки, но вписаны в сетку ровно.
- Цвета маркеров карты стали мягкими и ближе к зелено-серой палитре сайта.
- Карта слегка приглушена по насыщенности, чтобы маркеры не выбивались из общего дизайна.
- Главный посыл изменён с “Immobilienauktionen in Deutschland” на “Alle gerichtlichen Versteigerungen an einem Ort”.
- Тексты карты и кнопок частично приведены к немецкому интерфейсу.

## Как поставить

1. Сделай backup:

```powershell
Copy-Item -Recurse D:\Projects\zvg_frontend_mvp D:\Projects\zvg_frontend_mvp_backup_stage26
```

2. Скопируй из архива папки:

```txt
app
components
```

в проект:

```txt
D:\Projects\zvg_frontend_mvp
```

3. Проверь сборку:

```powershell
cd D:\Projects\zvg_frontend_mvp
npm run build
```

4. Проверь локально:

```powershell
npm run dev
```

Проверь:

```txt
http://localhost:3000
http://localhost:3000/map
http://localhost:3000/archive
```

5. Отправь на GitHub:

```powershell
git add .
git commit -m "Clean up filters map style and homepage positioning"
git push
```

`npm run db:push` не нужен — база данных не менялась.
