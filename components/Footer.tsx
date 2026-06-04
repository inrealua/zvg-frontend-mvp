import Link from "next/link";
import { SiteLogo } from "@/components/SiteLogo";
import { getI18n } from "@/lib/i18n/server";

export async function Footer() {
  const year = new Date().getFullYear();
  const { t } = await getI18n();

  return (
    <footer className="site-footer design-footer">
      <div className="container footer-inner design-footer-inner">
        <div className="footer-brand-block">
          <SiteLogo variant="compact" className="footer-brand-logo" />
          <p>{t.footer.tagline}</p>
        </div>

        <nav className="footer-links" aria-label={t.footer.navigation}>
          <Link href="/">{t.footer.home}</Link>
          <Link href="/map">{t.footer.advancedSearch}</Link>
          <Link href="/archive">{t.footer.archive}</Link>
          <Link href="/ueber-uns">{t.footer.about}</Link>
          <Link href="/datenschutz">{t.footer.privacy}</Link>
        </nav>

        <p className="footer-copy">© {year} ZVG-DE. {t.footer.copyright}</p>
      </div>
    </footer>
  );
}
