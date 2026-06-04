# Stage 47E hotfix v7 — FavoriteNoteForm ui not defined

Исправляет ошибку:

```txt
Cannot find name 'ui'
app/components/FavoriteNoteForm.tsx
```

Причина: предыдущий patch вставил `ui.cabinet.myNote` в client component, но сам `ui` там не определён.

## Установка

```powershell
cd D:\Projects\zvg_frontend_mvp
node .\scripts\stage47e_hotfix_v7_favorite_note_ui.mjs
npm run build
```

Если build пройдёт:

```powershell
git add .
git commit -m "Fix FavoriteNoteForm ui reference"
git push
```

Если будет новая ошибка — пришлите новый build log.
