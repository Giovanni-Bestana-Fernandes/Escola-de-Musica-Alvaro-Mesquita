import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, Newsreader } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import "./globals.css";

const hanken = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-hanken", weight: ["400", "500", "600"] });
const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-newsreader", weight: ["400", "500"], style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: { default: "Espaço Musical Álvaro Mesquita", template: "%s · Espaço Musical Álvaro Mesquita" },
  description:
    "Formando músicos para a vida. Aulas de guitarra, violão, baixo, teclado, ukulelê e canto, presenciais e online.",
  applicationName: "Álvaro Mesquita",
  appleWebApp: { capable: true, title: "Álvaro Mesquita", statusBarStyle: "black-translucent" },
  icons: { icon: "/icons/192", apple: "/icons/192" },
};

export const viewport: Viewport = {
  themeColor: "#0c0a08",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${hanken.variable} ${newsreader.variable}`}>
      <body className="min-h-dvh">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
