// Baixa do Wikimedia Commons as imagens da landing: a foto da sala de ensaio (fundo do topo) e os
// instrumentos recortados do carrossel. Converte para webp em public/landing/img e grava os créditos
// em public/landing/img/credits.json (copiados para src/lib/site-credits.ts, página /creditos).
// Uso: node scripts/fetch-instruments.mjs   (as imagens ficam versionadas; só rode para trocar alguma)
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const OUT = "public/landing/img";
const UA = "escola-site-builder/1.0 (landing images)";
const API = "https://commons.wikimedia.org/w/api.php";

/** key → arquivo do Commons. cut: "alpha" (já é PNG recortado) | "white" (fundo branco a remover) | "photo" */
const ITEMS = [
  { key: "sala", title: "File:A depressive rock band in Iran- Music rehearsal space- Canon Photography-Mortaz band- Photographer mostafa meraji 13.jpg", cut: "photo" },
  { key: "guitarra", title: "File:Guitar 3.png", cut: "alpha" },
  { key: "violao", title: "File:Spanish classical acoustic guitar3.png", cut: "alpha" },
  { key: "baixo", title: "File:Fender Jaguar Bass front.png", cut: "alpha" },
  { key: "canto", title: "File:AKG C214 Condenser microphone.png", cut: "alpha" },
  { key: "teclado", title: "File:Masterkeyboard.png", cut: "alpha" },
  { key: "ukulele", title: "File:Ukulele 105.jpg", cut: "white" },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url, json = false) {
  for (let k = 0; k < 8; k++) {
    const res = await fetch(url, { headers: { "user-agent": UA } });
    const ct = res.headers.get("content-type") ?? "";
    if (res.ok && (json ? ct.includes("json") : ct.startsWith("image"))) return json ? res.json() : Buffer.from(await res.arrayBuffer());
    await sleep(10000 * (k + 1));
  }
  throw new Error("falhou: " + url);
}
/** Miniatura num tamanho padrão do Wikimedia (o original costuma ser recusado com 429 para robôs). */
const STEPS = [1920, 1280, 960, 500, 330];
function thumb(ii) {
  const w = STEPS.find((s) => s < ii.width);
  if (!w) return ii.url.split("?")[0];
  const m = ii.url.split("?")[0].match(/^(https:\/\/upload\.wikimedia\.org\/wikipedia\/commons)\/(.+\/)([^/]+)$/);
  return `${m[1]}/thumb/${m[2]}${m[3]}/${w}px-${m[3]}`;
}
const strip = (h = "") => h.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

/** Remove o fundo branco por preenchimento a partir das bordas (só pixels claros e pouco saturados conectados à borda). */
async function cutWhite(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const bg = (i) => {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    return Math.min(r, g, b) > 214 && Math.max(r, g, b) - Math.min(r, g, b) < 26;
  };
  const seen = new Uint8Array(w * h);
  const stack = [];
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
  while (stack.length) {
    const p = stack.pop();
    if (seen[p]) continue;
    seen[p] = 1;
    if (!bg(p * 4)) continue;
    data[p * 4 + 3] = 0;
    const x = p % w, y = (p / w) | 0;
    if (x > 0) stack.push(p - 1);
    if (x < w - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - w);
    if (y < h - 1) stack.push(p + w);
  }
  // suaviza a borda: pixels opacos vizinhos de transparentes ficam semitransparentes
  const a = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) a[p] = data[p * 4 + 3];
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      if (a[p] && (!a[p - 1] || !a[p + 1] || !a[p - w] || !a[p + w])) data[p * 4 + 3] = 140;
    }
  return sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

await mkdir(OUT, { recursive: true });
const params = new URLSearchParams({ action: "query", format: "json", titles: ITEMS.map((i) => i.title).join("|"), prop: "imageinfo", iiprop: "url|size|extmetadata" });
const meta = await get(`${API}?${params}`, true);
const pages = Object.values(meta.query.pages);
const credits = [];

for (const it of ITEMS) {
  const page = pages.find((p) => p.title === it.title);
  const ii = page.imageinfo[0];
  const m = ii.extmetadata;
  const done = existsSync(`${OUT}/${it.key}${it.cut === "photo" ? "-2400" : ""}.webp`);
  const src = done ? null : await get(thumb(ii));
  if (!done) await sleep(8000);
  if (done) {
    if (it.cut !== "photo") {
      const { width, height } = await sharp(`${OUT}/${it.key}.webp`).metadata();
      it.size = { width, height };
    }
  } else if (it.cut === "photo") {
    for (const wd of [800, 1600, 2400]) await sharp(src).resize({ width: wd }).webp({ quality: 74 }).toFile(`${OUT}/${it.key}-${wd}.webp`);
  } else {
    const png = it.cut === "white" ? await cutWhite(src) : src;
    const trimmed = await sharp(png).trim({ threshold: 1 }).png().toBuffer();
    const img = sharp(trimmed).resize({ width: 1400, height: 1400, fit: "inside", withoutEnlargement: true });
    const { width, height } = await img.clone().webp({ quality: 82, alphaQuality: 90 }).toFile(`${OUT}/${it.key}.webp`);
    it.size = { width, height };
  }
  credits.push({
    id: `landing-${it.key}`,
    by: strip(m.Artist?.value).slice(0, 120) || "Autor desconhecido",
    licence: strip(m.LicenseShortName?.value),
    page: ii.descriptionurl,
    ...(it.size ?? {}),
  });
  console.log("✔", it.key, it.size ?? "", "|", credits.at(-1).licence, "|", credits.at(-1).by);
}
await writeFile(`${OUT}/credits.json`, JSON.stringify(credits, null, 1) + "\n");
