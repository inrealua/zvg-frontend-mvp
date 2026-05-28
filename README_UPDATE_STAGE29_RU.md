# Stage 29 — navigation, cards, map and search cleanup

Что исправлено:

- Главное меню: главная страница называется **Immobilien finden**, страница `/map` остаётся как **Karte** и используется как расширенный поиск.
- Карточки на главной: теги и нижние элементы получили нормальные отступы, выравнивание и не слипаются.
- Расширенный поиск `/map`: боковая колонка больше не сжимает поля в кривые маленькие блоки; фильтры идут аккуратной вертикальной сеткой.
- Ползунки цены/площади/участка получили фиксированную высоту и не накладываются на текст.
- Карта: маркеры стали более различимыми между типами объектов, но остались в спокойной цветовой гамме.
- Popup-карточка на карте стала шире, информативнее и ровнее.
- Мини-карта объекта: включён scrollWheelZoom.

Установка:

1. Сделайте backup:

```powershell
Copy-Item -Recurse D:\Projects\zvg_frontend_mvp D:\Projects\zvg_frontend_mvp_backup_stage29
```

2. Скопируйте папки `app` и `components` поверх проекта.
3. Проверьте:

```powershell
cd D:\Projects\zvg_frontend_mvp
npm run build
npm run dev
```

4. После проверки:

```powershell
git add .
git commit -m "Polish navigation cards maps and advanced search"
git push
```

База данных не менялась, `npm run db:push` не нужен.
