import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LeadForge — B2B Lead Generation Platform",
  description: "Discover, enrich, score, and contact B2B leads with intelligent automation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
