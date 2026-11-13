import { stripMarkers } from "@/lib/article-marker";

/** Página aprovada usada para montar o texto integral da publicação. */
export type PublishPage = { page_number: number; content: string; status: string };

/** Monta o Markdown integral a partir das páginas aprovadas, na ordem. */
export function assemblePublicationContent(title: string, pages: PublishPage[]): string {
  const approved = pages
    .filter((p) => p.status === "approved")
    .sort((a, b) => a.page_number - b.page_number)
    .map((p) => stripMarkers(p.content));
  const body = approved.join("\n\n");
  const hasHeading = /^#\s+\S/.test(body.trimStart());
  const header = hasHeading || !title.trim() ? "" : `# ${title.trim()}\n\n`;
  return `${header}${body}`.trim();
}

const HEADING = /^(#{1,6})\s+(.+)$/gm;

/** Extrai a seção de resumo/abstract do texto, quando existir. */
export function extractAbstract(markdown: string): string | null {
  const headings = [...markdown.matchAll(HEADING)];
  for (let i = 0; i < headings.length; i++) {
    const label = headings[i]![2]!.trim();
    if (/^(resumo|abstract|resumen)\b/i.test(label)) {
      const start = headings[i]!.index! + headings[i]![0].length;
      const end = headings[i + 1]?.index ?? markdown.length;
      const text = markdown
        .slice(start, end)
        // A linha de palavras-chave é exibida em campo próprio; remove-a do resumo.
        .replace(/\n\s*(?:\*\*)?\s*(?:palavras[- ]chave|keywords?|palabras clave)\b[\s\S]*$/i, "")
        .trim();
      if (text) return text.slice(0, 2000);
    }
  }
  return null;
}

/** True se o conteúdo já traz uma seção de resumo/abstract própria. */
export function contentHasAbstract(markdown: string): boolean {
  return /^#{1,6}\s+(resumo|abstract|resumen)\b/im.test(markdown);
}

/** Extrai palavras-chave de linhas como "Palavras-chave: a; b; c". */
export function extractKeywords(markdown: string): string | null {
  const match = markdown.match(
    /(?:\*\*)?\s*(?:palavras[- ]chave|keywords?|palabras clave)\s*(?:\*\*)?\s*[:\-]\s*(?:\*\*)?\s*(.+)/i,
  );
  if (!match) return null;
  return match[1]!
    .replace(/\*\*\s*$/, "")
    .trim()
    .replace(/\s*[.;]$/, "")
    .slice(0, 300);
}

/** Citação sugerida (ABNT simplificada) para um artigo publicado. */
export function publicationCitation(pub: {
  author_name: string;
  title: string;
  year?: string | null;
  doi?: string | null;
}): string {
  const year = pub.year ?? "";
  const doi = pub.doi ? ` DOI: ${pub.doi}.` : "";
  return `${pub.author_name.toUpperCase()}. ${pub.title}. ScienceChat Publicações${year ? `, ${year}` : ""}.${doi}`;
}

/** Ano (a partir de uma data ISO) para exibição/citação. */
export function yearOf(iso: string | null | undefined): string {
  if (!iso) return "";
  const match = iso.match(/^(\d{4})/);
  return match ? match[1]! : "";
}
