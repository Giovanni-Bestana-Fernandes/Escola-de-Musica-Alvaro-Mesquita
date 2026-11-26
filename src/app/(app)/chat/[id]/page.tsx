import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ChatRoom } from "@/components/ChatRoom";
import { Avatar, Flash } from "@/components/ui";
import { setConversationMeetLink } from "@/lib/actions/chat";
import { SubmitButton } from "@/components/SubmitButton";
import type { Message } from "@/lib/types";

export const metadata = { title: "Chat" };

export default async function ChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const user = await requireUser();
  const supabase = await createClient();

  const { data: conv } = await supabase
    .from("conversations")
    .select(
      "*, student:profiles!conversations_student_id_fkey(id, full_name, color), teacher:profiles!conversations_teacher_id_fkey(id, full_name, color), enrollment:enrollments(instrument:instruments(name))",
    )
    .eq("id", id)
    .maybeSingle();
  if (!conv) notFound();

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", id)
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<Message[]>();

  const isStudentSide = conv.student_id === user.id;
  const other = isStudentSide ? conv.teacher : conv.student;
  const canEditMeet = conv.teacher_id === user.id || user.isAdmin;
  const participants = {
    [conv.student.id]: conv.student.full_name as string,
    [conv.teacher.id]: conv.teacher.full_name as string,
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col">
      <Flash ok={sp.ok} error={sp.error} />
      <div className="mb-4 flex items-center gap-3">
        <Link href="/chat" className="btn btn-ghost -ml-3 px-2" aria-label="Voltar">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <Avatar name={other.full_name} color={isStudentSide ? other.color : undefined} size={42} />
        <div>
          <p className="font-serif text-lg text-fg">{other.full_name}</p>
          <p className="text-xs text-muted">
            {conv.enrollment?.instrument?.name}
            {!isStudentSide && conv.teacher_id !== user.id && ` · Prof. ${conv.teacher.full_name}`}
          </p>
        </div>
      </div>

      {canEditMeet && (
        <details className="card mb-3 p-4 text-sm">
          <summary className="cursor-pointer text-accent-strong">
            {conv.meet_link ? "Alterar link fixo do Google Meet" : "Fixar link do Google Meet nesta conversa"}
          </summary>
          <form action={setConversationMeetLink} className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input type="hidden" name="conversation_id" value={conv.id} />
            <input
              name="meet_link"
              type="url"
              placeholder="https://meet.google.com/xxx-xxxx-xxx"
              defaultValue={conv.meet_link ?? ""}
              className="input"
            />
            <SubmitButton className="btn btn-outline shrink-0">Salvar</SubmitButton>
          </form>
          <p className="mt-2 text-xs text-muted">Deixe em branco e salve para remover.</p>
        </details>
      )}

      <ChatRoom
        conversationId={conv.id}
        meId={user.id}
        meetLink={conv.meet_link}
        participants={participants}
        initialMessages={(messages ?? []).reverse()}
      />
    </div>
  );
}
