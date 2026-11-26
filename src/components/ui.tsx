import Link from "next/link";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { cn, STATUS_LABEL } from "@/lib/utils";

/** Mostra mensagens ?ok= / ?error= vindas dos Server Actions. */
export function Flash({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null;
  return (
    <div
      role="status"
      className={cn(
        "mb-5 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm",
        error ? "border-danger/30 bg-danger/5 text-danger" : "border-success/30 bg-success/5 text-success",
      )}
    >
      {error ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
      <span>{error ?? ok}</span>
    </div>
  );
}

/** Título da página com uma frase dizendo para que ela serve. */
export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <h1 className="h1 text-fg">{title}</h1>
        {subtitle && <p className="mt-2 text-[15px] leading-relaxed text-muted">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

/** Um bloco da página: título, uma frase do que ele faz e o conteúdo. */
export function Section({
  title,
  hint,
  step,
  action,
  children,
  className,
}: {
  title: string;
  hint?: string;
  step?: number;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("card", className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {step != null && (
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[13px] font-semibold text-accent-strong">
              {step}
            </span>
          )}
          <div>
            <h2 className="h2">{title}</h2>
            {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function StatCard({ label, value, hint, href }: { label: string; value: number | string; hint?: string; href?: string }) {
  const body = (
    <>
      <p className="text-[13px] font-medium text-muted">{label}</p>
      <p className="mt-1 font-serif text-4xl text-fg">{value}</p>
      {hint && <p className="mt-1 text-[13px] text-muted">{hint}</p>}
    </>
  );
  return href ? (
    <Link href={href} className="card block p-4">
      {body}
    </Link>
  ) : (
    <div className="card p-4">{body}</div>
  );
}

const STATUS_STYLE: Record<string, string> = {
  scheduled: "border-accent/40 bg-accent-soft/60 text-accent-strong",
  rescheduled: "border-info/30 bg-info/5 text-info",
  canceled: "border-danger/30 bg-danger/5 text-danger",
  done: "border-success/30 bg-success/5 text-success",
  pending: "border-warning/30 bg-warning/5 text-warning",
  approved: "border-success/30 bg-success/5 text-success",
  rejected: "border-danger/30 bg-danger/5 text-danger",
  active: "border-success/30 bg-success/5 text-success",
  paused: "border-warning/30 bg-warning/5 text-warning",
  ended: "border-line text-muted",
};

export function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABEL[status] ?? { active: "Ativa", paused: "Pausada", ended: "Encerrada" }[status] ?? status;
  return <span className={cn("badge", STATUS_STYLE[status] ?? "border-line text-muted")}>{label}</span>;
}

/** O status de um pedido explicado em uma frase. */
export const REQUEST_EXPLAIN: Record<string, string> = {
  pending: "Aguardando a resposta do professor",
  approved: "Aprovado pelo professor",
  rejected: "Recusado pelo professor",
};

export function Avatar({ name, color, size = 36 }: { name: string; color?: string; size?: number }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
        color ? "text-white" : "bg-accent-soft text-accent-strong",
      )}
      style={{ width: size, height: size, fontSize: size * 0.38, background: color }}
      aria-hidden="true"
    >
      {initials || "?"}
    </span>
  );
}

/** Estado vazio: o que falta, por quê, e o botão da próxima ação. */
export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: React.ReactNode;
  action?: { href: string; label: string };
}) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-surface/60 px-6 py-10 text-center">
      <p className="font-serif text-xl text-fg">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-md text-sm text-muted">{children}</div>}
      {action && (
        <Link href={action.href} className="btn btn-outline btn-sm mt-4">
          {action.label}
        </Link>
      )}
    </div>
  );
}
