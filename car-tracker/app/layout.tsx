import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Car Tracker",
  description: "Monitor car listings from sauto.cz and autobazar.eu",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
