// Verifica a landing em vários tamanhos de tela: nenhum conteúdo de uma seção pode passar da borda dela
// (ficar por baixo da seção seguinte ou do rodapé), nem ficar sob o letreiro, nem gerar rolagem lateral.
// Os elementos que vazam de propósito (instrumentos do carrossel, vinil, palheta, fitas, cabo) ficam de fora.
// Requer o app rodando. Uso: npm run test:layout   [APP_URL=http://localhost:3000] [SIZES=1440x900,390x844]
import { chromium } from "playwright-core";

const APP = process.env.APP_URL ?? "http://localhost:3000";
const SIZES = (process.env.SIZES ?? "1920x1080,1536x864,1440x900,1366x768,1280x720,1280x1024,1152x720,1024x768,1024x1366,820x1180,768x1024,430x932,390x844,375x667,360x640")
  .split(",")
  .map((s) => s.split("x").map(Number));

const browser = await chromium.launch({ channel: "chrome" });
let failed = 0;

for (const [w, h] of SIZES) {
  for (const state of ["fechado", "aberto"]) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, reducedMotion: "reduce" });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(APP + "/", { waitUntil: "load" });
    await page.waitForTimeout(600);
    if (state === "aberto") {
      // abre o painel mais alto (no celular o aberto tem altura fixa) para ver se a seção cresce junto
      await page.click('.inst__panel[data-slug="guitarra"] .inst__hit');
      await page.waitForTimeout(400);
    }
    // percorre a página para os efeitos de rolagem chegarem ao estado final
    const total = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < total; y += h) {
      await page.evaluate((yy) => scrollTo(0, yy), y);
      await page.waitForTimeout(60);
    }
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(200);
    const problems = await page.evaluate(() => {
      const out = [];
      const abs = (el) => {
        const r = el.getBoundingClientRect();
        return { top: r.top + scrollY, bottom: r.bottom + scrollY, left: r.left, right: r.right, w: r.width, h: r.height };
      };
      const INTENTIONAL = ".inst__fig, .vinyl, .pickdrop, .tape, .eq, .cable, .stage, .sr-only, .zoom, .inst__player, .metro";
      const CONTENT = "h1, h2, h3, p, li, a.btn, button, .inst__deck, .split-photo, .develop, address, .staff, .rosette-host, .ensaio, .type-moment";
      const blocks = [...document.querySelectorAll("main > section, footer.closing")];
      const name = (el) => el.id || el.className.toString().split(" ")[0];
      const label = (el) => `${el.tagName.toLowerCase()}${el.className ? "." + el.className.toString().trim().split(/\s+/)[0] : ""} "${(el.textContent || "").replace(/s+/g, " ").trim().slice(0, 40)}"`;
      for (const b of blocks) {
        const br = abs(b);
        for (const el of b.querySelectorAll(CONTENT)) {
          if (el.closest(INTENTIONAL)) continue;
          const cs = getComputedStyle(el);
          if (cs.display === "none" || cs.visibility === "hidden" || el.closest("[inert]") || el.closest("dialog:not([open])")) continue;
          const r = abs(el);
          if (!r.w || !r.h) continue;
          if (r.bottom > br.bottom + 1) out.push(`${name(b)}: ${label(el)} passa ${Math.round(r.bottom - br.bottom)}px do fim da seção`);
          if (r.top < br.top - 1) out.push(`${name(b)}: ${label(el)} começa ${Math.round(br.top - r.top)}px acima da seção`);
        }
      }
      // nada de texto sob o letreiro
      const mq = document.querySelector(".marquee");
      if (mq) {
        const m = abs(mq);
        for (const el of document.querySelectorAll(".hero--stage :is(h1, p, a.btn), #cursos :is(h2, .section-head p)")) {
          const r = abs(el);
          if (r.w && r.bottom > m.top + 4 && r.top < m.bottom - 4 && r.right > m.left && r.left < m.right) out.push(`letreiro cobre ${label(el)}`);
        }
      }
      // seções em ordem, sem se sobrepor
      for (let i = 1; i < blocks.length; i++) {
        const a = abs(blocks[i - 1]), c = abs(blocks[i]);
        // o letreiro fica de propósito sobre a divisa do hero com os cursos: aceita se ele cobre a emenda toda
        const m = blocks[i].previousElementSibling?.classList.contains("marquee") ? abs(blocks[i].previousElementSibling) : null;
        if (m && m.top <= c.top && m.bottom >= a.bottom) continue;
        if (c.top < a.bottom - 1) out.push(`${name(blocks[i])} começa ${Math.round(a.bottom - c.top)}px antes do fim de ${name(blocks[i - 1])}`);
      }
      if (document.documentElement.scrollWidth > innerWidth + 1) out.push(`rolagem lateral: ${document.documentElement.scrollWidth}px`);
      return out;
    });
    const all = [...problems, ...errors.map((e) => "erro JS: " + e)];
    if (all.length) failed++;
    console.log(`${all.length ? "✘" : "✔"} ${w}x${h} ${state}${all.map((p) => "\n    " + p).join("")}`);
    await page.close();
  }
}
await browser.close();
console.log(failed ? `\n${failed} combinações com problema\n` : "\nLayout OK em todos os tamanhos\n");
process.exit(failed ? 1 : 0);
