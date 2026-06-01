# Stage 35 — стабильный Logout

Этот пакет НЕ меняет login/register/Google auth. Он меняет только logout.

## Файлы

- `app/api/auth/logout/route.ts`
- `app/logout/route.ts`
- `components/LogoutButton.tsx`

## Что исправляет

- `/logout` работает как прямой выход.
- `/api/auth/logout` работает через GET и POST.
- Удаляет sessionToken из таблицы `Session`.
- Очищает production cookie `__Host-zvg_session`.
- Очищает dev cookie `zvg_dev_session`.
- Очищает старую legacy cookie `zvg_user_session`.
- Добавляет no-cache headers.
- Redirect идёт на `/?logout=timestamp`, чтобы не было кэширования.

## Как поставить

1. Сделать backup:

```powershell
Copy-Item -Recurse D:\Projects\zvg_frontend_mvp D:\Projects\zvg_frontend_mvp_backup_stage35
```

2. Скопировать папки `app` и `components` поверх проекта.

3. Проверить:

```powershell
npm run build
npm run dev
```

4. Commit / push:

```powershell
git add .
git commit -m "Fix database session logout"
git push
```

## Как проверить на production

1. Войти пользователем.
2. Открыть:

```txt
https://zvg-de.com/api/auth/me
```

Должен быть user.

3. Открыть:

```txt
https://zvg-de.com/logout
```

4. После редиректа открыть:

```txt
https://zvg-de.com/api/auth/me
```

Должно быть:

```json
{"user":null}
```

## Если Header всё ещё не выходит

В `components/Header.tsx` замени кнопку/ссылку Abmelden на:

```tsx
<a href="/logout">Abmelden</a>
```

или используй:

```tsx
import { LogoutButton } from "@/components/LogoutButton";

<LogoutButton />
```
