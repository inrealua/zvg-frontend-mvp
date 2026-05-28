# Stage 31 — Google Login + production cookie fix

## Что добавлено

- `/api/auth/google` — старт Google OAuth.
- `/api/auth/google/callback` — callback Google OAuth.
- `/api/auth/me` — более надёжное чтение `zvg_user_session`.
- `/api/auth/logout` — корректное удаление пользовательской cookie.
- `components/GoogleLoginButton.tsx` — кнопка Google login.
- `lib/session-cookie.ts` — единый helper для cookie.

## Важное

Этот пакет не использует NextAuth/Auth.js, чтобы не менять схему базы и не добавлять таблицы Adapter. Он использует Google OAuth напрямую и сохраняет пользователя в существующую таблицу `User`.

## Переменные Vercel

Добавить в Vercel → Settings → Environment Variables → All Environments:

```env
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
NEXT_PUBLIC_SITE_URL="https://zvg-frontend-mvp.vercel.app"
USER_SESSION_SECRET="..."
```

После привязки домена поменять:

```env
NEXT_PUBLIC_SITE_URL="https://zvg-de.com"
```

## Google Cloud OAuth redirect URI

В Google Cloud Console → APIs & Services → Credentials → OAuth Client:

Authorized JavaScript origins:

```txt
https://zvg-frontend-mvp.vercel.app
https://zvg-de.com
```

Authorized redirect URIs:

```txt
https://zvg-frontend-mvp.vercel.app/api/auth/google/callback
https://zvg-de.com/api/auth/google/callback
```

## Как подключить кнопку на странице login

В `app/login/page.tsx` добавь импорт:

```ts
import { GoogleLoginButton } from "@/components/GoogleLoginButton";
```

И вставь в форму входа, например перед email/password формой:

```tsx
<GoogleLoginButton next="/cabinet" />
```

Если в файле уже есть `next` из searchParams, можно передать его.

## Проверка

1. `npm run build`
2. `git add .`
3. `git commit -m "Add Google login and fix production auth cookie"`
4. `git push`
5. Redeploy на Vercel.
6. Открыть `/login` и нажать `Mit Google anmelden`.
7. Проверить `/api/auth/me`.

Должно вернуть пользователя, а не `{ "user": null }`.
