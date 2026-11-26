import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Flash, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { addInstrument, updateInstrument } from "@/lib/actions/people";
import type { Instrument } from "@/lib/types";

export const metadata = { title: "Cursos" };

export default async function InstrumentosPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase.from("instruments").select("*").order("sort").returns<Instrument[]>();

  return (
    <div className="mx-auto max-w-3xl">
      <Flash ok={sp.ok} error={sp.error} />
      <PageHeader title="Cursos" subtitle="Os instrumentos que a escola ensina. Aparecem no site e na hora de matricular um aluno." />

      <div className="space-y-3">
        {(data ?? []).map((i) => (
          <form key={i.id} action={updateInstrument} className="card grid gap-3 sm:grid-cols-[1fr_2fr_80px_auto] sm:items-end">
            <input type="hidden" name="id" value={i.id} />
            <div>
              <label className="label">Nome</label>
              <input name="name" defaultValue={i.name} required className="input" />
            </div>
            <div>
              <label className="label">Descrição</label>
              <input name="description" defaultValue={i.description ?? ""} className="input" />
            </div>
            <div>
              <label className="label">Ordem</label>
              <input name="sort" type="number" defaultValue={i.sort} className="input" />
            </div>
            <SubmitButton className="btn btn-outline">Salvar</SubmitButton>
          </form>
        ))}
      </div>

      <form action={addInstrument} className="card-accent mt-8 grid gap-3 sm:grid-cols-[1fr_2fr_80px_auto] sm:items-end">
        <div>
          <label className="label">Novo instrumento</label>
          <input name="name" required className="input" placeholder="Bateria" />
        </div>
        <div>
          <label className="label">Descrição</label>
          <input name="description" className="input" />
        </div>
        <div>
          <label className="label">Ordem</label>
          <input name="sort" type="number" defaultValue={(data?.length ?? 0) + 1} className="input" />
        </div>
        <SubmitButton>Adicionar</SubmitButton>
      </form>
    </div>
  );
}
