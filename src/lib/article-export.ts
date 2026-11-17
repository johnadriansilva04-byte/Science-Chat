import { stripMarkers } from "@/lib/article-marker";
import { parseBlocks, serializeBlocks } from "@/lib/article-blocks";
import { numberSections } from "@/lib/front-matter";

export type ExportPage = { page_number: number; content: string; status: string };

/** Assinatura da Variant impressa ao final de cada artigo. */
export const ARTICLE_SIGNATURE = "Criado com ScienceChat · Variant · CEO John Adrian";

/** True when the content already begins with a Markdown H1 (the article title). */
export function startsWithTitleHeading(content: string): boolean {
  return /^#\s+\S/.test(content.trimStart());
}

export type AssembleOptions = {
  /** Numera as seções progressivamente (1, 1.1, 1.1.1) — ABNT. */
  numberedSections?: boolean;
  /** Omite o H1 do título no corpo (usado quando a capa já o apresenta). */
  omitTitle?: boolean;
};

/** Remove um H1 inicial (o título) do corpo Markdown, se houver. */
export function stripLeadingTitle(markdown: string): string {
  return markdown.replace(/^\s*#\s+[^\n]*\n+/, "");
}

/** Corpo do documento (sem elementos pré-textuais) em Markdown. */
export function assembleBody(
  title: string,
  pages: ExportPage[],
  options: AssembleOptions = {},
): string {
  const approved = pages
    .filter((p) => p.status === "approved")
    .sort((a, b) => a.page_number - b.page_number);
  let body = approved.map((p) => stripMarkers(p.content)).join("\n\n");
  if (options.numberedSections && body) {
    body = serializeBlocks(numberSections(parseBlocks(body)));
  }
  // A primeira página aprovada normalmente já traz o H1 com o título; nesse caso
  // não repetir o cabeçalho para não duplicar o título no documento mestre.
  const hasTitle = startsWithTitleHeading(body);
  if (options.omitTitle && hasTitle) body = stripLeadingTitle(body);
  const header =
    hasTitle || options.omitTitle ? "" : `# ${title.trim() || "Artigo científico"}\n\n`;
  const footer = approved.length > 0 ? `\n\n---\n\n${ARTICLE_SIGNATURE}` : "";
  return `${header}${body}${footer}`.trim() + "\n";
}

/**
 * Assemble approved pages, in order, into the master document (Markdown).
 * Os elementos pré-textuais (capa/folha de rosto) são adicionados por cada
 * formato de saída, que conhece o layout adequado.
 */
export function assembleMarkdown(
  title: string,
  pages: ExportPage[],
  options: AssembleOptions = {},
): string {
  return assembleBody(title, pages, options);
}

/** Remove the most common Markdown syntax for plain-text export. */
export function markdownToPlainText(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`{1,3}([^`]+)`{1,3}/g, "$1")
    .replace(/^>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "• ")
    .replace(/^\s*(\d+)\.\s+/gm, "$1. ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^---+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function slugify(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "artigo"
  );
}

export function downloadFile(filename: string, content: string, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
