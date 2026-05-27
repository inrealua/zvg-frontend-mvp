import Link from "next/link";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getCurrentUser } from "@/lib/user-auth";

export async function Header() {
  const [isAdmin, currentUser] = await Promise.all([
    isAdminAuthenticated(),
    getCurrentUser()
  ]);

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="brand" aria-label="ZVGScout стартовая страница">
          <span className="brand-mark">Z</span>
          <span>
            ZVG<span>Scout</span>
          </span>
        </Link>
        <nav className="main-nav" aria-label="Главная навигация">
          <Link href="/">Объекты</Link>
          <a href="/#map">Карта</a>
          <Link href="/ueber-uns">О проекте</Link>
          {currentUser ? (
            <>
              <Link href="/cabinet">Кабинет</Link>
              <Link href="/logout">Выйти</Link>
            </>
          ) : (
            <>
              <Link href="/login">Войти</Link>
              <Link href="/register">Регистрация</Link>
            </>
          )}
          {isAdmin ? (
            <>
              <Link href="/admin/dashboard">Dashboard</Link>
              <Link href="/admin/quality">Quality</Link>
              <Link href="/admin/export">Export</Link>
              <Link href="/admin/duplicates">Duplicates</Link>
              <Link href="/admin/bulk">Bulk</Link>
              <Link href="/admin">Admin</Link>
              <Link href="/admin/import">Import</Link>
            </>
          ) : <Link href="/admin/login">Admin</Link>}
        </nav>
      </div>
    </header>
  );
}
