import Link from "next/link";
import type { RequestFull } from "@/lib/queries";
import { formatDateTime } from "@/lib/utils";
import { StatusBadge } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { decideRequest } from "@/lib/actions/lessons";

export function RequestItem({ request: r, canDecide, back }: { request: RequestFull; canDecide: boolean; back: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface-2/60 p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">
            {r.type === "cancel" ? "Cancelamento" : "Remarcação"}
            <span className="text-muted"> · {r.lesson.instrument?.name}</span>
          </p>
          <p className="text-xs text-muted">
            {canDecide ? r.requester?.full_name : r.lesson.teacher?.full_name}
          </p>
        </div>
        <StatusBadge status={r.status} />
      </div>
      <p className="mt-2 text-xs first-letter:uppercase">
        <Link href={`/aulas/${r.lesson_id}`} className="text-accent-strong hover:underline">
          Aula: {formatDateTime(r.lesson.starts_at)}
        </Link>
      </p>
      {r.type === "reschedule" && r.proposed_starts_at && (
        <p className="text-xs first-letter:uppercase text-info">Horário sugerido: {formatDateTime(r.proposed_starts_at)}</p>
      )}
      {r.reason && <p className="mt-1 text-xs italic text-muted">“{r.reason}”</p>}
      {r.response && <p className="mt-1 text-xs text-accent-strong">Resposta: {r.response}</p>}

      {canDecide && r.status === "pending" && (
        <form action={decideRequest} className="mt-3 space-y-2">
          <input type="hidden" name="request_id" value={r.id} />
          <input type="hidden" name="lesson_id" value={r.lesson_id} />
          <input type="hidden" name="back" value={back} />
          <input name="response" placeholder="Mensagem ao aluno (opcional)" className="input py-1.5 text-xs" />
          <div className="flex gap-2">
            <SubmitButton name="decision" value="approve" className="btn btn-primary btn-sm flex-1">
              Aprovar
            </SubmitButton>
            <SubmitButton name="decision" value="reject" className="btn btn-danger btn-sm flex-1">
              Recusar
            </SubmitButton>
          </div>
        </form>
      )}
    </div>
  );
}
