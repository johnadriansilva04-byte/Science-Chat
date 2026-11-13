/**
 * Regras de tamanho da página científica. Uma página A4 de artigo (fonte serifada
 * ~11pt, entrelinha 1.5) comporta cerca de 450–650 palavras; abaixo de 400 a IA
 * provavelmente cortou o conteúdo. Usado tanto no backend (retry) quanto na UI
 * (aviso ao pesquisador).
 */
export const MIN_PAGE_WORDS = 400;
export const TARGET_PAGE_WORDS = 550;

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
