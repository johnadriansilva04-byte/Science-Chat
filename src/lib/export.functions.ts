import { createServerFn } from "@tanstack/react-start";
import { requireUser } from "@/lib/cf/auth-middleware";
import * as repo from "@/lib/cf/repo.server";
import { assembleBody, markdownToPlainText } from "@/lib/article-export";
import { buildDocx } from "@/lib/docx";
import { markdownToHtml, markdownToLatex } from "@/lib/export-formats";
import { bytesToBase64 } from "@/lib/base64";
import { stateLabel, categoryLabel, type ClaimState, type ClaimCategory } from "@/lib/traceability";
import { formatProfile } from "@/lib/format-profile";
import {
  buildFrontMatter,
  frontMatterMarkdown,
  resolveDocumentMeta,
  type DocumentMeta,
} from "@/lib/front-matter";
import type { CitationStandard } from "@/lib/editorial";

export type ExportBundle = {
  title: string;
  author: string;
  /** Norma de formatação aplicada (ABNT, APA, IEEE, …). */
  standard: CitationStandard;
  markdown: string;
  plainText: string;
  html: string;
  latex: string;
  docxBase64: string;
};

/** Lê o JSON de identificação do trabalho gravado na configuração editorial. */
function parseLayout(raw: string | null): Partial<DocumentMeta> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && "document" in parsed) {
      return (parsed as { document: Partial<DocumentMeta> }).document;
    }
    return parsed as Partial<DocumentMeta>;
  } catch {
    return null;
  }
}

/** Reúne as páginas APROVADAS e monta todos os formatos, sem reescrever texto. */
export const buildExport = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((d: { articleId: string; author?: string }) => d)
  .handler(async ({ data, context }): Promise<ExportBundle> => {
    const userId = context.user.id;
    const article = await repo.getArticle(userId, data.articleId);
    if (!article) throw new Error("Artigo não encontrado");
    const pages = await repo.listPages(userId, data.articleId);
    const editorial = await repo.getEditorialConfig(userId, data.articleId);
    const standard = (editorial?.standard ?? "abnt") as CitationStandard;
    const profile = formatProfile(standard);
    const fallbackAuthor =
      data.author?.trim() || context.user.display_name || "Pesquisador(a) independente";

    // Elementos pré-textuais só entram quando a norma os prevê (ABNT, APA, …).
    const meta = resolveDocumentMeta(parseLayout(editorial?.layout_json ?? null), fallbackAuthor);
    const frontMatter = profile.frontMatter
      ? buildFrontMatter({ ...meta, author: meta.author || fallbackAuthor }, article.title)
      : null;

    const body = assembleBody(
      article.title,
      pages.map((p) => ({
        page_number: p.page_number,
        content: p.content,
        status: p.status,
      })),
      { numberedSections: profile.numberedSections, omitTitle: frontMatter !== null },
    );
    // O Markdown (texto) recebe a capa/folha de rosto como cabeçalho textual; os
    // formatos com layout (DOCX/HTML/LaTeX) recebem os blocos pré-textuais.
    const markdown = frontMatter ? `${frontMatterMarkdown(frontMatter)}\n${body}` : body;

    const author = frontMatter?.author ?? fallbackAuthor;
    const docx = buildDocx({ title: article.title, author, markdown: body, standard, frontMatter });

    return {
      title: article.title,
      author,
      standard,
      markdown,
      plainText: markdownToPlainText(markdown),
      html: markdownToHtml(body, article.title, author, standard, frontMatter),
      latex: markdownToLatex(body, article.title, author, standard, frontMatter),
      docxBase64: bytesToBase64(docx),
    };
  });

/** Dossiê documental como documento separado (Markdown), para auditoria. */
export const buildDossier = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((d: { articleId: string }) => d)
  .handler(async ({ data, context }) => {
    const userId = context.user.id;
    const article = await repo.getArticle(userId, data.articleId);
    if (!article) throw new Error("Artigo não encontrado");
    const docs = await repo.listDocuments(userId, data.articleId);
    const claims = await repo.listClaims(userId, data.articleId);
    const evidence = await repo.listEvidence(userId, data.articleId);

    const lines: string[] = [];
    lines.push(`# Dossiê documental — ${article.title}`);
    lines.push("");
    lines.push(
      "Este documento reúne os materiais apresentados pelo pesquisador e a rastreabilidade entre afirmações e evidências. Ele acompanha o artigo, mas é um produto separado.",
    );
    lines.push("");
    lines.push("## Documentos apresentados");
    lines.push("");
    if (!docs.length) lines.push("_Nenhum documento anexado._");
    for (const d of docs) {
      lines.push(
        `- **Anexo ${d.seq}** — ${d.filename} (${d.mime}, ${Math.round(d.size / 1024)} KB)${
          d.note ? ` — ${d.note}` : ""
        }${d.text_content ? " — texto lido" : " — sem texto legível"}`,
      );
    }
    lines.push("");
    lines.push("## Matriz de rastreabilidade");
    lines.push("");
    if (!claims.length) lines.push("_Nenhuma afirmação registrada._");
    for (const c of claims) {
      const evs = evidence.filter((e) => e.claim_id === c.id);
      lines.push(
        `### Afirmação ${c.seq} — ${categoryLabel(c.category as ClaimCategory)} · ${stateLabel(c.state as ClaimState)}`,
      );
      lines.push(`> ${c.text}`);
      if (evs.length) {
        for (const e of evs) {
          const doc = docs.find((d) => d.id === e.document_id);
          lines.push(
            `- Evidência: ${doc ? `Anexo ${doc.seq} (${doc.filename})` : "sem documento"}${
              e.location ? ` — ${e.location}` : ""
            }${e.excerpt ? `\n  > ${e.excerpt.slice(0, 300)}` : ""}`,
          );
        }
      } else {
        lines.push("- _Sem evidência vinculada._");
      }
      lines.push("");
    }
    lines.push("---");
    lines.push("");
    lines.push(
      "Observação: a ausência de documento para uma afirmação não a torna falsa — indica apenas que não foi localizada prova nos materiais apresentados.",
    );
    const markdown = lines.join("\n");
    return { markdown, plainText: markdownToPlainText(markdown) };
  });
