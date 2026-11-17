import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SAFEPAI Lite — Scam protection, made simple",
  description:
    "Review suspicious messages, payment requests, investment offers, URLs, and screenshots before you act.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
