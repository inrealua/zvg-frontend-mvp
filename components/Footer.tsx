import Link from "next/link";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer design-footer">
      <div className="container footer-inner design-footer-inner">
        <div>
          <Link href="/" className="footer-brand">ZVG DE</Link>
          <p>
            Immobilienauktionen in Deutschland: klare Suche, Karte, strukturierte Objektinformationen
            und Verwaltungswerkzeuge für Zwangsversteigerungen.
          </p>
        </div>
        <nav className="footer-links" aria-label="Footer Navigation">
          <Link href="/">Immobilien finden</Link>
          <Link href="/map">Karte</Link>
          <Link href="/archive">Archiv</Link>
          <Link href="/ueber-uns">Über uns</Link>
          <Link href="/impressum">Impressum</Link>
          <Link href="/datenschutz">Datenschutz</Link>
        </nav>
        <p className="footer-copy">© {year} zvg-de.com. Alle Angaben ohne Gewähr.</p>
      </div>
    </footer>
  );
}
