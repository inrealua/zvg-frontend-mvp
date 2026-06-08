import { HeaderMobileI18nStage92 } from "@/components/HeaderMobileI18nStage92";
import { TargetedPolishStage90 } from "@/components/TargetedPolishStage90";
import { TargetedSearchEnhancerStage89 } from "@/components/TargetedSearchEnhancerStage89";
import { RuntimeUiCleanup } from "@/components/RuntimeUiCleanup";
import { FilterMiniApplyEnhancer } from "@/components/FilterMiniApplyEnhancer";
import { BackToTopButton } from "@/components/BackToTopButton";
import { LanguageRuntimeFix } from "@/components/LanguageRuntimeFix";
import { getLocale } from "@/lib/i18n/server";
import type { Metadata, Viewport } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import "./globals.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "ZVG-DE — Gerichtliche Immobilienauktionen", template: "%s | ZVG-DE" },
  description: "ZVG-DE bündelt gerichtliche Immobilienauktionen in Deutschland: Suche, Karte, Filter, Favoriten und strukturierte Objektinformationen.",
  applicationName: "ZVG-DE",
  keywords: ["ZVG", "Zwangsversteigerung", "Immobilienauktionen", "Gerichtsauktionen", "Versteigerung", "Deutschland"],
  authors: [{ name: "ZVG-DE" }],
  creator: "ZVG-DE",
  publisher: "ZVG-DE",
  openGraph: {
    type: "website", locale: "de_DE", url: siteUrl, siteName: "ZVG-DE",
    title: "ZVG-DE — Gerichtliche Immobilienauktionen",
    description: "Alle gerichtlichen Immobilienauktionen an einem Ort: Suche, Karte, Filter und Objektinformationen."
  },
  twitter: {
    card: "summary_large_image",
    title: "ZVG-DE — Gerichtliche Immobilienauktionen",
    description: "Immobilien aus gerichtlichen Versteigerungen nach Karte, Gericht, Region, Preis und Termin finden."
  },
  robots: {
    index: true, follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 }
  }
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#2f5e4e" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();

  return (
    <html lang={locale}>
      <head>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body>
<HeaderMobileI18nStage92 />
        <TargetedPolishStage90 />
        <TargetedSearchEnhancerStage89 />
<RuntimeUiCleanup />
        <Header />
        {children}
        <Footer />
              <LanguageRuntimeFix />
              <BackToTopButton />
              <FilterMiniApplyEnhancer />
      </body>
    </html>
  );
}
