# ZVG-DE Site AI v3.0.1 hotfix

Исправляет `ERR_INVALID_URL input: '[SENSITIVE]'` при `npm run build`.

Причина: `NEXT_PUBLIC_SITE_URL=[SENSITIVE]` в `.env.local` имеет приоритет над `.env`, а `app/layout.tsx` передавал значение напрямую в `new URL()`.

Патч:
- добавляет `lib/site-url.ts`;
- безопасно нормализует `NEXT_PUBLIC_SITE_URL`;
- `[SENSITIVE]`, пустые и невалидные URL автоматически заменяются на `https://zvg-de.com`;
- применяет helper в `app/layout.tsx`, `app/robots.ts`, `app/sitemap.ts`.

Распаковать поверх корня проекта и снова выполнить `npm run build`.
