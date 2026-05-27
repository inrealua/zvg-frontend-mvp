# Stage 19 — SEO, sitemap, robots и юридические страницы

Этот пакет добавляет базовую SEO-инфраструктуру и публичные служебные страницы.

## Что добавлено

- `app/sitemap.ts` — динамический sitemap.xml с объектами из базы.
- `app/robots.ts` — robots.txt, закрывающий admin/login/cabinet от индексации.
- Улучшенные metadata / OpenGraph / Twitter cards.
- Dynamic metadata для страницы объекта.
- `Footer`.
- Страницы:
  - `/ueber-uns`
  - `/impressum`
  - `/datenschutz`

## Важно

Страницы Impressum и Datenschutz содержат MVP-шаблон. Перед реальной публичной эксплуатацией нужно заменить данные владельца и юридически проверить тексты.

## Новые переменные окружения

Желательно добавить локально и в Vercel:

```env
NEXT_PUBLIC_SITE_URL="https://your-domain.vercel.app"
SITE_OWNER_NAME="Ваше имя или компания"
SITE_OWNER_ADDRESS="Ваш адрес"
SITE_OWNER_EMAIL="email@example.com"
```

Если пока нет домена, `NEXT_PUBLIC_SITE_URL` можно поставить равным текущему Vercel URL.

## Установка

1. Сделай backup проекта:

```powershell
Copy-Item -Recurse D:\Projects\zvg_frontend_mvp D:\Projects\zvg_frontend_mvp_backup_stage19
```

2. Распакуй архив.
3. Скопируй папки `app` и `components` поверх проекта.
4. Проверь:

```powershell
cd D:\Projects\zvg_frontend_mvp
npm run build
npm run dev
```

5. Открой:

```txt
http://localhost:3000/sitemap.xml
http://localhost:3000/robots.txt
http://localhost:3000/ueber-uns
http://localhost:3000/impressum
http://localhost:3000/datenschutz
```

6. Отправь на GitHub:

```powershell
git add .
git commit -m "Add SEO sitemap robots and legal pages"
git push
```

`npm run db:push` для этого этапа не нужен, потому что схема базы не меняется.
