/**
 * Endereço da sede: o texto completo vem de site_settings.address (editável em Administração → Site da escola).
 * Daqui saem a forma curta (rua e número), o bairro e a cidade, o link para abrir no Google Maps e o mapa
 * incorporado com o pin. O mapa usa o link colado pela escola (maps_embed_url) ou, sem ele, a busca pelo endereço.
 */
export const ADDRESS_DEFAULT = "R. Joaquim Franco Silva, 80 - Vila Hab., Barra Bonita - SP, 17340-000";

export interface Address {
  full: string;
  /** rua e número: "R. Joaquim Franco Silva, 80" */
  street: string;
  /** bairro e cidade: "Vila Hab., Barra Bonita - SP" */
  area: string;
  /** só a cidade: "Barra Bonita" */
  city: string;
  /** "17340-000", ou vazio */
  cep: string;
}

/** Separa "Rua, 80 - Bairro, Cidade - UF, CEP" nas partes usadas pelo site. Aceita endereços em outro formato. */
export function parseAddress(raw: string | null | undefined): Address | null {
  const full = (raw ?? "").replace(/\s+/g, " ").trim();
  if (!full) return null;
  const parts = full.split(/\s+-\s+/);
  const street = parts[0];
  const cep = /\d{5}-?\d{3}/;
  const rest = parts.slice(1).map((p) => p.replace(cep, "").replace(/,\s*$/, "").trim()).filter(Boolean);
  const area = rest.join(" - ");
  // a cidade é o último pedaço antes da UF: "Vila Hab., Barra Bonita" → "Barra Bonita"
  const beforeUf = rest.length > 1 ? rest[rest.length - 2] : rest[0] ?? "";
  const city = beforeUf.split(",").pop()?.trim() ?? "";
  return { full, street, area, city, cep: full.match(cep)?.[0] ?? "" };
}

/** Abre o endereço no Google Maps (no celular abre o app). */
export const mapsLink = (a: Address) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.full)}`;

/**
 * O src do mapa incorporado. A escola pode colar em "Link do mapa" o código de "Incorporar um mapa" do Google
 * Maps (o <iframe> inteiro ou só o link); sem ele, o mapa busca o endereço e marca o pin.
 */
export function mapsEmbed(a: Address, custom?: string | null) {
  const src = custom?.match(/src="([^"]+)"/)?.[1] ?? custom?.trim();
  if (src && /^https:\/\/(www\.)?google\.[a-z.]+\/maps\/embed/.test(src)) return src;
  return `https://maps.google.com/maps?q=${encodeURIComponent(a.full)}&z=16&hl=pt-BR&output=embed`;
}
