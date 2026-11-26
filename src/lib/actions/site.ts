"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { redirectWith, str } from "@/lib/flash";

const BACK = "/admin/site";

export async function updateSettings(form: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("site_settings").upsert({
    id: 1,
    school_name: str(form, "school_name") || "Espaço Musical Álvaro Mesquita",
    tagline: str(form, "tagline") || null,
    address: str(form, "address") || null,
    whatsapp: str(form, "whatsapp").replace(/\D/g, "") || null,
    instagram: str(form, "instagram").replace(/^@/, "") || null,
    email: str(form, "email") || null,
    updated_at: new Date().toISOString(),
  });
  if (error) redirectWith(BACK, "error", error.message);
  revalidatePath("/");
  redirectWith(BACK, "ok", "Informações da escola salvas.");
}

export async function updateSection(form: FormData) {
  await requireAdmin();
  const slug = str(form, "slug");
  const supabase = await createClient();

  let image_url = str(form, "image_url") || null;
  const file = form.get("image");
  if (file instanceof File && file.size > 0) {
    if (!file.type.startsWith("image/")) redirectWith(BACK, "error", "Envie um arquivo de imagem.");
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `sections/${slug}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("site-images")
      .upload(path, file, { contentType: file.type, upsert: true });
    if (upErr) redirectWith(BACK, "error", upErr.message);
    image_url = supabase.storage.from("site-images").getPublicUrl(path).data.publicUrl;
  }
  if (form.get("remove_image") === "on") image_url = null;

  const { error } = await supabase.from("site_sections").upsert({
    slug,
    title: str(form, "title"),
    body: str(form, "body"),
    image_url,
    sort: Number(str(form, "sort")) || 0,
    visible: form.get("visible") === "on",
    updated_at: new Date().toISOString(),
  });
  if (error) redirectWith(BACK, "error", error.message);
  revalidatePath("/");
  redirectWith(`${BACK}#${slug}`, "ok", "Seção salva.");
}

export async function createSection(form: FormData) {
  await requireAdmin();
  const title = str(form, "title");
  if (!title) redirectWith(BACK, "error", "Informe o título.");
  const slug =
    title
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || `secao-${Date.now()}`;
  const supabase = await createClient();
  const { error } = await supabase.from("site_sections").insert({ slug, title, body: "", sort: 50 });
  if (error) redirectWith(BACK, "error", error.message);
  revalidatePath("/");
  redirectWith(BACK, "ok", "Seção criada.");
}

export async function deleteSection(form: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("site_sections").delete().eq("slug", str(form, "slug"));
  revalidatePath("/");
  redirectWith(BACK, "ok", "Seção removida.");
}
