# Stage 46 — final logo package from your SVG

Пакет собран из SVG, который вы загрузили.

## Что внутри

### SVG
- `public/brand/zvg-de-logo.svg` — основной SVG
- `public/brand/zvg-de-logo-original.svg` — копия исходника
- `public/favicon.svg`
- `app/icon.svg`

### PNG логотипы
- `public/brand/zvg-de-logo-320.png`
- `public/brand/zvg-de-logo-480.png`
- `public/brand/zvg-de-logo-640.png`
- `public/brand/zvg-de-logo-960.png`
- `public/brand/zvg-de-logo-1280.png`
- `public/brand/zvg-de-logo-1920.png`
- `public/brand/zvg-de-logo-header.png`
- `public/brand/zvg-de-logo-compact.png`

### Favicon / app icons
- `public/favicon.ico`
- `public/favicon-16x16.png`
- `public/favicon-32x32.png`
- `public/favicon-48x48.png`
- `public/favicon-64x64.png`
- `public/favicon-96x96.png`
- `public/favicon-128x128.png`
- `public/favicon-256x256.png`
- `public/apple-touch-icon.png`
- `public/android-chrome-192x192.png`
- `public/android-chrome-512x512.png`
- `public/site.webmanifest`

### Code
- `components/SiteLogo.tsx`
- `STAGE46_CSS_APPEND.css`

## Установка

1. Backup:

```powershell
Copy-Item -Recurse D:\Projects\zvg_frontend_mvp D:\Projects\zvg_frontend_mvp_backup_stage46
```

2. Скопировать папки:

```txt
app
components
public
```

в проект:

```txt
D:\Projects\zvg_frontend_mvp
```

3. Добавить содержимое `STAGE46_CSS_APPEND.css` в конец:

```txt
app/globals.css
```

4. Проверить, что в `components/Header.tsx` используется:

```tsx
import { SiteLogo } from "@/components/SiteLogo";

<SiteLogo variant="header" className="design-brand" />
```

5. Проверить и задеплоить:

```powershell
npm run build
git add .
git commit -m "Add final logo assets from provided SVG"
git push
```

После деплоя сделайте Ctrl+F5. Favicon может обновиться не сразу из-за кеша браузера.
