import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Über das Projekt",
  description: "Informationen zum ZVGScout MVP: Suche, Filter, Karte und Verwaltung von ZVG-Objekten."
};

export default function AboutPage() {
  return (
    <main className="static-page">
      <section className="container static-hero panel">
        <p className="eyebrow">Projekt</p>
        <h1>Über ZVGScout</h1>
        <p>
          ZVGScout ist ein MVP für die strukturierte Arbeit mit Immobilien aus deutschen
          Zwangsversteigerungen. Der aktuelle Fokus liegt auf Suche, Karte, Filtern,
          Favoriten, Import und administrativer Datenpflege.
        </p>
      </section>

      <section className="container static-content panel">
        <h2>Was das System aktuell kann</h2>
        <ul>
          <li>Objekte aus einer MySQL-Datenbank anzeigen.</li>
          <li>Nach Bundesland, Gericht, Stadt, Preis, Termin, Objektart und Karte filtern.</li>
          <li>Objekte auf OpenStreetMap darstellen.</li>
          <li>Favoriten und gespeicherte Suchen für registrierte Nutzer speichern.</li>
          <li>Objekte, Fotos und Dokumente im Adminbereich verwalten.</li>
          <li>JSON/CSV-Daten direkt in die Datenbank importieren.</li>
        </ul>

        <h2>Nächste Ausbaustufen</h2>
        <p>
          Später können Parser, automatische Datenaktualisierung, Marktanalyse,
          Risikobewertung und Benachrichtigungen ergänzt werden. Diese Funktionen sind
          im aktuellen MVP noch nicht enthalten.
        </p>
      </section>
    </main>
  );
}
