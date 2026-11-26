"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Emblema em SVG inspirado na logo (palheta dourada com ondas sonoras).
 * Usado no menu, nos ícones e como substituto enquanto /logo.png não existir.
 */
export function LogoMark({ className }: { className?: string }) {
  const gid = `lm-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const g = `url(#${gid})`;
  return (
    <svg viewBox="0 0 100 110" className={cn("h-10 w-10", className)} aria-hidden="true">
      <defs>
        <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="100" y2="110">
          <stop offset="0" stopColor="#fbecbf" />
          <stop offset="0.3" stopColor="#ecc566" />
          <stop offset="0.55" stopColor="#c08f2a" />
          <stop offset="0.8" stopColor="#f5d98a" />
          <stop offset="1" stopColor="#9a7020" />
        </linearGradient>
      </defs>
      {/* palheta */}
      <path
        d="M50 104C38 92 8 58 6 32 4 12 26 4 50 4s46 8 44 28c-2 26-32 60-44 72Z"
        fill="#070707"
        stroke={g}
        strokeWidth="5"
      />
      <path
        d="M50 94C40 83 16 56 14 34 13 18 30 12 50 12s37 6 36 22c-2 22-26 49-36 60Z"
        fill="none"
        stroke={g}
        strokeWidth="1.5"
        opacity="0.7"
      />
      {/* braços de guitarra estilizados */}
      <g stroke={g} strokeWidth="3.2" strokeLinecap="round">
        <line x1="32" y1="22" x2="40" y2="58" />
        <line x1="50" y1="16" x2="50" y2="58" />
        <line x1="68" y1="22" x2="60" y2="58" />
      </g>
      <g fill={g}>
        <rect x="28" y="16" width="8" height="8" rx="2" />
        <rect x="46" y="10" width="8" height="8" rx="2" />
        <rect x="64" y="16" width="8" height="8" rx="2" />
      </g>
      {/* faixa curva */}
      <path d="M14 56c18 10 50 10 72-6" fill="none" stroke={g} strokeWidth="4" strokeLinecap="round" />
      {/* onda sonora */}
      <g fill={g}>
        <rect x="36" y="74" width="3" height="6" rx="1.5" />
        <rect x="41" y="70" width="3" height="14" rx="1.5" />
        <rect x="46" y="67" width="3" height="20" rx="1.5" />
        <rect x="51" y="70" width="3" height="14" rx="1.5" />
        <rect x="56" y="72" width="3" height="10" rx="1.5" />
        <rect x="61" y="74" width="3" height="6" rx="1.5" />
      </g>
    </svg>
  );
}

/** Logo completa. Coloque o arquivo oficial em public/logo.png; até lá, mostra o emblema + nome. */
export function Logo({ className, priority = false }: { className?: string; priority?: boolean }) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  // A imagem pode falhar antes da hidratação (onError não dispara); confere manualmente.
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);
  if (failed) {
    return (
      <div className={cn("flex flex-col items-center text-center", className)}>
        <LogoMark className="h-32 w-32" />
        <div className="mt-4 flex items-center gap-3">
          <span className="gold-rule w-10" />
          <span className="font-serif text-lg text-fg">Espaço Musical</span>
          <span className="gold-rule w-10" />
        </div>
        <div className="font-serif text-4xl text-fg">Álvaro Mesquita</div>
        <div className="mt-1 font-serif italic text-accent-strong">Formando músicos para a vida.</div>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src="/logo.png"
      alt="Espaço Musical Álvaro Mesquita - Formando músicos para a vida"
      className={className}
      fetchPriority={priority ? "high" : undefined}
      onError={() => setFailed(true)}
    />
  );
}
