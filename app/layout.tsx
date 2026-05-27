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
    default: "ZVGScout — судебные торги Германии",
    template: "%s | ZVGScout"
  },
  description:
    "Поиск объектов судебных торгов Германии: фильтры, карта, карточки объектов, избранное, импорт и администрирование.",
  applicationName: "ZVGScout",
  keywords: [
    "ZVG",
    "Zwangsversteigerung",
    "Immobilien",
    "Gerichtsauktion",
    "Versteigerung",
    "Deutschland"
  ],
  authors: [{ name: "ZVGScout" }],
  creator: "ZVGScout",
  publisher: "ZVGScout",
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: siteUrl,
    siteName: "ZVGScout",
    title: "ZVGScout — судебные торги Германии",
    description:
      "Карта, фильтры и карточки объектов судебных торгов Германии на базе Next.js и MySQL."
  },
  twitter: {
    card: "summary_large_image",
    title: "ZVGScout — судебные торги Германии",
    description: "Поиск ZVG-объектов по карте, фильтрам, суду, региону, цене и дате торгов."
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
  themeColor: "#0f172a"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
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
