"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { registerPhotos } from "@/lib/actions/festivals";

const MAX_SIDE = 2000;

/** Reduz fotos grandes de celular antes de enviar (economiza armazenamento). */
async function resize(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 1.5 * 1024 * 1024) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return await new Promise((res) => canvas.toBlob((b) => res(b ?? file), "image/jpeg", 0.85));
  } catch {
    return file;
  }
}

export function PhotoUploader({ festivalId }: { festivalId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handle(files: FileList) {
    setError(null);
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!list.length) return;
    setProgress({ done: 0, total: list.length });
    const paths: string[] = [];
    for (const file of list) {
      const blob = await resize(file);
      const path = `${festivalId}/${crypto.randomUUID()}.jpg`;
      const { error } = await supabase.storage
        .from("festival-photos")
        .upload(path, blob, { contentType: blob.type || "image/jpeg" });
      if (error) setError(`Falha em ${file.name}: ${error.message}`);
      else paths.push(path);
      setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
    }
    if (paths.length) {
      const res = await registerPhotos(festivalId, paths);
      if (!res.ok) setError(res.error ?? "Erro ao salvar as fotos.");
    }
    setProgress(null);
    router.refresh();
  }

  return (
    <div>
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-accent/40 px-4 py-8 text-center transition hover:border-accent hover:bg-accent-soft">
        {progress ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-accent-strong" />
            <span className="text-sm">Enviando {progress.done} de {progress.total}...</span>
          </>
        ) : (
          <>
            <Upload className="h-8 w-8 text-accent-strong" />
            <span className="text-sm">Toque para escolher várias fotos</span>
            <span className="text-xs text-muted">As fotos são otimizadas automaticamente</span>
          </>
        )}
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          disabled={!!progress}
          onChange={(e) => e.target.files && handle(e.target.files)}
        />
      </label>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
