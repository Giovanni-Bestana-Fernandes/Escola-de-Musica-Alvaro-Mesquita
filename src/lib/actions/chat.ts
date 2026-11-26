"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireTeacher, requireUser } from "@/lib/auth";
import { redirectWith, str } from "@/lib/flash";
import { isSafeUrl } from "@/lib/utils";

export async function setConversationMeetLink(form: FormData) {
  await requireTeacher();
  const id = str(form, "conversation_id");
  const back = `/chat/${id}`;
  const link = str(form, "meet_link");
  if (link && !isSafeUrl(link)) redirectWith(back, "error", "Link inválido.");
  const supabase = await createClient();
  const { error } = await supabase.from("conversations").update({ meet_link: link || null }).eq("id", id);
  if (error) redirectWith(back, "error", error.message);
  revalidatePath(back);
  redirectWith(back, "ok", link ? "Link do Meet fixado." : "Link do Meet removido.");
}

/** Gera um link temporário (1h) para baixar um arquivo do chat. O RLS do storage valida o acesso. */
export async function getChatFileUrl(path: string) {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("chat-files").createSignedUrl(path, 3600);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, url: data.signedUrl };
}
