/** Créditos das fotos do site (a linha "Fotos via Wikimedia Commons" do rodapé abre esta página). */
import { PHOTO_CREDITS } from "@/lib/site-credits";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function GET() {
  const items = PHOTO_CREDITS.map(
    (c) => `<li><a class="link" href="${esc(c.page)}">${esc(c.by)}</a> <span class="muted">(${esc(c.licence)})</span></li>`,
  ).join("");
  const html = `<!doctype html>
<html lang="pt-BR" data-type="service" data-radius="soft" data-buttons="arrow" data-motion>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Créditos das fotos: Espaço Musical Álvaro Mesquita</title>
<meta name="description" content="Autores e licenças das fotos usadas no site do Espaço Musical Álvaro Mesquita.">
<meta name="robots" content="noindex">
<link rel="icon" href="/icons/192" type="image/png">
<link href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400..700&family=Hanken+Grotesk:wght@400..600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/system.css">
<style>
:root { --p-bg:#0c0a08; --p-surface:#16130f; --p-ink:#f4ead2; --p-muted:#a99f8a; --p-accent:#d9a83e; --p-accent-ink:#0c0a08; --p-action:#d9a83e; --p-action-ink:#0c0a08;
  --font-display:"Newsreader",Georgia,serif; --font-text:"Hanken Grotesk",system-ui,sans-serif; --display-weight:400; --display-tracking:-0.018em; }
main { padding: 96px 0; }
ul { list-style: none; padding: 0; display: grid; gap: 12px; margin-top: 32px; }
</style>
</head>
<body>
<main><div class="wrap">
  <p><a class="link" href="/">Voltar ao site</a></p>
  <h1 style="margin-top:32px">Créditos das fotos</h1>
  <p class="muted">Fotos do Wikimedia Commons, usadas conforme as licenças abaixo.</p>
  <ul>${items}</ul>
</div></main>
</body>
</html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
