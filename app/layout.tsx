import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gridiron GM — Autonomous Fantasy Football General Manager",
  description:
    "A 24/7 autonomous fantasy football GM for Sleeper leagues: sportsbook-driven projections, automatic trades, waiver claims, lineup optimisation and championship-probability optimisation.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
