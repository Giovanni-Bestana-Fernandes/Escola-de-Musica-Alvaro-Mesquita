import { can, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CalendarView } from "@/components/CalendarView";
import { Flash, PageHeader } from "@/components/ui";

export const metadata = { title: "Agenda" };

export default async function CalendarioPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const canViewAll = can(user, "view_all_calendars");
  let teachers: { id: string; full_name: string; color: string }[] = [];
  if (canViewAll) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, color")
      .in("role", ["admin", "teacher"])
      .eq("active", true)
      .order("full_name");
    teachers = data ?? [];
  }

  return (
    <div>
      <Flash ok={sp.ok} error={sp.error} />
      <PageHeader
        title="Agenda"
        subtitle={
          user.isStudent
            ? "Todas as suas aulas. Clique numa aula para ver o horário, o link do Meet ou pedir para remarcar ou cancelar."
            : canViewAll
              ? "Suas aulas e as de cada professor. Escolha no seletor de quem ver; arraste uma aula para remarcar."
              : "Aulas com seus alunos. Arraste uma aula para remarcar; clique para cancelar ou pôr o link do Meet."
        }
      />
      <CalendarView
        userId={user.id}
        isStudent={user.isStudent}
        isAdmin={user.isAdmin}
        canViewAll={canViewAll}
        teachers={teachers}
      />
    </div>
  );
}
