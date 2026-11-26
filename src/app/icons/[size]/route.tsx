import { ImageResponse } from "next/og";

// Ícones PNG do app (PWA) gerados a partir do emblema dourado.
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110">
<defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="100" y2="110">
<stop offset="0" stop-color="#fbecbf"/><stop offset="0.3" stop-color="#ecc566"/><stop offset="0.55" stop-color="#c08f2a"/><stop offset="0.8" stop-color="#f5d98a"/><stop offset="1" stop-color="#9a7020"/>
</linearGradient></defs>
<path d="M50 104C38 92 8 58 6 32 4 12 26 4 50 4s46 8 44 28c-2 26-32 60-44 72Z" fill="#070707" stroke="url(#g)" stroke-width="5"/>
<g stroke="url(#g)" stroke-width="3.2" stroke-linecap="round"><line x1="32" y1="22" x2="40" y2="58"/><line x1="50" y1="16" x2="50" y2="58"/><line x1="68" y1="22" x2="60" y2="58"/></g>
<g fill="url(#g)"><rect x="28" y="16" width="8" height="8" rx="2"/><rect x="46" y="10" width="8" height="8" rx="2"/><rect x="64" y="16" width="8" height="8" rx="2"/></g>
<path d="M14 56c18 10 50 10 72-6" fill="none" stroke="url(#g)" stroke-width="4" stroke-linecap="round"/>
<g fill="url(#g)"><rect x="36" y="74" width="3" height="6" rx="1.5"/><rect x="41" y="70" width="3" height="14" rx="1.5"/><rect x="46" y="67" width="3" height="20" rx="1.5"/><rect x="51" y="70" width="3" height="14" rx="1.5"/><rect x="56" y="72" width="3" height="10" rx="1.5"/><rect x="61" y="74" width="3" height="6" rx="1.5"/></g>
</svg>`;

export function generateStaticParams() {
  return [{ size: "192" }, { size: "512" }];
}

export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size: raw } = await params;
  const size = raw === "512" ? 512 : 192;
  const inner = Math.round(size * 0.62);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#070707" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt=""
          width={inner}
          height={Math.round(inner * 1.1)}
          src={`data:image/svg+xml;base64,${Buffer.from(SVG).toString("base64")}`}
        />
      </div>
    ),
    { width: size, height: size },
  );
}
