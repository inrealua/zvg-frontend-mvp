# Stage 47E hotfix v9 — raw button text

Исправляет ошибку:

```tsx
{isPending ? "Speichern..." : Notiz speichern}
```

Правильно:

```tsx
{isPending ? "Speichern..." : "Notiz speichern"}
```

## Установка

```powershell
cd D:\Projects\zvg_frontend_mvp
node .\scripts\stage47e_hotfix_v9_button_text.mjs
npm run build
```

Если build пройдёт:

```powershell
git add .
git commit -m "Fix raw button text after Stage 47E"
git push
```
