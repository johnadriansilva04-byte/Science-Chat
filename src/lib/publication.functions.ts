import { createServerFn } from "@tanstack/react-start";
import { requireUser } from "@/lib/cf/auth-middleware";
import * as repo from "@/lib/cf/repo.server";
import { slugify } from "@/lib/article-export";
import { base64ToBytes } from "@/lib/base64";
import {
  assemblePublicationContent,
  extractAbstract,
  extractKeywords,
  yearOf,
} from "@/lib/publication";
import type { PublicationStatus, ReviewStatus } from "@/lib/cf/repo.server";

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
  review_status: ReviewStatus;
  review_proof_filename: string | null;
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
    review_status: p.review_status,
    review_proof_filename: p.review_proof_filename,
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
  review_status: ReviewStatus;
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
    review_status: p.review_status,
  };
}

/** Público: lista os artigos publicados (revisados e ainda não revisados). */
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

/**
 * Publica na área pública. Não exige revisão: o artigo entra no mural na
 * seção "Ainda não revisados". A revisão por pares é comprovada à parte
 * (`submitReviewProof`), com o registro/DOI e o comprovante da revista.
 */
export const publishPublication = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((d: { articleId: string }) => d)
  .handler(async ({ data, context }) => {
    const pub = await repo.getPublicationByArticle(context.user.id, data.articleId);
    if (!pub) throw new Error("Publicação não encontrada.");
    await repo.setPublicationStatus(context.user.id, pub.id, "published");
    return { ok: true, slug: pub.slug };
  });

/**
 * Comprova a revisão por pares. A plataforma NÃO revisa: quem revisa são as
 * revistas e universidades. O autor informa o identificador (DOI ou registro
 * do aceite) e anexa o comprovante. Só então o artigo aparece na seção
 * "Revisados por pares" do mural.
 */
export const submitReviewProof = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    (d: {
      articleId: string;
      identifier: string;
      filename?: string;
      mime?: string;
      base64?: string;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    const userId = context.user.id;
    const pub = await repo.getPublicationByArticle(userId, data.articleId);
    if (!pub) throw new Error("Publicação não encontrada.");
    const identifier = (data.identifier || "").trim().slice(0, 120);
    const hasFile = Boolean(data.base64 && data.filename);
    if (!identifier && !hasFile) {
      throw new Error("Informe o DOI/registro ou anexe o comprovante de aceite.");
    }
    let proofKey = pub.review_proof_key;
    let proofFilename = pub.review_proof_filename;
    let proofMime = pub.review_proof_mime;
    if (hasFile) {
      const { putDocumentBytes } = await import("@/lib/cf/storage.server");
      const bytes = base64ToBytes(data.base64!);
      const MAX = 8 * 1024 * 1024;
      if (bytes.length === 0) throw new Error("Arquivo vazio");
      if (bytes.length > MAX) throw new Error("Comprovante maior que 8 MB");
      const mime = data.mime || "application/octet-stream";
      const key = `publications/${pub.id}/review-proof`;
      const stored = await putDocumentBytes(key, bytes, mime);
      if (!stored) throw new Error("Armazenamento indisponível. Tente novamente.");
      proofKey = stored;
      proofFilename = data.filename!.slice(0, 200);
      proofMime = mime;
    }
    await repo.setReviewProof(userId, pub.id, {
      doi: identifier || pub.doi,
      proofKey,
      proofFilename,
      proofMime,
    });
    return { ok: true };
  });

/** Desfaz a comprovação: o artigo volta para "Ainda não revisados". */
export const clearReviewProof = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((d: { articleId: string }) => d)
  .handler(async ({ data, context }) => {
    const pub = await repo.getPublicationByArticle(context.user.id, data.articleId);
    if (!pub) throw new Error("Publicação não encontrada.");
    await repo.clearReviewProof(context.user.id, pub.id);
    return { ok: true };
  });

/** Autor: baixa o comprovante de revisão que ele mesmo anexou. */
export const getReviewProof = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((d: { articleId: string }) => d)
  .handler(async ({ data, context }) => {
    const pub = await repo.getPublicationByArticle(context.user.id, data.articleId);
    if (!pub?.review_proof_key) return null;
    const { readDocumentBytes, toBase64 } = await import("@/lib/cf/storage.server");
    const bytes = await readDocumentBytes(pub.review_proof_key, null);
    if (!bytes) return null;
    return {
      filename: pub.review_proof_filename ?? "comprovante",
      mime: pub.review_proof_mime ?? "application/octet-stream",
      base64: toBase64(bytes),
    };
  });

export const deletePublication = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((d: { articleId: string }) => d)
  .handler(async ({ data, context }) => {
    const pub = await repo.getPublicationByArticle(context.user.id, data.articleId);
    if (pub) {
      if (pub.review_proof_key) {
        const { deleteDocumentBytes } = await import("@/lib/cf/storage.server");
        await deleteDocumentBytes(pub.review_proof_key).catch(() => {});
      }
      await repo.deletePublication(context.user.id, pub.id);
    }
    return { ok: true };
  });
