# Stage 30 — исправление карточек и многовыборных фильтров

## Что исправлено

- В карточках на главной теги Bundesland/PLZ теперь не сливаются с кнопкой `Details ansehen`.
- Добавлен нормальный нижний отступ между тегами и кнопкой.
- Блок действий в карточке выровнен: сердце + кнопка.
- В расширенном поиске многовыборные блоки Bundesland / Objektart / Nutzung стали пропорциональными.
- Checkbox больше не отображается огромным пустым квадратом по центру.
- Текст опций больше не вылезает за пределы карточек.
- В боковой колонке `/map` опции строятся компактно в 2 колонки, на узких экранах — в 1 колонку.

## Как установить

1. Сделай backup:

```powershell
Copy-Item -Recurse D:\Projects\zvg_frontend_mvp D:\Projects\zvg_frontend_mvp_backup_stage30
```

2. Скопируй папку `app` из архива поверх проекта:

```txt
D:\Projects\zvg_frontend_mvp
```

3. Проверь:

```powershell
cd D:\Projects\zvg_frontend_mvp
npm run build
npm run dev
```

4. После проверки:

```powershell
git add .
git commit -m "Fix homepage card spacing and advanced multiselect layout"
git push
```

База данных не менялась, `npm run db:push` не нужен.
