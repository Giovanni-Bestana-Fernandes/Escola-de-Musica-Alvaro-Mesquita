"use client";

import { useState } from "react";
import { requestChange } from "@/lib/actions/lessons";
import { SubmitButton } from "@/components/SubmitButton";
import { cn } from "@/lib/utils";

export function RequestForm({ lessonId, defaultDate }: { lessonId: string; defaultDate: string }) {
  const [type, setType] = useState<"reschedule" | "cancel">("reschedule");
  return (
    <form action={requestChange} className="space-y-3">
      <input type="hidden" name="lesson_id" value={lessonId} />
      <input type="hidden" name="type" value={type} />
      <div className="grid grid-cols-2 gap-2">
        {(["reschedule", "cancel"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={cn("btn", type === t ? "btn-outline bg-accent-soft" : "btn-ghost border border-line")}
          >
            {t === "reschedule" ? "Remarcar" : "Cancelar"}
          </button>
        ))}
      </div>
      {type === "reschedule" && (
        <div>
          <label className="label">Sugira um novo horário</label>
          <input type="datetime-local" name="proposed_starts_at" required defaultValue={defaultDate} className="input" />
        </div>
      )}
      <div>
        <label className="label">Motivo (opcional)</label>
        <textarea name="reason" rows={2} className="input" placeholder="Ex.: tenho prova na escola nesse dia" />
      </div>
      <SubmitButton>{type === "reschedule" ? "Pedir remarcação" : "Pedir cancelamento"}</SubmitButton>
    </form>
  );
}
