import { createServerFn } from "@tanstack/react-start";
import { requireUser } from "@/lib/cf/auth-middleware";
import * as repo from "@/lib/cf/repo.server";
import { auditArticle, auditSummary, type AuditResult } from "@/lib/audit";

export type AuditView = {
  id: string;
  scope: string;
  scopeRef: string | null;
  report: string;
  summary: string | null;
  created_at: string;
};

function toView(row: repo.AuditRow): AuditView {
  return {
    id: row.id,
    scope: row.scope,
    scopeRef: row.scope_ref,
    report: row.report,
    summary: row.summary,
    created_at: row.created_at,
  };
}

/** Executa a auditoria (página, artigo ou afirmação) e grava o relatório. */
export const runAudit = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((d: { articleId: string; scope: "article" | "page"; scopeRef?: string }) => d)
  .handler(async ({ data, context }) => {
    const userId = context.user.id;
    const article = await repo.getArticle(userId, data.articleId);
    if (!article) throw new Error("Artigo não encontrado");

    const allPages = await repo.listPages(userId, data.articleId);
    const claims = await repo.listClaims(userId, data.articleId);
    const docs = await repo.listDocuments(userId, data.articleId);

    const pages =
      data.scope === "page" && data.scopeRef
        ? allPages.filter((p) => String(p.page_number) === data.scopeRef)
        : allPages;

    const result: AuditResult = auditArticle({
      title: article.title,
      pages: pages.map((p) => ({
        page_number: p.page_number,
        content: p.content,
        status: p.status,
      })),
      claims: claims.map((c) => ({
        seq: c.seq,
        text: c.text,
        category: c.category,
        state: c.state,
      })),
      documentCount: docs.length,
    });

    const row = await repo.addAudit(userId, data.articleId, {
      scope: data.scope,
      scopeRef: data.scopeRef ?? null,
      report: result.report,
      summary: auditSummary(result),
    });
    return { ok: true, audit: toView(row), counts: result.counts };
  });

/** Lista as auditorias anteriores do artigo (mais recentes primeiro). */
export const listAudits = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((d: { articleId: string }) => d)
  .handler(async ({ data, context }): Promise<AuditView[]> => {
    const rows = await repo.listAudits(context.user.id, data.articleId);
    return rows.map(toView);
  });

/**
 * Prévia da auditoria sem gravar — para o painel mostrar o estado atual antes
 * de o pesquisador decidir registrá-lo.
 */
export const previewAudit = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((d: { articleId: string }) => d)
  .handler(async ({ data, context }) => {
    const userId = context.user.id;
    const article = await repo.getArticle(userId, data.articleId);
    if (!article) throw new Error("Artigo não encontrado");
    const pages = await repo.listPages(userId, data.articleId);
    const claims = await repo.listClaims(userId, data.articleId);
    const docs = await repo.listDocuments(userId, data.articleId);
    const result = auditArticle({
      title: article.title,
      pages: pages.map((p) => ({
        page_number: p.page_number,
        content: p.content,
        status: p.status,
      })),
      claims: claims.map((c) => ({
        seq: c.seq,
        text: c.text,
        category: c.category,
        state: c.state,
      })),
      documentCount: docs.length,
    });
    return { counts: result.counts, findings: result.findings, report: result.report };
  });
