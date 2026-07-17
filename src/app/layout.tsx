import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Blockticket",
  description: "Reservas e ingressos para parques e atrações",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
