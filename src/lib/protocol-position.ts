import { SECTION_GUIDE, SECTION_GUIDE_ORDER } from "@/lib/section-guide";

/**
 * Em que parte do protocolo de montagem o artigo está, lido do TEXTO da página
 * em produção.
 *
 * O documento não guarda a seção de cada página (só o texto). Como as páginas
 * começam com o título da seção em Markdown, dá para inferir a posição olhando
 * o primeiro título — e assim a faixa do protocolo no chat mostra onde estamos
 * sem precisar de mais um campo no banco.
 *
 * Devolve 1..N (posição em `SECTION_GUIDE`), ou 0 quando não há como saber.
 */
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

/** Apelidos que aparecem nos títulos gerados, além do nome exato do guia. */
const ALIASES: Record<string, string[]> = {
  introducao: ["introducao", "introdução"],
  fundamentacao: ["fundamentacao", "fundamentação", "referencial teorico", "revisao de literatura"],
  metodologia: ["metodologia", "metodos", "métodos", "material e metodos"],
  resultados: ["resultados", "resultados e discussao", "analise"],
  discussao: ["discussao", "discussão"],
  conclusao: ["conclusao", "conclusão", "consideracoes finais"],
  referencias: ["referencias", "referências"],
};

/** Primeiro título Markdown da página (`# ...`, `## ...`), sem numeração. */
export function firstHeading(text: string): string | null {
  for (const line of text.split("\n")) {
    const match = line.match(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/);
    if (match?.[1]) {
      return normalize(match[1])
        .replace(/^[\d.\s]+/, "")
        .trim();
    }
  }
  return null;
}

/** Posição (1-based) da parte do protocolo, ou 0 se a página não a identifica. */
export function protocolPosition(pageText: string | undefined | null): number {
  if (!pageText) return 0;
  const heading = firstHeading(pageText);
  if (!heading) return 0;

  for (let i = 0; i < SECTION_GUIDE.length; i++) {
    const section = SECTION_GUIDE[i]!;
    const names = [normalize(section.title), ...(ALIASES[section.key] ?? [])];
    if (names.some((name) => heading === name || heading.startsWith(name))) {
      return i + 1;
    }
  }
  return 0;
}

/** A chave da seção em produção, para reuso (ex.: realce no trilho). */
export function protocolKey(pageText: string | undefined | null): string | null {
  const position = protocolPosition(pageText);
  return position ? (SECTION_GUIDE_ORDER[position - 1] ?? null) : null;
}
