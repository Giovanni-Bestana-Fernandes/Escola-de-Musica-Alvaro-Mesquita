"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";

/** Campo de busca que esconde, na própria página, os itens [data-search] cujo texto não contém o termo. */
export function SearchFilter({ placeholder = "Buscar pelo nome", scope }: { placeholder?: string; scope: string }) {
  const [q, setQ] = useState("");
  const [shown, setShown] = useState<number | null>(null);
  useEffect(() => {
    const term = q
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .trim();
    const items = document.querySelectorAll<HTMLElement>(`${scope} [data-search]`);
    let n = 0;
    items.forEach((el) => {
      const hay = (el.dataset.search ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
      const ok = !term || hay.includes(term);
      el.hidden = !ok;
      if (ok) n++;
    });
    setShown(term ? n : null);
  }, [q, scope]);
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <label className="relative w-full max-w-sm">
        <span className="sr-only">{placeholder}</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className="input pl-9" type="search" />
      </label>
      {shown != null && <span className="text-sm text-muted">{shown === 0 ? "Ninguém encontrado" : `${shown} encontrado(s)`}</span>}
    </div>
  );
}
