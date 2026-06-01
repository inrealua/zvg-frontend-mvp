# Stage 40 — Selected ZVG-DE logo

Этот пакет ставит логотип из выбранного варианта:
- заглавное `ZVG-DE`;
- тире между ZVG и DE;
- иконка дом + судебные колонны + молоток;
- favicon на основе этой иконки.

## Файлы

### Assets
- `public/brand/zvg-de-logo-header.svg`
- `public/brand/zvg-de-logo-compact.svg`
- `public/brand/zvg-de-logo-stacked.svg`
- `public/brand/zvg-de-icon.svg`
- `public/favicon.svg`
- `public/favicon.ico`
- `public/favicon-16x16.png`
- `public/favicon-32x32.png`
- `public/favicon-48x48.png`
- `public/apple-touch-icon.png`
- `public/android-chrome-192x192.png`
- `public/android-chrome-512x512.png`
- `app/favicon.ico`
- `app/icon.svg`

### Code
- `components/SiteLogo.tsx`
- `STAGE40_CSS_APPEND.css`

## Установка

1. Backup:

```powershell
Copy-Item -Recurse D:\Projects\zvg_frontend_mvp D:\Projects\zvg_frontend_mvp_backup_stage40
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

3. Открыть `STAGE40_CSS_APPEND.css`, скопировать весь текст и вставить в самый конец:

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
git commit -m "Apply selected ZVG-DE logo and favicon"
git push
```

## Если логотип всё ещё не поменялся

В текущем `Header.tsx` старый логотип, вероятно, прописан вручную.
Нужно заменить старый блок логотипа на:

```tsx
import { SiteLogo } from "@/components/SiteLogo";

<SiteLogo variant="header" />
```

Если пришлёшь `components/Header.tsx`, можно дать точный готовый файл.
