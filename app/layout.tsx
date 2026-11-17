import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SAFEPAI Lite — Check before you pay",
  description: "Get a clearer view of suspicious messages, websites, investment offers, and payment requests.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
