# Stage 47E hotfix v6 — FilterBar selectedLabel signature

Исправляет ошибку:

```ts
function selectedLabel(values: string[], "totalLabel: string"): string
```

Должно быть:

```ts
function selectedLabel(values: string[], totalLabel: string): string
```

## Установка

```powershell
cd D:\Projects\zvg_frontend_mvp
node .\scripts\stage47e_hotfix_v6_filterbar_signature.mjs
npm run build
```
