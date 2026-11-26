// Verifica a landing em vários tamanhos de tela: nenhum conteúdo de uma seção pode passar da borda dela (ficar
// por baixo da seção seguinte ou do rodapé), nem ficar sob o letreiro, nem gerar rolagem lateral, e não pode
// sobrar faixa vazia grande dentro de uma seção (a página tem de ser contínua).
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
      // seções contínuas: sem faixa vazia grande no começo ou no fim do conteúdo (o hero e as aulas, que
      // seguram a tela de propósito, ficam de fora)
      for (const b of blocks) {
        if (b.matches(".hero, [data-moment='pinned-chapters']")) continue;
        const br = abs(b), cs = getComputedStyle(b);
        const inner = { top: br.top + parseFloat(cs.paddingTop), bottom: br.bottom - parseFloat(cs.paddingBottom) };
        const rs = [...b.querySelectorAll(CONTENT + ", iframe, figure, .inst__panel")]
          .filter((el) => !el.closest(INTENTIONAL) && el.getBoundingClientRect().height > 0 && getComputedStyle(el).display !== "none")
          .map(abs);
        if (!rs.length) continue;
        const top = Math.min(...rs.map((r) => r.top)), bottom = Math.max(...rs.map((r) => r.bottom));
        if (top - inner.top > 140) out.push(`${name(b)}: ${Math.round(top - inner.top)}px vazios antes do conteúdo`);
        if (inner.bottom - bottom > 140) out.push(`${name(b)}: ${Math.round(inner.bottom - bottom)}px vazios depois do conteúdo`);
      }
      // o cabo de guitarra corre pelas margens: não pode riscar títulos, textos, botões nem fitas
      const cable = document.querySelector(".cable__line");
      if (cable && cable.getTotalLength) {
        const len = cable.getTotalLength();
        const texts = [...document.querySelectorAll("main h1, main h2, main h3, main p, main li, main a.btn, .tape, footer.closing :is(h2, p, h3, li, address)")]
          .filter((el) => !el.closest(".sr-only, .inst__body, dialog") && el.getBoundingClientRect().width > 0)
          .map((el) => {
            // a caixa do texto em si (não a linha inteira do bloco), a partir dos retângulos das linhas
            const rg = document.createRange();
            rg.selectNodeContents(el);
            return { el, rects: [...rg.getClientRects()].map((r) => ({ l: r.left, r: r.right, t: r.top + scrollY, b: r.bottom + scrollY })) };
          });
        const hit = new Set();
        for (let s = 0; s <= len; s += 6) {
          const p = cable.getPointAtLength(s);
          for (const t of texts)
            if (!hit.has(t.el) && t.rects.some((r) => p.x > r.l + 2 && p.x < r.r - 2 && p.y > r.t + 2 && p.y < r.b - 2)) hit.add(t.el);
        }
        for (const el of hit) out.push(`o cabo risca ${label(el)}`);
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
