# Stage 23 — исправление авторизации на Vercel

Этот пакет убирает зависимость верхнего меню от серверного кэша Next.js.

Что изменено:

- Добавлен `/api/auth/me`, который всегда читает cookie текущего пользователя без кэша.
- Добавлен клиентский компонент `AuthNav`, который проверяет пользователя на стороне браузера.
- `Header` теперь показывает вход/кабинет через `AuthNav`, поэтому на Vercel меню не должно "разлогиниваться" при переходе между страницами.
- `FavoriteButton` и `SaveSearchButton` явно отправляют cookie через `credentials: "include"` и обновляют router после успешного действия.

## Установка

1. Сделать backup:

```powershell
Copy-Item -Recurse D:\Projects\zvg_frontend_mvp D:\Projects\zvg_frontend_mvp_backup_stage23
```

2. Скопировать поверх проекта папки:

```txt
app
components
```

3. Проверить сборку:

```powershell
cd D:\Projects\zvg_frontend_mvp
npm run build
```

4. Проверить локально:

```powershell
npm run dev
```

5. Отправить на GitHub:

```powershell
git add .
git commit -m "Fix production user session navigation"
git push
```

6. На Vercel сделать Redeploy.

После деплоя обязательно выйдите из аккаунта и войдите заново.
