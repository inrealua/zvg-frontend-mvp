# Stage 33 — Logout fix + Google auth UI

## Что исправляет

- Исправляет logout/Abmelden для новой database-session авторизации.
- Удаляет сессию из таблицы Session.
- Очищает production cookie `__Host-zvg_session`, dev cookie `zvg_dev_session` и старую legacy cookie `zvg_user_session`.
- Добавляет красивую кнопку Google auth.
- Добавляет Google auth на страницу login.
- Добавляет Google auth на страницу register.

## Установка

1. Сделать backup:

```powershell
Copy-Item -Recurse D:\Projects\zvg_frontend_mvp D:\Projects\zvg_frontend_mvp_backup_stage33
```

2. Скопировать папки из архива поверх проекта:

```txt
app
components
```

3. Проверить:

```powershell
cd D:\Projects\zvg_frontend_mvp
npm run build
npm run dev
```

4. Отправить на GitHub:

```powershell
git add .
git commit -m "Fix logout and improve Google auth UI"
git push
```

## После деплоя

- Удалить старые cookies сайта.
- Войти через Google.
- Проверить `/api/auth/me`.
- Нажать Abmelden.
- Проверить, что cookie `__Host-zvg_session` исчезла.
