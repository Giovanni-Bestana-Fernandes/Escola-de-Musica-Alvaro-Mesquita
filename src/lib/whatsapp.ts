/** Número e mensagem de matrícula da escola (enviados pelo cliente). O número fica em src/lib/site-data.ts. */
export const WHATSAPP_DEFAULT = "5514996436839";
export const WHATSAPP_MESSAGE =
  "Olá! Quero aprender um instrumento no Espaço Musical Álvaro Mesquita. Poderia me enviar a tabela de horários e valores?";

export function whatsappLink(number?: string | null) {
  const phone = (number || WHATSAPP_DEFAULT).replace(/\D/g, "");
  return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
}

/** O vídeo que aparece antes de ir para o WhatsApp (post do Instagram da escola). */
export const ENROLL_VIDEO_POST = "https://www.instagram.com/p/DWj6PbAIEbT/";
