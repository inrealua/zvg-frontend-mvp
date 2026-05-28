import type { Metadata, Viewport } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import "./globals.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ZVG DE — Immobilienauktionen in Deutschland",
    template: "%s | ZVG DE"
  },
  description:
    "ZVG DE hilft beim Finden von Immobilien aus Zwangsversteigerungen in Deutschland: Karte, Filter, Objektkarten, Favoriten und strukturierte Informationen.",
  applicationName: "ZVG DE",
  keywords: [
    "ZVG",
    "Zwangsversteigerung",
    "Immobilienauktionen",
    "Gerichtsauktionen",
    "Versteigerung",
    "Deutschland"
  ],
  authors: [{ name: "ZVG DE" }],
  creator: "ZVG DE",
  publisher: "ZVG DE",
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: siteUrl,
    siteName: "ZVG DE",
    title: "ZVG DE — Immobilienauktionen in Deutschland",
    description:
      "Transparente Suche nach Immobilien aus Zwangsversteigerungen: Filter, Karte und Objektinformationen auf einen Blick."
  },
  twitter: {
    card: "summary_large_image",
    title: "ZVG DE — Immobilienauktionen in Deutschland",
    description: "Immobilien aus Zwangsversteigerungen nach Karte, Gericht, Region, Preis und Termin finden."
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1
    }
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2f5e4e"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <head>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      </head>
      <body>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
