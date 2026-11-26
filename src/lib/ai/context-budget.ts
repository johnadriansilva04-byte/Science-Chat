/**
 * Teto de contexto para prompts montados a partir de texto que cresce sem
 * limite (transcrição da entrevista, documento inteiro no chat).
 *
 * Sem teto, um artigo de 30 páginas reenviava o documento completo em cada
 * mensagem e esgotava a cota diária de neurônios em poucos turnos. O corte
 * preserva o começo (tese, combinação inicial) e o fim (o que está sendo
 * discutido agora), que é onde o modelo mais precisa de contexto.
 */
export const CLIPPED_MARKER = "\n\n[… trecho intermediário omitido para caber na cota da IA …]\n\n";

export function clipText(text: string, maxChars: number, marker: string = CLIPPED_MARKER): string {
  if (!text) return "";
  if (!Number.isFinite(maxChars) || maxChars <= 0) return "";
  if (text.length <= maxChars) return text;

  const budget = maxChars - marker.length;
  if (budget <= 0) return text.slice(0, maxChars);

  const head = Math.ceil(budget * 0.4);
  const tail = budget - head;
  return `${text.slice(0, head)}${marker}${text.slice(text.length - tail)}`;
}
