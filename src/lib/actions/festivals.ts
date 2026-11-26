"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePerm } from "@/lib/auth";
import { redirectWith, str } from "@/lib/flash";
import { parseYoutubeId } from "@/lib/utils";

export async function createFestival(form: FormData) {
  const user = await requirePerm("manage_festivals");
  const title = str(form, "title");
  const date = str(form, "date");
  if (!title || !date) redirectWith("/festivais", "error", "Informe título e data.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("festivals")
    .insert({
      title,
      date,
      location: str(form, "location") || null,
      description: str(form, "description") || null,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error) redirectWith("/festivais", "error", error.message);
  revalidatePath("/festivais");
  redirectWith(`/festivais/${data.id}`, "ok", "Festival criado. Agora adicione fotos e vídeos.");
}

export async function updateFestival(form: FormData) {
  await requirePerm("manage_festivals");
  const id = str(form, "id");
  const back = `/festivais/${id}`;
  const supabase = await createClient();
  const { error } = await supabase
    .from("festivals")
    .update({
      title: str(form, "title"),
      date: str(form, "date"),
      location: str(form, "location") || null,
      description: str(form, "description") || null,
    })
    .eq("id", id);
  if (error) redirectWith(back, "error", error.message);
  revalidatePath(back);
  redirectWith(back, "ok", "Festival atualizado.");
}

export async function deleteFestival(form: FormData) {
  await requirePerm("manage_festivals");
  const id = str(form, "id");
  const supabase = await createClient();
  const { data: media } = await supabase
    .from("festival_media")
    .select("storage_path")
    .eq("festival_id", id)
    .eq("type", "photo");
  const paths = (media ?? []).map((m) => m.storage_path).filter(Boolean) as string[];
  if (paths.length) await supabase.storage.from("festival-photos").remove(paths);
  const { error } = await supabase.from("festivals").delete().eq("id", id);
  if (error) redirectWith(`/festivais/${id}`, "error", error.message);
  revalidatePath("/festivais");
  redirectWith("/festivais", "ok", "Festival excluído.");
}

export async function addYoutubeVideo(form: FormData) {
  const user = await requirePerm("manage_festivals");
  const festivalId = str(form, "festival_id");
  const back = `/festivais/${festivalId}`;
  const youtubeId = parseYoutubeId(str(form, "url"));
  if (!youtubeId) redirectWith(back, "error", "Link do YouTube inválido.");
  const supabase = await createClient();
  const { error } = await supabase.from("festival_media").insert({
    festival_id: festivalId,
    type: "youtube",
    youtube_id: youtubeId,
    caption: str(form, "caption") || null,
    created_by: user.id,
  });
  if (error) redirectWith(back, "error", error.message);
  revalidatePath(back);
  redirectWith(back, "ok", "Vídeo adicionado.");
}

/** Registra no banco as fotos que o navegador já enviou ao storage. */
export async function registerPhotos(festivalId: string, paths: string[]) {
  const user = await requirePerm("manage_festivals");
  const valid = paths.filter((p) => p.startsWith(`${festivalId}/`));
  if (!valid.length) return { ok: false, error: "Nenhuma foto válida." };
  const supabase = await createClient();
  const { error } = await supabase.from("festival_media").insert(
    valid.map((storage_path) => ({ festival_id: festivalId, type: "photo", storage_path, created_by: user.id })),
  );
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/festivais/${festivalId}`);
  return { ok: true };
}

export async function deleteMedia(form: FormData) {
  await requirePerm("manage_festivals");
  const id = str(form, "id");
  const festivalId = str(form, "festival_id");
  const supabase = await createClient();
  const { data: media } = await supabase.from("festival_media").select("*").eq("id", id).single();
  if (media?.storage_path) await supabase.storage.from("festival-photos").remove([media.storage_path]);
  await supabase.from("festival_media").delete().eq("id", id);
  revalidatePath(`/festivais/${festivalId}`);
  redirectWith(`/festivais/${festivalId}`, "ok", "Mídia removida.");
}
