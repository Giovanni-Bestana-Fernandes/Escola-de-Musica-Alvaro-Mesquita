// Cria o usuário admin (Álvaro) e, com --demo, professores, alunos, matrículas e aulas de exemplo.
// Uso: npm run seed        (só o admin, a partir de ADMIN_EMAIL / ADMIN_PASSWORD)
//      npm run seed:demo   (admin + dados de demonstração; senha de todos: "senha123")
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });
const demo = process.argv.includes("--demo");

async function ensureUser({ email, password, full_name, role, color }) {
  const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
  const existing = list?.users.find((u) => u.email === email);
  if (existing) {
    console.log(`= ${email} já existe`);
    return existing.id;
  }
  const { data, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
    app_metadata: { role },
  });
  if (error) throw error;
  if (color) await db.from("profiles").update({ color }).eq("id", data.user.id);
  console.log(`+ ${role.padEnd(7)} ${email}`);
  return data.user.id;
}

const { data: instruments } = await db.from("instruments").select("id, slug");
const inst = Object.fromEntries((instruments ?? []).map((i) => [i.slug, i.id]));
if (!inst.guitarra) {
  console.error("Instrumentos não encontrados. Rode supabase/seed.sql antes.");
  process.exit(1);
}

if (!process.env.ADMIN_EMAIL && !demo) {
  console.error("Defina ADMIN_EMAIL e ADMIN_PASSWORD em .env.local (ou use npm run seed:demo).");
  process.exit(1);
}
const alvaroId = await ensureUser({
  email: process.env.ADMIN_EMAIL ?? (demo ? "alvaro@demo.com" : undefined),
  password: process.env.ADMIN_PASSWORD ?? "senha123",
  full_name: process.env.ADMIN_NAME ?? "Álvaro Mesquita",
  role: "admin",
  color: "#a0782c",
});
await db
  .from("profiles")
  .update({ nickname: "Alvarinho", bio: "Fundador da escola e responsável pelo Projeto de Bandas." })
  .eq("id", alvaroId);
// a equipe do cartaz "Conheça a nossa equipe": Alvarinho e Lucas dão guitarra, violão, contrabaixo, canto e
// ukulele; Camila dá teclado
const CORDAS = [inst.guitarra, inst.violao, inst.baixo, inst.canto, inst.ukulele];
await db.from("teacher_instruments").upsert(CORDAS.map((instrument_id) => ({ teacher_id: alvaroId, instrument_id })));

if (demo) {
  const pass = "senha123";
  const camila = await ensureUser({ email: "camila@demo.com", password: pass, full_name: "Camila", role: "teacher", color: "#db2777" });
  const lucas = await ensureUser({ email: "lucas@demo.com", password: pass, full_name: "Lucas", role: "teacher", color: "#0891b2" });
  const carla = await ensureUser({ email: "carla@demo.com", password: pass, full_name: "Carla Alves", role: "student" });
  const diego = await ensureUser({ email: "diego@demo.com", password: pass, full_name: "Diego Rocha", role: "student" });

  await db.from("teacher_instruments").upsert([
    { teacher_id: camila, instrument_id: inst.teclado },
    ...CORDAS.map((instrument_id) => ({ teacher_id: lucas, instrument_id })),
  ]);
  await db.from("teacher_permissions").update({ manage_festivals: true }).eq("teacher_id", camila);

  const { count } = await db.from("enrollments").select("*", { count: "exact", head: true });
  if (!count) {
    const { data: enr, error } = await db
      .from("enrollments")
      .insert([
        { student_id: carla, teacher_id: alvaroId, instrument_id: inst.guitarra, mode: "presencial" },
        { student_id: carla, teacher_id: camila, instrument_id: inst.teclado, mode: "online" },
        { student_id: diego, teacher_id: lucas, instrument_id: inst.baixo, mode: "presencial" },
      ])
      .select();
    if (error) throw error;

    // 6 semanas de aulas a partir da próxima segunda-feira (horário de Brasília)
    const base = new Date();
    base.setUTCDate(base.getUTCDate() + ((8 - base.getUTCDay()) % 7 || 7));
    const slots = [
      { e: enr[0], day: 0, hour: 14 },
      { e: enr[1], day: 1, hour: 18 },
      { e: enr[2], day: 2, hour: 10 },
    ];
    const lessons = [];
    for (const { e, day, hour } of slots) {
      for (let w = 0; w < 6; w++) {
        const d = new Date(base);
        d.setUTCDate(d.getUTCDate() + day + w * 7);
        d.setUTCHours(hour + 3, 0, 0, 0); // -03:00 -> UTC
        lessons.push({
          enrollment_id: e.id,
          teacher_id: e.teacher_id,
          student_id: e.student_id,
          instrument_id: e.instrument_id,
          mode: e.mode,
          starts_at: d.toISOString(),
          ends_at: new Date(d.getTime() + 60 * 60 * 1000).toISOString(),
          meet_link: e.mode === "online" ? "https://meet.google.com/abc-defg-hij" : null,
        });
      }
    }
    const { error: lerr } = await db.from("lessons").insert(lessons);
    if (lerr) throw lerr;
    console.log(`+ ${enr.length} matrículas, ${lessons.length} aulas`);

    await db.from("festivals").insert({
      title: "Festival de Inverno",
      date: new Date().toISOString().slice(0, 10),
      location: "Nova sede",
      description: "Todos os alunos no palco!",
      created_by: alvaroId,
    });
  }
  console.log("\nLogins de demonstração (senha: senha123):");
  console.log("  admin:  alvaro@demo.com (ou ADMIN_EMAIL)\n  prof.:  camila@demo.com, lucas@demo.com\n  alunos: carla@demo.com, diego@demo.com");
}
console.log("\nPronto!");
