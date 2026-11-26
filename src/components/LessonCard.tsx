import Link from "next/link";
import { Video, MapPin } from "lucide-react";
import type { LessonFull } from "@/lib/queries";
import { formatDateTime, formatTime } from "@/lib/utils";
import { StatusBadge } from "@/components/ui";

export function LessonCard({ lesson, viewer }: { lesson: LessonFull; viewer: "student" | "teacher" }) {
  const other = viewer === "student" ? lesson.teacher : lesson.student;
  return (
    <Link
      href={`/aulas/${lesson.id}`}
      className="flex items-center gap-4 rounded-xl border border-line bg-surface-2/60 p-3 transition hover:border-accent"
    >
      <div className="w-1 self-stretch rounded-full" style={{ background: lesson.teacher?.color ?? "#c08f2a" }} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {lesson.instrument?.name} <span className="text-muted">· {other?.full_name}</span>
        </p>
        <p className="text-sm first-letter:uppercase text-accent-strong">
          {formatDateTime(lesson.starts_at)} – {formatTime(lesson.ends_at)}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <StatusBadge status={lesson.status} />
        <span className="flex items-center gap-1 text-xs text-muted">
          {lesson.mode === "online" ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
          {lesson.mode === "online" ? "Online" : "Presencial"}
        </span>
      </div>
    </Link>
  );
}
