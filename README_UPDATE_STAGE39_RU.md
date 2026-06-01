# Stage 39 — ZVG-DE brand + favicon + 2-column favorites

Этот пакет внедряет выбранный дизайн:

- логотип ZVG-DE заглавными буквами;
- тире между ZVG и DE;
- фирменная иконка: дом + судебные колонны + молоток;
- favicon и app icons;
- кабинет / избранное в 2 колонки;
- минимум 6 карточек на экране на широком desktop;
- комментарий виден сразу;
- быстрый optimistic UI для сердечка.

## Файлы

### Assets
- `public/brand/zvg-de-icon.svg`
- `public/brand/zvg-de-logo-horizontal.svg`
- `public/brand/zvg-de-logo-compact.svg`
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
- `components/FavoriteButton.tsx`
- `components/FavoriteNoteForm.tsx`
- `app/cabinet/page.tsx`
- `STAGE39_CSS_APPEND.css`

## Установка

1. Backup:

```powershell
Copy-Item -Recurse D:\Projects\zvg_frontend_mvp D:\Projects\zvg_frontend_mvp_backup_stage39
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

3. Открыть `STAGE39_CSS_APPEND.css` и вставить его содержимое в конец:

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
git commit -m "Apply ZVG-DE brand and two-column favorites"
git push
```

## Как подключить новый логотип в Header

Если после установки логотип в меню не изменился, нужно открыть текущий файл Header, скорее всего:

```txt
components/Header.tsx
```

и заменить старый логотип на:

```tsx
import { SiteLogo } from "@/components/SiteLogo";

<SiteLogo variant="compact" />
```

Если хочешь — пришли текущий `components/Header.tsx`, и я дам точную замену без риска сломать меню.

## Проверка

- Открыть `/cabinet`.
- Должны быть 2 колонки карточек.
- На широком экране должно помещаться около 6 карточек.
- Favicon должен появиться после hard refresh / очистки cache.
