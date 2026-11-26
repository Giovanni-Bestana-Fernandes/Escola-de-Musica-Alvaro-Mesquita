import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Video, MapPin, MessageSquare, Clock, User, Music } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LESSON_SELECT, REQUEST_SELECT, type LessonFull, type RequestFull } from "@/lib/queries";
import { Flash, StatusBadge } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { RequestItem } from "@/components/RequestItem";
import { RequestForm } from "@/components/RequestForm";
import {
  rescheduleLesson,
  setLessonStatus,
  updateLessonDetails,
  withdrawRequest,
  deleteLesson,
} from "@/lib/actions/lessons";
import { formatDateTime, formatTime, isoToLocalInput } from "@/lib/utils";

export const metadata = { title: "Aula" };

export default async function AulaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const user = await requireUser();
  const supabase = await createClient();

  const { data: lesson } = await supabase.from("lessons").select(LESSON_SELECT).eq("id", id).maybeSingle<LessonFull>();
  if (!lesson) notFound();

  const [{ data: requests }, { data: conv }] = await Promise.all([
    supabase
      .from("lesson_change_requests")
      .select(REQUEST_SELECT)
      .eq("lesson_id", id)
      .order("created_at", { ascending: false })
      .returns<RequestFull[]>(),
    supabase.from("conversations").select("id").eq("enrollment_id", lesson.enrollment_id).maybeSingle(),
  ]);

  const canManage = user.isAdmin || lesson.teacher_id === user.id;
  const isMyLesson = lesson.student_id === user.id;
  const pending = requests?.find((r) => r.status === "pending");
  const isPast = Date.parse(lesson.ends_at) < Date.now();
  const active = lesson.status !== "canceled";
  const duration = Math.round((Date.parse(lesson.ends_at) - Date.parse(lesson.starts_at)) / 60000);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/calendario" className="btn btn-ghost -ml-3 mb-4">
        <ArrowLeft className="h-4 w-4" /> Calendário
      </Link>
      <Flash ok={sp.ok} error={sp.error} />

      <div className="card-accent mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-serif text-2xl text-fg">Aula de {lesson.instrument?.name}</h1>
            <p className="mt-1 first-letter:uppercase text-accent-strong">
              {formatDateTime(lesson.starts_at, { weekday: "long", month: "long" })} – {formatTime(lesson.ends_at)}
            </p>
          </div>
          <StatusBadge status={lesson.status} />
        </div>
        <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
          <Info icon={User} label="Aluno" value={lesson.student?.full_name} />
          <Info icon={Music} label="Professor" value={lesson.teacher?.full_name} />
          <Info icon={lesson.mode === "online" ? Video : MapPin} label="Modalidade" value={lesson.mode === "online" ? "Online" : "Presencial"} />
          <Info icon={Clock} label="Duração" value={`${duration} min`} />
        </div>
        {lesson.notes && <p className="mt-4 rounded-xl bg-surface-2 p-3 text-sm text-fg/85">{lesson.notes}</p>}
        <div className="mt-5 flex flex-wrap gap-2">
          {lesson.meet_link && active && (
            <a href={lesson.meet_link} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
              <Video className="h-4 w-4" /> Entrar no Google Meet
            </a>
          )}
          {conv && (
            <Link href={`/chat/${conv.id}`} className="btn btn-outline">
              <MessageSquare className="h-4 w-4" /> Abrir chat
            </Link>
          )}
        </div>
      </div>

      <StatusTimeline status={lesson.status} pending={!!pending} lastDecided={requests?.find((r) => r.status !== "pending")?.status ?? null} />

      {/* Aluno: solicitar remarcação/cancelamento */}
      {isMyLesson && active && !isPast && !pending && (
        <section className="card mb-6">
          <h2 className="h2 mb-1">Precisa remarcar ou cancelar?</h2>
          <p className="mb-4 text-sm text-muted">Seu pedido vai para o professor, que aprova ou sugere outro horário pelo chat.</p>
          <RequestForm lessonId={lesson.id} defaultDate={isoToLocalInput(lesson.starts_at)} />
        </section>
      )}
      {isMyLesson && pending && (
        <section className="card mb-6">
          <h2 className="h2 mb-1">Pedido enviado</h2>
          <p className="text-sm text-muted">Seu pedido está aguardando a resposta do professor. Você vê a resposta aqui e no Início.</p>
          <form action={withdrawRequest} className="mt-3">
            <input type="hidden" name="request_id" value={pending.id} />
            <input type="hidden" name="lesson_id" value={lesson.id} />
            <SubmitButton className="btn btn-ghost btn-sm" confirm="Retirar o pedido?">
              Retirar pedido
            </SubmitButton>
          </form>
        </section>
      )}

      {/* Professor / Álvaro: gerenciar */}
      {canManage && (
        <h2 className="mb-1 mt-2 font-serif text-2xl">O que você pode fazer nesta aula</h2>
      )}
      {canManage && (
        <p className="mb-4 text-sm text-muted">Mudanças aqui aparecem na hora na agenda do aluno.</p>
      )}
      {canManage && (
        <div className="mb-6 grid gap-6 md:grid-cols-2">
          <section className="card">
            <h2 className="h2 mb-4">Remarcar</h2>
            <form action={rescheduleLesson} className="space-y-3">
              <input type="hidden" name="id" value={lesson.id} />
              <div>
                <label className="label">Nova data e hora</label>
                <input type="datetime-local" name="starts_at" required defaultValue={isoToLocalInput(lesson.starts_at)} className="input" />
              </div>
              <div>
                <label className="label">Duração (min)</label>
                <input type="number" name="duration" min={15} max={240} step={5} defaultValue={duration} className="input" />
              </div>
              <SubmitButton>Remarcar aula</SubmitButton>
            </form>
          </section>

          <section className="card">
            <h2 className="h2 mb-4">Detalhes</h2>
            <form action={updateLessonDetails} className="space-y-3">
              <input type="hidden" name="id" value={lesson.id} />
              <div>
                <label className="label">Modalidade</label>
                <select name="mode" defaultValue={lesson.mode} className="input">
                  <option value="presencial">Presencial</option>
                  <option value="online">Online</option>
                </select>
              </div>
              <div>
                <label className="label">Link do Google Meet</label>
                <input name="meet_link" type="url" placeholder="https://meet.google.com/..." defaultValue={lesson.meet_link ?? ""} className="input" />
              </div>
              <div>
                <label className="label">Observações</label>
                <textarea name="notes" rows={2} defaultValue={lesson.notes ?? ""} className="input" placeholder="Conteúdo da aula, tarefas..." />
              </div>
              <SubmitButton className="btn btn-outline">Salvar</SubmitButton>
            </form>
          </section>

          <section className="card md:col-span-2">
            <h2 className="h2 mb-4">Status</h2>
            <div className="flex flex-wrap gap-2">
              {active && (
                <form action={setLessonStatus}>
                  <input type="hidden" name="id" value={lesson.id} />
                  <input type="hidden" name="status" value="canceled" />
                  <SubmitButton className="btn btn-danger" confirm="Cancelar esta aula?">Cancelar aula</SubmitButton>
                </form>
              )}
              {active && lesson.status !== "done" && (
                <form action={setLessonStatus}>
                  <input type="hidden" name="id" value={lesson.id} />
                  <input type="hidden" name="status" value="done" />
                  <SubmitButton className="btn btn-outline">Marcar como realizada</SubmitButton>
                </form>
              )}
              {!active && (
                <form action={setLessonStatus}>
                  <input type="hidden" name="id" value={lesson.id} />
                  <input type="hidden" name="status" value="scheduled" />
                  <SubmitButton className="btn btn-outline">Reativar aula</SubmitButton>
                </form>
              )}
              <form action={deleteLesson} className="ml-auto">
                <input type="hidden" name="id" value={lesson.id} />
                <SubmitButton className="btn btn-ghost" confirm="Excluir definitivamente esta aula?">Excluir</SubmitButton>
              </form>
            </div>
          </section>
        </div>
      )}

      {!!requests?.length && (
        <section className="card">
          <h2 className="h2 mb-4">Pedidos desta aula</h2>
          <div className="space-y-3">
            {requests.map((r) => (
              <RequestItem key={r.id} request={r} canDecide={canManage} back={`/aulas/${lesson.id}`} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-accent-strong" />
      <div>
        <p className="text-xs text-muted">{label}</p>
        <p>{value ?? "—"}</p>
      </div>
    </div>
  );
}

/** Linha do tempo do status da aula: agendada → pedido do aluno → resultado. */
function StatusTimeline({ status, pending, lastDecided }: { status: string; pending: boolean; lastDecided: string | null }) {
  const steps: { label: string; state: "done" | "now" | "todo" | "off" }[] = [
    { label: "Agendada", state: "done" },
    {
      label: pending ? "Pedido do aluno aguardando resposta" : lastDecided === "rejected" ? "Pedido recusado" : "Sem pedidos",
      state: pending ? "now" : lastDecided ? "done" : "off",
    },
    {
      label:
        status === "canceled" ? "Cancelada" : status === "rescheduled" ? "Remarcada" : status === "done" ? "Realizada" : "Confirmada",
      state: pending ? "todo" : "done",
    },
  ];
  return (
    <ol className="mb-6 flex flex-wrap items-center gap-2 text-sm" aria-label="Situação da aula">
      {steps.map((st, i) => (
        <li key={i} className="flex items-center gap-2">
          <span
            className={
              st.state === "now"
                ? "badge border-warning/30 bg-warning/5 text-warning"
                : st.state === "done"
                  ? "badge border-success/30 bg-success/5 text-success"
                  : "badge border-line text-muted"
            }
          >
            {st.label}
          </span>
          {i < steps.length - 1 && <span className="text-muted" aria-hidden="true">→</span>}
        </li>
      ))}
    </ol>
  );
}
