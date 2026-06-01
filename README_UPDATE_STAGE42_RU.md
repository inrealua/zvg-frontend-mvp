# Stage 42 — exact selected ZVG-DE logo fix

Этот пакет исправляет логотип так, чтобы он был ближе к выбранной первой картинке:

- крупное классическое написание `ZVG-DE`;
- `DE` в sage green;
- тонкая вертикальная линия между иконкой и текстом;
- tagline под названием;
- без наложения старого и нового логотипов.

## Файлы

- `public/brand/zvg-de-logo-header.svg`
- `public/brand/zvg-de-logo-compact.svg`
- `public/brand/zvg-de-icon.svg`
- `public/favicon.svg`
- `app/icon.svg`
- `components/SiteLogo.tsx`
- `components/Header.tsx`
- `STAGE42_CSS_APPEND.css`

## Установка

1. Backup:

```powershell
Copy-Item -Recurse D:\Projects\zvg_frontend_mvp D:\Projects\zvg_frontend_mvp_backup_stage42
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

3. Открыть `STAGE42_CSS_APPEND.css`, скопировать всё и вставить в конец:

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
git commit -m "Fix ZVG-DE logo to selected concept"
git push
```

После деплоя сделай Ctrl+F5.
