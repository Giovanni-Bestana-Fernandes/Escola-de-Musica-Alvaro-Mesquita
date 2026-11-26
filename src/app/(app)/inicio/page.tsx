import Link from "next/link";
import { CalendarDays, MessageSquare, Video, CalendarPlus, ArrowRight, MapPin } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LESSON_SELECT, REQUEST_SELECT, type LessonFull, type RequestFull } from "@/lib/queries";
import { EmptyState, Flash, REQUEST_EXPLAIN, Section, StatCard, StatusBadge } from "@/components/ui";
import { LessonCard } from "@/components/LessonCard";
import { RequestItem } from "@/components/RequestItem";
import { formatDateTime, formatTime, TZ_OFFSET } from "@/lib/utils";

export const metadata = { title: "Início" };

/** Início e fim do dia de hoje no horário de Brasília, em ISO. */
function todayRange() {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const start = new Date(`${day}T00:00:00${TZ_OFFSET}`);
  return { start: start.toISOString(), end: new Date(start.getTime() + 86400000).toISOString() };
}
/** A semana de hoje (segunda a domingo), no horário de Brasília. */
function weekRange() {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const noon = new Date(`${day}T12:00:00${TZ_OFFSET}`);
  const dow = (noon.getUTCDay() + 6) % 7;
  const monday = new Date(`${day}T00:00:00${TZ_OFFSET}`).getTime() - dow * 86400000;
  return { start: new Date(monday).toISOString(), end: new Date(monday + 7 * 86400000).toISOString() };
}

export default async function InicioPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const firstName = user.full_name.split(" ")[0];
  return (
    <div>
      <Flash ok={sp.ok} error={sp.error} />
      <div className="mb-8">
        <h1 className="h1">Olá, {firstName}</h1>
        <p className="mt-2 text-[15px] text-muted">
          {user.isStudent
            ? "Aqui está a sua próxima aula e o que mudou na sua agenda."
            : "Sua agenda de hoje e o que está esperando a sua resposta."}
        </p>
      </div>
      {user.isStudent ? <StudentHome userId={user.id} /> : <TeacherHome userId={user.id} isAdmin={user.isAdmin} />}
    </div>
  );
}

// ---------------------------------------------------------------- aluno
async function StudentHome({ userId }: { userId: string }) {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const [{ data: lessons }, { data: requests }] = await Promise.all([
    supabase
      .from("lessons")
      .select(LESSON_SELECT)
      .eq("student_id", userId)
      .gte("ends_at", now)
      .neq("status", "canceled")
      .order("starts_at")
      .limit(6)
      .returns<LessonFull[]>(),
    supabase
      .from("lesson_change_requests")
      .select(REQUEST_SELECT)
      .eq("requested_by", userId)
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<RequestFull[]>(),
  ]);
  const next = lessons?.[0];
  const rest = lessons?.slice(1) ?? [];
  let convId: string | null = null;
  if (next) {
    const { data } = await supabase.from("conversations").select("id").eq("enrollment_id", next.enrollment_id).maybeSingle();
    convId = data?.id ?? null;
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 [&>*]:min-w-0">
      <div className="min-w-0 space-y-6 lg:col-span-2">
        {next ? (
          <section className="card-accent p-6 md:p-8">
            <p className="text-[13px] font-medium text-accent-strong">Sua próxima aula</p>
            <h2 className="mt-2 font-serif text-3xl">{next.instrument?.name}</h2>
            <p className="mt-1 text-lg first-letter:uppercase">
              {formatDateTime(next.starts_at, { weekday: "long", month: "long" })} – {formatTime(next.ends_at)}
            </p>
            <p className="mt-2 flex items-center gap-2 text-sm text-muted">
              {next.mode === "online" ? <Video className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
              {next.mode === "online" ? "Online, pelo Google Meet" : "Presencial, na sede"} · Prof. {next.teacher?.full_name}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {next.mode === "online" && next.meet_link && (
                <a href={next.meet_link} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                  <Video className="h-4 w-4" /> Entrar no Meet
                </a>
              )}
              {convId && (
                <Link href={`/chat/${convId}`} className="btn btn-outline">
                  <MessageSquare className="h-4 w-4" /> Falar com o professor
                </Link>
              )}
              <Link href={`/aulas/${next.id}`} className="btn btn-ghost">
                Remarcar ou cancelar <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        ) : (
          <EmptyState title="Nenhuma aula marcada" action={{ href: "/chat", label: "Falar com o professor" }}>
            Quando o seu professor agendar as aulas, a próxima aparece aqui com o horário e o link do Meet.
          </EmptyState>
        )}

        {rest.length > 0 && (
          <Section
            title="Depois dessa"
            hint="Toque numa aula para ver os detalhes ou pedir para remarcar."
            action={
              <Link href="/calendario" className="btn btn-ghost btn-sm">
                <CalendarDays className="h-4 w-4" /> Ver agenda
              </Link>
            }
          >
            <div className="space-y-2">
              {rest.map((l) => (
                <LessonCard key={l.id} lesson={l} viewer="student" />
              ))}
            </div>
          </Section>
        )}
      </div>

      <Section title="Meus pedidos" hint="Remarcações e cancelamentos que você pediu.">
        {requests?.length ? (
          <ul className="space-y-3">
            {requests.map((r) => (
              <li key={r.id} className="rounded-xl border border-line bg-surface-2/50 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">
                    {r.type === "cancel" ? "Cancelar" : "Remarcar"} {r.lesson.instrument?.name}
                  </span>
                  <StatusBadge status={r.status} />
                </div>
                <p className="mt-1 text-muted">{REQUEST_EXPLAIN[r.status]}.</p>
                {r.response && <p className="mt-1">Resposta: “{r.response}”</p>}
                <Link href={`/aulas/${r.lesson_id}`} className="mt-1 inline-block text-accent-strong hover:underline">
                  Ver a aula
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">
            Precisa faltar? Abra a aula e escolha <strong className="text-fg">Remarcar ou cancelar</strong>. O pedido vai
            para o seu professor.
          </p>
        )}
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------- professor e Álvaro
async function TeacherHome({ userId, isAdmin }: { userId: string; isAdmin: boolean }) {
  const supabase = await createClient();
  const today = todayRange();
  const week = weekRange();

  const [{ data: todayLessons }, { data: upcoming }, { data: pending }, { count: myStudents }] = await Promise.all([
    supabase
      .from("lessons")
      .select(LESSON_SELECT)
      .eq("teacher_id", userId)
      .gte("starts_at", today.start)
      .lt("starts_at", today.end)
      .neq("status", "canceled")
      .order("starts_at")
      .returns<LessonFull[]>(),
    supabase
      .from("lessons")
      .select(LESSON_SELECT)
      .eq("teacher_id", userId)
      .gte("starts_at", today.end)
      .neq("status", "canceled")
      .order("starts_at")
      .limit(4)
      .returns<LessonFull[]>(),
    supabase
      .from("lesson_change_requests")
      .select(REQUEST_SELECT)
      .eq("status", "pending")
      .eq("lesson.teacher_id", userId)
      .order("created_at")
      .returns<RequestFull[]>(),
    supabase.from("enrollments").select("*", { count: "exact", head: true }).eq("teacher_id", userId).eq("status", "active"),
  ]);

  let school: { students: number; teachers: number; week: number; pending: number } | null = null;
  if (isAdmin) {
    const [st, te, wk, pe] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "student").eq("active", true),
      supabase.from("profiles").select("*", { count: "exact", head: true }).in("role", ["teacher", "admin"]).eq("active", true),
      supabase
        .from("lessons")
        .select("*", { count: "exact", head: true })
        .gte("starts_at", week.start)
        .lt("starts_at", week.end)
        .neq("status", "canceled"),
      supabase.from("lesson_change_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
    ]);
    school = { students: st.count ?? 0, teachers: te.count ?? 0, week: wk.count ?? 0, pending: pe.count ?? 0 };
  }

  const list = todayLessons?.length ? todayLessons : (upcoming ?? []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Aulas hoje" value={todayLessons?.length ?? 0} href="/calendario" />
        <StatCard label="Pedidos para responder" value={pending?.length ?? 0} hint={pending?.length ? "Veja abaixo" : "Tudo em dia"} />
        <StatCard label="Meus alunos ativos" value={myStudents ?? 0} href="/alunos" />
        <Link href="/alunos" className="card flex flex-col justify-between gap-2 p-4">
          <CalendarPlus className="h-5 w-5 text-accent-strong" />
          <span className="font-medium">Agendar aulas</span>
          <span className="text-[13px] text-muted">Matricule um aluno e crie as aulas da semana</span>
        </Link>
      </div>

      {school && (
        <Section title="Visão geral da escola" hint="Todos os professores somados. Só a direção vê estes números.">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Alunos ativos" value={school.students} href="/alunos" />
            <StatCard label="Professores" value={school.teachers} href="/admin/professores" />
            <StatCard label="Aulas nesta semana" value={school.week} href="/calendario" />
            <StatCard label="Pedidos pendentes" value={school.pending} hint="Em todas as turmas" />
          </div>
        </Section>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 [&>*]:min-w-0">
        <Section
          className="lg:col-span-3"
          title="Hoje"
          hint={todayLessons?.length ? "Suas aulas de hoje, em ordem." : "Nenhuma aula hoje. Estas são as próximas."}
          action={
            <Link href="/calendario" className="btn btn-ghost btn-sm">
              <CalendarDays className="h-4 w-4" /> Agenda
            </Link>
          }
        >
          {list.length ? (
            <div className="space-y-2">
              {list.map((l) => (
                <LessonCard key={l.id} lesson={l} viewer="teacher" />
              ))}
            </div>
          ) : (
            <EmptyState title="Nenhuma aula agendada" action={{ href: "/alunos", label: "Agendar aulas" }}>
              Abra um aluno e use “Agendar aulas” para criar as aulas semanais.
            </EmptyState>
          )}
        </Section>

        <Section
          className="lg:col-span-2"
          title="Pedidos para responder"
          hint="Alunos pedindo para remarcar ou cancelar. Aprovar já atualiza a agenda."
        >
          {pending?.length ? (
            <div className="space-y-3">
              {pending.map((r) => (
                <RequestItem key={r.id} request={r} canDecide back="/inicio" />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">Nenhum pedido esperando você.</p>
          )}
        </Section>
      </div>
    </div>
  );
}
