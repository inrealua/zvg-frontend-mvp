# Stage 47E hotfix v5 — FilterBar raw JSX attributes

Исправляет ошибку:

```tsx
<MultiCheckboxGroup title=Objektart ... />
<MultiCheckboxGroup title=Nutzung ... />
```

Правильно:

```tsx
<MultiCheckboxGroup title="Objektart" ... />
<MultiCheckboxGroup title="Nutzung" ... />
```

## Установка

```powershell
cd D:\Projects\zvg_frontend_mvp
node .\scripts\stage47e_hotfix_v5_filterbar_attrs.mjs
npm run build
```

Если будет новая ошибка — пришлите build log.
