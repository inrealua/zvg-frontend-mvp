import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getCurrentUser } from "@/lib/user-auth";
import { SiteLogo } from "@/components/SiteLogo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getI18n } from "@/lib/i18n/server";

export async function Header() {
  noStore();
  const [{ isAdmin, currentUser }, { locale, t }] = await Promise.all([
    Promise.all([isAdminAuthenticated(), getCurrentUser()]).then(([isAdmin, currentUser]) => ({ isAdmin, currentUser })),
    getI18n()
  ]);

  return (
    <header className="site-header design-header">
      <div className="container header-inner design-header-inner">
        <SiteLogo variant="header" className="design-brand" />

        <nav className="main-nav design-nav" aria-label={t.nav.aria}>
          <Link href="/">{t.nav.home}</Link>
          <Link href="/map">{t.nav.advancedSearch}</Link>
          <Link href="/archive">{t.nav.archive}</Link>

          {currentUser ? (
            <>
              <Link href="/cabinet">{t.nav.account}</Link>
              <Link href="/logout" className="nav-cta nav-cta-secondary">{t.nav.logout}</Link>
            </>
          ) : (
            <>
              <Link href="/login">{t.nav.login}</Link>
              <Link href="/register" className="nav-cta">{t.nav.register}</Link>
            </>
          )}

          {isAdmin ? (
            <details className="admin-menu">
              <summary>{t.nav.admin}</summary>
              <div className="admin-menu-panel">
                <Link href="/admin/dashboard">{t.nav.dashboard}</Link>
                <Link href="/admin">{t.nav.objects}</Link>
                <Link href="/admin/import">{t.nav.import}</Link>
                <Link href="/admin/quality">{t.nav.quality}</Link>
                <Link href="/admin/export">{t.nav.export}</Link>
                <Link href="/admin/duplicates">{t.nav.duplicates}</Link>
                <Link href="/admin/bulk">{t.nav.bulk}</Link>
              </div>
            </details>
          ) : null}

          <LanguageSwitcher locale={locale} labels={t.locale} />
        </nav>
      </div>
    </header>
  );
}
