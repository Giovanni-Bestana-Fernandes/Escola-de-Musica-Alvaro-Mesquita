const GOLD = "linear-gradient(135deg,#fbecbf,#ecc566 25%,#c08f2a 50%,#f5d98a 75%,#9a7020)";

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        textAlign: "center",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/192" alt="" width={80} height={80} />
      <h1
        style={{
          margin: "24px 0 8px",
          font: "400 32px Georgia, serif",
          background: GOLD,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        Página não encontrada
      </h1>
      <p style={{ margin: 0, color: "#a99f8a" }}>Essa nota saiu do tom... 🎵</p>
      {/* "/" é um route handler (HTML puro), não uma página React: precisa de navegação completa */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a
        href="/"
        style={{
          marginTop: 24,
          padding: "12px 22px",
          borderRadius: 10,
          background: GOLD,
          color: "#0c0a08",
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        Voltar ao início
      </a>
    </main>
  );
}
