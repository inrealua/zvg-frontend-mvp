# Stage 34 — Fix logout

Этот пакет чинит выход пользователя:

- `/api/auth/logout` поддерживает GET и POST;
- `/logout` тоже поддерживает GET и POST;
- удаляет sessionToken из таблицы `Session`;
- очищает `__Host-zvg_session`;
- очищает `zvg_dev_session` для localhost;
- очищает старую `zvg_user_session`;
- добавляет компонент `LogoutButton` для client-side logout.

## Установка

1. Сделай backup:

```powershell
Copy-Item -Recurse D:\Projects\zvg_frontend_mvp D:\Projects\zvg_frontend_mvp_backup_stage34
```

2. Скопируй папки `app` и `components` поверх проекта.

3. Проверь:

```powershell
npm run build
npm run dev
```

4. Если Header сейчас ведёт на другой адрес, поставь ссылку выхода на:

```tsx
<a href="/logout">Abmelden</a>
```

или используй компонент:

```tsx
import { LogoutButton } from "@/components/LogoutButton";

<LogoutButton />
```

5. Деплой:

```powershell
git add .
git commit -m "Fix user logout"
git push
```

## Проверка

После деплоя:

1. Войди через Google.
2. Открой `/api/auth/me` — должен быть user.
3. Открой `/logout` напрямую.
4. Снова открой `/api/auth/me` — должен быть `{ "user": null }`.
