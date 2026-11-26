"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { can, requireAdmin, requireTeacher } from "@/lib/auth";
import { redirectWith, str } from "@/lib/flash";
import type { Permission } from "@/lib/types";

const PERMS: Permission[] = ["manage_festivals", "manage_students", "view_all_calendars", "manage_financial"];

/**
 * Cria a conta de um professor (só Álvaro) ou aluno (Álvaro ou professor com permissão "Alunos").
 * O papel é gravado em app_metadata, que só a service role pode definir.
 */
export async function createPerson(form: FormData) {
  const role = str(form, "role") === "teacher" ? "teacher" : "student";
  const back = role === "teacher" ? "/admin/professores" : "/alunos";
  const user = role === "teacher" ? await requireAdmin() : await requireTeacher();
  if (role === "student" && !can(user, "manage_students"))
    redirectWith(back, "error", "Você não tem permissão para cadastrar alunos. Fale com o Álvaro.");

  const full_name = str(form, "full_name");
  const email = str(form, "email").toLowerCase();
  const password = str(form, "password");
  if (!full_name || !email) redirectWith(back, "error", "Informe nome e e-mail.");
  if (password.length < 8) redirectWith(back, "error", "A senha inicial precisa ter pelo menos 8 caracteres.");

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, phone: str(form, "phone") || null },
    app_metadata: { role },
  });
  if (error) {
    const msg = error.message.includes("already") ? "Já existe uma conta com esse e-mail." : error.message;
    redirectWith(back, "error", msg);
  }

  if (role === "teacher") {
    const instruments = form.getAll("instruments").map(Number).filter(Boolean);
    if (instruments.length)
      await admin
        .from("teacher_instruments")
        .insert(instruments.map((instrument_id) => ({ teacher_id: data.user.id, instrument_id })));
    const color = str(form, "color");
    if (/^#[0-9a-f]{6}$/i.test(color)) await admin.from("profiles").update({ color }).eq("id", data.user.id);
  }

  revalidatePath(back);
  redirectWith(back, "ok", `Conta criada para ${full_name}. Envie o e-mail e a senha inicial para a pessoa.`);
}

export async function setPermissions(form: FormData) {
  await requireAdmin();
  const teacherId = str(form, "teacher_id");
  const patch = Object.fromEntries(PERMS.map((p) => [p, form.get(p) === "on"]));
  const supabase = await createClient();
  const { error } = await supabase
    .from("teacher_permissions")
    .upsert({ teacher_id: teacherId, ...patch, updated_at: new Date().toISOString() });
  if (error) redirectWith("/admin/professores", "error", error.message);
  revalidatePath("/admin/professores");
  redirectWith("/admin/professores", "ok", "Permissões salvas.");
}

export async function setTeacherInstruments(form: FormData) {
  await requireAdmin();
  const teacherId = str(form, "teacher_id");
  const instruments = form.getAll("instruments").map(Number).filter(Boolean);
  const supabase = await createClient();
  await supabase.from("teacher_instruments").delete().eq("teacher_id", teacherId);
  if (instruments.length)
    await supabase
      .from("teacher_instruments")
      .insert(instruments.map((instrument_id) => ({ teacher_id: teacherId, instrument_id })));
  const color = str(form, "color");
  if (/^#[0-9a-f]{6}$/i.test(color)) await supabase.from("profiles").update({ color }).eq("id", teacherId);
  revalidatePath("/admin/professores");
  redirectWith("/admin/professores", "ok", "Professor atualizado.");
}

export async function setActive(form: FormData) {
  const me = await requireAdmin();
  const id = str(form, "id");
  const back = str(form, "back") || "/admin/professores";
  if (id === me.id) redirectWith(back, "error", "Você não pode desativar a própria conta.");
  const active = str(form, "active") === "true";
  const admin = createAdminClient();
  await admin.from("profiles").update({ active }).eq("id", id);
  // Usuário desativado também não consegue mais fazer login.
  await admin.auth.admin.updateUserById(id, { ban_duration: active ? "none" : "876000h" });
  revalidatePath(back);
  redirectWith(back, "ok", active ? "Conta reativada." : "Conta desativada.");
}

export async function resetPassword(form: FormData) {
  const me = await requireTeacher();
  const id = str(form, "id");
  const back = str(form, "back") || "/alunos";
  const password = str(form, "password");
  if (password.length < 8) redirectWith(back, "error", "A senha precisa ter pelo menos 8 caracteres.");
  const admin = createAdminClient();
  const { data: target } = await admin.from("profiles").select("role").eq("id", id).single();
  const allowed = me.isAdmin || (target?.role === "student" && can(me, "manage_students"));
  if (!allowed) redirectWith(back, "error", "Sem permissão.");
  const { error } = await admin.auth.admin.updateUserById(id, { password });
  if (error) redirectWith(back, "error", error.message);
  redirectWith(back, "ok", "Senha redefinida.");
}

export async function createEnrollment(form: FormData) {
  const me = await requireTeacher();
  const back = "/alunos";
  const teacherId = str(form, "teacher_id") || me.id;
  if (teacherId !== me.id && !can(me, "manage_students"))
    redirectWith(back, "error", "Você só pode matricular alunos com você mesmo.");
  const supabase = await createClient();
  const { error } = await supabase.from("enrollments").insert({
    student_id: str(form, "student_id"),
    teacher_id: teacherId,
    instrument_id: Number(str(form, "instrument_id")),
    mode: str(form, "mode") === "online" ? "online" : "presencial",
  });
  if (error) redirectWith(back, "error", error.message);
  revalidatePath(back);
  revalidatePath("/chat");
  redirectWith(back, "ok", "Matrícula criada. O chat entre aluno e professor já está disponível.");
}

export async function setEnrollmentStatus(form: FormData) {
  await requireTeacher();
  const id = str(form, "id");
  const status = str(form, "status");
  if (!["active", "paused", "ended"].includes(status)) redirectWith("/alunos", "error", "Status inválido.");
  const supabase = await createClient();
  const { error } = await supabase.from("enrollments").update({ status }).eq("id", id);
  if (error) redirectWith("/alunos", "error", error.message);
  if (status === "ended") {
    await supabase
      .from("lessons")
      .update({ status: "canceled" })
      .eq("enrollment_id", id)
      .gt("starts_at", new Date().toISOString())
      .in("status", ["scheduled", "rescheduled"]);
  }
  revalidatePath("/alunos");
  redirectWith("/alunos", "ok", "Matrícula atualizada.");
}

export async function addInstrument(form: FormData) {
  await requireAdmin();
  const name = str(form, "name");
  if (!name) redirectWith("/admin/instrumentos", "error", "Informe o nome.");
  const slug = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const supabase = await createClient();
  const { error } = await supabase
    .from("instruments")
    .insert({ name, slug, description: str(form, "description") || null, sort: Number(str(form, "sort")) || 99 });
  if (error) redirectWith("/admin/instrumentos", "error", error.message);
  revalidatePath("/admin/instrumentos");
  revalidatePath("/");
  redirectWith("/admin/instrumentos", "ok", "Instrumento adicionado.");
}

export async function updateInstrument(form: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("instruments")
    .update({
      name: str(form, "name"),
      description: str(form, "description") || null,
      sort: Number(str(form, "sort")) || 0,
    })
    .eq("id", Number(str(form, "id")));
  if (error) redirectWith("/admin/instrumentos", "error", error.message);
  revalidatePath("/admin/instrumentos");
  revalidatePath("/");
  redirectWith("/admin/instrumentos", "ok", "Instrumento atualizado.");
}
