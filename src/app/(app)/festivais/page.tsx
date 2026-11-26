import Link from "next/link";
import { Camera, PlayCircle, Calendar, MapPin } from "lucide-react";
import { can, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, Flash, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { createFestival } from "@/lib/actions/festivals";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Festivais" };

interface FestivalRow {
  id: string;
  title: string;
  date: string;
  location: string | null;
  description: string | null;
  media: { type: "photo" | "youtube"; storage_path: string | null; youtube_id: string | null }[];
}

export default async function FestivaisPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("festivals")
    .select("id, title, date, location, description, media:festival_media(type, storage_path, youtube_id)")
    .order("date", { ascending: false })
    .returns<FestivalRow[]>();
  const festivals = data ?? [];

  // Capa: primeira foto (URL assinada) ou miniatura do primeiro vídeo.
  const coverPaths = festivals
    .map((f) => f.media.find((m) => m.type === "photo")?.storage_path)
    .filter(Boolean) as string[];
  const signed = coverPaths.length
    ? (await supabase.storage.from("festival-photos").createSignedUrls(coverPaths, 3600)).data ?? []
    : [];
  const signedMap = new Map(signed.map((s) => [s.path, s.signedUrl]));

  const canManage = can(user, "manage_festivals");

  return (
    <div>
      <Flash ok={sp.ok} error={sp.error} />
      <PageHeader title="Festivais" subtitle="Fotos e vídeos dos alunos no palco. Abra um festival para ver tudo; toque numa foto para ampliar." />

      {canManage && (
        <details className="card-accent mb-8">
          <summary className="cursor-pointer font-serif text-lg text-fg">+ Novo festival</summary>
          <form action={createFestival} className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Título</label>
              <input name="title" required className="input" placeholder="Festival de Fim de Ano 2026" />
            </div>
            <div>
              <label className="label">Data</label>
              <input name="date" type="date" required className="input" />
            </div>
            <div>
              <label className="label">Local</label>
              <input name="location" className="input" placeholder="Nova sede" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Descrição</label>
              <textarea name="description" rows={2} className="input" />
            </div>
            <div>
              <SubmitButton>Criar festival</SubmitButton>
            </div>
          </form>
        </details>
      )}

      {festivals.length === 0 ? (
        <EmptyState title="Nenhum festival publicado ainda">Em breve as fotos e vídeos aparecem aqui!</EmptyState>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {festivals.map((f) => {
            const photo = f.media.find((m) => m.type === "photo")?.storage_path;
            const video = f.media.find((m) => m.type === "youtube")?.youtube_id;
            const cover = photo ? signedMap.get(photo) : video ? `https://i.ytimg.com/vi/${video}/hqdefault.jpg` : null;
            const photos = f.media.filter((m) => m.type === "photo").length;
            const videos = f.media.length - photos;
            return (
              <Link key={f.id} href={`/festivais/${f.id}`} className="group overflow-hidden rounded-2xl border border-line bg-surface transition hover:border-accent">
                <div className="relative aspect-video bg-surface-2">
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-accent-strong">
                      <Camera className="h-12 w-12" />
                    </div>
                  )}
                  <div className="absolute bottom-3 left-3 flex gap-2 text-xs">
                    <span className="badge border-transparent bg-surface/90 text-fg"><Camera className="h-3 w-3" /> {photos}</span>
                    <span className="badge border-transparent bg-surface/90 text-fg"><PlayCircle className="h-3 w-3" /> {videos}</span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-serif text-lg text-fg">{f.title}</h3>
                  <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(f.date)}</span>
                    {f.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {f.location}</span>}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
