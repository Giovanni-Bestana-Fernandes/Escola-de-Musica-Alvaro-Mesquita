/**
 * Tela de matrícula: o botão "Quero me matricular" da landing abre esta página, que mostra o vídeo da escola
 * (post do Instagram) e só depois leva ao WhatsApp com a mensagem pronta pedindo horários e valores.
 */
import { createClient } from "@supabase/supabase-js";
import { ENROLL_VIDEO_POST, whatsappLink } from "@/lib/whatsapp";
import { ADDRESS_DEFAULT, mapsLink, parseAddress } from "@/lib/address";

export const dynamic = "force-dynamic";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const MARK = `<svg viewBox="0 0 100 110" width="34" height="37" aria-hidden="true"><defs><linearGradient id="bm" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="100" y2="110"><stop offset="0" stop-color="#fbecbf"/><stop offset=".3" stop-color="#ecc566"/><stop offset=".55" stop-color="#c08f2a"/><stop offset=".8" stop-color="#f5d98a"/><stop offset="1" stop-color="#9a7020"/></linearGradient></defs><path d="M50 104C38 92 8 58 6 32 4 12 26 4 50 4s46 8 44 28c-2 26-32 60-44 72Z" fill="none" stroke="url(#bm)" stroke-width="6"/><g stroke="url(#bm)" stroke-width="4" stroke-linecap="round"><line x1="32" y1="24" x2="40" y2="58"/><line x1="50" y1="18" x2="50" y2="58"/><line x1="68" y1="24" x2="60" y2="58"/></g><path d="M14 56c18 10 50 10 72-6" fill="none" stroke="url(#bm)" stroke-width="5" stroke-linecap="round"/></svg>`;

export async function GET() {
  let phone: string | null = null;
  let address: string | null = ADDRESS_DEFAULT;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key) {
    const db = createClient(url, key, { auth: { persistSession: false } });
    const { data } = await db.from("site_settings").select("whatsapp, address").eq("id", 1).maybeSingle();
    phone = data?.whatsapp ?? null;
    if (data) address = data.address;
  }
  const wa = whatsappLink(phone);
  const embed = `${ENROLL_VIDEO_POST}embed/`;
  const place = parseAddress(address);

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Matrícula: Espaço Musical Álvaro Mesquita</title>
<meta name="description" content="Veja como são as aulas do Espaço Musical Álvaro Mesquita e fale com a escola no WhatsApp para receber a tabela de horários e valores.">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#1b1712">
<link rel="icon" href="/icons/192" type="image/png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400..500&family=Hanken+Grotesk:wght@400..600&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box} html,body{margin:0}
  body{min-height:100svh;background:#1b1712;color:#f6f1e6;font:400 16px/1.6 "Hanken Grotesk",system-ui,sans-serif;-webkit-font-smoothing:antialiased}
  a{color:inherit}
  .top{display:flex;align-items:center;justify-content:space-between;gap:16px;width:min(100% - 48px,1100px);margin:0 auto;padding:20px 0}
  .logo{display:inline-flex;align-items:center;gap:10px;text-decoration:none;font:400 20px "Newsreader",Georgia,serif}
  .back{font-size:15px;color:#f6f1e6b3;text-decoration:none;padding:12px 4px}
  .back:hover{color:#f6f1e6}
  main{width:min(100% - 48px,1100px);margin:0 auto;padding:16px 0 56px;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,420px);gap:56px;align-items:center}
  .eyebrow{color:#c8952e;font-size:14px;font-weight:500;margin:0 0 12px}
  h1{font:400 clamp(34px,4.4vw,56px)/1.05 "Newsreader",Georgia,serif;letter-spacing:-.02em;margin:0 0 18px}
  .lead{font-size:18px;line-height:1.6;color:#f6f1e6d9;max-width:34em;margin:0 0 28px}
  ul{list-style:none;padding:0;margin:0 0 32px;display:grid;gap:10px}
  li{display:flex;gap:10px;align-items:baseline}
  li::before{content:"";flex:none;width:8px;height:8px;border-radius:50%;background:#c8952e;translate:0 -2px}
  .cta{display:inline-flex;align-items:center;gap:10px;min-height:52px;padding:0 26px;border-radius:10px;background:#c8952e;color:#111;font-weight:600;font-size:17px;text-decoration:none;transition:transform .18s,background .18s}
  .cta:hover{background:#d6a33b;transform:translateY(-1px)} .cta:active{transform:scale(.98)}
  .cta:focus-visible,.back:focus-visible,.alt:focus-visible{outline:2px solid #c8952e;outline-offset:3px}
  .note{font-size:14px;color:#f6f1e699;margin:14px 0 0}
  .where{display:flex;gap:10px;align-items:flex-start;margin:22px 0 0;padding-top:18px;border-top:1px solid #f6f1e626;font-size:15px;font-style:normal;color:#f6f1e6d9}
  .where svg{flex:none;margin-top:3px;color:#c8952e}
  .where a{color:#f6f1e6;text-underline-offset:3px}
  .where a:focus-visible{outline:2px solid #c8952e;outline-offset:3px}
  .video{background:#0f0d0b;border:1px solid #f6f1e626;border-radius:20px;overflow:hidden;box-shadow:0 30px 80px -40px #000}
  .video iframe{display:block;width:100%;height:min(760px,78svh);border:0;background:#fff}
  .alt{display:block;text-align:center;font-size:14px;color:#f6f1e6b3;padding:12px}
  @media (max-width:860px){main{grid-template-columns:1fr;gap:28px}.video{order:-1}.video iframe{height:min(640px,72svh)}.cta{width:100%;justify-content:center}}
  @media (prefers-reduced-motion:reduce){.cta{transition:none}.cta:hover{transform:none}}
</style>
</head>
<body>
<header class="top">
  <a class="logo" href="/">${MARK}<span>Álvaro Mesquita</span></a>
  <a class="back" href="/">Voltar ao site</a>
</header>
<main>
  <div>
    <p class="eyebrow">Matrícula</p>
    <h1>Antes de começar, veja como são as aulas</h1>
    <p class="lead">Aqui você não é só mais um aluno. Cada aula é pensada pra sua evolução, com atenção individual e foco no que você quer tocar, do iniciante ao avançado.</p>
    <ul>
      <li>Violão, guitarra, baixo, ukulele, canto e teclado</li>
      <li>Método prático e direto</li>
      <li>Ambiente preparado e acolhedor</li>
      <li>Prática de banda e sala de ensaio</li>
    </ul>
    <a class="cta" href="${esc(wa)}">Continuar para o WhatsApp
      <svg width="14" height="14" viewBox="0 0 12 12" aria-hidden="true"><path d="M1 6h8M4.5 2.5 8 6l-3.5 3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
    <p class="note">Poucos horários disponíveis. A mensagem já vai pronta, pedindo a tabela de horários e valores.</p>
    ${place ? `<address class="where"><svg width="16" height="20" viewBox="0 0 16 20" aria-hidden="true"><path d="M8 19s6-6.2 6-11A6 6 0 0 0 2 8c0 4.8 6 11 6 11Z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="8" cy="8" r="2.2" fill="currentColor"/></svg><span>Aulas presenciais na sede: <a href="${esc(mapsLink(place))}" target="_blank" rel="noopener">${esc(place.full)}</a></span></address>` : ""}
  </div>
  <div class="video">
    <iframe src="${esc(embed)}" title="Vídeo do Espaço Musical Álvaro Mesquita no Instagram" loading="eager" allowfullscreen allow="autoplay; encrypted-media; picture-in-picture; clipboard-write"></iframe>
    <a class="alt" href="${esc(ENROLL_VIDEO_POST)}" target="_blank" rel="noopener">O vídeo não abriu? Assistir no Instagram</a>
  </div>
</main>
</body>
</html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
