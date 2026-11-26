import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export const TIMEZONE = "America/Sao_Paulo";
/** Brasília não tem horário de verão desde 2019. */
export const TZ_OFFSET = "-03:00";
const OFFSET_MS = 3 * 60 * 60 * 1000;

/** Converte o valor de um <input type="datetime-local"> (horário de Brasília) em ISO UTC. */
export function localInputToIso(value: string): string {
  const v = value.length === 16 ? `${value}:00` : value;
  const d = new Date(`${v}${TZ_OFFSET}`);
  if (Number.isNaN(d.getTime())) throw new Error("Data inválida");
  return d.toISOString();
}

/** Converte ISO UTC em valor para <input type="datetime-local"> no horário de Brasília. */
export function isoToLocalInput(iso: string): string {
  return new Date(new Date(iso).getTime() - OFFSET_MS).toISOString().slice(0, 16);
}

export function formatDateTime(iso: string, opts: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIMEZONE,
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    ...opts,
  }).format(new Date(iso));
}

export function formatTime(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TIMEZONE, hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso),
  );
}

/** "YYYY-MM-DD" -> dd/mm/aaaa, sem deslocamento de fuso. */
export function formatDate(date: string) {
  const [y, m, d] = date.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export function parseYoutubeId(input: string): string | null {
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  try {
    const url = new URL(s);
    if (url.hostname.includes("youtu.be")) return url.pathname.slice(1, 12) || null;
    if (url.hostname.includes("youtube.com")) {
      const v = url.searchParams.get("v");
      if (v) return v.slice(0, 11);
      const m = url.pathname.match(/\/(embed|shorts|live)\/([\w-]{11})/);
      if (m) return m[2];
    }
  } catch {
    return null;
  }
  return null;
}

export function isSafeUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export const STATUS_LABEL: Record<string, string> = {
  scheduled: "Agendada",
  rescheduled: "Remarcada",
  canceled: "Cancelada",
  done: "Realizada",
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Recusado",
};

export const ROLE_LABEL: Record<string, string> = {
  admin: "Diretor e professor",
  teacher: "Professor",
  student: "Aluno",
};

export const PERMISSION_LABEL: Record<string, { label: string; hint: string }> = {
  manage_festivals: { label: "Festivais", hint: "Criar festivais e publicar fotos e vídeos" },
  manage_students: { label: "Alunos", hint: "Cadastrar alunos e matrículas de qualquer professor" },
  view_all_calendars: { label: "Calendário geral", hint: "Ver as aulas de todos os professores" },
  manage_financial: { label: "Administrativo", hint: "Acesso à parte administrativa/financeira" },
};
