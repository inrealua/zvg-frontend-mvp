# Stage 43 — exact raster logo from selected concept

Предыдущие SVG-версии получались криво, потому что я пытался вручную перерисовать логотип.  
В этом пакете логотип взят как PNG-кроп из выбранного макета, поэтому визуально он будет соответствовать первой картинке.

## Что внутри

- `public/brand/zvg-de-logo-selected.png`
- `public/brand/zvg-de-logo-header.png`
- `public/brand/zvg-de-logo-compact.png`
- `public/brand/zvg-de-icon-512.png`
- favicon-файлы
- `components/SiteLogo.tsx`
- `components/Header.tsx`
- `STAGE43_CSS_APPEND.css`

## Установка

1. Backup:

```powershell
Copy-Item -Recurse D:\Projects\zvg_frontend_mvp D:\Projects\zvg_frontend_mvp_backup_stage43
```

2. Скопировать из архива папки:

```txt
app
components
public
```

в проект:

```txt
D:\Projects\zvg_frontend_mvp
```

3. Открыть `STAGE43_CSS_APPEND.css` и вставить всё в конец:

```txt
app/globals.css
```

4. Проверить:

```powershell
npm run build
npm run dev
```

5. Deploy:

```powershell
git add .
git commit -m "Use exact selected raster logo"
git push
```

После деплоя сделай Ctrl+F5. Если favicon старый — очисти cache сайта или проверь в инкогнито.
