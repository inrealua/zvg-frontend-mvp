import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE, getAdminPassword, getAdminSessionToken, isAdminAuthenticated } from "@/lib/admin-auth";

type LoginSearchParams = Promise<Record<string, string | string[] | undefined>>;

export const dynamic = "force-dynamic";

async function loginAdmin(formData: FormData) {
  "use server";

  const password = String(formData.get("password") || "");
  const nextValue = String(formData.get("next") || "/admin");
  const safeNext = nextValue.startsWith("/admin") && !nextValue.startsWith("/admin/login") ? nextValue : "/admin";

  if (password !== getAdminPassword()) {
    redirect(`/admin/login?error=1&next=${encodeURIComponent(safeNext)}`);
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, getAdminSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });

  redirect(safeNext);
}

export default async function AdminLoginPage({ searchParams }: { searchParams: LoginSearchParams }) {
  const params = await searchParams;
  const nextValue = typeof params.next === "string" ? params.next : "/admin";
  const hasError = params.error === "1";
  const loggedOut = params.loggedOut === "1";
  const isLoggedIn = await isAdminAuthenticated();

  if (isLoggedIn) {
    redirect("/admin");
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link href="/" className="brand auth-brand" aria-label="ZVGScout стартовая страница">
          <span className="brand-mark">Z</span>
          <span>
            ZVG<span>Scout</span>
          </span>
        </Link>

        <div className="auth-heading">
          <p className="hero-kicker">Admin login</p>
          <h1>Вход в админ-панель</h1>
          <p>Этот этап закрывает ручное управление объектами простым паролем администратора.</p>
        </div>

        {hasError && <div className="auth-alert error">Неверный пароль администратора.</div>}
        {loggedOut && <div className="auth-alert success">Вы вышли из админ-панели.</div>}

        <form action={loginAdmin} className="auth-form">
          <input type="hidden" name="next" value={nextValue} />
          <label>
            Пароль администратора
            <input name="password" type="password" required autoComplete="current-password" placeholder="Введите ADMIN_PASSWORD" />
          </label>
          <button className="btn btn-primary" type="submit">Войти</button>
        </form>

        <p className="auth-note">
          Для Vercel добавь переменные <b>ADMIN_PASSWORD</b> и <b>ADMIN_SESSION_TOKEN</b>. Для локальной проверки без переменных временный пароль: <b>admin12345</b>.
        </p>
      </section>
    </main>
  );
}
