# Stage 47E hotfix v2

Исправляет новые ошибки сборки после Stage 47E:

- `selectedLabel(values, {ui.search.allStates})`
- `"use client"` оказался не первой строкой
- server imports попали в client components
- дубли `locale`
- дубли `ui`
- ошибки в `PublicPropertiesPage.tsx`

## Установка

1. Скопируйте папку `scripts` в проект.

2. Выполните:

```powershell
cd D:\Projects\zvg_frontend_mvp
node .\scripts\stage47e_hotfix_v2.mjs
npm run build
```

Если build пройдёт:

```powershell
git add .
git commit -m "Fix Stage 47E patch issues"
git push
```

Если будет новая ошибка — пришлите новый лог.
