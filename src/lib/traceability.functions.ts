import { createServerFn } from "@tanstack/react-start";
import { requireUser } from "@/lib/cf/auth-middleware";
import * as repo from "@/lib/cf/repo.server";
import { interviewNotes } from "@/lib/interview-notes";
import {
  bestExcerpt,
  buildMatrix,
  claimStateFor,
  exemptFromEvidence,
  extractClaims,
  guessCategory,
  looksContradicted,
  matchDegree,
  stateCounts,
  type ClaimCategory,
  type ClaimState,
  type EvidenceLike,
  type MatchDegree,
} from "@/lib/traceability";
import { readDocumentBytes } from "@/lib/cf/storage.server";
import { extractText } from "@/lib/documents.server";
import { bytesToBase64 } from "@/lib/base64";

export type MatrixEvidence = {
  id: string;
  documentId: string | null;
  documentSeq: number | null;
  documentName: string | null;
  location: string | null;
  excerpt: string | null;
  matchDegree: MatchDegree | null;
  state: string;
  note: string | null;
};

export type MatrixClaim = {
  id: string;
  seq: number;
  text: string;
  category: ClaimCategory;
  state: ClaimState;
  sourceQuestion: string | null;
  limitations: string | null;
  evidence: MatrixEvidence[];
};

export type TraceabilityMatrix = {
  claims: MatrixClaim[];
  counts: Record<ClaimState, number>;
};

/** Lê o texto de um documento (extraído ou, se preciso, do arquivo original). */
async function documentText(
  userId: string,
  articleId: string,
  documentId: string,
): Promise<{ name: string; seq: number; text: string } | null> {
  const doc = await repo.getDocument(userId, articleId, documentId);
  if (!doc) return null;
  if (doc.text_content) return { name: doc.filename, seq: doc.seq, text: doc.text_content };
  const bytes = await readDocumentBytes(doc.storage_key, doc.content);
  if (!bytes) return { name: doc.filename, seq: doc.seq, text: "" };
  const text = extractText(doc.filename, doc.mime, bytesToBase64(bytes)) ?? "";
  return { name: doc.filename, seq: doc.seq, text };
}

/** Extrai afirmações das respostas da entrevista e (re)constrói a matriz. */
export const extractClaimsFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((d: { articleId: string; replace?: boolean }) => d)
  .handler(async ({ data, context }) => {
    const userId = context.user.id;
    const article = await repo.getArticle(userId, data.articleId);
    if (!article) throw new Error("Artigo não encontrado");

    const messages = await repo.listMessages(userId, data.articleId);
    const notes = interviewNotes(
      messages.map((m) => ({
        role: m.role,
        parts: JSON.parse(m.parts) as { type: string; text?: string }[],
      })),
    );
    const candidates = extractClaims(notes);

    if (data.replace) await repo.clearClaims(userId, data.articleId);
    const existing = await repo.listClaims(userId, data.articleId);
    const known = new Set(existing.map((c) => c.text.trim().toLowerCase()));

    let created = 0;
    for (const candidate of candidates) {
      if (known.has(candidate.text.trim().toLowerCase())) continue;
      await repo.addClaim(userId, data.articleId, {
        text: candidate.text,
        category: candidate.category,
        sourceQuestion: candidate.question,
        sourceAnswer: candidate.text,
        state: exemptFromEvidence(candidate.category) ? "declarada" : "aguardando_validacao",
      });
      created += 1;
    }
    return { ok: true, created, total: existing.length + created };
  });

/** Matriz de rastreabilidade completa (afirmações + evidências). */
export const getMatrix = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((d: { articleId: string }) => d)
  .handler(async ({ data, context }): Promise<TraceabilityMatrix> => {
    const userId = context.user.id;
    const [claims, evidence, docs] = await Promise.all([
      repo.listClaims(userId, data.articleId),
      repo.listEvidence(userId, data.articleId),
      repo.listDocuments(userId, data.articleId),
    ]);
    const docById = new Map(docs.map((d) => [d.id, d]));

    const rows = buildMatrix(
      claims.map((c) => ({
        id: c.id,
        seq: c.seq,
        text: c.text,
        category: c.category as ClaimCategory,
        state: c.state as ClaimState,
        source_question: c.source_question,
        limitations: c.limitations,
      })),
      evidence.map((e): EvidenceLike => ({
        claim_id: e.claim_id,
        document_id: e.document_id,
        location: e.location,
        excerpt: e.excerpt,
        match_degree: e.match_degree as MatchDegree | null,
        state: e.state,
      })),
    );

    const out: MatrixClaim[] = rows.map((row) => ({
      id: row.claim.id,
      seq: row.claim.seq,
      text: row.claim.text,
      category: row.claim.category,
      state: row.claim.state,
      sourceQuestion: row.claim.source_question,
      limitations: row.claim.limitations,
      evidence: row.evidence.map((e) => ({
        id: (e as unknown as { id?: string }).id ?? "",
        documentId: e.document_id,
        documentSeq: e.document_id ? (docById.get(e.document_id)?.seq ?? null) : null,
        documentName: e.document_id ? (docById.get(e.document_id)?.filename ?? null) : null,
        location: e.location,
        excerpt: e.excerpt,
        matchDegree: e.match_degree,
        state: e.state,
        note: null,
      })),
    }));

    return {
      claims: out,
      counts: stateCounts(rows),
    };
  });

/** Vincula um documento a uma afirmação e calcula o grau de correspondência. */
export const linkEvidence = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    (d: { articleId: string; claimId: string; documentId: string; location?: string }) => d,
  )
  .handler(async ({ data, context }) => {
    const userId = context.user.id;
    const claim = await repo.getClaim(userId, data.articleId, data.claimId);
    if (!claim) throw new Error("Afirmação não encontrada");
    const doc = await documentText(userId, data.articleId, data.documentId);
    if (!doc) throw new Error("Documento não encontrado");

    const category = claim.category as ClaimCategory;
    if (!doc.text.trim()) {
      // Documento sem texto legível (imagem/PDF digitalizado): não classificamos
      // como falso — registramos que não foi possível verificar automaticamente.
      await repo.addEvidence(userId, data.claimId, {
        documentId: data.documentId,
        location: data.location ?? null,
        excerpt: null,
        matchDegree: null,
        state: "nao_verificavel",
        note: "Documento sem texto legível — verificação manual necessária.",
      });
      await repo.updateClaim(userId, data.articleId, data.claimId, { state: "nao_verificavel" });
      return { ok: true, state: "nao_verificavel" as ClaimState, degree: null };
    }

    const { excerpt, ratio } = bestExcerpt(claim.text, doc.text);
    const degree = matchDegree(ratio);
    const contradicted = degree !== "nenhuma" && looksContradicted(claim.text, excerpt);
    const state = claimStateFor({
      category,
      degree,
      hasDocument: true,
      contradicted,
    });
    await repo.addEvidence(userId, data.claimId, {
      documentId: data.documentId,
      location: data.location ?? `Anexo ${doc.seq}`,
      excerpt: excerpt || null,
      matchDegree: degree,
      state,
      note: contradicted ? "Possível contradição — revisar direção do resultado." : null,
    });
    await repo.updateClaim(userId, data.articleId, data.claimId, { state });
    return { ok: true, state, degree };
  });

export const updateClaim = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    (d: {
      articleId: string;
      claimId: string;
      text?: string;
      category?: ClaimCategory;
      state?: ClaimState;
      limitations?: string | null;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    await repo.updateClaim(context.user.id, data.articleId, data.claimId, {
      ...(data.text !== undefined ? { text: data.text } : {}),
      ...(data.category !== undefined ? { category: data.category } : {}),
      ...(data.state !== undefined ? { state: data.state } : {}),
      ...(data.limitations !== undefined ? { limitations: data.limitations } : {}),
    });
    return { ok: true };
  });

export const deleteClaim = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((d: { articleId: string; claimId: string }) => d)
  .handler(async ({ data, context }) => {
    await repo.deleteClaim(context.user.id, data.articleId, data.claimId);
    return { ok: true };
  });

export const deleteEvidence = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((d: { evidenceId: string }) => d)
  .handler(async ({ data, context }) => {
    await repo.deleteEvidence(context.user.id, data.evidenceId);
    return { ok: true };
  });

/** Cria manualmente uma afirmação (o pesquisador pode acrescentar as suas). */
export const addClaim = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((d: { articleId: string; text: string; category?: ClaimCategory }) => d)
  .handler(async ({ data, context }) => {
    const text = data.text.trim().slice(0, 600);
    if (!text) throw new Error("Afirmação vazia");
    const category = data.category ?? guessCategory(text);
    await repo.addClaim(context.user.id, data.articleId, {
      text,
      category,
      sourceQuestion: null,
      sourceAnswer: null,
      state: exemptFromEvidence(category) ? "declarada" : "aguardando_validacao",
    });
    return { ok: true };
  });
