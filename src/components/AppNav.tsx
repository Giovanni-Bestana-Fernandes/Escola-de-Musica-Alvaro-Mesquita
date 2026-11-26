"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  CalendarDays,
  MessageSquare,
  Camera,
  Users,
  ShieldCheck,
  Guitar,
  LayoutTemplate,
  UserCircle,
  LogOut,
  Menu,
} from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { cn } from "@/lib/utils";

export interface NavUser {
  name: string;
  roleLabel: string;
  isAdmin: boolean;
  isTeacher: boolean;
}

const ICONS = { Home, CalendarDays, MessageSquare, Camera, Users, ShieldCheck, Guitar, LayoutTemplate, UserCircle };
type IconName = keyof typeof ICONS;
interface Item {
  href: string;
  label: string;
  icon: IconName;
  /** uma linha dizendo o que tem na página (aparece na barra lateral) */
  hint?: string;
}

export function buildNav(u: NavUser) {
  const main: Item[] = [
    { href: "/inicio", label: "Início", icon: "Home", hint: u.isTeacher ? "Agenda de hoje e pedidos" : "Sua próxima aula" },
    { href: "/calendario", label: "Agenda", icon: "CalendarDays", hint: "Todas as aulas no calendário" },
    { href: "/chat", label: "Mensagens", icon: "MessageSquare", hint: "Chat, arquivos e link do Meet" },
    { href: "/festivais", label: "Festivais", icon: "Camera", hint: "Fotos e vídeos" },
  ];
  if (u.isTeacher)
    main.push({ href: "/alunos", label: u.isAdmin ? "Alunos" : "Meus alunos", icon: "Users", hint: "Matrículas e agendamento" });
  const admin: Item[] = u.isAdmin
    ? [
        { href: "/admin/professores", label: "Professores", icon: "ShieldCheck", hint: "Contas e o que cada um pode fazer" },
        { href: "/admin/instrumentos", label: "Cursos", icon: "Guitar", hint: "Instrumentos oferecidos" },
        { href: "/admin/site", label: "Site da escola", icon: "LayoutTemplate", hint: "Textos e endereço da página inicial" },
      ]
    : [];
  return { main, admin };
}

function NavLink({ item, active }: { item: Item; active: boolean }) {
  const Icon = ICONS[item.icon];
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-start gap-3 rounded-xl px-3 py-2.5 text-sm transition",
        active ? "bg-accent text-fg" : "text-[#f6f1e6]/85 hover:bg-white/8 hover:text-[#f6f1e6]",
      )}
    >
      <Icon className={cn("mt-0.5 h-4.5 w-4.5 shrink-0", active ? "text-fg" : "text-accent")} />
      <span className="leading-tight">
        <span className="block font-medium">{item.label}</span>
        {item.hint && <span className={cn("mt-0.5 block text-[12.5px]", active ? "text-fg/75" : "text-[#f6f1e6]/55")}>{item.hint}</span>}
      </span>
    </Link>
  );
}

export function Sidebar({ user, signOut }: { user: NavUser; signOut: () => Promise<void> }) {
  const path = usePathname();
  const { main, admin } = buildNav(user);
  const isActive = (href: string) => path === href || path.startsWith(href + "/");
  return (
    <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 flex-col bg-[#1b1712] px-3 py-5 text-[#f6f1e6] lg:flex">
      <Link href="/" className="mb-6 flex items-center gap-2 px-2">
        <LogoMark className="h-10 w-10" />
        <div className="leading-tight">
          <p className="text-[13px] text-accent">Espaço Musical</p>
          <p className="font-serif text-lg text-[#f6f1e6]">Álvaro Mesquita</p>
        </div>
      </Link>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
        <p className="mb-1 px-3 text-[13px] font-medium text-[#f6f1e6]/50">Minha área</p>
        {main.map((i) => (
          <NavLink key={i.href} item={i} active={isActive(i.href)} />
        ))}
        {admin.length > 0 && (
          <>
            <p className="mb-1 mt-5 px-3 text-[13px] font-medium text-[#f6f1e6]/50">
              Administração
            </p>
            {admin.map((i) => (
              <NavLink key={i.href} item={i} active={isActive(i.href)} />
            ))}
          </>
        )}
      </nav>
      <div className="mt-4 border-t border-white/10 pt-4">
        <NavLink item={{ href: "/perfil", label: user.name, icon: "UserCircle", hint: `${user.roleLabel} · meu perfil` }} active={isActive("/perfil")} />
        <form action={signOut}>
          <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-[#f6f1e6]/60 hover:bg-white/8 hover:text-[#f6f1e6]">
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </form>
      </div>
    </aside>
  );
}

export function MobileNav({ user }: { user: NavUser }) {
  const path = usePathname();
  const { main } = buildNav(user);
  const items = main.slice(0, 4);
  const isActive = (href: string) => path === href || path.startsWith(href + "/");
  const moreActive = !items.some((i) => isActive(i.href));
  return (
    <>
      <header className="sticky top-0 z-30 flex items-center gap-2 bg-[#1b1712] px-4 py-3 text-[#f6f1e6] lg:hidden">
        <LogoMark className="h-8 w-8" />
        <span className="font-serif text-lg text-[#f6f1e6]">Álvaro Mesquita</span>
      </header>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-surface/95 backdrop-blur lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {items.map((i) => {
          const Icon = ICONS[i.icon];
          const active = isActive(i.href);
          return (
            <Link
              key={i.href}
              href={i.href}
              className={cn("flex flex-col items-center gap-1 py-2.5 text-[11px]", active ? "text-accent-strong" : "text-muted")}
            >
              <Icon className={cn("h-5 w-5", active && "text-accent-strong")} />
              {i.label}
            </Link>
          );
        })}
        <Link
          href="/perfil"
          className={cn("flex flex-col items-center gap-1 py-2.5 text-[11px]", moreActive ? "text-accent-strong" : "text-muted")}
        >
          <Menu className={cn("h-5 w-5", moreActive && "text-accent-strong")} />
          Mais
        </Link>
      </nav>
    </>
  );
}
