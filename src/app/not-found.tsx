import Link from "next/link";
import { LogoMark } from "@/components/Logo";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <LogoMark className="h-20 w-20" />
      <h1 className="mt-6 font-serif text-3xl text-fg">Página não encontrada</h1>
      <p className="mt-2 text-muted">Essa nota saiu do tom... 🎵</p>
      <Link href="/" className="btn btn-primary mt-6">Voltar ao início</Link>
    </main>
  );
}
