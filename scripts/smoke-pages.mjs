// Abre cada página do site e verifica se renderiza com o conteúdo esperado.
// Requer o app rodando (APP_URL, padrão http://localhost:3000). Uso: npm run test:pages
const APP = process.env.APP_URL ?? "http://localhost:3000";

let failed = 0;
async function page(path, expect = [], expectStatus = 200, absent = []) {
  const res = await fetch(APP + path, { redirect: "manual" });
  const html = await res.text();
  const missing = expect.filter((t) => !html.includes(t));
  const present = absent.filter((t) => html.includes(t));
  const ok = res.status === expectStatus && !missing.length && !present.length;
  if (!ok) failed++;
  console.log(
    `  ${ok ? "✔" : "✘"} ${res.status} ${path}${missing.length ? `  faltando: ${missing.join(" | ")}` : ""}${present.length ? `  não devia ter: ${present.join(" | ")}` : ""}`,
  );
}

console.log("\nSite");
await page(
  "/",
  ["hero-h", "6 cursos de instrumento e canto", "A nova sede", "Guitarra", "Ukulelê", "Projeto de Bandas", "professor <strong>Alvarinho</strong>", "Nossa equipe", "landing/img/equipe.webp", "Alvarinho", "Camila", "Lucas", "Aulas de:", "landing/img/banda-1600.webp", "curso-teclado", "landing/img/sala-1600.webp", "R. Joaquim Franco Silva, 80", "maps.google.com/maps?q=", "Abrir no Google Maps", "href=\"/matricula\"", "instagram.com/escolaalvaromesquita", "phone=5514996436839", "landing/stage.js", "landing/instruments.js", "landing/forms.js", "class=\"loader\"", "landing/img/roqueiro.gif"],
  200,
  ["/login", "Área do aluno", "área do aluno"],
);
await page("/matricula", ["Antes de começar, veja como são as aulas", "Continuar para o WhatsApp", "phone=5514996436839", "DWj6PbAIEbT/embed", "R. Joaquim Franco Silva, 80"]);
await page("/creditos", ["Créditos das fotos", "Wikimedia"]);
await page("/manifest.webmanifest", ['"start_url":"/"']);
await page("/icons/192");

console.log("\nÁrea logada removida");
for (const p of ["/login", "/inicio", "/admin/site", "/alunos", "/calendario", "/chat"]) await page(p, [], 404);

console.log(failed ? `\n${failed} falharam\n` : "\nTodas as páginas OK\n");
process.exit(failed ? 1 : 0);
