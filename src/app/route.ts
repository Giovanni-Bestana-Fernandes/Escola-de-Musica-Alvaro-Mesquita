/**
 * Página pública (site da escola) servida como HTML puro, no padrão do kit design-taste-frontend
 * (public/assets: system.css, motion, layout, moments) + a sala de ensaio com luzes e o cabo que liga as seções
 * (public/landing/stage.js), o carrossel de cursos (public/landing/instruments.js) e as formas musicais de cada
 * seção (public/landing/forms.js).
 * Fica fora do Tailwind da área logada para os dois sistemas visuais não se misturarem.
 * Os textos editáveis vêm do Supabase (Administração → Página inicial).
 *
 * type: service · site-kind other
 * deal: hero sobre a foto da sala de ensaio (luzes e poeira animadas), carrossel colorido por instrumento,
 *       seções com borda rasgada ligadas por um cabo de guitarra (pedidos do cliente),
 *       nav-split, footer-visit, close-type, rhythm surface-pairs, buttons arrow, mark: emblema da logo
 * palette: cores da logo (preto + dourado) via start.mjs brand · type: Newsreader / Hanken Grotesk
 * moments: pinned-chapters (#aulas), picture-develops (#festivais)
 */
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

interface Settings {
  school_name: string;
  tagline: string | null;
  address: string | null;
  whatsapp: string | null;
  instagram: string | null;
  email: string | null;
}
interface Section {
  slug: string;
  title: string;
  body: string;
  visible: boolean;
}
interface Instrument {
  id: number;
  name: string;
  slug: string;
  description: string | null;
}
interface Teacher {
  id: string;
  full_name: string;
  bio: string | null;
  role: string;
  instruments: string[];
}

// ---------------------------------------------------------------- helpers
const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** Markdown mínimo (parágrafos, **negrito**, *itálico*) com escape. Ignora notas de edição "(Edite ...)". */
function md(src: string) {
  return src
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p && !/^\*?\(edite/i.test(p))
    .map(
      (p) =>
        `<p>${esc(p)
          .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
          .replace(/\*(.+?)\*/g, "<em>$1</em>")
          .replace(/\n/g, "<br>")}</p>`,
    )
    .join("");
}

const listPt = (a: string[]) => (a.length < 2 ? a.join("") : `${a.slice(0, -1).join(", ")} e ${a[a.length - 1]}`);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Rua e bairro, sem número nem CEP. */
function street(address: string | null) {
  if (!address) return null;
  return address
    .replace(/\(.*?\)/g, "")
    .replace(/,?\s*\d{5}-?\d{3}/g, "")
    .replace(/,\s*\d+[a-zA-Z]?\b/g, "")
    .replace(/\s+-\s+/g, ", ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

const ARROW =
  '<svg class="m-arrow" viewBox="0 0 12 12" aria-hidden="true"><path class="m-arrow__stem" d="M1 6h8"/><path class="m-arrow__head" d="M4.5 2.5 8 6l-3.5 3.5"/></svg>';

/** Emblema dourado da escola (palheta com guitarras e onda sonora), como na logo. */
const MARK = `<svg class="brand-mark" viewBox="0 0 100 110" aria-hidden="true"><defs><linearGradient id="bm" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="100" y2="110"><stop offset="0" stop-color="#fbecbf"/><stop offset=".3" stop-color="#ecc566"/><stop offset=".55" stop-color="#c08f2a"/><stop offset=".8" stop-color="#f5d98a"/><stop offset="1" stop-color="#9a7020"/></linearGradient></defs><path d="M50 104C38 92 8 58 6 32 4 12 26 4 50 4s46 8 44 28c-2 26-32 60-44 72Z" fill="none" stroke="url(#bm)" stroke-width="6"/><g stroke="url(#bm)" stroke-width="4" stroke-linecap="round"><line x1="32" y1="24" x2="40" y2="58"/><line x1="50" y1="18" x2="50" y2="58"/><line x1="68" y1="24" x2="60" y2="58"/></g><path d="M14 56c18 10 50 10 72-6" fill="none" stroke="url(#bm)" stroke-width="5" stroke-linecap="round"/><g fill="url(#bm)"><rect x="36" y="74" width="4" height="6" rx="2"/><rect x="42" y="70" width="4" height="14" rx="2"/><rect x="48" y="66" width="4" height="22" rx="2"/><rect x="54" y="70" width="4" height="14" rx="2"/><rect x="60" y="74" width="4" height="6" rx="2"/></g></svg>`;

// Fotos substitutas (Wikimedia Commons) até a escola enviar as próprias. Ver README, "Fotos".
interface Photo {
  id: string;
  w: number;
  h: number;
  alt: string;
}
const PHOTO: Record<string, Photo> = {
  guitarra: { id: "f196893593", w: 1280, h: 853, alt: "Partitura apoiada sobre uma guitarra elétrica sunburst, ao lado do captador" },
  violao: { id: "f93045510", w: 1280, h: 719, alt: "Mãos tocando um violão, com a mão esquerda no braço" },
  baixo: { id: "f175224612", w: 1280, h: 853, alt: "Mãos tocando um contrabaixo elétrico de madeira" },
  teclado: { id: "f17114225", w: 1280, h: 848, alt: "Mãos sobre as teclas de um piano em luz quente" },
  ukulele: { id: "f1557609", w: 1280, h: 962, alt: "Mãos tocando um ukulelê" },
  canto: { id: "f186065728", w: 1280, h: 1910, alt: "Microfone de estúdio montado num pedestal" },
  sede: { id: "f191180461", w: 1280, h: 853, alt: "Sala de ensaio com microfone sobre a bateria" },
  online: { id: "f189822850", w: 1280, h: 1920, alt: "Aluno tocando violão em casa diante de um notebook aberto" },
  materiais: { id: "f27422285", w: 1280, h: 853, alt: "Braço de um violão com os trastes e as cordas de perto" },
  festival: { id: "f190017875", w: 1280, h: 853, alt: "Banda tocando num palco ao ar livre à noite, sob as luzes" },
  professores: { id: "f32699013", w: 1280, h: 853, alt: "Cordas de um violão de perto, em fundo escuro" },
  sala: { id: "f186065725", w: 1280, h: 853, alt: "Bateria e pratos numa sala de música com piso de madeira" },
};

function img(p: Photo, { sizes = "(max-width: 1023px) 100vw, 50vw", cls = "frame__img", eager = false, attrs = "" } = {}) {
  const base = `assets/img/photo-${p.id}`;
  return `<img class="${cls}" src="${base}.webp" srcset="${base}-500.webp 500w, ${base}-960.webp 960w, ${base}.webp 1280w" sizes="${sizes}" width="${p.w}" height="${p.h}" alt="${esc(p.alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" data-source="stand-in" data-subject="${esc(p.alt)}"${attrs ? " " + attrs : ""}>`;
}

const CREDITS_SOURCES = "Fotos via Wikimedia Commons";

// Carrossel de cursos: cada instrumento tem a sua cor e o seu recorte (public/landing/img, de scripts/fetch-instruments.mjs).
// "wide" = instrumento deitado (teclado): fica inclinado na faixa estreita e deitado no painel aberto.
interface Cut {
  color: string;
  ink: string;
  w: number;
  h: number;
  alt: string;
  wide?: boolean;
}
const CUT: Record<string, Cut> = {
  violao: { color: "#d9861a", ink: "#1b1712", w: 596, h: 1400, alt: "Violão clássico de tampo claro e cordas de náilon" },
  guitarra: { color: "#d4252d", ink: "#ffffff", w: 433, h: 1400, alt: "Guitarra elétrica vermelha com escudo branco e três captadores" },
  baixo: { color: "#1d4fd8", ink: "#ffffff", w: 474, h: 1400, alt: "Contrabaixo elétrico vermelho com escudo creme e braço longo" },
  ukulele: { color: "#169a57", ink: "#ffffff", w: 294, h: 948, alt: "Ukulelê de madeira clara com quatro cordas" },
  canto: { color: "#7b2fd0", ink: "#ffffff", w: 476, h: 1400, alt: "Microfone condensador de estúdio prateado" },
  teclado: { color: "#f06a14", ink: "#1b1712", w: 500, h: 295, alt: "Teclado de 88 teclas azul-acinzentado visto em diagonal", wide: true },
};
const CUT_FALLBACK = ["#c8952e", "#0f8b8d", "#c2185b", "#5d4037"];
const SALA_ALT = "Sala de ensaio escura com bateria, amplificadores e a banda tocando sob luz roxa e âmbar";

// ---------------------------------------------------------------- page
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let settings: Settings | null = null;
  let sections: Section[] = [];
  let instruments: Instrument[] = [];
  let teachers: Teacher[] = [];
  if (url && key) {
    const db = createClient(url, key, { auth: { persistSession: false } });
    const [s, sec, ins, t] = await Promise.all([
      db.from("site_settings").select("*").eq("id", 1).maybeSingle<Settings>(),
      db.from("site_sections").select("slug, title, body, visible").returns<Section[]>(),
      db.from("instruments").select("id, name, slug, description").order("sort").returns<Instrument[]>(),
      db.from("public_teachers").select("*").returns<Teacher[]>(),
    ]);
    settings = s.data;
    sections = sec.data ?? [];
    instruments = ins.data ?? [];
    teachers = t.data ?? [];
  }

  const name = settings?.school_name || "Espaço Musical Álvaro Mesquita";
  const tagline = settings?.tagline || "Formando músicos para a vida.";
  const sec = (slug: string) => sections.find((x) => x.slug === slug && x.visible);
  const sobre = sec("sobre");
  const sede = sec("nova-sede");
  const festivais = sec("festivais");
  const addr = street(settings?.address ?? null);
  const mapUrl = addr ? `https://www.openstreetmap.org/search?query=${encodeURIComponent(addr)}` : null;
  // "Quero me matricular" abre a tela do vídeo (/matricula), que depois leva ao WhatsApp
  const wa = "/matricula";
  const waAttrs = "";
  const MAIN = "Quero me matricular";
  const insNames = instruments.map((i) => i.name.toLowerCase());
  const nIns = instruments.length || 6;
  const orderedTeachers = [...teachers].sort((a, b) =>
    a.role === "admin" ? -1 : b.role === "admin" ? 1 : a.full_name.localeCompare(b.full_name),
  );
  const year = new Date().getFullYear();

  // ---- cursos: um painel colorido por instrumento (carrossel em acordeão, public/landing/instruments.js)
  const panels = instruments
    .map((i, k) => {
      const cut = CUT[i.slug];
      const color = cut?.color ?? CUT_FALLBACK[k % CUT_FALLBACK.length];
      const ink = cut?.ink ?? "#ffffff";
      const num = String(k + 1).padStart(2, "0");
      const player = PHOTO[i.slug];
      const id = `curso-${esc(i.slug)}`;
      const figure = cut
        ? `<figure class="inst__fig"><img class="inst__img" src="landing/img/${esc(i.slug)}.webp" width="${cut.w}" height="${cut.h}" alt="${esc(cut.alt)}" loading="lazy" decoding="async" data-source="stand-in" data-subject="${esc(cut.alt)}"></figure>`
        : "";
      return `<article class="inst__panel${cut?.wide ? " is-wide" : ""}${cut ? "" : " no-cut"}" style="--c:${color};--ci:${ink}" data-slug="${esc(i.slug)}">
        <button class="inst__hit" type="button" aria-expanded="false" aria-controls="${id}"><span class="inst__num">${num}</span><span class="inst__vname">${esc(i.name)}</span><span class="sr-only">: ver o curso</span></button>
        ${player ? `<div class="inst__player" aria-hidden="true">${img(player, { cls: "", sizes: "(max-width: 899px) 100vw, 40vw" })}</div>` : ""}
        ${figure}
        <div class="inst__body" id="${id}">
          <p class="inst__big" aria-hidden="true">${num}</p>
          <h3 class="inst__title">${esc(i.name)}</h3>
          ${i.description ? `<p class="inst__desc">${esc(i.description)}</p>` : ""}
          <div class="inst__actions">
            <a class="btn btn--primary" href="${esc(wa)}">${MAIN}${ARROW}</a>
            ${cut ? `<button class="inst__zoom" type="button">Ver de perto</button>` : ""}
          </div>
          <div class="inst__now" aria-hidden="true"><span class="bars"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span><span><b>Aula de ${esc(i.name.toLowerCase())}</b><small>Na sede ou online</small></span></div>
        </div>
        <button class="inst__close" type="button" aria-label="Fechar ${esc(i.name)}">&times;</button>
      </article>`;
    })
    .join("");
  const marquee = (instruments.length ? instruments.map((i) => i.name) : ["Violão", "Guitarra", "Baixo", "Ukulelê", "Canto", "Teclado"])
    .map((n) => `<span>${esc(n)}</span><i>★</i>`)
    .join("");
  const h1 = "Espaço musical Alvaro Mesquita".split(" ").map((w, k) => `<span class="w" style="--i:${k}">${esc(w)}</span>`).join(" ");

  const teacherRows = orderedTeachers
    .map(
      (t) =>
        `<li><span class="rows__name">${esc(t.full_name)}${t.instruments.length ? `<small>${esc(listPt(t.instruments))}</small>` : ""}</span><span class="rows__value">${t.role === "admin" ? "Fundador" : "Professor"}</span></li>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="pt-BR" data-type="service" data-radius="soft" data-buttons="arrow" data-motion>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(name)}: escola de rock com aulas presenciais e online</title>
<meta name="description" content="Escola de rock: aulas de ${esc(listPt(insNames))} na sede da escola ou pelo Google Meet, com área do aluno para agenda, chat e fotos dos festivais.">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(name)}: escola de rock com aulas presenciais e online">
<meta property="og:description" content="${esc(cap(listPt(insNames)))}, na sede ou online.">
<meta property="og:image" content="/share.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/icons/192" type="image/png">
<link rel="manifest" href="/manifest.webmanifest">
<meta name="theme-color" content="#1b1712">
<meta name="site-kind" content="other">
<meta name="page-type" content="service">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400..700&family=Hanken+Grotesk:wght@400..600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/system.css">
<link rel="stylesheet" href="assets/ui/cards.css">
<link rel="stylesheet" href="assets/motion/motion.css">
<link rel="stylesheet" href="assets/layout/layout.css">
<link rel="stylesheet" href="assets/icons/icon.css">
<link rel="stylesheet" href="landing/landing.css">
<link rel="preload" as="image" href="landing/img/sala-1600.webp" imagesrcset="landing/img/sala-800.webp 800w, landing/img/sala-1600.webp 1600w, landing/img/sala-2400.webp 2400w" imagesizes="100vw" fetchpriority="high">
<style>
:root {
  --p-bg: #f6f1e6; --p-surface: #ece3d1; --p-ink: #1b1712; --p-muted: #6a6152;
  --p-accent: #c8952e; --p-accent-ink: #111111; --p-action: #c8952e; --p-action-ink: #111111;
  --p-inv-bg: #1b1712; --p-inv-surface: #27231e; --p-inv-ink: #f6f1e6; --p-inv-muted: #9b968d;
  --p-inv-accent: #c8952e; --p-inv-accent-ink: #111111; --p-inv-action: #c8952e; --p-inv-action-ink: #111111;
  --font-display: "Newsreader", Georgia, serif;
  --font-text: "Hanken Grotesk", system-ui, sans-serif;
  --display-weight: 400;
  --display-tracking: -0.018em;
  --display-tracking-xl: -0.025em;
  --ly-scale: 1.06;
}
</style>
<script>document.documentElement.classList.add('m-enter');setTimeout(()=>document.documentElement.classList.add('m-enter-done'),700)</script>
<script>document.documentElement.classList.add('mo-js');setTimeout(()=>document.documentElement.classList.add('mo-safe'),2500)</script>
<link rel="modulepreload" href="assets/moments/moments.js">
<link rel="modulepreload" href="assets/moments/lib.js">
<link rel="modulepreload" href="assets/moments/pinned-chapters/moment.js">
<link rel="modulepreload" href="assets/moments/picture-develops/moment.js">
<style>
  /* the client's mark beside the name (its own emblem replaces the dealt mark) */
  .brand-mark { width: 30px; height: 33px; flex: none; }
  .nav__logo { display: inline-flex; align-items: center; gap: 10px; }
  .footer .brand-mark { width: 36px; height: 40px; }
  /* the type moment: the street of the new building set large */
  .type-moment { font: var(--display-weight) clamp(32px, 3.6vw, 52px)/1.05 var(--font-display); letter-spacing: -0.03em; margin: 0 0 var(--s-6); }
  .type-moment a { color: inherit; text-decoration: none; }
  .rows .rows__name small { display: block; font-weight: 400; color: var(--muted); font-size: var(--t-small); }
  /* picture-develops: the section's one photograph, on the split's right column, as tall as the text beside it */
  .develop { margin: 0; border-radius: var(--r-lg); overflow: hidden; height: min(560px, var(--ly-fit)); }
  .develop > img { display: block; width: 100%; height: 100%; object-fit: cover; }
  @media (max-width: 1023px) { .develop { height: auto; aspect-ratio: 4 / 3; margin-top: var(--s-7); } }
  .prose > * + * { margin-top: var(--s-4); }
  .credits > summary::after { content: "Créditos"; }
  .credits[open] > summary::after { content: "Ocultar"; }
  .split-photo { margin: 0; border-radius: var(--r-lg); overflow: hidden; aspect-ratio: 4 / 3; }
  .split-photo > img { display: block; width: 100%; height: 100%; object-fit: cover; }
</style>
</head>
<body>
<!-- type: service
     deal: hero split, nav nav-split, close close-type, footer footer-visit, rhythm surface-pairs, buttons arrow, mark: o emblema da logo
     moments: pinned-chapters (#aulas), picture-develops (#festivais); fundo de foto da sala de ensaio com luzes, carrossel de cursos colorido e o cabo que liga as seções (pedidos do cliente) -->
<header class="nav nav--split nav--tone">
  <div class="wrap nav__bar">
    <a class="skip-link" href="#top">Pular para o conteúdo</a>
    <a class="nav__logo" href="#top">${MARK}<span>Álvaro Mesquita</span></a>
    <nav class="nav__links" aria-label="Principal">
      <div class="nav__item"><a class="nav__link" href="#cursos">Cursos</a></div>
      <div class="nav__item"><a class="nav__link" href="#aulas">Aulas</a></div>
      <div class="nav__item"><a class="nav__link" href="#festivais">Festivais</a></div>
      <div class="nav__item"><a class="nav__link" href="#sede">Sede</a></div>
    </nav>
    <div class="nav__actions">
      <a class="nav__link" href="/login">Área do aluno</a>
      <a class="btn btn--primary" href="${esc(wa)}"${waAttrs}>${MAIN}</a>
    </div>
    <button class="nav__toggle" type="button" aria-expanded="false" aria-label="Menu"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 5h14M2 13h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>
  </div>
</header>

<main id="top">
  <section class="hero hero--stage ground-inverse" data-enter aria-labelledby="hero-h">
    <div class="stage" aria-hidden="true">
      <img class="stage__photo" src="landing/img/sala-1600.webp" srcset="landing/img/sala-800.webp 800w, landing/img/sala-1600.webp 1600w, landing/img/sala-2400.webp 2400w" sizes="100vw" width="2400" height="1600" alt="" fetchpriority="high" decoding="async" data-source="stand-in" data-subject="${esc(SALA_ALT)}">
      <span class="stage__beam stage__beam--1"></span><span class="stage__beam stage__beam--2"></span><span class="stage__beam stage__beam--3"></span>
      <canvas class="stage__dust"></canvas>
      <span class="stage__shade"></span>
      <span class="stage__amp"><i></i></span>
    </div>
    <div class="wrap hero__wrap">
      <div class="hero__text">
        ${addr ? `<p class="hero__kicker"><span class="dot" aria-hidden="true"></span>Nova sede: ${esc(addr)}</p>` : ""}
        <h1 id="hero-h">${h1}</h1>
        <p class="hero__lead">${esc(cap(listPt(insNames)))}, do iniciante ao avançado. Cada aula é pensada pra sua evolução, com atenção individual e foco no que você quer tocar.</p>
        <div class="btn-row"><a class="btn btn--primary" href="${esc(wa)}"${waAttrs}>${MAIN}${ARROW}</a><a class="btn btn--secondary" href="#cursos">Ver os cursos</a></div>
      </div>
      <p class="sr-only">${esc(SALA_ALT)}.</p>
    </div>
  </section>
  <div class="marquee" aria-hidden="true"><div class="marquee__track">${marquee}${marquee}${marquee}${marquee}</div></div>

  <section class="section inst torn" id="cursos" aria-labelledby="cursos-h">
    <div class="wrap">
      <div class="section-head"><h2 id="cursos-h">${nIns} cursos de instrumento e canto</h2><p>Método prático e direto, ambiente preparado e acolhedor e o professor acompanhando de perto a sua evolução. Clique num instrumento para ver o curso.</p></div>
      <div class="inst__deck" data-inst>${panels}</div>
    </div>
    <dialog class="zoom" aria-label="Instrumento ampliado">
      <div class="zoom__stage"><img class="zoom__img" alt=""></div>
      <p class="zoom__cap"><span class="zoom__num"></span><span class="zoom__name"></span><small>Clique na imagem para aproximar</small></p>
      <button class="zoom__btn zoom__prev" type="button" aria-label="Instrumento anterior">&larr;</button>
      <button class="zoom__btn zoom__next" type="button" aria-label="Próximo instrumento">&rarr;</button>
      <button class="zoom__btn zoom__x" type="button" aria-label="Fechar">&times;</button>
    </dialog>
  </section>

  <section class="section" id="aulas" style="--h: 2" data-moment="pinned-chapters" aria-labelledby="aulas-h">
    <div class="wrap mo-pc__grid">
      <div class="mo-pc__text">
        <h2 id="aulas-h">Aulas em 3 passos</h2>
        <ol class="mo-pc__steps">
          <li class="mo-pc__step">
            <h3>Aula presencial na sede</h3>
            <p>Você vem à sede no dia e no horário combinados com o seu professor. As salas têm os instrumentos para a aula.</p>
            <figure class="mo-pc__visual">${img(PHOTO.sede, { cls: "" })}</figure>
          </li>
          <li class="mo-pc__step">
            <h3>Aula online pelo Google Meet</h3>
            <p>O professor fixa o link da aula no chat. No horário marcado, você abre o app da escola e entra na chamada.</p>
            <figure class="mo-pc__visual">${img(PHOTO.online, { cls: "" })}</figure>
          </li>
          <li class="mo-pc__step">
            <h3>Agenda e materiais no app</h3>
            <p>No calendário você vê as suas aulas e pede para remarcar ou cancelar. Partituras, áudios e links ficam no chat.</p>
            <figure class="mo-pc__visual">${img(PHOTO.materiais, { cls: "" })}</figure>
          </li>
        </ol>
      </div>
      <div class="mo-pc__visuals frame"></div>
    </div>
  </section>

  <section class="section ground-inverse torn" id="festivais" aria-labelledby="festivais-h">
    <div class="wrap grid grid--top">
      <div class="span-6">
        <div class="section-head">
          <h2 id="festivais-h">Festivais de rock com todos os alunos no palco</h2>
        </div>
        <div class="prose">${md(festivais?.body || "Nos festivais da escola, todos os alunos tocam. As fotos e os vídeos de cada festival ficam na área do aluno.")}
        <p><a class="link" href="/login">Ver as fotos na área do aluno</a></p></div>
      </div>
      <div class="taped span-6 start-7"><figure class="develop" data-moment="picture-develops">${img(PHOTO.festival, { cls: "" })}</figure><span class="tape tape--a" aria-hidden="true">Ao vivo</span></div>
    </div>
  </section>

  <section class="section torn" id="professores" aria-labelledby="professores-h">
    <div class="wrap grid grid--top">
      <div class="span-6">
        <div class="section-head">
          <h2 id="professores-h">Professores da escola</h2>
          ${sobre ? `<div class="prose">${md(sobre.body)}</div>` : ""}
        </div>
        ${teacherRows ? `<ul class="rows">${teacherRows}</ul>` : ""}
      </div>
      <figure class="split-photo tilt span-6 start-7">${img(PHOTO.professores, { cls: "" })}</figure>
    </div>
  </section>

  <section class="section" id="sede" aria-labelledby="sede-h">
    <div class="wrap">
      <div class="section-head"><h2 id="sede-h">${esc(sede?.title || "A nova sede")}</h2></div>
      <div class="grid grid--top">
        <div class="span-6">
          ${addr ? `<p class="type-moment"><a href="${esc(mapUrl!)}" target="_blank" rel="noopener">${esc(addr)}</a></p>` : ""}
          <div class="prose">${sede ? md(sede.body) : ""}
          ${mapUrl ? `<p><a class="link" href="${esc(mapUrl)}" target="_blank" rel="noopener">Ver o caminho no mapa</a></p>` : ""}</div>
          <div class="ensaio">
            <h3>Prática de banda e sala de ensaio</h3>
            <p>Se você já toca, a sede tem sala de ensaio equipada pra sua banda dar o próximo passo.</p>
          </div>
        </div>
        <div class="taped span-6 start-7"><figure class="split-photo tilt">${img(PHOTO.sala, { cls: "" })}</figure><span class="tape tape--b" aria-hidden="true">Ensaio</span></div>
      </div>
    </div>
  </section>
</main>

<footer class="footer closing footer--dark ground-inverse torn" id="contact" aria-labelledby="close-h">
  <div class="wrap">
    <div class="closing__cta close--type">
      <div class="section-head">
        <h2 id="close-h">${MAIN}</h2>
        <p>Poucos horários disponíveis. Veja como são as aulas e peça no WhatsApp a tabela de horários e valores.</p>
      </div>
      <a class="btn btn--primary btn--xl btn--wide" href="${esc(wa)}"${waAttrs}>${MAIN}${ARROW}</a>
    </div>
    <div class="closing__links">
      <div class="grid">
        <div class="span-6 stack-4">
          <a class="nav__logo" href="#top">${MARK}<span>${esc(name)}</span></a>
          ${addr ? `<address class="footer__address">${esc(addr)}</address>` : ""}
          <p class="footer__lede">${esc(tagline)}</p>
        </div>
        <div class="span-3 start-7 footer__col"><h3>Escola</h3><ul><li><a href="#cursos">Cursos</a></li><li><a href="#aulas">Aulas</a></li><li><a href="#festivais">Festivais</a></li><li><a href="#sede">Sede</a></li></ul></div>
        <div class="span-3 footer__col"><h3>Contato</h3><ul>
          <li><a href="/login">Área do aluno</a></li>
          ${settings?.instagram ? `<li><a href="https://instagram.com/${esc(settings.instagram)}" target="_blank" rel="noopener">Instagram</a></li>` : ""}
          ${settings?.email ? `<li><a href="mailto:${esc(settings.email)}">E-mail</a></li>` : ""}
        </ul></div>
      </div>
      <div class="footer__legal">
        <span>&copy; ${year} ${esc(name)}</span>
        <a class="credits link" href="/creditos">${CREDITS_SOURCES}</a>
      </div>
    </div>
  </div>
</footer>

<nav class="actionbar" aria-label="Ações rápidas">
  <a class="btn btn--primary" href="${esc(wa)}"${waAttrs}>${MAIN}</a>
</nav>

<script type="module" src="assets/system.js"></script>
<script type="module" src="assets/motion/motion.js"></script>
<script type="module" src="assets/layout/layout.js"></script>
<script type="module" src="landing/stage.js"></script>
<script type="module" src="landing/instruments.js"></script>
<script type="module" src="landing/forms.js"></script>
</body>
</html>`;

  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
