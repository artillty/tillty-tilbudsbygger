import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "tillty Tilbudsbygger",
  description: "Internt salgsværktøj: sammensæt et tilbud og find det frem igen.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#142251",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="da">
      <head>
        {/* Brandfontene defineres ét sted: byggerens eget fonts.css. */}
        <link rel="stylesheet" href="/bygger/css/fonts.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
