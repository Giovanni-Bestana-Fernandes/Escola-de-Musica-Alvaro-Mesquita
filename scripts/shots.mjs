// Screenshots da landing (várias posições de rolagem, o carrossel aberto e a ampliação) e da tela de matrícula.
// Usa o Chrome instalado (playwright-core, sem baixar navegador). Requer o app rodando.
// Uso: npm run shots  [APP_URL=http://localhost:3000] [OUT=.taste-skill/shots/app]
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const APP = process.env.APP_URL ?? "http://localhost:3000";
const OUT = process.env.OUT ?? ".taste-skill/shots/app";
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({
  channel: "chrome",
  args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--ignore-gpu-blocklist"],
});

async function landing(w, h, tag) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(APP + "/", { waitUntil: "load" });
  await page.waitForTimeout(3000);
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  const stops = [0, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 9].map((k) => Math.round(k * h)).filter((y) => y < total);
  for (const y of stops) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}/landing-${tag}-${String(y).padStart(5, "0")}.png` });
  }
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/landing-${tag}-end.png` });
  // carrossel: fechado, um painel aberto e a ampliação
  await page.evaluate(() => document.querySelector(".inst__deck").scrollIntoView({ block: "center" }));
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/landing-${tag}-deck.png` });
  for (const slug of (process.env.PANELS ?? "guitarra,teclado").split(",")) {
    await page.click(`.inst__panel[data-slug="${slug}"] .inst__hit`);
    await page.waitForTimeout(1500);
    if (w < 900) await page.evaluate((s) => document.querySelector(`.inst__panel[data-slug="${s}"]`).scrollIntoView({ block: "start" }), slug);
    else await page.evaluate(() => document.querySelector(".inst__deck").scrollIntoView({ block: "center" }));
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/landing-${tag}-open-${slug}.png` });
  }
  await page.click(".inst__panel.is-open .inst__zoom");
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/landing-${tag}-zoom.png` });
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/landing-${tag}-zoom-next.png` });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(800);
  console.log(`landing ${tag}: ${stops.length} posições${errors.length ? "  ERROS: " + errors.join(" | ") : ""}`);
  await page.close();
}

await landing(1440, 900, "1440");
await landing(390, 844, "390");
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(APP + "/matricula", { waitUntil: "load" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/matricula-${w}.png` });
  await page.close();
}
await browser.close();
