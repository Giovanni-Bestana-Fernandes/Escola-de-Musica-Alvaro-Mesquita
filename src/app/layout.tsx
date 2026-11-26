import type { Metadata, Viewport } from "next";

// O site é servido como HTML puro (src/app/route.ts, /matricula e /creditos). Este layout só envolve a página 404.
export const metadata: Metadata = {
  title: { default: "Espaço Musical Álvaro Mesquita", template: "%s · Espaço Musical Álvaro Mesquita" },
  description:
    "Formando músicos para a vida. Aulas de guitarra, violão, baixo, teclado, ukulelê e canto, presenciais e online.",
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
    <html lang="pt-BR">
      <body style={{ margin: 0, background: "#0c0a08", color: "#f4ead2", fontFamily: "system-ui, sans-serif" }}>{children}</body>
    </html>
  );
}
