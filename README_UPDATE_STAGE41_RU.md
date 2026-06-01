# Stage 41 — fix header logo overlay

Проблема была в том, что в Header старый логотип был прописан вручную, а CSS из Stage 40 дополнительно рисовал новый логотип поверх него.

## Что меняется

- `components/Header.tsx` теперь использует `<SiteLogo variant="header" />`
- старый ручной блок логотипа удалён
- CSS отключает fallback overlay из Stage 40

## Установка

1. Скопировать `components/Header.tsx` поверх:

```txt
D:\Projects\zvg_frontend_mvp\components\Header.tsx
```

2. Открыть `STAGE41_CSS_APPEND.css` и вставить содержимое в конец:

```txt
app/globals.css
```

3. Проверить:

```powershell
npm run build
npm run dev
```

4. Deploy:

```powershell
git add .
git commit -m "Fix header logo overlay"
git push
```
