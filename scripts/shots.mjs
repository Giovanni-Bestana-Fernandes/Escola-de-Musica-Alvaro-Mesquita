// Screenshots da landing (várias posições de rolagem e um arraste) e da área logada de cada perfil.
// Usa o Chrome instalado (playwright-core, sem baixar navegador). Requer o app rodando e os dados de demonstração.
// Uso: npm run shots  [APP_URL=http://localhost:3000] [ONLY=landing|app] [OUT=.taste-skill/shots/app]
import { chromium } from "playwright-core";
import { createClient } from "@supabase/supabase-js";
import { mkdirSync } from "node:fs";

const APP = process.env.APP_URL ?? "http://localhost:3000";
const OUT = process.env.OUT ?? ".taste-skill/shots/app";
const ONLY = process.env.ONLY ?? "";
mkdirSync(OUT, { recursive: true });
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const host = new URL(URL_).hostname.split(".")[0];
const storageKey = `sb-${host}-auth-token`;

async function sessionCookie(email, password = "senha123") {
  const c = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const value = "base64-" + Buffer.from(JSON.stringify(data.session)).toString("base64url");
  const size = 3180;
  const appHost = new URL(APP).hostname;
  if (value.length <= size) return [{ name: storageKey, value, domain: appHost, path: "/" }];
  const out = [];
  for (let i = 0; i * size < value.length; i++) out.push({ name: `${storageKey}.${i}`, value: value.slice(i * size, (i + 1) * size), domain: appHost, path: "/" });
  return out;
}

const browser = await chromium.launch({
  channel: "chrome",
  args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--ignore-gpu-blocklist"],
});

async function landing(w, h, tag) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(APP + "/", { waitUntil: "networkidle" });
  await page.waitForSelector(".stage.is-ready", { timeout: 20000 }).catch(() => errors.push("guitarra não ficou pronta"));
  await page.waitForTimeout(800);
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  const stops = [0, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 7, 8].map((k) => Math.round(k * h)).filter((y) => y < total);
  for (const y of stops) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}/landing-${tag}-${String(y).padStart(5, "0")}.png` });
  }
  // arrastar a guitarra no hero
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(700);
  await page.mouse.move(w * 0.72, h * 0.5);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(w * 0.72 - i * 25, h * 0.5 + i * 4, { steps: 2 });
  await page.waitForTimeout(120);
  await page.screenshot({ path: `${OUT}/landing-${tag}-drag.png` });
  await page.mouse.up();
  console.log(`landing ${tag}: ${stops.length} posições${errors.length ? "  ERROS: " + errors.join(" | ") : ""}`);
  await page.close();
}

async function app(email, pages, tag, w = 1440, h = 900) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  await ctx.addCookies(await sessionCookie(email, email.startsWith("alvaro") ? process.env.ADMIN_PASSWORD ?? "senha123" : "senha123"));
  const page = await ctx.newPage();
  for (const p of pages) {
    await page.goto(APP + p, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    const name = `${tag}${p.replace(/[/?=]+/g, "_")}`;
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  }
  console.log(`${tag}: ${pages.length} páginas`);
  await ctx.close();
}

if (ONLY !== "app") {
  await landing(1440, 900, "1440");
  await landing(390, 844, "390");
}
if (ONLY !== "landing") {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(APP + "/login", { waitUntil: "networkidle" });
  await p.screenshot({ path: `${OUT}/login.png` });
  await ctx.close();
  await app("carla@demo.com", ["/inicio", "/calendario", "/chat", "/festivais", "/perfil"], "aluno");
  await app("ana@demo.com", ["/inicio", "/alunos", "/calendario"], "prof");
  await app(process.env.ADMIN_EMAIL ?? "alvaro@demo.com", ["/inicio", "/alunos", "/admin/professores", "/admin/site"], "admin");
  await app("carla@demo.com", ["/inicio"], "aluno-390", 390, 844);
}
await browser.close();
