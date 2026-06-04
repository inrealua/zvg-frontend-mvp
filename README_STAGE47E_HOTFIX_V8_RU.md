# Stage 47E hotfix v8 — placeholder attribute

Исправляет ошибку:

```tsx
placeholder=Ihre persönliche Notiz zu diesem Objekt...
```

Должно быть:

```tsx
placeholder="Ihre persönliche Notiz zu diesem Objekt..."
```

## Установка

```powershell
cd D:\Projects\zvg_frontend_mvp
node .\scripts\stage47e_hotfix_v8_placeholder_attr.mjs
npm run build
```

Если build пройдёт:

```powershell
git add .
git commit -m "Fix placeholder attribute after Stage 47E"
git push
```

Если появится новая ошибка — пришлите новый build log.
