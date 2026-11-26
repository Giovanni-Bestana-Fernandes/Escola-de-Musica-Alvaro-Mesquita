import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, MapPin } from "lucide-react";
import { can, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, Flash } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { Gallery, type GalleryItem } from "@/components/Gallery";
import { PhotoUploader } from "@/components/PhotoUploader";
import { addYoutubeVideo, deleteFestival, updateFestival } from "@/lib/actions/festivals";
import { formatDate } from "@/lib/utils";
import type { Festival, FestivalMedia } from "@/lib/types";

export const metadata = { title: "Festival" };

export default async function FestivalPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const user = await requireUser();
  const supabase = await createClient();

  const { data: festival } = await supabase.from("festivals").select("*").eq("id", id).maybeSingle<Festival>();
  if (!festival) notFound();
  const { data: media } = await supabase
    .from("festival_media")
    .select("*")
    .eq("festival_id", id)
    .order("created_at")
    .returns<FestivalMedia[]>();

  const photoPaths = (media ?? []).filter((m) => m.type === "photo").map((m) => m.storage_path!) ;
  const signed = photoPaths.length
    ? (await supabase.storage.from("festival-photos").createSignedUrls(photoPaths, 3600)).data ?? []
    : [];
  const urlMap = new Map(signed.map((s) => [s.path, s.signedUrl]));

  const items: GalleryItem[] = (media ?? []).map((m) => ({
    id: m.id,
    type: m.type,
    caption: m.caption,
    url: m.type === "photo" ? urlMap.get(m.storage_path!) ?? "" : `https://www.youtube-nocookie.com/embed/${m.youtube_id}`,
    thumb: m.type === "photo" ? urlMap.get(m.storage_path!) ?? "" : `https://i.ytimg.com/vi/${m.youtube_id}/hqdefault.jpg`,
  }));
  const videos = items.filter((i) => i.type === "youtube");
  const photos = items.filter((i) => i.type === "photo");
  const canManage = can(user, "manage_festivals");

  return (
    <div>
      <Link href="/festivais" className="btn btn-ghost -ml-3 mb-4">
        <ArrowLeft className="h-4 w-4" /> Festivais
      </Link>
      <Flash ok={sp.ok} error={sp.error} />

      <div className="mb-8">
        <h1 className="h1 text-fg">{festival.title}</h1>
        <p className="mt-2 flex flex-wrap gap-x-4 text-sm text-muted">
          <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {formatDate(festival.date)}</span>
          {festival.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {festival.location}</span>}
        </p>
        {festival.description && <p className="mt-3 max-w-2xl text-fg/85">{festival.description}</p>}
        <div className="gold-rule mt-4 w-40" />
      </div>

      {canManage && (
        <div className="mb-10 grid gap-4 lg:grid-cols-2">
          <section className="card">
            <h2 className="h2 mb-3">Adicionar fotos</h2>
            <PhotoUploader festivalId={festival.id} />
          </section>
          <section className="card">
            <h2 className="h2 mb-3">Adicionar vídeo do YouTube</h2>
            <form action={addYoutubeVideo} className="space-y-3">
              <input type="hidden" name="festival_id" value={festival.id} />
              <input name="url" required placeholder="https://youtu.be/..." className="input" />
              <input name="caption" placeholder="Legenda (ex.: Banda Rock Kids - Back in Black)" className="input" />
              <SubmitButton className="btn btn-outline">Adicionar vídeo</SubmitButton>
              <p className="text-xs text-muted">Dica: publique no YouTube como &quot;Não listado&quot; para só quem tem o link assistir.</p>
            </form>
          </section>
          <details className="card lg:col-span-2">
            <summary className="cursor-pointer text-sm text-accent-strong">Editar ou excluir festival</summary>
            <form action={updateFestival} className="mt-4 grid gap-3 sm:grid-cols-3">
              <input type="hidden" name="id" value={festival.id} />
              <input name="title" defaultValue={festival.title} required className="input" />
              <input name="date" type="date" defaultValue={festival.date} required className="input" />
              <input name="location" defaultValue={festival.location ?? ""} placeholder="Local" className="input" />
              <textarea name="description" defaultValue={festival.description ?? ""} rows={2} className="input sm:col-span-3" />
              <div><SubmitButton className="btn btn-outline">Salvar</SubmitButton></div>
            </form>
            <form action={deleteFestival} className="mt-4">
              <input type="hidden" name="id" value={festival.id} />
              <SubmitButton className="btn btn-danger btn-sm" confirm="Excluir o festival e TODAS as fotos? Não dá para desfazer.">
                Excluir festival
              </SubmitButton>
            </form>
          </details>
        </div>
      )}

      {items.length === 0 && <EmptyState title="Ainda não há fotos nem vídeos">Volte em breve!</EmptyState>}

      {videos.length > 0 && (
        <section className="mb-10">
          <h2 className="h2 mb-4">Vídeos</h2>
          <Gallery items={videos} festivalId={festival.id} canManage={canManage} />
        </section>
      )}
      {photos.length > 0 && (
        <section>
          <h2 className="h2 mb-4">Fotos ({photos.length})</h2>
          <Gallery items={photos} festivalId={festival.id} canManage={canManage} />
        </section>
      )}
    </div>
  );
}
