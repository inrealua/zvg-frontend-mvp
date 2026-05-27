import Link from "next/link";

export function Header() {
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
          <Link href="/admin">Admin</Link>
          <span className="nav-disabled">Кабинет позже</span>
        </nav>
      </div>
    </header>
  );
}
