"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { redirectWith, str } from "@/lib/flash";

export async function signIn(form: FormData) {
  const email = str(form, "email");
  const password = str(form, "password");
  const next = str(form, "next");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirectWith(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`, "error", "E-mail ou senha inválidos.");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/inicio");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function updateMyProfile(form: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const patch: Record<string, string | null> = {
    full_name: str(form, "full_name") || user.full_name,
    phone: str(form, "phone") || null,
  };
  if (user.isTeacher) {
    patch.bio = str(form, "bio") || null;
    const color = str(form, "color");
    if (/^#[0-9a-f]{6}$/i.test(color)) patch.color = color;
  }
  const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
  if (error) redirectWith("/perfil", "error", error.message);
  revalidatePath("/", "layout");
  redirectWith("/perfil", "ok", "Perfil atualizado.");
}

export async function changePassword(form: FormData) {
  await requireUser();
  const password = str(form, "password");
  const confirm = str(form, "confirm");
  if (password.length < 8) redirectWith("/perfil", "error", "A senha precisa ter pelo menos 8 caracteres.");
  if (password !== confirm) redirectWith("/perfil", "error", "As senhas não conferem.");
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirectWith("/perfil", "error", error.message);
  redirectWith("/perfil", "ok", "Senha alterada.");
}
