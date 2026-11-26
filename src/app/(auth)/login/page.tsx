import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { signIn } from "@/lib/actions/auth";
import { LogoMark } from "@/components/Logo";
import { Flash } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export const metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  return (
    <main
      className="flex min-h-dvh items-center justify-center px-4 py-10"
    >
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <LogoMark className="h-24 w-24" />
          <p className="mt-4 font-serif text-sm text-fg">Espaço Musical</p>
          <h1 className="font-serif text-3xl text-fg">Álvaro Mesquita</h1>
          <div className="gold-rule mt-3 w-40" />
        </div>

        <div className="card-accent">
          <h2 className="mb-1 font-serif text-xl text-fg">Entrar</h2>
          <p className="mb-5 text-sm text-muted">Área de alunos e professores</p>
          <Flash error={sp.error} ok={sp.ok} />
          <form action={signIn} className="space-y-4">
            <input type="hidden" name="next" value={sp.next ?? ""} />
            <div>
              <label className="label" htmlFor="email">E-mail</label>
              <input id="email" name="email" type="email" required autoComplete="email" className="input" />
            </div>
            <div>
              <label className="label" htmlFor="password">Senha</label>
              <input id="password" name="password" type="password" required autoComplete="current-password" className="input" />
            </div>
            <SubmitButton className="btn btn-primary w-full">Entrar</SubmitButton>
          </form>
          <p className="mt-4 text-center text-xs text-muted">
            Esqueceu a senha? Fale com seu professor ou com a secretaria.
          </p>
        </div>

        <Link href="/" className="btn btn-ghost mx-auto mt-6 flex w-fit">
          <ArrowLeft className="h-4 w-4" /> Voltar ao site
        </Link>
      </div>
    </main>
  );
}
