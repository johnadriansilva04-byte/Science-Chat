/** Marcador citável de um documento primário dentro do texto do artigo. */
export function anexoMarker(seq: number, legenda?: string) {
  return legenda ? `${legenda} [Anexo ${seq}]` : `[Anexo ${seq}]`;
}

/**
 * Insere o marcador de um anexo no conteúdo de uma página. Se `posicao` indicar
 * "após o Nº parágrafo", insere depois dele; caso contrário, acrescenta ao final.
 */
export function insertAnexoMarker(
  content: string,
  seq: number,
  posicao?: string,
  legenda?: string,
): string {
  const marker = anexoMarker(seq, legenda);
  const base = content ?? "";
  const paragraphs = base.split(/\n{2,}/);
  const match = posicao?.match(/par[áa]grafo\s+(\d+)/i);
  if (match && paragraphs.length > 1) {
    const n = parseInt(match[1] ?? "1", 10);
    const idx = Math.min(Math.max(n, 1), paragraphs.length);
    paragraphs.splice(idx, 0, marker);
    return paragraphs.join("\n\n");
  }
  return `${base.trimEnd()}\n\n${marker}`.trim();
}
