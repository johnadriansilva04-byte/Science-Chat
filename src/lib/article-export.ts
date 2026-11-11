import { stripMarkers } from "@/lib/article-marker";

export type ExportPage = { page_number: number; content: string; status: string };

/** Assinatura da Variant impressa ao final de cada artigo. */
export const ARTICLE_SIGNATURE = "Criado com ScienceChat · Variant · CEO John Adrian";

/** True when the content already begins with a Markdown H1 (the article title). */
export function startsWithTitleHeading(content: string): boolean {
  return /^#\s+\S/.test(content.trimStart());
}

/** Assemble approved pages, in order, into the master document (Markdown). */
export function assembleMarkdown(title: string, pages: ExportPage[]): string {
  const approved = pages
    .filter((p) => p.status === "approved")
    .sort((a, b) => a.page_number - b.page_number);
  const body = approved.map((p) => stripMarkers(p.content)).join("\n\n");
  // A primeira página aprovada normalmente já traz o H1 com o título; nesse caso
  // não repetir o cabeçalho para não duplicar o título no documento mestre.
  const header = startsWithTitleHeading(body) ? "" : `# ${title.trim() || "Artigo científico"}\n\n`;
  const footer = approved.length > 0 ? `\n\n---\n\n${ARTICLE_SIGNATURE}` : "";
  return `${header}${body}${footer}`.trim() + "\n";
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
