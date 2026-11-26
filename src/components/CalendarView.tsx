"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";
import type { EventDropArg, EventInput, EventSourceFuncArg } from "@fullcalendar/core";
import type { EventResizeDoneArg } from "@fullcalendar/interaction";
import { createClient } from "@/lib/supabase/client";
import { moveLesson } from "@/lib/actions/lessons";
import { LESSON_SELECT, type LessonFull } from "@/lib/queries";

interface Props {
  userId: string;
  isStudent: boolean;
  isAdmin: boolean;
  canViewAll: boolean;
  teachers: { id: string; full_name: string; color: string }[];
}

export function CalendarView({ userId, isStudent, isAdmin, canViewAll, teachers }: Props) {
  const router = useRouter();
  const calRef = useRef<FullCalendar>(null);
  const supabase = useMemo(() => createClient(), []);
  // "mine" = minhas aulas; "all" = todos os professores; ou o id de um professor.
  const [scope, setScope] = useState<string>("mine");
  const [showCanceled, setShowCanceled] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  useEffect(() => {
    calRef.current?.getApi().refetchEvents();
  }, [scope, showCanceled]);

  useEffect(() => {
    calRef.current?.getApi().changeView(isMobile ? "listWeek" : "timeGridWeek");
  }, [isMobile]);

  const fetchEvents = useCallback(
    async (info: EventSourceFuncArg): Promise<EventInput[]> => {
      let q = supabase
        .from("lessons")
        .select(LESSON_SELECT)
        .gte("starts_at", info.start.toISOString())
        .lt("starts_at", info.end.toISOString())
        .order("starts_at");
      if (scope === "mine") q = q.eq(isStudent ? "student_id" : "teacher_id", userId);
      else if (scope !== "all") q = q.eq("teacher_id", scope);
      if (!showCanceled) q = q.neq("status", "canceled");
      const { data, error } = await q.returns<LessonFull[]>();
      if (error) {
        setMsg(error.message);
        return [];
      }
      return (data ?? []).map((l) => {
        const who = isStudent ? l.teacher?.full_name : l.student?.full_name;
        const showTeacher = !isStudent && scope !== "mine" && l.teacher_id !== userId;
        const color = l.teacher?.color ?? "#c08f2a";
        return {
          id: l.id,
          title: `${l.instrument?.name ?? "Aula"} · ${who ?? ""}${showTeacher ? ` (${l.teacher?.full_name})` : ""}${l.mode === "online" ? " · online" : ""}`,
          start: l.starts_at,
          end: l.ends_at,
          backgroundColor: color,
          borderColor: color,
          textColor: "#0b0b0b",
          classNames: l.status === "canceled" ? ["is-canceled"] : [],
          editable: !isStudent && l.status !== "canceled" && (isAdmin || l.teacher_id === userId),
        };
      });
    },
    [supabase, scope, showCanceled, isStudent, isAdmin, userId],
  );

  async function onMove(arg: EventDropArg | EventResizeDoneArg) {
    const { event } = arg;
    if (!event.start || !event.end) return arg.revert();
    const res = await moveLesson(event.id, event.start.toISOString(), event.end.toISOString());
    if (!res.ok) {
      arg.revert();
      setMsg(res.error ?? "Não foi possível mover a aula.");
    } else {
      setMsg("Aula remarcada.");
      router.refresh();
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {!isStudent && (
          <select className="input w-auto" value={scope} onChange={(e) => setScope(e.target.value)} aria-label="Visualizar">
            <option value="mine">Minhas aulas</option>
            {canViewAll && (
              <>
                <option value="all">Todos os professores</option>
                {teachers
                  .filter((t) => t.id !== userId)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      Prof. {t.full_name}
                    </option>
                  ))}
              </>
            )}
          </select>
        )}
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={showCanceled} onChange={(e) => setShowCanceled(e.target.checked)} className="accent-[#c8952e]" />
          Mostrar canceladas
        </label>
        {canViewAll && scope !== "mine" && (
          <div className="flex flex-wrap gap-3 text-xs">
            {teachers.map((t) => (
              <span key={t.id} className="flex items-center gap-1.5 text-muted">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.color }} />
                {t.full_name}
              </span>
            ))}
          </div>
        )}
      </div>

      {msg && (
        <div className="mb-3 flex items-center justify-between rounded-xl border border-accent/50 bg-accent-soft px-4 py-2 text-sm text-accent-strong">
          {msg}
          <button onClick={() => setMsg(null)} className="text-muted hover:text-fg" aria-label="Fechar">
            ✕
          </button>
        </div>
      )}

      <div className="card overflow-x-auto p-3 md:p-5">
        <FullCalendar
          ref={calRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          locale={ptBrLocale}
          initialView="timeGridWeek"
          headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,listWeek" }}
          buttonText={{ today: "Hoje", month: "Mês", week: "Semana", list: "Lista" }}
          slotMinTime="07:00:00"
          slotMaxTime="22:00:00"
          allDaySlot={false}
          nowIndicator
          height="auto"
          events={fetchEvents}
          eventClick={(info) => {
            info.jsEvent.preventDefault();
            router.push(`/aulas/${info.event.id}`);
          }}
          eventDrop={onMove}
          eventResize={onMove}
          noEventsContent="Nenhuma aula neste período"
        />
      </div>
      {!isStudent && (
        <p className="mt-3 text-xs text-muted">Dica: arraste uma aula para remarcar. Clique para ver detalhes, cancelar ou adicionar o link do Meet.</p>
      )}
    </div>
  );
}
