import Link from "next/link";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div>
          <Link href="/" className="footer-brand">ZVGScout</Link>
          <p>
            MVP-Plattform für Zwangsversteigerungsobjekte in Deutschland: Suche, Karte,
            Filter, Favoriten und Verwaltungswerkzeuge.
          </p>
        </div>
        <nav className="footer-links" aria-label="Footer Navigation">
          <Link href="/">Objekte</Link>
          <Link href="/ueber-uns">Über das Projekt</Link>
          <Link href="/impressum">Impressum</Link>
          <Link href="/datenschutz">Datenschutz</Link>
        </nav>
        <p className="footer-copy">© {year} ZVGScout MVP. Alle Angaben ohne Gewähr.</p>
      </div>
    </footer>
  );
}
