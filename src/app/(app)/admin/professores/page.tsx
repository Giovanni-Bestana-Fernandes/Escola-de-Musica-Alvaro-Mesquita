import { UserPlus, ShieldCheck } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Avatar, Flash, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { createPerson, resetPassword, setActive, setPermissions, setTeacherInstruments } from "@/lib/actions/people";
import { PERMISSION_LABEL } from "@/lib/utils";
import type { Instrument, Profile, TeacherPermissions } from "@/lib/types";

export const metadata = { title: "Professores e acessos" };

const PERMS = ["manage_festivals", "manage_students", "view_all_calendars", "manage_financial"] as const;

export default async function ProfessoresPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const me = await requireAdmin();
  const supabase = await createClient();
  const [{ data: teachers }, { data: perms }, { data: instruments }, { data: ti }] = await Promise.all([
    supabase.from("profiles").select("*").in("role", ["admin", "teacher"]).order("role").order("full_name").returns<Profile[]>(),
    supabase.from("teacher_permissions").select("*").returns<TeacherPermissions[]>(),
    supabase.from("instruments").select("*").order("sort").returns<Instrument[]>(),
    supabase.from("teacher_instruments").select("*"),
  ]);
  const permMap = new Map((perms ?? []).map((p) => [p.teacher_id, p]));
  const instMap = new Map<string, number[]>();
  for (const r of ti ?? []) instMap.set(r.teacher_id, [...(instMap.get(r.teacher_id) ?? []), r.instrument_id]);

  return (
    <div>
      <Flash ok={sp.ok} error={sp.error} />
      <PageHeader
        title="Professores"
        subtitle="Cadastre professores e decida o que cada um pode fazer. Todo professor já vê os próprios alunos, aulas e mensagens; os interruptores liberam o resto."
      />

      <details className="card-accent mb-8">
        <summary className="flex cursor-pointer items-center gap-2 font-serif text-lg text-fg">
          <UserPlus className="h-5 w-5" /> Cadastrar professor
        </summary>
        <form action={createPerson} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="role" value="teacher" />
          <div>
            <label className="label">Nome completo</label>
            <input name="full_name" required className="input" />
          </div>
          <div>
            <label className="label">E-mail (login)</label>
            <input name="email" type="email" required className="input" />
          </div>
          <div>
            <label className="label">Senha inicial</label>
            <input name="password" required minLength={8} className="input" />
          </div>
          <div>
            <label className="label">Cor no calendário</label>
            <input name="color" type="color" defaultValue="#0891b2" className="input h-[42px] p-1" />
          </div>
          <fieldset className="sm:col-span-2">
            <legend className="label">Instrumentos que ensina</legend>
            <InstrumentChecks instruments={instruments ?? []} selected={[]} />
          </fieldset>
          <div><SubmitButton>Cadastrar professor</SubmitButton></div>
        </form>
      </details>

      <div className="space-y-4">
        {(teachers ?? []).map((t) => {
          const p = permMap.get(t.id);
          const isMe = t.id === me.id;
          return (
            <section key={t.id} className={t.role === "admin" ? "card-accent" : "card"}>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <Avatar name={t.full_name} color={t.color} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-lg">
                    {t.full_name}
                    {t.role === "admin" && <span className="ml-2 badge border-accent/50 text-accent-strong"><ShieldCheck className="h-3 w-3" /> Diretor</span>}
                    {!t.active && <span className="ml-2 badge border-danger/50 text-danger">Desativado</span>}
                  </p>
                  <p className="truncate text-xs text-muted">{t.email}</p>
                  <p className="mt-1 text-[13px] text-muted">
                    {t.role === "admin"
                      ? "Acesso total"
                      : PERMS.filter((k) => p?.[k]).length
                        ? `Também pode: ${PERMS.filter((k) => p?.[k]).map((k) => PERMISSION_LABEL[k].label).join(", ")}`
                        : "Acesso padrão: os próprios alunos, aulas e mensagens"}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {/* Permissões */}
                <div className="rounded-xl border border-line bg-surface-2/50 p-4">
                  <p className="label">Permissões</p>
                  {t.role === "admin" ? (
                    <p className="text-sm text-muted">Acesso total a toda a plataforma.</p>
                  ) : (
                    <form action={setPermissions} className="space-y-2">
                      <input type="hidden" name="teacher_id" value={t.id} />
                      {PERMS.map((k) => (
                        <label key={k} className="flex cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-surface-2">
                          <input type="checkbox" name={k} defaultChecked={!!p?.[k]} className="peer sr-only" />
                          <span className="relative mt-0.5 h-5 w-9 shrink-0 rounded-full bg-line transition peer-checked:bg-accent after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-surface after:transition peer-checked:after:translate-x-4" />
                          <span>
                            <span className="block text-sm font-medium">{PERMISSION_LABEL[k].label}</span>
                            <span className="block text-xs text-muted">{PERMISSION_LABEL[k].hint}</span>
                          </span>
                        </label>
                      ))}
                      <p className="px-2 text-xs text-muted">
                        Todo professor já vê os próprios alunos, aulas e chats.
                      </p>
                      <SubmitButton className="btn btn-outline btn-sm">Salvar permissões</SubmitButton>
                    </form>
                  )}
                </div>

                {/* Instrumentos e cor */}
                <div className="rounded-xl border border-line bg-surface-2/50 p-4">
                  <form action={setTeacherInstruments} className="space-y-3">
                    <input type="hidden" name="teacher_id" value={t.id} />
                    <p className="label">Instrumentos</p>
                    <InstrumentChecks instruments={instruments ?? []} selected={instMap.get(t.id) ?? []} />
                    <div className="flex items-center gap-3">
                      <label className="label mb-0">Cor</label>
                      <input name="color" type="color" defaultValue={t.color} className="h-8 w-12 rounded border border-line bg-page" />
                    </div>
                    <SubmitButton className="btn btn-outline btn-sm">Salvar</SubmitButton>
                  </form>
                  {!isMe && (
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                      <form action={resetPassword} className="flex gap-2">
                        <input type="hidden" name="id" value={t.id} />
                        <input type="hidden" name="back" value="/admin/professores" />
                        <input name="password" minLength={8} required placeholder="Nova senha" className="input w-36 py-1.5 text-xs" />
                        <SubmitButton className="btn btn-ghost btn-sm">Redefinir</SubmitButton>
                      </form>
                      <form action={setActive}>
                        <input type="hidden" name="id" value={t.id} />
                        <input type="hidden" name="back" value="/admin/professores" />
                        <input type="hidden" name="active" value={t.active ? "false" : "true"} />
                        <SubmitButton
                          className={t.active ? "btn btn-danger btn-sm" : "btn btn-outline btn-sm"}
                          confirm={t.active ? `Desativar o acesso de ${t.full_name}?` : undefined}
                        >
                          {t.active ? "Desativar" : "Reativar"}
                        </SubmitButton>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function InstrumentChecks({ instruments, selected }: { instruments: Instrument[]; selected: number[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {instruments.map((i) => (
        <label key={i.id} className="cursor-pointer">
          <input type="checkbox" name="instruments" value={i.id} defaultChecked={selected.includes(i.id)} className="peer sr-only" />
          <span className="badge border-line px-3 py-1 text-sm text-muted transition peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:text-fg">
            {i.name}
          </span>
        </label>
      ))}
    </div>
  );
}
