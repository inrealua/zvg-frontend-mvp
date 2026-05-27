# Stage 4 — защита админ-панели паролем

Этот пакет закрывает `/admin` простым admin-login. Это временный, но полезный этап до полноценной регистрации пользователей.

## Что добавлено

- `/admin/login` — страница входа администратора.
- `/admin/logout` — выход.
- `middleware.ts` — защита всех страниц `/admin/*`, кроме `/admin/login`.
- `lib/admin-auth.ts` — общий helper для admin-cookie.
- Обновлён `Header.tsx`: если админ вошёл, показываются `Admin` и `Выйти`.
- База данных не меняется.
- Новые npm-пакеты не нужны.

## ВАЖНО: переменные окружения

Для локальной разработки можно временно использовать пароль по умолчанию:

```txt
admin12345
```

Но для Vercel обязательно добавь свои переменные:

```env
ADMIN_PASSWORD="придумай_сложный_пароль"
ADMIN_SESSION_TOKEN="длинная_случайная_строка"
```

`ADMIN_SESSION_TOKEN` — это не пароль. Это секретное значение для cookie-сессии. Пример можно сгенерировать так:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Как поставить

1. Сделай backup:

```powershell
Copy-Item -Recurse D:\Projects\zvg_frontend_mvp D:\Projects\zvg_frontend_mvp_backup_stage4
```

2. Распакуй архив `zvg_stage4_admin_auth_update_files.zip`.

3. Скопируй файлы/папки из архива поверх проекта:

```txt
app
components
lib
middleware.ts
```

4. Добавь в локальный `.env`:

```env
ADMIN_PASSWORD="admin12345"
ADMIN_SESSION_TOKEN="dev-admin-token-change-me"
```

5. Проверь:

```powershell
npm run build
npm run dev
```

6. Открой:

```txt
http://localhost:3000/admin
```

Тебя должно перекинуть на:

```txt
http://localhost:3000/admin/login
```

7. Войди паролем из `ADMIN_PASSWORD`.

8. Отправь на GitHub:

```powershell
git add .
git commit -m "Protect admin area with password login"
git push
```

9. В Vercel добавь `ADMIN_PASSWORD` и `ADMIN_SESSION_TOKEN` в Environment Variables и сделай Redeploy.
