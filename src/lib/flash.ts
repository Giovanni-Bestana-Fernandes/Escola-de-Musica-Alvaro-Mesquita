import "server-only";
import { redirect } from "next/navigation";

/** Redireciona exibindo uma mensagem de sucesso ou erro (lida pelo componente <Flash />). */
export function redirectWith(path: string, kind: "ok" | "error", message: string): never {
  const [withoutHash, hash] = path.split("#");
  const [base, query = ""] = withoutHash.split("?");
  const params = new URLSearchParams(query);
  params.delete("ok");
  params.delete("error");
  params.set(kind, message);
  redirect(`${base}?${params.toString()}${hash ? `#${hash}` : ""}`);
}

export function errorMessage(e: unknown) {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return "Ocorreu um erro inesperado.";
}

export function str(form: FormData, key: string) {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}
