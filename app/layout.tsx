import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZVG Frontend MVP",
  description: "MVP сайта для объектов судебных торгов Германии"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <header className="header">
          <div className="container header-inner">
            <Link href="/" className="logo">ZVG<span>Scout</span> MVP</Link>
            <nav className="nav">
              <Link href="/">Объекты</Link>
              <span>Карта</span>
              <span>Кабинет позже</span>
              <span>Admin позже</span>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
