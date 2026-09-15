import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Control | ZVG-DE",
  robots: { index: false, follow: false }
};

export default function AiLayout({ children }: { children: React.ReactNode }) {
  return children;
}
