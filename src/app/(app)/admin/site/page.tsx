import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Flash, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { createSection, deleteSection, updateSection, updateSettings } from "@/lib/actions/site";
import type { SiteSection, SiteSettings } from "@/lib/types";

export const metadata = { title: "Página inicial" };

const FIXED = ["sobre", "nova-sede", "festivais"];

export default async function SiteAdminPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: settings }, { data: sections }] = await Promise.all([
    supabase.from("site_settings").select("*").eq("id", 1).maybeSingle<SiteSettings>(),
    supabase.from("site_sections").select("*").order("sort").returns<SiteSection[]>(),
  ]);
  const s = settings ?? ({} as Partial<SiteSettings>);

  return (
    <div className="mx-auto max-w-4xl">
      <Flash ok={sp.ok} error={sp.error} />
      <PageHeader title="Site da escola" subtitle="Os textos, o endereço e os contatos que aparecem no site público. Salve cada bloco separadamente.">
        <Link href="/" target="_blank" className="btn btn-outline">
          <ExternalLink className="h-4 w-4" /> Ver site
        </Link>
      </PageHeader>

      <section className="card-accent mb-8">
        <h2 className="h2 mb-4">Informações da escola</h2>
        <form action={updateSettings} className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Nome</label>
            <input name="school_name" defaultValue={s.school_name ?? ""} className="input" />
          </div>
          <div>
            <label className="label">Slogan</label>
            <input name="tagline" defaultValue={s.tagline ?? ""} className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Endereço da nova sede</label>
            <input name="address" defaultValue={s.address ?? ""} className="input" placeholder="Rua das Flores, Centro, Cidade" />
            <p className="mt-1 text-xs text-muted">
              Rua e bairro. O site mostra o endereço em destaque e um link &quot;Ver o caminho no mapa&quot;.
            </p>
          </div>
          <div>
            <label className="label">WhatsApp (com DDI e DDD)</label>
            <input name="whatsapp" defaultValue={s.whatsapp ?? ""} className="input" placeholder="5511999998888" />
          </div>
          <div>
            <label className="label">Instagram</label>
            <input name="instagram" defaultValue={s.instagram ?? ""} className="input" placeholder="@usuario" />
          </div>
          <div>
            <label className="label">E-mail</label>
            <input name="email" type="email" defaultValue={s.email ?? ""} className="input" />
          </div>
          <div className="flex items-end"><SubmitButton>Salvar informações</SubmitButton></div>
        </form>
      </section>

      <h2 className="h2 mb-2">Seções de texto</h2>
      <p className="mb-4 text-sm text-muted">
        Use **negrito** e *itálico* nos textos. O site usa três seções: &quot;sobre&quot; (texto da seção Professores),
        &quot;festivais&quot; e &quot;nova-sede&quot; (o título e o texto da seção Sede).
      </p>
      <div className="space-y-4">
        {(sections ?? []).map((sec) => (
          <section key={sec.slug} id={sec.slug} className="card scroll-mt-20">
            <form action={updateSection} className="grid gap-3 sm:grid-cols-[1fr_90px]">
              <input type="hidden" name="slug" value={sec.slug} />
              <input type="hidden" name="image_url" value={sec.image_url ?? ""} />
              <div>
                <label className="label">Título <span className="normal-case text-accent-strong">({sec.slug})</span></label>
                <input name="title" defaultValue={sec.title} className="input" />
              </div>
              <div>
                <label className="label">Ordem</label>
                <input name="sort" type="number" defaultValue={sec.sort} className="input" />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Texto</label>
                <textarea name="body" rows={6} defaultValue={sec.body} className="input" />
              </div>
              <div className="sm:col-span-2 flex flex-wrap items-center gap-4">
                <div>
                  <label className="label">Imagem (opcional)</label>
                  <input name="image" type="file" accept="image/*" className="text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-accent-strong" />
                </div>
                {sec.image_url && (
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={sec.image_url} alt="" className="h-14 w-20 rounded object-cover" />
                    <label className="flex items-center gap-1 text-xs text-muted">
                      <input type="checkbox" name="remove_image" /> remover
                    </label>
                  </div>
                )}
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="visible" defaultChecked={sec.visible} className="accent-[#c8952e]" /> Visível no site
                </label>
              </div>
              <div className="sm:col-span-2 flex gap-2">
                <SubmitButton className="btn btn-outline">Salvar seção</SubmitButton>
              </div>
            </form>
            {!FIXED.includes(sec.slug) && (
              <form action={deleteSection} className="mt-2">
                <input type="hidden" name="slug" value={sec.slug} />
                <SubmitButton className="btn btn-ghost btn-sm text-danger" confirm="Remover esta seção?">Remover seção</SubmitButton>
              </form>
            )}
          </section>
        ))}
      </div>

      <form action={createSection} className="card mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="label">Nova seção</label>
          <input name="title" required className="input" placeholder="Ex.: Aulas para crianças" />
        </div>
        <SubmitButton>Adicionar seção</SubmitButton>
      </form>
    </div>
  );
}
