# Stage 48 — full language cleanup

Исправляет кодовые места, где на EN/RU/DE оставалась смесь языков.

## Установка

```powershell
Copy-Item -Recurse D:\Projects\zvg_frontend_mvp D:\Projects\zvg_frontend_mvp_backup_stage48
```

Скопировать из архива папки:

```txt
components
lib
scripts
```

в проект:

```txt
D:\Projects\zvg_frontend_mvp
```

Запустить:

```powershell
cd D:\Projects\zvg_frontend_mvp
node .\scripts\stage48_patch_public_pages_i18n.mjs
npm run build
npm run dev
```

Если build прошёл:

```powershell
git add .
git commit -m "Clean up multilingual UI texts"
git push
```

## Что проверить

EN:
- Quick Search
- Property map
- Search this map area
- Draw region
- Page / Found / Active / Cancelled / Archive / Max. value
- No radius
- Shown / Previous / Next

RU:
- Быстрый поиск
- Карта объектов
- Искать в этой области карты
- Нарисовать область
- Без радиуса

DE:
- Schnellsuche
- Karte der Objekte
- Kein Radius
