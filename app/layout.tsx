import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QUIZ-PROTO-2025 | Randers Kommune",
  description: "Officiel protokol for videns-verifikation og underholdningsformål",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="da">
      <body className="font-bureau paper-texture">{children}</body>
    </html>
  );
}
