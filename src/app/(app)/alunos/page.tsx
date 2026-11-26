import Link from "next/link";
import { MessageSquare, CalendarPlus, UserPlus, Video, MapPin } from "lucide-react";
import { can, requireTeacher } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ENROLLMENT_SELECT, type EnrollmentFull } from "@/lib/queries";
import { Avatar, EmptyState, Flash, PageHeader, StatusBadge } from "@/components/ui";
import { SearchFilter } from "@/components/SearchFilter";
import { SubmitButton } from "@/components/SubmitButton";
import { createLessons } from "@/lib/actions/lessons";
import { createEnrollment, createPerson, resetPassword, setActive, setEnrollmentStatus } from "@/lib/actions/people";
import type { Instrument } from "@/lib/types";

export const metadata = { title: "Alunos" };

export default async function AlunosPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const user = await requireTeacher();
  const manage = can(user, "manage_students");
  const supabase = await createClient();

  let enrQ = supabase.from("enrollments").select(ENROLLMENT_SELECT).order("created_at", { ascending: false });
  if (!manage) enrQ = enrQ.eq("teacher_id", user.id);
  const [{ data: enrollments }, { data: students }, { data: teachers }, { data: instruments }, { data: convs }] =
    await Promise.all([
      enrQ.returns<EnrollmentFull[]>(),
      supabase.from("profiles").select("id, full_name, email, active").eq("role", "student").order("full_name"),
      supabase.from("profiles").select("id, full_name").in("role", ["admin", "teacher"]).eq("active", true).order("full_name"),
      supabase.from("instruments").select("*").order("sort").returns<Instrument[]>(),
      supabase.from("conversations").select("id, enrollment_id"),
    ]);
  const convByEnr = new Map((convs ?? []).map((c) => [c.enrollment_id, c.id]));

  // Agrupa matrículas por aluno
  const byStudent = new Map<string, { student: NonNullable<EnrollmentFull["student"]>; list: EnrollmentFull[] }>();
  for (const e of enrollments ?? []) {
    if (!e.student) continue;
    const g = byStudent.get(e.student_id) ?? { student: e.student, list: [] };
    g.list.push(e);
    byStudent.set(e.student_id, g);
  }
  // Alunos sem matrícula (visíveis apenas para quem gerencia alunos)
  const withoutEnrollment = manage ? (students ?? []).filter((s) => !byStudent.has(s.id)) : [];

  return (
    <div>
      <Flash ok={sp.ok} error={sp.error} />
      <PageHeader
        title={manage ? "Alunos e matrículas" : "Meus alunos"}
        subtitle={manage
          ? "Três passos: cadastre a conta do aluno, faça a matrícula (aluno + professor + instrumento) e agende as aulas. Cada matrícula já cria o chat entre aluno e professor."
          : "Seus alunos e as matrículas com você. Em cada matrícula você agenda as aulas e abre o chat."}
      />

      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        {manage && (
          <details className="card">
            <summary className="flex cursor-pointer items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[13px] font-semibold text-accent-strong">1</span>
              <span>
                <span className="flex items-center gap-2 font-serif text-xl"><UserPlus className="h-5 w-5 text-accent-strong" /> Cadastrar aluno</span>
                <span className="mt-0.5 block text-sm text-muted">Cria o login do aluno. Ele pode trocar a senha depois.</span>
              </span>
            </summary>
            <form action={createPerson} className="mt-4 grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="role" value="student" />
              <div className="sm:col-span-2">
                <label className="label">Nome completo</label>
                <input name="full_name" required className="input" />
              </div>
              <div>
                <label className="label">E-mail (login)</label>
                <input name="email" type="email" required className="input" />
              </div>
              <div>
                <label className="label">Telefone</label>
                <input name="phone" className="input" placeholder="(00) 00000-0000" />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Senha inicial</label>
                <input name="password" required minLength={8} className="input" placeholder="mínimo 8 caracteres" />
                <p className="mt-1 text-xs text-muted">O aluno pode trocar depois em &quot;Meu perfil&quot;.</p>
              </div>
              <div><SubmitButton>Cadastrar</SubmitButton></div>
            </form>
          </details>
        )}

        <details className="card" open={!manage && !(enrollments ?? []).length}>
          <summary className="flex cursor-pointer items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[13px] font-semibold text-accent-strong">{manage ? 2 : 1}</span>
            <span>
              <span className="flex items-center gap-2 font-serif text-xl"><CalendarPlus className="h-5 w-5 text-accent-strong" /> Matricular</span>
              <span className="mt-0.5 block text-sm text-muted">Liga o aluno a um professor e a um instrumento. Depois, agende as aulas no cartão do aluno.</span>
            </span>
          </summary>
          <form action={createEnrollment} className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Aluno</label>
              <select name="student_id" required className="input">
                <option value="">Selecione...</option>
                {(students ?? []).filter((s) => s.active).map((s) => (
                  <option key={s.id} value={s.id}>{s.full_name} ({s.email})</option>
                ))}
              </select>
              {!manage && (
                <p className="mt-1 text-xs text-muted">Aluno novo? Peça ao Álvaro para cadastrar a conta.</p>
              )}
            </div>
            <div>
              <label className="label">Instrumento</label>
              <select name="instrument_id" required className="input">
                {(instruments ?? []).map((i) => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Modalidade</label>
              <select name="mode" className="input">
                <option value="presencial">Presencial</option>
                <option value="online">Online</option>
              </select>
            </div>
            {manage && (
              <div className="sm:col-span-2">
                <label className="label">Professor</label>
                <select name="teacher_id" defaultValue={user.id} className="input">
                  {(teachers ?? []).map((t) => (
                    <option key={t.id} value={t.id}>{t.full_name}{t.id === user.id ? " (eu)" : ""}</option>
                  ))}
                </select>
              </div>
            )}
            <div><SubmitButton>Matricular</SubmitButton></div>
          </form>
        </details>
      </div>

      {byStudent.size === 0 && withoutEnrollment.length === 0 ? (
        <EmptyState title="Nenhum aluno ainda">{manage ? "Comece pelo passo 1: cadastre a conta do aluno. Depois faça a matrícula." : "Quando o Álvaro cadastrar um aluno, faça a matrícula dele com você no passo 1."}</EmptyState>
      ) : (
        <div id="lista-alunos" className="space-y-4">
          <SearchFilter scope="#lista-alunos" placeholder="Buscar aluno pelo nome ou e-mail" />
          {[...byStudent.values()].map(({ student, list }) => (
            <section key={student.id} className="card" data-search={`${student.full_name} ${student.email ?? ""}`}>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <Avatar name={student.full_name} size={42} />
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-lg">
                    {student.full_name}
                    {!student.active && <span className="ml-2 badge border-danger/50 text-danger">Desativado</span>}
                  </p>
                  <p className="truncate text-xs text-muted">{student.email}{student.phone && ` · ${student.phone}`}</p>
                </div>
                {manage && <StudentAdmin id={student.id} active={student.active} isAdmin={user.isAdmin} />}
              </div>

              <div className="space-y-3">
                {list.map((e) => {
                  const canCreate = e.teacher_id === user.id || user.isAdmin;
                  const convId = convByEnr.get(e.id);
                  return (
                    <div key={e.id} className="rounded-xl border border-line bg-surface-2/50 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ background: e.teacher?.color }} />
                        <span className="font-medium">{e.instrument?.name}</span>
                        <span className="text-sm text-muted">· Prof. {e.teacher?.full_name}</span>
                        <span className="flex items-center gap-1 text-xs text-muted">
                          {e.mode === "online" ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                          {e.mode === "online" ? "Online" : "Presencial"}
                        </span>
                        <StatusBadge status={e.status} />
                        <div className="ml-auto flex gap-2">
                          {convId && (
                            <Link href={`/chat/${convId}`} className="btn btn-ghost btn-sm">
                              <MessageSquare className="h-4 w-4" /> Chat
                            </Link>
                          )}
                          <form action={setEnrollmentStatus} className="flex gap-1">
                            <input type="hidden" name="id" value={e.id} />
                            <select name="status" defaultValue={e.status} className="input w-auto py-1 text-xs">
                              <option value="active">Ativa</option>
                              <option value="paused">Pausada</option>
                              <option value="ended">Encerrada</option>
                            </select>
                            <SubmitButton className="btn btn-ghost btn-sm">OK</SubmitButton>
                          </form>
                        </div>
                      </div>
                      {canCreate && e.status === "active" && (
                        <details className="mt-3">
                          <summary className="btn btn-outline btn-sm mt-1 cursor-pointer list-none"><CalendarPlus className="h-4 w-4" /> {manage ? "3. " : ""}Agendar aulas</summary>
                          <p className="mt-2 text-sm text-muted">Escolha a primeira aula e quantas semanas repetir no mesmo dia e horário. Use 1 semana para uma aula avulsa.</p>
                          <form action={createLessons} className="mt-3 grid gap-3 sm:grid-cols-4">
                            <input type="hidden" name="enrollment_id" value={e.id} />
                            <input type="hidden" name="back" value="/alunos" />
                            <div className="sm:col-span-2">
                              <label className="label">Primeira aula</label>
                              <input type="datetime-local" name="starts_at" required className="input" />
                            </div>
                            <div>
                              <label className="label">Duração (min)</label>
                              <input type="number" name="duration" defaultValue={60} min={15} max={240} step={5} className="input" />
                            </div>
                            <div>
                              <label className="label">Semanas</label>
                              <input type="number" name="weeks" defaultValue={4} min={1} max={52} className="input" />
                            </div>
                            {e.mode === "online" && (
                              <div className="sm:col-span-4">
                                <label className="label">Link do Google Meet</label>
                                <input type="url" name="meet_link" placeholder="https://meet.google.com/..." className="input" />
                              </div>
                            )}
                            <div className="sm:col-span-4">
                              <SubmitButton>Criar aulas semanais</SubmitButton>
                            </div>
                          </form>
                        </details>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          {withoutEnrollment.length > 0 && (
            <section className="card">
              <h2 className="h2 mb-3">Alunos sem matrícula</h2>
              <div className="divide-y divide-line">
                {withoutEnrollment.map((s) => (
                  <div key={s.id} className="flex flex-wrap items-center gap-3 py-3" data-search={`${s.full_name} ${s.email ?? ""}`}>
                    <Avatar name={s.full_name} size={32} />
                    <div className="flex-1">
                      <p>{s.full_name} {!s.active && <span className="badge border-danger/50 text-danger">Desativado</span>}</p>
                      <p className="text-xs text-muted">{s.email}</p>
                    </div>
                    <StudentAdmin id={s.id} active={s.active} isAdmin={user.isAdmin} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function StudentAdmin({ id, active, isAdmin }: { id: string; active: boolean; isAdmin: boolean }) {
  return (
    <details className="relative text-sm">
      <summary className="btn btn-ghost btn-sm cursor-pointer list-none">Senha e acesso ▾</summary>
      <div className="absolute right-0 z-20 mt-2 w-72 space-y-3 rounded-xl border border-line bg-surface p-4 shadow-xl">
        <form action={resetPassword} className="space-y-2">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="back" value="/alunos" />
          <label className="label">Nova senha</label>
          <input name="password" minLength={8} required className="input" />
          <SubmitButton className="btn btn-outline btn-sm w-full">Redefinir senha</SubmitButton>
        </form>
        {isAdmin && (
          <form action={setActive}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="back" value="/alunos" />
            <input type="hidden" name="active" value={active ? "false" : "true"} />
            <SubmitButton
              className={active ? "btn btn-danger btn-sm w-full" : "btn btn-outline btn-sm w-full"}
              confirm={active ? "Desativar o acesso deste aluno?" : undefined}
            >
              {active ? "Desativar acesso" : "Reativar acesso"}
            </SubmitButton>
          </form>
        )}
      </div>
    </details>
  );
}
