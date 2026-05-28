import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getSafeNextUrl } from "@/lib/user-auth";
import { GoogleLoginButton } from "@/components/GoogleLoginButton";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

function getSingle(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const currentUser = await getCurrentUser();
  const nextUrl = getSafeNextUrl(getSingle(params.next), "/cabinet");
  const error = getSingle(params.error);

  if (currentUser) redirect(nextUrl);

  return (
    <main className="auth-page">
      <section className="auth-card panel">
        <p className="eyebrow">ZVGScout Konto</p>
        <h1>Вход в кабинет</h1>
        <p className="meta">Войдите, чтобы сохранять избранные объекты и поисковые фильтры.</p>

        {error ? (
          <div className="warning-box compact">
            {error === "invalid" ? "Неверный email или пароль." : "Заполните email и пароль."}
          </div>
        ) : null}

        <form className="auth-form" action="/api/auth/login" method="post">
          <input type="hidden" name="next" value={nextUrl} />
          <GoogleLoginButton next="/cabinet" />
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Пароль
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          <button className="btn btn-primary" type="submit">Войти</button>
        </form>

        <p className="auth-switch">
          Нет аккаунта? <Link href={`/register?next=${encodeURIComponent(nextUrl)}`}>Зарегистрироваться</Link>
        </p>
      </section>
    </main>
  );
}
