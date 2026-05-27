import Link from "next/link";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export async function Header() {
  const isAdmin = await isAdminAuthenticated();

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
          {isAdmin ? (
            <>
              <Link href="/admin">Admin</Link>
              <Link href="/admin/logout">Выйти</Link>
            </>
          ) : (
            <Link href="/admin/login">Admin login</Link>
          )}
          <span className="nav-disabled">Кабинет позже</span>
        </nav>
      </div>
    </header>
  );
}
