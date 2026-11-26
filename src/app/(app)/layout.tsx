import { requireUser } from "@/lib/auth";
import { signOut } from "@/lib/actions/auth";
import { MobileNav, Sidebar, type NavUser } from "@/components/AppNav";
import { ROLE_LABEL } from "@/lib/utils";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const navUser: NavUser = {
    name: user.full_name,
    roleLabel: ROLE_LABEL[user.role],
    isAdmin: user.isAdmin,
    isTeacher: user.isTeacher,
  };
  return (
    <div className="flex min-h-dvh">
      <Sidebar user={navUser} signOut={signOut} />
      <div className="min-w-0 flex-1">
        <MobileNav user={navUser} />
        <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 lg:px-8 lg:pb-10 lg:pt-8">{children}</main>
      </div>
    </div>
  );
}
