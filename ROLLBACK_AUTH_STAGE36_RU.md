# Stage 36 — откат авторизации к рабочей версии Stage 32

Этот пакет возвращает пользовательскую авторизацию к версии, где работали:

- Google login
- email/password login
- register
- `/api/auth/me`
- `cabinet`
- favorites
- saved searches
- database sessions через MySQL

## Важно

Этот пакет специально НЕ содержит `app/logout/route.ts` и `components/LogoutButton.tsx`.
Если они остались после Stage 34/35, их нужно удалить вручную, чтобы не было конфликтов.

## Как поставить

### 1. Backup

```powershell
Copy-Item -Recurse D:\Projects\zvg_frontend_mvp D:\Projects\zvg_frontend_mvp_backup_before_auth_rollback
```

### 2. Удалить файлы, которые могли сломать logout/auth

```powershell
Remove-Item -Recurse -Force .\app\logout -ErrorAction SilentlyContinue
Remove-Item -Force .\components\LogoutButton.tsx -ErrorAction SilentlyContinue
```

### 3. Скопировать файлы из архива поверх проекта

Скопируй папки:

```txt
app
components
lib
prisma
```

в:

```txt
D:\Projects\zvg_frontend_mvp
```

### 4. Обновить базу, если таблица Session отсутствует

```powershell
npm run db:push
```

Если таблица уже есть — команда просто подтвердит схему.

### 5. Проверить сборку

```powershell
npm run build
```

### 6. Отправить на GitHub

```powershell
git add .
git commit -m "Rollback auth to working database sessions"
git push
```

## Проверка после деплоя

1. Очисти cookies для `https://zvg-de.com`.
2. Войди через Google.
3. Открой:

```txt
https://zvg-de.com/api/auth/me
```

Должен быть пользователь, например:

```json
{"user":{"id":"...","email":"...","name":"...","role":"USER"}}
```

4. Проверь кабинет:

```txt
https://zvg-de.com/cabinet
```

5. Проверь избранное.

## Logout пока не чиним

После этого сначала убеждаемся, что login снова стабилен. Logout будем чинить отдельно одним файлом после того, как ты пришлёшь текущий `Header.tsx`.
