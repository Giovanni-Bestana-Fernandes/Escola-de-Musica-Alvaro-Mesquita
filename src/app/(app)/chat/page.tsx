import Link from "next/link";
import { Video } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Avatar, EmptyState, PageHeader } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Mensagens" };

interface ConvRow {
  id: string;
  student_id: string;
  teacher_id: string;
  meet_link: string | null;
  student: { full_name: string; color: string } | null;
  teacher: { full_name: string; color: string } | null;
  enrollment: { status: string; instrument: { name: string } | null } | null;
  messages: { body: string | null; attachment_name: string | null; created_at: string }[];
}

export default async function ChatListPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("conversations")
    .select(
      "id, student_id, teacher_id, meet_link, student:profiles!conversations_student_id_fkey(full_name, color), teacher:profiles!conversations_teacher_id_fkey(full_name, color), enrollment:enrollments(status, instrument:instruments(name)), messages(body, attachment_name, created_at)",
    )
    .order("created_at", { referencedTable: "messages", ascending: false })
    .limit(1, { referencedTable: "messages" })
    .returns<ConvRow[]>();

  const rows = (data ?? []).sort((a, b) => {
    const la = a.messages[0]?.created_at ?? "";
    const lb = b.messages[0]?.created_at ?? "";
    return lb.localeCompare(la);
  });
  const mine = rows.filter((c) => c.student_id === user.id || c.teacher_id === user.id);
  const others = rows.filter((c) => !mine.includes(c));

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Mensagens"
        subtitle={user.isStudent ? "Uma conversa com cada professor: tire dúvidas, receba partituras e áudios e o link das aulas online." : "Uma conversa com cada aluno: envie materiais e fixe o link do Meet no topo."}
      />
      {mine.length ? (
        <List rows={mine} viewerIsStudent={user.isStudent} />
      ) : (
        <EmptyState title="Nenhuma conversa ainda">As conversas aparecem automaticamente quando há uma matrícula.</EmptyState>
      )}
      {user.isAdmin && others.length > 0 && (
        <>
          <h2 className="h2 mb-3 mt-10">Conversas dos outros professores</h2>
          <List rows={others} viewerIsStudent={false} showTeacher />
        </>
      )}
    </div>
  );
}

function List({ rows, viewerIsStudent, showTeacher }: { rows: ConvRow[]; viewerIsStudent: boolean; showTeacher?: boolean }) {
  return (
    <div className="space-y-2">
      {rows.map((c) => {
        const other = viewerIsStudent ? c.teacher : c.student;
        const last = c.messages[0];
        return (
          <Link key={c.id} href={`/chat/${c.id}`} className="card flex items-center gap-3 p-4 hover:border-accent">
            <Avatar name={other?.full_name ?? "?"} color={viewerIsStudent ? other?.color : undefined} size={44} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {other?.full_name}
                <span className="text-sm text-muted">
                  {" "}
                  · {c.enrollment?.instrument?.name}
                  {showTeacher && ` · Prof. ${c.teacher?.full_name}`}
                </span>
              </p>
              <p className="truncate text-sm text-muted">
                {last ? last.body ?? `📎 ${last.attachment_name ?? "arquivo"}` : "Sem mensagens"}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 text-xs text-muted">
              {last && <span className="first-letter:uppercase">{formatDateTime(last.created_at, { weekday: undefined })}</span>}
              {c.meet_link && <Video className="h-4 w-4 text-accent-strong" />}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
