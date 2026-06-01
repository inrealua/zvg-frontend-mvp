import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getCurrentUser } from "@/lib/user-auth";
import { SiteLogo } from "@/components/SiteLogo";

export async function Header() {
  noStore();
  const [isAdmin, currentUser] = await Promise.all([
    isAdminAuthenticated(),
    getCurrentUser()
  ]);

  return (
    <header className="site-header design-header">
      <div className="container header-inner design-header-inner">
        <SiteLogo variant="header" className="design-brand" />

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
