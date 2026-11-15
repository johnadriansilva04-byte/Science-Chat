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

/**
 * Entre duas versões do mesmo texto, devolve a mais longa (em palavras). Usado
 * quando a IA precisa reescrever uma página curta: se a nova tentativa vier ainda
 * menor, mantemos a anterior para não piorar o resultado.
 */
export function pickLongerText(a: string, b: string): string {
  return countWords(b) > countWords(a) ? b : a;
}

/** Normaliza um parágrafo para comparação (sem acentos, pontuação ou caixa). */
function normalizeParagraph(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function jaccard(a: string, b: string): number {
  const sa = new Set(a.split(" ").filter(Boolean));
  const sb = new Set(b.split(" ").filter(Boolean));
  if (!sa.size || !sb.size) return 0;
  let inter = 0;
  for (const w of sa) if (sb.has(w)) inter += 1;
  return inter / (sa.size + sb.size - inter);
}

/**
 * Remove parágrafos repetidos de uma página. Modelos pequenos às vezes degeneram
 * e repetem o mesmo parágrafo; a duplicação não deve chegar ao documento. Mantém a
 * primeira ocorrência e descarta as seguintes quase idênticas (Jaccard ≥ 0,8).
 * Títulos e parágrafos curtos (menos de 8 palavras) são preservados.
 */
export function dedupeParagraphs(text: string): string {
  const paragraphs = text.split(/\n{2,}/);
  const kept: string[] = [];
  const seen: string[] = [];
  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;
    const norm = normalizeParagraph(trimmed);
    const isHeading = /^#{1,6}\s/.test(trimmed);
    const tooShort = norm.split(" ").filter(Boolean).length < 8;
    if (!isHeading && !tooShort && seen.some((s) => jaccard(s, norm) >= 0.8)) continue;
    seen.push(norm);
    kept.push(trimmed);
  }
  return kept.join("\n\n");
}

/** Quebra um parágrafo em frases (mantendo a pontuação no fim de cada frase). */
function splitSentences(paragraph: string): string[] {
  const matches = paragraph.match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g);
  return (matches ?? [paragraph]).map((s) => s.trim()).filter(Boolean);
}

/** Junta frases em parágrafos de até `perParagraph` frases. */
function groupSentences(sentences: string[], perParagraph = 3): string[] {
  const out: string[] = [];
  for (let i = 0; i < sentences.length; i += perParagraph) {
    out.push(sentences.slice(i, i + perParagraph).join(" "));
  }
  return out;
}

/**
 * Normaliza a página gerada pela IA. Modelos pequenos às vezes devolvem a página
 * inteira em um único bloco e repetem frases ("Este artigo visa…" várias vezes).
 * `dedupeParagraphs` só enxerga repetição entre blocos separados por linha em
 * branco; aqui tratamos a repetição DENTRO do bloco e refluímos o texto em
 * parágrafos legíveis: remove frases quase idênticas (Jaccard ≥ 0,75) e agrupa o
 * restante em parágrafos de até 3 frases. Títulos e blocos já bem divididos ficam
 * intactos (parágrafo com até 3 frases e ≤ 160 palavras é mantido como está).
 */
export function normalizePageText(text: string): string {
  const deduped = dedupeParagraphs(text);
  const blocks = deduped.split(/\n{2,}/);
  const out: string[] = [];
  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    if (/^#{1,6}\s/.test(trimmed)) {
      out.push(trimmed);
      continue;
    }
    const sentences = splitSentences(trimmed);
    const kept: string[] = [];
    const seen: string[] = [];
    for (const sentence of sentences) {
      const norm = normalizeParagraph(sentence);
      if (
        norm.split(" ").filter(Boolean).length >= 6 &&
        seen.some((s) => jaccard(s, norm) >= 0.75)
      ) {
        continue;
      }
      seen.push(norm);
      kept.push(sentence);
    }
    const words = countWords(kept.join(" "));
    // Bloco curto e já legível vira um único parágrafo (não fatiamos por fatiar).
    if (kept.length <= 3 && words <= 160) {
      out.push(kept.join(" "));
      continue;
    }
    out.push(...groupSentences(kept));
  }
  return out.join("\n\n");
}
