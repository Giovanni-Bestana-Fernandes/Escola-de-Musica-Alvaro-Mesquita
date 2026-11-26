// Testes ponta a ponta das regras de acesso (RLS), storage e realtime.
// Requer os dados de demonstração: npm run seed:demo
// Uso: npm run test:rls
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASS = "senha123";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "alvaro@demo.com";
const ADMIN_PASS = process.env.ADMIN_PASSWORD ?? PASS;

let passed = 0;
let failed = 0;
function check(name, cond, extra = "") {
  if (cond) {
    passed++;
    console.log(`  ✔ ${name}`);
  } else {
    failed++;
    console.log(`  ✘ ${name} ${extra}`);
  }
}

async function login(email, password = PASS) {
  const c = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`login ${email}: ${error.message}`);
  return { c, id: data.user.id };
}

const service = createClient(URL, SERVICE, { auth: { persistSession: false } });
const anon = createClient(URL, ANON, { auth: { persistSession: false } });

const alvaro = await login(ADMIN_EMAIL, ADMIN_PASS);
const camila = await login("camila@demo.com");
const lucas = await login("lucas@demo.com");
const carla = await login("carla@demo.com");
const diego = await login("diego@demo.com");

const { count: totalLessons } = await service.from("lessons").select("*", { count: "exact", head: true });

console.log("\nVisitante (sem login)");
{
  const { data: t } = await anon.from("public_teachers").select("full_name");
  check("vê professores na página pública", (t?.length ?? 0) >= 3);
  const { data: p } = await anon.from("profiles").select("email");
  check("NÃO vê perfis (e-mails/telefones)", (p?.length ?? 0) === 0);
  const { data: s } = await anon.from("site_sections").select("slug");
  check("vê textos do site", (s?.length ?? 0) > 0);
  const { data: l } = await anon.from("lessons").select("id");
  check("NÃO vê aulas", (l?.length ?? 0) === 0);
  const { error } = await anon.auth.signUp({ email: `hacker${Date.now()}@x.com`, password: "12345678" });
  check("cadastro público bloqueado", !!error, "(signup deveria falhar)");
  const { error: sErr } = await anon.from("site_sections").update({ title: "hack" }).eq("slug", "sobre").select();
  const { data: sobre } = await service.from("site_sections").select("title").eq("slug", "sobre").single();
  check("NÃO edita o site", sobre.title !== "hack", sErr?.message);
}

console.log("\nAluna Carla");
let carlaCamilaLesson;
{
  const { data: mine } = await carla.c.from("lessons").select("*");
  check("vê só as próprias aulas", mine.length > 0 && mine.every((l) => l.student_id === carla.id), `(${mine.length})`);
  const { data: dl } = await carla.c.from("lessons").select("id").eq("student_id", diego.id);
  check("NÃO vê aulas do Diego", dl.length === 0);

  carlaCamilaLesson = mine.find((l) => l.teacher_id === camila.id);
  const { data: upd } = await carla.c.from("lessons").update({ status: "canceled" }).eq("id", carlaCamilaLesson.id).select();
  check("NÃO altera aula diretamente", (upd?.length ?? 0) === 0);

  const { error: roleErr } = await carla.c.from("profiles").update({ role: "admin" }).eq("id", carla.id);
  const { data: me } = await service.from("profiles").select("role").eq("id", carla.id).single();
  check("NÃO consegue virar admin", me.role === "student", roleErr?.message ?? "");

  const { error: nameErr } = await carla.c.from("profiles").update({ phone: "11999990000" }).eq("id", carla.id);
  check("edita o próprio telefone", !nameErr, nameErr?.message);

  const { data: perms } = await carla.c.from("teacher_permissions").select("*");
  check("NÃO vê permissões dos professores", perms.length === 0);
}

console.log("\nPedido de remarcação (Carla → Camila)");
let requestId;
const proposed = new Date(Date.parse(carlaCamilaLesson.starts_at) + 26 * 3600e3).toISOString(); // dia seguinte, +2h
{
  const { data: diegoLesson } = await service.from("lessons").select("id").eq("student_id", diego.id).limit(1).single();
  const { error: e1 } = await carla.c
    .from("lesson_change_requests")
    .insert({ lesson_id: diegoLesson.id, requested_by: carla.id, type: "cancel" });
  check("NÃO pede remarcação de aula de outro aluno", !!e1);

  const { data: req, error: e2 } = await carla.c
    .from("lesson_change_requests")
    .insert({ lesson_id: carlaCamilaLesson.id, requested_by: carla.id, type: "reschedule", proposed_starts_at: proposed, reason: "prova" })
    .select()
    .single();
  check("pede remarcação da própria aula", !e2, e2?.message);
  requestId = req?.id;

  const { data: bReq } = await lucas.c.from("lesson_change_requests").select("id").eq("id", requestId);
  check("Lucas (outro prof.) NÃO vê o pedido", bReq.length === 0);
  const { error: bDecide } = await lucas.c.rpc("decide_change_request", { p_request: requestId, p_approve: true });
  check("Lucas NÃO pode aprovar", !!bDecide);
  const { error: cDecide } = await carla.c.rpc("decide_change_request", { p_request: requestId, p_approve: true });
  check("Carla NÃO pode aprovar o próprio pedido", !!cDecide);

  const { data: aReq } = await camila.c.from("lesson_change_requests").select("id").eq("id", requestId);
  check("Camila (professora da aula) vê o pedido", aReq.length === 1);
  const { error: aDecide } = await camila.c.rpc("decide_change_request", { p_request: requestId, p_approve: true, p_response: "ok!" });
  check("Camila aprova", !aDecide, aDecide?.message);
  const { data: les } = await service.from("lessons").select("starts_at, status").eq("id", carlaCamilaLesson.id).single();
  check("aula foi remarcada", Date.parse(les.starts_at) === Date.parse(proposed) && les.status === "rescheduled", JSON.stringify(les));
  const { error: again } = await camila.c.rpc("decide_change_request", { p_request: requestId, p_approve: false });
  check("pedido não pode ser respondido duas vezes", !!again);
}

console.log("\nConflito de horário");
{
  const { data: anaLessons } = await service.from("lessons").select("*").eq("teacher_id", camila.id).neq("status", "canceled").order("starts_at").limit(2);
  const [a, b] = anaLessons;
  const { data: conflict } = await camila.c.rpc("lesson_conflict", { p_teacher: camila.id, p_starts: a.starts_at, p_ends: a.ends_at, p_ignore: b.id });
  check("detecta conflito no mesmo horário", conflict === true);
  const { data: free } = await camila.c.rpc("lesson_conflict", { p_teacher: camila.id, p_starts: "2001-01-01T10:00:00Z", p_ends: "2001-01-01T11:00:00Z" });
  check("horário livre não tem conflito", free === false);
  // Pedido de remarcação para horário ocupado deve falhar na aprovação
  const { data: r } = await carla.c
    .from("lesson_change_requests")
    .insert({ lesson_id: carlaCamilaLesson.id, requested_by: carla.id, type: "reschedule", proposed_starts_at: (a.id === carlaCamilaLesson.id ? b : a).starts_at })
    .select()
    .single();
  const { error } = await camila.c.rpc("decide_change_request", { p_request: r.id, p_approve: true });
  check("aprovação para horário ocupado é bloqueada", !!error && /horário/.test(error.message), error?.message);
  await camila.c.rpc("decide_change_request", { p_request: r.id, p_approve: false });
}

console.log("\nProfessores e Álvaro");
{
  const { data: bl } = await lucas.c.from("lessons").select("teacher_id");
  check("Lucas vê só as próprias aulas", bl.length > 0 && bl.every((l) => l.teacher_id === lucas.id));
  const { data: bStudents } = await lucas.c.from("profiles").select("id").eq("role", "student");
  check("Lucas vê só os próprios alunos", bStudents.length === 1 && bStudents[0].id === diego.id, `(${bStudents.length})`);
  const { data: al } = await alvaro.c.from("lessons").select("id");
  check("Álvaro vê TODAS as aulas", al.length === totalLessons, `(${al.length}/${totalLessons})`);
  const { data: alMine } = await alvaro.c.from("lessons").select("id").eq("teacher_id", alvaro.id);
  check("Álvaro também tem as próprias aulas (é professor)", alMine.length > 0);

  const { data: bUpd } = await lucas.c.from("lessons").update({ notes: "x" }).eq("teacher_id", camila.id).select();
  check("Lucas NÃO altera aulas da Camila", (bUpd?.length ?? 0) === 0);

  const { data: pUpd } = await camila.c.from("teacher_permissions").update({ view_all_calendars: true }).eq("teacher_id", camila.id).select();
  check("Camila NÃO muda as próprias permissões", (pUpd?.length ?? 0) === 0);
}

console.log("\nPermissão 'Calendário geral' (Álvaro liga para o Lucas)");
{
  await alvaro.c.from("teacher_permissions").update({ view_all_calendars: true }).eq("teacher_id", lucas.id);
  const { data: bl } = await lucas.c.from("lessons").select("id");
  check("Lucas passa a ver todas as aulas", bl.length === totalLessons, `(${bl.length}/${totalLessons})`);
  const { data: bUpd } = await lucas.c.from("lessons").update({ notes: "x" }).eq("teacher_id", camila.id).select();
  check("...mas continua sem alterar aulas da Camila", (bUpd?.length ?? 0) === 0);
  await alvaro.c.from("teacher_permissions").update({ view_all_calendars: false }).eq("teacher_id", lucas.id);
  const { data: bl2 } = await lucas.c.from("lessons").select("teacher_id");
  check("desligando, volta a ver só as próprias", bl2.every((l) => l.teacher_id === lucas.id));
}

console.log("\nFestivais");
{
  const { error: cErr } = await carla.c.from("festivals").insert({ title: "x", date: "2026-01-01" });
  check("aluna NÃO cria festival", !!cErr);
  const { error: bErr } = await lucas.c.from("festivals").insert({ title: "x", date: "2026-01-01" });
  check("Lucas (sem permissão) NÃO cria festival", !!bErr);
  const { data: f, error: aErr } = await camila.c.from("festivals").insert({ title: "Teste RLS", date: "2026-01-01" }).select().single();
  check("Camila (com permissão Festivais) cria festival", !aErr, aErr?.message);

  const png = new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], { type: "image/png" });
  const path = `${f.id}/teste.png`;
  const { error: upA } = await camila.c.storage.from("festival-photos").upload(path, png, { contentType: "image/png" });
  check("Camila envia foto", !upA, upA?.message);
  const { error: upC } = await carla.c.storage.from("festival-photos").upload(`${f.id}/hack.png`, png, { contentType: "image/png" });
  check("aluna NÃO envia foto", !!upC);
  const { data: signed, error: sErr } = await carla.c.storage.from("festival-photos").createSignedUrl(path, 60);
  check("aluna vê/baixa a foto", !!signed?.signedUrl && !sErr, sErr?.message);
  const { error: anonErr } = await anon.storage.from("festival-photos").createSignedUrl(path, 60);
  check("visitante NÃO acessa fotos dos festivais", !!anonErr);

  await alvaro.c.from("teacher_permissions").update({ manage_festivals: false }).eq("teacher_id", camila.id);
  const { error: offErr } = await camila.c.from("festivals").insert({ title: "y", date: "2026-01-01" });
  check("Álvaro desliga a permissão → Camila não cria mais", !!offErr);
  await alvaro.c.from("teacher_permissions").update({ manage_festivals: true }).eq("teacher_id", camila.id);

  await service.storage.from("festival-photos").remove([path]);
  await service.from("festivals").delete().eq("id", f.id);
}

console.log("\nChat, arquivos e tempo real");
{
  const { data: conv } = await carla.c.from("conversations").select("*").eq("teacher_id", camila.id).single();
  const { data: diegoConv } = await service.from("conversations").select("*").eq("student_id", diego.id).single();
  const { data: carlaConvs } = await carla.c.from("conversations").select("id");
  check("Carla vê só as próprias conversas", carlaConvs.length === 2, `(${carlaConvs.length})`);

  // Realtime: Carla escuta, Camila envia
  const received = [];
  const diegoReceived = [];
  const ch = carla.c
    .channel("t1")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conv.id}` }, (p) => received.push(p.new))
  const ch2 = diego.c
    .channel("t2")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conv.id}` }, (p) => diegoReceived.push(p.new))
  await carla.c.realtime.setAuth((await carla.c.auth.getSession()).data.session.access_token);
  await diego.c.realtime.setAuth((await diego.c.auth.getSession()).data.session.access_token);
  await Promise.all([
    new Promise((r) => ch.subscribe((s) => s === "SUBSCRIBED" && r())),
    new Promise((r) => ch2.subscribe((s) => s === "SUBSCRIBED" && r())),
  ]);
  await new Promise((r) => setTimeout(r, 1500));

  const { error: mErr } = await camila.c.from("messages").insert({ conversation_id: conv.id, sender_id: camila.id, body: "Oi Carla! Link: https://meet.google.com/abc" });
  check("Camila envia mensagem", !mErr, mErr?.message);
  for (let i = 0; i < 20 && received.length === 0; i++) await new Promise((r) => setTimeout(r, 250));
  check("Carla recebe em tempo real", received.length === 1);
  check("Diego NÃO recebe mensagens da conversa da Carla", diegoReceived.length === 0);
  await carla.c.removeAllChannels();
  await diego.c.removeAllChannels();

  const { data: dMsgs } = await diego.c.from("messages").select("id").eq("conversation_id", conv.id);
  check("Diego NÃO lê a conversa da Carla", dMsgs.length === 0);
  const { error: fake } = await carla.c.from("messages").insert({ conversation_id: conv.id, sender_id: camila.id, body: "fingindo ser a Camila" });
  check("NÃO envia mensagem em nome de outra pessoa", !!fake);
  const { error: intrude } = await carla.c.from("messages").insert({ conversation_id: diegoConv.id, sender_id: carla.id, body: "oi" });
  check("NÃO envia mensagem em conversa alheia", !!intrude);
  const { data: alvMsgs } = await alvaro.c.from("messages").select("id").eq("conversation_id", conv.id);
  check("Álvaro (diretor) consegue ler", alvMsgs.length > 0);

  // Arquivos
  const file = new Blob(["partitura de teste"], { type: "text/plain" });
  const fpath = `${conv.id}/${Date.now()}-partitura.txt`;
  const { error: uErr } = await carla.c.storage.from("chat-files").upload(fpath, file, { contentType: "text/plain" });
  check("Carla envia arquivo no chat", !uErr, uErr?.message);
  const { data: dl, error: dlErr } = await camila.c.storage.from("chat-files").download(fpath);
  check("Camila baixa o arquivo", !dlErr && (await dl.text()) === "partitura de teste", dlErr?.message);
  const { error: dDl } = await diego.c.storage.from("chat-files").download(fpath);
  check("Diego NÃO baixa o arquivo", !!dDl);
  const { error: dUp } = await diego.c.storage.from("chat-files").upload(`${conv.id}/intruso.txt`, file);
  check("Diego NÃO envia arquivo na conversa da Carla", !!dUp);
  const { error: badPath } = await carla.c.storage.from("chat-files").upload(`nao-e-uuid/x.txt`, file);
  check("caminho inválido é recusado (sem erro de cast)", !!badPath && !/uuid/i.test(badPath.message), badPath?.message);

  await service.storage.from("chat-files").remove([fpath]);
}

console.log(`\n${passed} passaram, ${failed} falharam\n`);
process.exit(failed ? 1 : 0);
