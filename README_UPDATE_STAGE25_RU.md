# Stage 25 — ZVG DE Visual Redesign

Этот пакет внедряет выбранный дизайн: спокойный светлый стиль с зелёной палитрой, новым брендом ZVG DE и более профессиональной композицией главной страницы.

## Установка

```powershell
Copy-Item -Recurse D:\Projects\zvg_frontend_mvp D:\Projects\zvg_frontend_mvp_backup_stage25
```

Распакуй архив и скопируй папки:

```txt
app
components
```

в:

```txt
D:\Projects\zvg_frontend_mvp
```

Соглашайся на замену файлов.

## Проверка

```powershell
cd D:\Projects\zvg_frontend_mvp
npm run build
npm run dev
```

Проверь:

```txt
http://localhost:3000
http://localhost:3000/map
http://localhost:3000/archive
```

## Деплой

```powershell
git add .
git commit -m "Apply ZVG DE visual redesign"
git push
```

После `git push` Vercel автоматически запустит новый deploy.

## База данных

Схема базы не менялась. Команду `npm run db:push` запускать не нужно.
