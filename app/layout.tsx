import type { Metadata } from "next";
import { Header } from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZVGScout — судебные торги Германии",
  description: "Поиск объектов судебных торгов Германии: фильтры, карта, карточки объектов и данные из MySQL."
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
      </body>
    </html>
  );
}
