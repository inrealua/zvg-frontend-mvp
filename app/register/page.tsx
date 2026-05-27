import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getSafeNextUrl } from "@/lib/user-auth";

type RegisterPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

function getSingle(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  const currentUser = await getCurrentUser();
  const nextUrl = getSafeNextUrl(getSingle(params.next), "/cabinet");
  const error = getSingle(params.error);

  if (currentUser) redirect(nextUrl);

  return (
    <main className="auth-page">
      <section className="auth-card panel">
        <p className="eyebrow">ZVGScout Konto</p>
        <h1>Регистрация</h1>
        <p className="meta">Создайте аккаунт для избранного и сохранённых поисков.</p>

        {error ? (
          <div className="warning-box compact">
            {error === "exists" ? "Пользователь с таким email уже существует." : "Проверьте email и пароль. Пароль минимум 8 символов."}
          </div>
        ) : null}

        <form className="auth-form" action="/api/auth/register" method="post">
          <input type="hidden" name="next" value={nextUrl} />
          <label>
            Имя
            <input name="name" type="text" autoComplete="name" />
          </label>
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Пароль
            <input name="password" type="password" autoComplete="new-password" minLength={8} required />
          </label>
          <button className="btn btn-primary" type="submit">Создать аккаунт</button>
        </form>

        <p className="auth-switch">
          Уже есть аккаунт? <Link href={`/login?next=${encodeURIComponent(nextUrl)}`}>Войти</Link>
        </p>
      </section>
    </main>
  );
}
