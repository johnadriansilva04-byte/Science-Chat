import { createServerFn } from "@tanstack/react-start";
import { requireUser } from "@/lib/cf/auth-middleware";
import * as repo from "@/lib/cf/repo.server";
import { slugify } from "@/lib/article-export";
import {
  assemblePublicationContent,
  extractAbstract,
  extractKeywords,
  yearOf,
} from "@/lib/publication";
import type { PublicationStatus } from "@/lib/cf/repo.server";

export type PublicationView = {
  id: string;
  slug: string;
  title: string;
  abstract: string | null;
  keywords: string | null;
  language: string;
  area: string | null;
  author_name: string;
  affiliation: string | null;
  orcid: string | null;
  content: string;
  status: PublicationStatus;
  review_report: string | null;
  doi: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  published_at: string | null;
  updated_at: string;
};

function toView(p: repo.Publication): PublicationView {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    abstract: p.abstract,
    keywords: p.keywords,
    language: p.language,
    area: p.area,
    author_name: p.author_name,
    affiliation: p.affiliation,
    orcid: p.orcid,
    content: p.content,
    status: p.status,
    review_report: p.review_report,
    doi: p.doi,
    submitted_at: p.submitted_at,
    reviewed_at: p.reviewed_at,
    published_at: p.published_at,
    updated_at: p.updated_at,
  };
}

export type PublicationSummary = {
  id: string;
  slug: string;
  title: string;
  author_name: string;
  area: string | null;
  language: string;
  abstract: string | null;
  published_at: string | null;
  doi: string | null;
};

function toSummary(p: repo.Publication): PublicationSummary {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    author_name: p.author_name,
    area: p.area,
    language: p.language,
    abstract: p.abstract,
    published_at: p.published_at,
    doi: p.doi,
  };
}

/** Público: lista apenas artigos publicados (revisados por pares). */
export const listPublicPublications = createServerFn({ method: "POST" }).handler(async () => {
  const rows = await repo.listPublished(60);
  return rows.map(toSummary);
});

/** Público: lê um artigo publicado pelo slug. */
export const getPublicPublication = createServerFn({ method: "POST" })
  .validator((d: { slug: string }) => d)
  .handler(async ({ data }) => {
    const pub = await repo.getPublishedBySlug(data.slug);
    if (!pub) return null;
    return { ...toView(pub), year: yearOf(pub.published_at) };
  });

/** Área do autor: estado da publicação do artigo atual (se houver). */
export const getArticlePublication = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((d: { articleId: string }) => d)
  .handler(async ({ data, context }) => {
    const pub = await repo.getPublicationByArticle(context.user.id, data.articleId);
    return pub ? toView(pub) : null;
  });

export const listMyPublications = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const rows = await repo.listPublications(context.user.id);
    return rows.map(toView);
  });

/**
 * Prepara (ou atualiza) a publicação a partir das páginas aprovadas do artigo.
 * Fica em 'draft' — o autor ainda precisa submeter à revisão e depois publicar.
 */
export const preparePublication = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    (d: {
      articleId: string;
      authorName?: string;
      affiliation?: string;
      orcid?: string;
      language?: string;
      area?: string;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    const userId = context.user.id;
    const article = await repo.getArticle(userId, data.articleId);
    if (!article) throw new Error("Artigo não encontrado");
    const pages = await repo.listPages(userId, data.articleId);
    const content = assemblePublicationContent(article.title, pages);
    if (!content.trim()) {
      throw new Error("O artigo ainda não tem páginas aprovadas para publicar.");
    }
    const abstract = extractAbstract(content);
    const keywords = extractKeywords(content);
    const authorName = (data.authorName || "").trim() || "Pesquisador independente";
    const slug = await repo.uniqueSlug(slugify(article.title));
    const pub = await repo.upsertPublication(userId, data.articleId, {
      slug,
      title: article.title,
      abstract,
      keywords,
      language: (data.language || "pt").slice(0, 8),
      area: (data.area || "").trim().slice(0, 120) || null,
      author_name: authorName.slice(0, 160),
      affiliation: (data.affiliation || "").trim().slice(0, 200) || null,
      orcid: (data.orcid || "").trim().slice(0, 40) || null,
      content,
    });
    return toView(pub);
  });

/** Submete à revisão por pares. */
export const submitPublication = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((d: { articleId: string }) => d)
  .handler(async ({ data, context }) => {
    const pub = await repo.getPublicationByArticle(context.user.id, data.articleId);
    if (!pub) throw new Error("Prepare a publicação antes de submeter.");
    await repo.setPublicationStatus(context.user.id, pub.id, "submitted");
    return { ok: true };
  });

/** Publica na área pública — somente após parecer favorável (accepted). */
export const publishPublication = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((d: { articleId: string; doi?: string }) => d)
  .handler(async ({ data, context }) => {
    const pub = await repo.getPublicationByArticle(context.user.id, data.articleId);
    if (!pub) throw new Error("Publicação não encontrada.");
    if (pub.status !== "accepted" && pub.status !== "published") {
      throw new Error("O artigo precisa ser aceito na revisão por pares antes de ser publicado.");
    }
    await repo.setPublicationStatus(context.user.id, pub.id, "published", {
      doi: (data.doi || "").trim() || null,
    });
    return { ok: true, slug: pub.slug };
  });

/**
 * Revisão por pares interna (Pracinha como revisor). Gera um parecer e, se
 * favorável, marca como 'accepted' — liberando a publicação pelo autor.
 */
export const runPeerReview = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((d: { articleId: string }) => d)
  .handler(async ({ data, context }) => {
    const userId = context.user.id;
    const pub = await repo.getPublicationByArticle(userId, data.articleId);
    if (!pub) throw new Error("Prepare a publicação antes da revisão.");
    if (pub.status === "published") throw new Error("Este artigo já foi publicado.");
    const { generateFinalText } = await import("@/lib/ai/gateway.server");
    const { PEER_REVIEW_INSTRUCTIONS } = await import("@/lib/ai/prompts");
    await repo.setPublicationStatus(userId, pub.id, "in_review");
    const prompt = `TÍTULO: ${pub.title}\n\nRESUMO:\n${pub.abstract ?? "(sem resumo)"}\n\nARTIGO:\n${pub.content.slice(0, 12000)}`;
    const report = await generateFinalText(prompt, PEER_REVIEW_INSTRUCTIONS);
    // Parecer favorável quando o relatório traz o veredito "ACEITO".
    const accepted = /\bACEITO\b/i.test(report) && !/\bREJEITADO\b/i.test(report);
    await repo.setPublicationStatus(userId, pub.id, accepted ? "accepted" : "rejected", {
      reviewReport: report,
    });
    return { ok: true, accepted, report };
  });

export const deletePublication = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((d: { articleId: string }) => d)
  .handler(async ({ data, context }) => {
    const pub = await repo.getPublicationByArticle(context.user.id, data.articleId);
    if (pub) await repo.deletePublication(context.user.id, pub.id);
    return { ok: true };
  });
