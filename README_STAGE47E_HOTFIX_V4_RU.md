# Stage 47E hotfix v4 — client components

Исправляет ошибку, когда в client components (`FilterBar`, `PropertyMap`, `QuickSearchBar`, `SaveSearchButton`) попали server imports:

```ts
import { getI18n } from "@/lib/i18n/server";
import { getUiText } from "@/lib/i18n/ui-texts";
"use client";
```

В Next.js `"use client"` должен быть первой строкой, а `getI18n()` нельзя вызывать внутри client component.

## Что делает

- переносит `"use client"` наверх;
- убирает `getI18n` / `getUiText` из client components;
- убирает случайные `await getI18n()`;
- временно заменяет `ui.*` в client components на немецкие fallback-строки, чтобы восстановить build.

## Установка

1. Скопировать папку `scripts` в проект.

2. Запустить:

```powershell
cd D:\Projects\zvg_frontend_mvp
node .\scripts\stage47e_hotfix_v4_client_components.mjs
npm run build
```

Если build пройдёт:

```powershell
git add .
git commit -m "Fix client components after Stage 47E patch"
git push
```

После восстановления build лучше сделать отдельный аккуратный Stage 48 для перевода client-компонентов через props, а не через server imports.
