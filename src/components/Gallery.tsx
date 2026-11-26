"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X, Trash2, Download } from "lucide-react";
import { deleteMedia } from "@/lib/actions/festivals";

export interface GalleryItem {
  id: string;
  type: "photo" | "youtube";
  url: string;
  thumb: string;
  caption: string | null;
}

export function Gallery({ items, festivalId, canManage }: { items: GalleryItem[]; festivalId: string; canManage: boolean }) {
  const [open, setOpen] = useState<number | null>(null);
  const photos = items.filter((i) => i.type === "photo");

  const go = useCallback(
    (d: number) => setOpen((o) => (o === null ? o : (o + d + photos.length) % photos.length)),
    [photos.length],
  );

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, go]);

  return (
    <>
      <div className={items[0]?.type === "youtube" ? "grid gap-4 md:grid-cols-2" : "grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4"}>
        {items.map((item) => (
          <figure key={item.id} className="group relative overflow-hidden rounded-xl border border-line bg-surface-2">
            {item.type === "youtube" ? (
              <iframe
                src={item.url}
                title={item.caption ?? "Vídeo do festival"}
                className="aspect-video w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            ) : (
              <button onClick={() => setOpen(photos.indexOf(item))} className="block w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.thumb} alt={item.caption ?? "Foto do festival"} loading="lazy" className="aspect-square w-full object-cover transition group-hover:scale-105" />
              </button>
            )}
            {item.caption && <figcaption className="px-3 py-2 text-sm text-fg/80">{item.caption}</figcaption>}
            {canManage && (
              <form action={deleteMedia} className="absolute right-2 top-2 transition sm:opacity-0 sm:group-hover:opacity-100">
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="festival_id" value={festivalId} />
                <button
                  className="rounded-full bg-page/80 p-2 text-danger"
                  aria-label="Remover"
                  onClick={(e) => {
                    if (!confirm("Remover esta mídia?")) e.preventDefault();
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </form>
            )}
          </figure>
        ))}
      </div>

      {open !== null && photos[open] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-page/95 p-4" onClick={() => setOpen(null)} role="dialog" aria-modal="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photos[open].url}
            alt={photos[open].caption ?? ""}
            className="max-h-[85dvh] max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute right-4 top-4 flex gap-2">
            <a href={photos[open].url} download target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="rounded-full bg-surface-2 p-2 text-accent-strong" aria-label="Baixar">
              <Download className="h-5 w-5" />
            </a>
            <button className="rounded-full bg-surface-2 p-2 text-accent-strong" aria-label="Fechar">
              <X className="h-5 w-5" />
            </button>
          </div>
          {photos.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); go(-1); }} className="absolute left-2 rounded-full bg-surface-2/80 p-3 text-accent-strong" aria-label="Anterior">
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); go(1); }} className="absolute right-2 rounded-full bg-surface-2/80 p-3 text-accent-strong" aria-label="Próxima">
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
          <p className="absolute bottom-4 text-sm text-muted">{open + 1} / {photos.length}</p>
        </div>
      )}
    </>
  );
}
