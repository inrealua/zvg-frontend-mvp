# Stage 24 — точечный фикс пользовательской сессии в production

Исправляет чтение cookie `zvg_user_session` в `/api/auth/me` и других server/API местах.

Файлы:
- lib/user-auth.ts
- app/api/auth/me/route.ts
- app/api/auth/login/route.ts

После установки обязательно:
1. npm run build
2. git add .
3. git commit -m "Fix production user auth cookie reading"
4. git push
5. На Vercel дождаться деплоя
6. Выйти на сайте, удалить старую `zvg_user_session`, войти снова
7. Проверить /api/auth/me
