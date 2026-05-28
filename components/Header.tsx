import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getCurrentUser } from "@/lib/user-auth";

export async function Header() {
  noStore();
  const [isAdmin, currentUser] = await Promise.all([
    isAdminAuthenticated(),
    getCurrentUser()
  ]);

  return (
    <header className="site-header design-header">
      <div className="container header-inner design-header-inner">
        <Link href="/" className="brand design-brand" aria-label="ZVG DE стартовая страница">
          <span className="brand-mark design-brand-mark" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" role="img">
              <path d="M3 10.5 12 3l9 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M5.5 9.5V21h13V9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M9.5 21v-6h5v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="brand-text-wrap">
            <strong>ZVG DE</strong>
            <small>Immobilienauktionen</small>
          </span>
        </Link>

        <nav className="main-nav design-nav" aria-label="Главная навигация">
          <Link href="/">Immobilien finden</Link>
          <Link href="/map">Karte</Link>
          <Link href="/archive">Archiv</Link>
          <Link href="/ueber-uns">Über uns</Link>
          <Link href="/datenschutz">Datenschutz</Link>

          {currentUser ? (
            <>
              <Link href="/cabinet" className="nav-icon-link">♡ Favoriten</Link>
              <Link href="/cabinet">Mein Konto</Link>
              <Link href="/logout" className="nav-cta nav-cta-secondary">Abmelden</Link>
            </>
          ) : (
            <>
              <Link href="/login">Anmelden</Link>
              <Link href="/register" className="nav-cta">Registrieren</Link>
            </>
          )}

          {isAdmin ? (
            <details className="admin-menu">
              <summary>Admin</summary>
              <div className="admin-menu-panel">
                <Link href="/admin/dashboard">Dashboard</Link>
                <Link href="/admin">Objekte</Link>
                <Link href="/admin/import">Import</Link>
                <Link href="/admin/quality">Quality</Link>
                <Link href="/admin/export">Export</Link>
                <Link href="/admin/duplicates">Duplicates</Link>
                <Link href="/admin/bulk">Bulk</Link>
              </div>
            </details>
          ) : (
            <Link href="/admin/login" className="admin-login-link">Admin</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
