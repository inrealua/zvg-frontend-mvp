# Stage 32 — полная перестройка пользовательской авторизации

Этот пакет заменяет старую пользовательскую авторизацию на стабильную схему сессий в базе данных.

## Что меняется

- старая пользовательская cookie `zvg_user_session` больше не используется;
- новая production-cookie: `__Host-zvg_session`;
- локальная dev-cookie: `zvg_dev_session`;
- сессия хранится в MySQL в новой таблице `Session`;
- Google login, email login, register, logout, `/api/auth/me`, favorites и saved searches читают пользователя одним способом;
- `USER_SESSION_SECRET` больше не нужен для пользовательской авторизации;
- админскую авторизацию пакет не трогает.

## Файлы в пакете

```txt
prisma/schema.prisma
lib/user-auth.ts
lib/session-cookie.ts
app/api/auth/login/route.ts
app/api/auth/register/route.ts
app/api/auth/logout/route.ts
app/api/auth/me/route.ts
app/api/auth/google/route.ts
app/api/auth/google/callback/route.ts
app/api/favorites/[propertyId]/route.ts
app/api/saved-searches/route.ts
app/api/saved-searches/[id]/route.ts
components/FavoriteButton.tsx
components/DeleteFavoriteButton.tsx
components/SaveSearchButton.tsx
```

## Установка

### 1. Backup

```powershell
Copy-Item -Recurse D:\Projects\zvg_frontend_mvp D:\Projects\zvg_frontend_mvp_backup_stage32
```

### 2. Распакуй архив

Распакуй `zvg_stage32_database_sessions_auth_rebuild.zip`.

### 3. Скопируй поверх проекта

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

### 4. Обнови базу данных

Пакет добавляет таблицу `Session`, поэтому нужно выполнить:

```powershell
npm run db:push
```

### 5. Проверь сборку

```powershell
npm run build
```

### 6. Проверь локально

```powershell
npm run dev
```

Проверь:

```txt
http://localhost:3000/login
http://localhost:3000/register
http://localhost:3000/cabinet
http://localhost:3000/api/auth/me
```

### 7. Отправь на GitHub

```powershell
git add .
git commit -m "Rebuild user auth with database sessions"
git push
```

### 8. Vercel variables

В Vercel оставь/проверь:

```txt
DATABASE_URL
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
NEXT_PUBLIC_SITE_URL=https://zvg-de.com
```

`USER_SESSION_SECRET` для пользовательского логина больше не нужен, но можешь пока не удалять.

### 9. Google Console

В Google OAuth Client должны быть:

Authorized JavaScript origins:

```txt
https://zvg-de.com
```

Authorized redirect URIs:

```txt
https://zvg-de.com/api/auth/google/callback
```

Если временно тестируешь старый Vercel-домен, добавь также:

```txt
https://zvg-frontend-mvp.vercel.app
https://zvg-frontend-mvp.vercel.app/api/auth/google/callback
```

## Проверка на production

После деплоя:

1. Удали старые cookie сайта.
2. Войди через Google.
3. Открой `https://zvg-de.com/api/auth/me`.
4. Должен вернуться user, а не `null`.
5. Добавь объект в избранное.
6. Проверь кабинет.

В браузере в Application → Cookies должна появиться cookie:

```txt
__Host-zvg_session
```

Она должна быть на домене `zvg-de.com`, с `Path=/`, `Secure=true`, `HttpOnly=true`, `SameSite=Lax`.
