import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Permission, Profile, TeacherPermissions } from "@/lib/types";

export interface CurrentUser extends Profile {
  permissions: Omit<TeacherPermissions, "teacher_id">;
  isAdmin: boolean;
  /** Álvaro (admin) também é professor. */
  isTeacher: boolean;
  isStudent: boolean;
}

const NO_PERMS = {
  manage_festivals: false,
  manage_students: false,
  view_all_calendars: false,
  manage_financial: false,
};
const ALL_PERMS = {
  manage_festivals: true,
  manage_students: true,
  view_all_calendars: true,
  manage_financial: true,
};

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single<Profile>();
  if (!profile || !profile.active) return null;

  const isAdmin = profile.role === "admin";
  let permissions = isAdmin ? ALL_PERMS : NO_PERMS;
  if (profile.role === "teacher") {
    const { data } = await supabase
      .from("teacher_permissions")
      .select("manage_festivals, manage_students, view_all_calendars, manage_financial")
      .eq("teacher_id", user.id)
      .maybeSingle();
    permissions = data ?? NO_PERMS;
  }

  return {
    ...profile,
    permissions,
    isAdmin,
    isTeacher: isAdmin || profile.role === "teacher",
    isStudent: profile.role === "student",
  };
});

export function can(user: CurrentUser | null, perm: Permission) {
  return !!user && (user.isAdmin || user.permissions[perm]);
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireTeacher() {
  const user = await requireUser();
  if (!user.isTeacher) redirect("/inicio");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!user.isAdmin) redirect("/inicio");
  return user;
}

export async function requirePerm(perm: Permission) {
  const user = await requireUser();
  if (!can(user, perm)) redirect("/inicio");
  return user;
}
