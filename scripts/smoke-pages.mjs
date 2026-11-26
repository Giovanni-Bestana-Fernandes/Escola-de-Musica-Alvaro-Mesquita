// Abre as páginas do app logado como cada usuário de demonstração e verifica se renderizam sem erro.
// Requer: npm run seed:demo e o app rodando (APP_URL, padrão http://localhost:3000).
// Uso: npm run test:pages
import { createClient } from "@supabase/supabase-js";

const APP = process.env.APP_URL ?? "http://localhost:3000";
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const storageKey = `sb-${new URL(URL_).hostname.split(".")[0]}-auth-token`;
const service = createClient(URL_, SERVICE, { auth: { persistSession: false } });

/** Monta o cookie de sessão no mesmo formato do @supabase/ssr (com divisão em pedaços). */
async function cookieFor(email) {
  const c = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { data, error } = await c.auth.signInWithPassword({ email, password: process.env.ADMIN_EMAIL === email ? process.env.ADMIN_PASSWORD : "senha123" });
  if (error) throw error;
  const value = "base64-" + Buffer.from(JSON.stringify(data.session)).toString("base64url");
  const size = 3180;
  if (value.length <= size) return `${storageKey}=${value}`;
  const parts = [];
  for (let i = 0; i * size < value.length; i++) parts.push(`${storageKey}.${i}=${value.slice(i * size, (i + 1) * size)}`);
  return parts.join("; ");
}

let failed = 0;
async function page(cookie, path, expect = [], expectStatus = 200) {
  const res = await fetch(APP + path, { headers: { cookie }, redirect: "manual" });
  const html = await res.text();
  const missing = expect.filter((t) => !html.includes(t));
  const serverError = /Application error|digest|Internal Server Error/i.test(html) && res.status >= 500;
  const ok = res.status === expectStatus && !missing.length && !serverError;
  if (!ok) failed++;
  console.log(
    `  ${ok ? "✔" : "✘"} ${res.status} ${path}${res.status >= 300 && res.status < 400 ? ` → ${res.headers.get("location")}` : ""}${missing.length ? `  faltando: ${missing.join(" | ")}` : ""}`,
  );
}

const { data: lessons } = await service.from("lessons").select("id, student:profiles!lessons_student_id_fkey(email), teacher:profiles!lessons_teacher_id_fkey(email)");
const carlaLesson = lessons.find((l) => l.student.email === "carla@demo.com" && l.teacher.email === "camila@demo.com").id;
const diegoLesson = lessons.find((l) => l.student.email === "diego@demo.com").id;
const { data: convs } = await service.from("conversations").select("id, student:profiles!conversations_student_id_fkey(email)");
const carlaConv = convs.find((c) => c.student.email === "carla@demo.com").id;
const diegoConv = convs.find((c) => c.student.email === "diego@demo.com").id;
const { data: fest } = await service.from("festivals").select("id").limit(1).single();

console.log("\nVisitante");
await page("", "/", ["hero-h", "6 cursos de instrumento e canto", "A nova sede", "Guitarra", "Ukulelê", "Projeto de Bandas", "professor <strong>Alvarinho</strong>", "Nossa equipe", "landing/img/equipe.webp", "Alvarinho", "Camila", "Lucas", "Aulas de:", "landing/img/banda-1600.webp", "curso-teclado", "landing/img/sala-1600.webp", "R. Joaquim Franco Silva, 80", "maps.google.com/maps?q=", "Abrir no Google Maps", "landing/stage.js", "landing/instruments.js", "landing/forms.js"]);
await page("", "/creditos", ["Créditos das fotos", "Wikimedia"]);
await page("", "/matricula", ["Antes de começar, veja como são as aulas", "Continuar para o WhatsApp", "phone=5514996436839", "DWj6PbAIEbT/embed", "R. Joaquim Franco Silva, 80"]);
await page("", "/login", ["Entrar"]);
await page("", "/inicio", [], 307);
await page("", "/admin/site", [], 307);

console.log("\nAluna Carla");
const carla = await cookieFor("carla@demo.com");
await page(carla, "/inicio", ["Carla", "Sua próxima aula", "Meus pedidos"]);
await page(carla, "/calendario", ["Agenda"]);
await page(carla, `/aulas/${carlaLesson}`, ["Aula de", "Precisa remarcar ou cancelar?"]);
await page(carla, `/aulas/${diegoLesson}`, [], 404);
await page(carla, "/chat", ["Camila"]);
await page(carla, `/chat/${carlaConv}`, ["Escreva uma mensagem"]);
await page(carla, `/chat/${diegoConv}`, [], 404);
await page(carla, "/festivais", ["Festival de Inverno"]);
await page(carla, `/festivais/${fest.id}`, ["Festival de Inverno"]);
await page(carla, "/perfil", ["Meu perfil", "Trocar senha"]);
await page(carla, "/alunos", [], 307);
await page(carla, "/admin/professores", [], 307);

console.log("\nProfessora Camila");
const camila = await cookieFor("camila@demo.com");
await page(camila, "/inicio", ["Camila", "Pedidos para responder", "Hoje"]);
await page(camila, "/alunos", ["Meus alunos", "Carla Alves", "Agendar aulas"]);
await page(camila, `/aulas/${carlaLesson}`, ["Remarcar", "Cancelar aula"]);
await page(camila, "/festivais", ["Novo festival"]);
await page(camila, "/admin/professores", [], 307);

console.log("\nProfessor Lucas (sem permissões extras)");
const lucas = await cookieFor("lucas@demo.com");
await page(lucas, "/alunos", ["Meus alunos", "Diego Rocha"]);
await page(lucas, "/festivais", ["Festival de Inverno"]);
await page(lucas, `/chat/${carlaConv}`, [], 404);

console.log("\nÁlvaro (diretor e professor)");
const alvaro = await cookieFor(process.env.ADMIN_EMAIL ?? "alvaro@demo.com");
await page(alvaro, "/inicio", ["Álvaro", "Visão geral da escola"]);
await page(alvaro, "/calendario", ["Agenda"]);
await page(alvaro, "/alunos", ["Alunos e matrículas", "Cadastrar aluno", "Carla Alves", "Diego Rocha"]);
await page(alvaro, "/chat", ["Conversas dos outros professores"]);
await page(alvaro, "/admin/professores", ["Professores", "Camila", "Lucas", "Calendário geral", "Também pode: Festivais"]);
await page(alvaro, "/admin/instrumentos", ["Ukulelê"]);
await page(alvaro, "/admin/site", ["Informações da escola", "nova-sede", "Link do mapa", "R. Joaquim Franco Silva, 80"]);
await page(alvaro, `/aulas/${diegoLesson}`, ["Remarcar"]);

console.log(failed ? `\n${failed} falharam\n` : "\nTodas as páginas OK\n");
process.exit(failed ? 1 : 0);
