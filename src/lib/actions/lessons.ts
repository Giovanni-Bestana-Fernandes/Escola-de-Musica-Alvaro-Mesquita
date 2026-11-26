"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireTeacher, requireUser } from "@/lib/auth";
import { redirectWith, str } from "@/lib/flash";
import { isSafeUrl, localInputToIso, formatDateTime } from "@/lib/utils";
import type { Lesson } from "@/lib/types";

async function loadLesson(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("lessons").select("*").eq("id", id).single<Lesson>();
  return { supabase, lesson: data };
}

async function hasConflict(teacherId: string, starts: string, ends: string, ignore?: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("lesson_conflict", {
    p_teacher: teacherId,
    p_starts: starts,
    p_ends: ends,
    p_ignore: ignore ?? null,
  });
  return !!data;
}

function revalidateLessons(id?: string) {
  revalidatePath("/calendario");
  revalidatePath("/inicio");
  if (id) revalidatePath(`/aulas/${id}`);
}

/** Professor/Álvaro remarca a aula diretamente. */
export async function rescheduleLesson(form: FormData) {
  const user = await requireTeacher();
  const id = str(form, "id");
  const back = `/aulas/${id}`;
  const { supabase, lesson } = await loadLesson(id);
  if (!lesson) redirectWith("/calendario", "error", "Aula não encontrada.");
  if (lesson.teacher_id !== user.id && !user.isAdmin) redirectWith(back, "error", "Sem permissão.");

  let starts: string;
  try {
    starts = localInputToIso(str(form, "starts_at"));
  } catch {
    redirectWith(back, "error", "Informe uma data válida.");
  }
  const minutes = Number(str(form, "duration")) || (Date.parse(lesson.ends_at) - Date.parse(lesson.starts_at)) / 60000;
  const ends = new Date(Date.parse(starts) + minutes * 60000).toISOString();

  if (await hasConflict(lesson.teacher_id, starts, ends, id))
    redirectWith(back, "error", "Já existe outra aula do professor nesse horário.");

  const { error } = await supabase
    .from("lessons")
    .update({ starts_at: starts, ends_at: ends, status: "rescheduled" })
    .eq("id", id);
  if (error) redirectWith(back, "error", error.message);
  revalidateLessons(id);
  redirectWith(back, "ok", `Aula remarcada para ${formatDateTime(starts)}.`);
}

/** Arrastar e soltar no calendário. Retorna resultado em vez de redirecionar. */
export async function moveLesson(id: string, startsIso: string, endsIso: string) {
  const user = await requireTeacher();
  const { supabase, lesson } = await loadLesson(id);
  if (!lesson) return { ok: false, error: "Aula não encontrada." };
  if (lesson.teacher_id !== user.id && !user.isAdmin) return { ok: false, error: "Sem permissão." };
  if (lesson.status === "canceled") return { ok: false, error: "Aula cancelada não pode ser movida." };
  if (await hasConflict(lesson.teacher_id, startsIso, endsIso, id))
    return { ok: false, error: "Já existe outra aula do professor nesse horário." };
  const { error } = await supabase
    .from("lessons")
    .update({ starts_at: startsIso, ends_at: endsIso, status: "rescheduled" })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateLessons(id);
  return { ok: true };
}

export async function setLessonStatus(form: FormData) {
  const user = await requireTeacher();
  const id = str(form, "id");
  const status = str(form, "status");
  const back = `/aulas/${id}`;
  if (!["canceled", "done", "scheduled"].includes(status)) redirectWith(back, "error", "Status inválido.");
  const { supabase, lesson } = await loadLesson(id);
  if (!lesson || (lesson.teacher_id !== user.id && !user.isAdmin)) redirectWith(back, "error", "Sem permissão.");
  if (status === "scheduled" && (await hasConflict(lesson.teacher_id, lesson.starts_at, lesson.ends_at, id)))
    redirectWith(back, "error", "O horário já foi ocupado por outra aula.");
  const { error } = await supabase.from("lessons").update({ status }).eq("id", id);
  if (error) redirectWith(back, "error", error.message);
  revalidateLessons(id);
  const msg = { canceled: "Aula cancelada.", done: "Aula marcada como realizada.", scheduled: "Aula reativada." }[status]!;
  redirectWith(back, "ok", msg);
}

export async function updateLessonDetails(form: FormData) {
  const user = await requireTeacher();
  const id = str(form, "id");
  const back = `/aulas/${id}`;
  const meet = str(form, "meet_link");
  if (meet && !isSafeUrl(meet)) redirectWith(back, "error", "Link do Meet inválido.");
  const mode = str(form, "mode") === "online" ? "online" : "presencial";
  const { supabase, lesson } = await loadLesson(id);
  if (!lesson || (lesson.teacher_id !== user.id && !user.isAdmin)) redirectWith(back, "error", "Sem permissão.");
  const { error } = await supabase
    .from("lessons")
    .update({ meet_link: meet || null, notes: str(form, "notes") || null, mode })
    .eq("id", id);
  if (error) redirectWith(back, "error", error.message);
  revalidateLessons(id);
  redirectWith(back, "ok", "Aula atualizada.");
}

export async function deleteLesson(form: FormData) {
  const user = await requireTeacher();
  const id = str(form, "id");
  const { supabase, lesson } = await loadLesson(id);
  if (!lesson || (lesson.teacher_id !== user.id && !user.isAdmin)) redirectWith(`/aulas/${id}`, "error", "Sem permissão.");
  await supabase.from("lessons").delete().eq("id", id);
  revalidateLessons();
  redirectWith("/calendario", "ok", "Aula excluída.");
}

/** Cria uma aula avulsa ou uma série semanal para uma matrícula. */
export async function createLessons(form: FormData) {
  const user = await requireTeacher();
  const enrollmentId = str(form, "enrollment_id");
  const back = str(form, "back") || "/alunos";
  const supabase = await createClient();
  const { data: enr } = await supabase.from("enrollments").select("*").eq("id", enrollmentId).single();
  if (!enr) redirectWith(back, "error", "Matrícula não encontrada.");
  if (enr.teacher_id !== user.id && !user.isAdmin) redirectWith(back, "error", "Só o professor da matrícula pode criar aulas.");

  let first: string;
  try {
    first = localInputToIso(str(form, "starts_at"));
  } catch {
    redirectWith(back, "error", "Informe a data e hora da primeira aula.");
  }
  const minutes = Math.min(Math.max(Number(str(form, "duration")) || 60, 15), 240);
  const weeks = Math.min(Math.max(Number(str(form, "weeks")) || 1, 1), 52);
  const meet = str(form, "meet_link");
  if (meet && !isSafeUrl(meet)) redirectWith(back, "error", "Link do Meet inválido.");

  const rows = [];
  const conflicts: string[] = [];
  for (let w = 0; w < weeks; w++) {
    const s = new Date(Date.parse(first) + w * 7 * 86400000).toISOString();
    const e = new Date(Date.parse(s) + minutes * 60000).toISOString();
    if (await hasConflict(enr.teacher_id, s, e)) conflicts.push(formatDateTime(s));
    rows.push({
      enrollment_id: enr.id,
      teacher_id: enr.teacher_id,
      student_id: enr.student_id,
      instrument_id: enr.instrument_id,
      mode: enr.mode,
      starts_at: s,
      ends_at: e,
      meet_link: meet || null,
    });
  }
  if (conflicts.length) redirectWith(back, "error", `Conflito de horário em: ${conflicts.join(", ")}`);

  const { error } = await supabase.from("lessons").insert(rows);
  if (error) redirectWith(back, "error", error.message);
  revalidateLessons();
  redirectWith(back, "ok", weeks === 1 ? "Aula criada." : `${weeks} aulas criadas.`);
}

/** Aluno solicita remarcação ou cancelamento. */
export async function requestChange(form: FormData) {
  const user = await requireUser();
  const id = str(form, "lesson_id");
  const back = `/aulas/${id}`;
  const type = str(form, "type") === "cancel" ? "cancel" : "reschedule";
  let proposed: string | null = null;
  if (type === "reschedule") {
    try {
      proposed = localInputToIso(str(form, "proposed_starts_at"));
    } catch {
      redirectWith(back, "error", "Sugira uma nova data e horário.");
    }
    if (Date.parse(proposed) < Date.now()) redirectWith(back, "error", "A nova data precisa ser no futuro.");
  }
  const supabase = await createClient();
  const { count } = await supabase
    .from("lesson_change_requests")
    .select("*", { count: "exact", head: true })
    .eq("lesson_id", id)
    .eq("status", "pending");
  if (count) redirectWith(back, "error", "Já existe um pedido pendente para esta aula.");

  const { error } = await supabase.from("lesson_change_requests").insert({
    lesson_id: id,
    requested_by: user.id,
    type,
    proposed_starts_at: proposed,
    reason: str(form, "reason") || null,
  });
  if (error) redirectWith(back, "error", error.message);
  revalidateLessons(id);
  redirectWith(back, "ok", "Pedido enviado ao professor.");
}

export async function withdrawRequest(form: FormData) {
  await requireUser();
  const id = str(form, "request_id");
  const lessonId = str(form, "lesson_id");
  const supabase = await createClient();
  await supabase.from("lesson_change_requests").delete().eq("id", id);
  revalidateLessons(lessonId);
  redirectWith(`/aulas/${lessonId}`, "ok", "Pedido retirado.");
}

/** Professor da aula (ou Álvaro) aprova ou recusa o pedido. */
export async function decideRequest(form: FormData) {
  await requireTeacher();
  const id = str(form, "request_id");
  const back = str(form, "back") || "/inicio";
  const approve = str(form, "decision") === "approve";
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_change_request", {
    p_request: id,
    p_approve: approve,
    p_response: str(form, "response") || null,
  });
  if (error) redirectWith(back, "error", error.message);
  revalidateLessons(str(form, "lesson_id") || undefined);
  redirectWith(back, "ok", approve ? "Pedido aprovado e aula atualizada." : "Pedido recusado.");
}
