// Gera public/landing/guitar-still.webp (a guitarra parada, fundo transparente) a partir da própria cena 3D.
// Uso: APP_URL=http://localhost:3000 node scripts/make-guitar-still.mjs
import { chromium } from "playwright-core";
import { writeFileSync } from "node:fs";
const b = await chromium.launch({ channel: "chrome", args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"] });
const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
await p.goto((process.env.APP_URL ?? "http://localhost:3000") + "/", { waitUntil: "networkidle" });
await p.waitForSelector(".stage.is-ready");
await p.waitForTimeout(600);
const url = await p.evaluate(() => window.__guitar.still(900, 1200));
writeFileSync("public/landing/guitar-still.webp", Buffer.from(url.split(",")[1], "base64"));
await b.close();
console.log("public/landing/guitar-still.webp");
