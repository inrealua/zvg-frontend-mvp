# Stage 47E hotfix v3 — FilterBar JSX attributes

Исправляет ошибку:

```txt
<MultiCheckboxGroup title=ui.search.propertyType ...
Expected '</', got 'ident'
```

Правильный JSX:

```tsx
<MultiCheckboxGroup title={ui.search.propertyType} ... />
```

## Установка

1. Скопируйте папку `scripts` в проект.
2. Выполните:

```powershell
cd D:\Projects\zvg_frontend_mvp
node .\scripts\stage47e_hotfix_v3_filterbar.mjs
npm run build
```

Если появится новая ошибка — пришлите build log.
