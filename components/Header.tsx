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
          <span className="nav-disabled">Кабинет позже</span>
          <span className="nav-disabled">Admin позже</span>
        </nav>
      </div>
    </header>
  );
}
