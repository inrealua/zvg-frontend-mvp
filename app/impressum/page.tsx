import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Impressum",
  description: "Impressum und Anbieterkennzeichnung für ZVGScout."
};

export default function ImpressumPage() {
  const ownerName = process.env.SITE_OWNER_NAME || "Bitte Betreibername eintragen";
  const ownerAddress = process.env.SITE_OWNER_ADDRESS || "Bitte vollständige Anschrift eintragen";
  const ownerEmail = process.env.SITE_OWNER_EMAIL || "Bitte E-Mail-Adresse eintragen";

  return (
    <main className="static-page">
      <section className="container static-hero panel">
        <p className="eyebrow">Rechtliches</p>
        <h1>Impressum</h1>
        <p>
          Diese Seite enthält die Anbieterkennzeichnung. Bitte vor Veröffentlichung mit den
          echten Betreiberangaben ersetzen und rechtlich prüfen lassen.
        </p>
      </section>

      <section className="container static-content panel">
        <h2>Angaben gemäß § 5 TMG / DDG</h2>
        <p>
          <strong>{ownerName}</strong><br />
          {ownerAddress}
        </p>

        <h2>Kontakt</h2>
        <p>E-Mail: {ownerEmail}</p>

        <h2>Haftung für Inhalte</h2>
        <p>
          Die Inhalte dieses MVP wurden mit größter Sorgfalt erstellt. Für die Richtigkeit,
          Vollständigkeit und Aktualität der Inhalte kann jedoch keine Gewähr übernommen werden.
          Immobilien- und Versteigerungsdaten müssen vor Entscheidungen immer anhand der
          amtlichen Quellen und Dokumente geprüft werden.
        </p>

        <h2>Haftung für Links</h2>
        <p>
          Diese Website kann Links zu externen Websites enthalten. Auf deren Inhalte besteht
          kein Einfluss. Für externe Inhalte sind ausschließlich die jeweiligen Anbieter verantwortlich.
        </p>
      </section>
    </main>
  );
}
