import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Datenschutz",
  description: "Datenschutzhinweise für ZVGScout MVP."
};

export default function DatenschutzPage() {
  const ownerEmail = process.env.SITE_OWNER_EMAIL || "Bitte E-Mail-Adresse eintragen";

  return (
    <main className="static-page">
      <section className="container static-hero panel">
        <p className="eyebrow">Rechtliches</p>
        <h1>Datenschutz</h1>
        <p>
          Diese Datenschutzhinweise sind eine technische MVP-Vorlage und müssen vor dem
          produktiven Einsatz rechtlich geprüft und an den tatsächlichen Betrieb angepasst werden.
        </p>
      </section>

      <section className="container static-content panel">
        <h2>1. Verantwortlicher</h2>
        <p>
          Verantwortlicher ist der im Impressum genannte Betreiber. Kontakt: {ownerEmail}.
        </p>

        <h2>2. Verarbeitete Daten</h2>
        <p>
          Im aktuellen MVP können insbesondere folgende Daten verarbeitet werden: Nutzerkonto,
          E-Mail-Adresse, gespeicherte Favoriten, gespeicherte Suchanfragen, Session-Cookies,
          technische Server-Logs und administrativ importierte Objektdaten.
        </p>

        <h2>3. Zweck der Verarbeitung</h2>
        <p>
          Die Daten werden verwendet, um die Plattform bereitzustellen, Nutzerkonten zu verwalten,
          Favoriten und gespeicherte Suchen zu ermöglichen und den sicheren Betrieb der Anwendung
          zu gewährleisten.
        </p>

        <h2>4. Cookies und Sessions</h2>
        <p>
          Für Login, Adminbereich und Nutzerfunktionen können technisch notwendige Cookies gesetzt
          werden. Diese Cookies dienen nicht dem Tracking, sondern der Authentifizierung und Sicherheit.
        </p>

        <h2>5. Datenbank und Hosting</h2>
        <p>
          Die Anwendung nutzt eine externe Datenbank und Hosting-Infrastruktur. Die konkreten Anbieter
          müssen hier ergänzt werden, sobald der produktive Betrieb final feststeht.
        </p>

        <h2>6. Rechte der betroffenen Personen</h2>
        <p>
          Betroffene Personen können Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung
          und weitere Rechte nach DSGVO geltend machen. Anfragen können an die oben genannte
          Kontaktadresse gerichtet werden.
        </p>
      </section>
    </main>
  );
}
