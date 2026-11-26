import Link from "next/link";
import { Users, ShieldCheck, Guitar, LayoutTemplate, LogOut, ChevronRight } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { changePassword, signOut, updateMyProfile } from "@/lib/actions/auth";
import { Avatar, Flash, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { ROLE_LABEL } from "@/lib/utils";

export const metadata = { title: "Meu perfil" };

export default async function PerfilPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const user = await requireUser();

  const links = [
    ...(user.isTeacher ? [{ href: "/alunos", label: user.isAdmin ? "Alunos e matrículas" : "Meus alunos", Icon: Users }] : []),
    ...(user.isAdmin
      ? [
          { href: "/admin/professores", label: "Professores e acessos", Icon: ShieldCheck },
          { href: "/admin/instrumentos", label: "Instrumentos", Icon: Guitar },
          { href: "/admin/site", label: "Página inicial", Icon: LayoutTemplate },
        ]
      : []),
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <Flash ok={sp.ok} error={sp.error} />
      <PageHeader title="Meu perfil" subtitle="Seus dados de contato e a sua senha." />

      <div className="card-accent mb-6 flex items-center gap-4">
        <Avatar name={user.full_name} color={user.isTeacher ? user.color : undefined} size={56} />
        <div>
          <p className="font-serif text-xl">{user.full_name}</p>
          <p className="text-sm text-accent-strong">{ROLE_LABEL[user.role]}</p>
          <p className="text-xs text-muted">{user.email}</p>
        </div>
      </div>

      {/* Atalhos (no celular, a barra inferior só mostra 4 itens) */}
      {links.length > 0 && (
        <nav className="card mb-6 divide-y divide-line p-0 lg:hidden">
          {links.map(({ href, label, Icon }) => (
            <Link key={href} href={href} className="flex items-center gap-3 px-5 py-4 hover:bg-surface-2">
              <Icon className="h-5 w-5 text-accent-strong" />
              <span className="flex-1">{label}</span>
              <ChevronRight className="h-4 w-4 text-muted" />
            </Link>
          ))}
        </nav>
      )}

      <section className="card mb-6">
        <h2 className="h2 mb-4">Dados</h2>
        <form action={updateMyProfile} className="space-y-3">
          <div>
            <label className="label">Nome</label>
            <input name="full_name" defaultValue={user.full_name} required className="input" />
          </div>
          <div>
            <label className="label">Telefone</label>
            <input name="phone" defaultValue={user.phone ?? ""} className="input" />
          </div>
          {user.isTeacher && (
            <>
              <div>
                <label className="label">Sobre mim (aparece no site)</label>
                <textarea name="bio" rows={3} defaultValue={user.bio ?? ""} className="input" />
              </div>
              <div className="flex items-center gap-3">
                <label className="label mb-0">Minha cor no calendário</label>
                <input name="color" type="color" defaultValue={user.color} className="h-8 w-12 rounded border border-line bg-page" />
              </div>
            </>
          )}
          <SubmitButton>Salvar</SubmitButton>
        </form>
      </section>

      <section className="card mb-6">
        <h2 className="h2 mb-4">Trocar senha</h2>
        <form action={changePassword} className="grid gap-3 sm:grid-cols-2">
          <input name="password" type="password" minLength={8} required placeholder="Nova senha" autoComplete="new-password" className="input" />
          <input name="confirm" type="password" minLength={8} required placeholder="Confirmar senha" autoComplete="new-password" className="input" />
          <div><SubmitButton className="btn btn-outline">Alterar senha</SubmitButton></div>
        </form>
      </section>

      <form action={signOut}>
        <button className="btn btn-danger w-full">
          <LogOut className="h-4 w-4" /> Sair da conta
        </button>
      </form>
    </div>
  );
}
