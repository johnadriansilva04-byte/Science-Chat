/**
 * Repositório de dados sobre D1. A posse é garantida por `user_id` em toda
 * consulta (o D1 não tem RLS), por isso todo método recebe o id do usuário.
 */
import { requireDb } from "@/lib/cf/bindings.server";
import { newId } from "@/lib/cf/auth.server";

export type Article = {
  id: string;
  user_id: string;
  title: string;
  phase: string;
  plan: string | null;
  /** Metodologia acoplada (opcional). Só pode apontar para uma `approved`. */
  methodology_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ChatMessage = {
  id: string;
  article_id: string;
  user_id: string;
  role: string;
  parts: string;
  created_at: string;
};

export type ArticlePage = {
  id: string;
  article_id: string;
  user_id: string;
  page_number: number;
  content: string;
  status: string;
  created_at: string;
};

function nowIso() {
  return new Date().toISOString();
}

export async function listArticles(userId: string): Promise<Article[]> {
  const { results } = await requireDb()
    .prepare(
      "select id, user_id, title, phase, plan, methodology_id, created_at, updated_at from articles where user_id = ? order by updated_at desc",
    )
    .bind(userId)
    .all<Article>();
  return results;
}

export async function getArticle(userId: string, articleId: string): Promise<Article | null> {
  return requireDb()
    .prepare(
      "select id, user_id, title, phase, plan, methodology_id, created_at, updated_at from articles where id = ? and user_id = ?",
    )
    .bind(articleId, userId)
    .first<Article>();
}

export async function createArticle(userId: string, title?: string): Promise<Article> {
  const id = newId();
  const ts = nowIso();
  const cleanTitle = title?.trim().slice(0, 200) || "Novo artigo";
  await requireDb()
    .prepare(
      "insert into articles (id, user_id, title, phase, created_at, updated_at) values (?, ?, ?, 'interview', ?, ?)",
    )
    .bind(id, userId, cleanTitle, ts, ts)
    .run();
  return {
    id,
    user_id: userId,
    title: cleanTitle,
    phase: "interview",
    plan: null,
    methodology_id: null,
    created_at: ts,
    updated_at: ts,
  };
}

export async function updateArticle(
  userId: string,
  articleId: string,
  patch: {
    title?: string;
    phase?: string;
    plan?: string | null;
    methodology_id?: string | null;
  },
): Promise<void> {
  const sets: string[] = [];
  const values: unknown[] = [];
  if (patch.title !== undefined) {
    sets.push("title = ?");
    values.push(patch.title);
  }
  if (patch.phase !== undefined) {
    sets.push("phase = ?");
    values.push(patch.phase);
  }
  if (patch.plan !== undefined) {
    sets.push("plan = ?");
    values.push(patch.plan);
  }
  if (patch.methodology_id !== undefined) {
    sets.push("methodology_id = ?");
    values.push(patch.methodology_id);
  }
  sets.push("updated_at = ?");
  values.push(nowIso());
  values.push(articleId, userId);
  await requireDb()
    .prepare(`update articles set ${sets.join(", ")} where id = ? and user_id = ?`)
    .bind(...values)
    .run();
}

export async function deleteArticle(userId: string, articleId: string): Promise<void> {
  await requireDb()
    .prepare("delete from articles where id = ? and user_id = ?")
    .bind(articleId, userId)
    .run();
}

export async function listMessages(userId: string, articleId: string): Promise<ChatMessage[]> {
  const { results } = await requireDb()
    .prepare(
      "select id, article_id, user_id, role, parts, created_at from chat_messages where article_id = ? and user_id = ? order by created_at",
    )
    .bind(articleId, userId)
    .all<ChatMessage>();
  return results;
}

export async function addMessage(
  userId: string,
  articleId: string,
  role: string,
  parts: unknown,
): Promise<void> {
  await requireDb()
    .prepare(
      "insert into chat_messages (id, article_id, user_id, role, parts, created_at) values (?, ?, ?, ?, ?, ?)",
    )
    .bind(newId(), articleId, userId, role, JSON.stringify(parts), nowIso())
    .run();
}

export async function listPages(userId: string, articleId: string): Promise<ArticlePage[]> {
  const { results } = await requireDb()
    .prepare(
      "select id, article_id, user_id, page_number, content, status, created_at from article_pages where article_id = ? and user_id = ? order by page_number",
    )
    .bind(articleId, userId)
    .all<ArticlePage>();
  return results;
}

export async function upsertPage(
  userId: string,
  articleId: string,
  pageNumber: number,
  content: string,
  status = "draft",
): Promise<void> {
  await requireDb()
    .prepare(
      `insert into article_pages (id, article_id, user_id, page_number, content, status, created_at)
       values (?, ?, ?, ?, ?, ?, ?)
       on conflict (article_id, page_number)
       do update set content = excluded.content, status = excluded.status`,
    )
    .bind(newId(), articleId, userId, pageNumber, content, status, nowIso())
    .run();
}

export async function setPageStatus(
  userId: string,
  articleId: string,
  pageNumber: number,
  status: string,
): Promise<void> {
  await requireDb()
    .prepare(
      "update article_pages set status = ? where article_id = ? and page_number = ? and user_id = ?",
    )
    .bind(status, articleId, pageNumber, userId)
    .run();
}

export async function getPage(
  userId: string,
  articleId: string,
  pageNumber: number,
): Promise<ArticlePage | null> {
  return requireDb()
    .prepare(
      "select id, article_id, user_id, page_number, content, status, created_at from article_pages where article_id = ? and page_number = ? and user_id = ?",
    )
    .bind(articleId, pageNumber, userId)
    .first<ArticlePage>();
}

export async function deletePage(
  userId: string,
  articleId: string,
  pageNumber: number,
): Promise<void> {
  await requireDb()
    .prepare("delete from article_pages where article_id = ? and page_number = ? and user_id = ?")
    .bind(articleId, pageNumber, userId)
    .run();
}

export type DocumentRow = {
  id: string;
  article_id: string;
  user_id: string;
  seq: number;
  filename: string;
  mime: string;
  size: number;
  text_content: string | null;
  note: string | null;
  created_at: string;
};

export type DocumentWithContent = DocumentRow & {
  content: string | null;
  storage_key: string | null;
};

/** Lista os documentos (sem o base64, que é pesado) em ordem de anexo. */
export async function listDocuments(userId: string, articleId: string): Promise<DocumentRow[]> {
  const { results } = await requireDb()
    .prepare(
      "select id, article_id, user_id, seq, filename, mime, size, text_content, note, created_at from documents where article_id = ? and user_id = ? order by seq",
    )
    .bind(articleId, userId)
    .all<DocumentRow>();
  return results;
}

export async function getDocument(
  userId: string,
  articleId: string,
  id: string,
): Promise<DocumentWithContent | null> {
  return requireDb()
    .prepare(
      "select id, article_id, user_id, seq, filename, mime, size, content, storage_key, text_content, note, created_at from documents where id = ? and article_id = ? and user_id = ?",
    )
    .bind(id, articleId, userId)
    .first<DocumentWithContent>();
}

/** Insere um documento recebendo o próximo número de anexo do artigo. */
export async function addDocument(
  userId: string,
  articleId: string,
  doc: {
    id?: string;
    filename: string;
    mime: string;
    size: number;
    content: string | null;
    storageKey: string | null;
    textContent: string | null;
    note: string | null;
  },
): Promise<DocumentRow> {
  const db = requireDb();
  const next = await db
    .prepare(
      "select coalesce(max(seq), 0) + 1 as seq from documents where article_id = ? and user_id = ?",
    )
    .bind(articleId, userId)
    .first<{ seq: number }>();
  const seq = next?.seq ?? 1;
  const id = doc.id ?? newId();
  const ts = nowIso();
  await db
    .prepare(
      "insert into documents (id, article_id, user_id, seq, filename, mime, size, content, storage_key, text_content, note, created_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(
      id,
      articleId,
      userId,
      seq,
      doc.filename,
      doc.mime,
      doc.size,
      doc.content,
      doc.storageKey,
      doc.textContent,
      doc.note,
      ts,
    )
    .run();
  return {
    id,
    article_id: articleId,
    user_id: userId,
    seq,
    filename: doc.filename,
    mime: doc.mime,
    size: doc.size,
    text_content: doc.textContent,
    note: doc.note,
    created_at: ts,
  };
}

export async function deleteDocument(userId: string, articleId: string, id: string): Promise<void> {
  await requireDb()
    .prepare("delete from documents where id = ? and article_id = ? and user_id = ?")
    .bind(id, articleId, userId)
    .run();
}

export type PublicationStatus = "draft" | "published";

/** Revisão por pares: a plataforma NÃO revisa. O autor comprova. */
export type ReviewStatus = "nao_revisado" | "revisado";

export type Publication = {
  id: string;
  user_id: string;
  article_id: string | null;
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
  review_notes: string | null;
  doi: string | null;
  review_status: ReviewStatus;
  review_proof_key: string | null;
  review_proof_filename: string | null;
  review_proof_mime: string | null;
  review_claimed_at: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

const PUBLICATION_COLUMNS =
  "id, user_id, article_id, slug, title, abstract, keywords, language, area, author_name, affiliation, orcid, content, status, review_report, review_notes, doi, review_status, review_proof_key, review_proof_filename, review_proof_mime, review_claimed_at, submitted_at, reviewed_at, published_at, created_at, updated_at";

/** Publicação de um artigo (no máximo uma por artigo). */
export async function getPublicationByArticle(
  userId: string,
  articleId: string,
): Promise<Publication | null> {
  return requireDb()
    .prepare(`select ${PUBLICATION_COLUMNS} from publications where article_id = ? and user_id = ?`)
    .bind(articleId, userId)
    .first<Publication>();
}

export async function getPublicationById(userId: string, id: string): Promise<Publication | null> {
  return requireDb()
    .prepare(`select ${PUBLICATION_COLUMNS} from publications where id = ? and user_id = ?`)
    .bind(id, userId)
    .first<Publication>();
}

/** Público: apenas artigos com status 'published'. */
export async function getPublishedBySlug(slug: string): Promise<Publication | null> {
  return requireDb()
    .prepare(
      `select ${PUBLICATION_COLUMNS} from publications where slug = ? and status = 'published'`,
    )
    .bind(slug)
    .first<Publication>();
}

export async function listPublished(limit = 60): Promise<Publication[]> {
  const { results } = await requireDb()
    .prepare(
      `select ${PUBLICATION_COLUMNS} from publications where status = 'published' order by published_at desc limit ?`,
    )
    .bind(limit)
    .all<Publication>();
  return results;
}

export async function listPublications(userId: string): Promise<Publication[]> {
  const { results } = await requireDb()
    .prepare(
      `select ${PUBLICATION_COLUMNS} from publications where user_id = ? order by updated_at desc`,
    )
    .bind(userId)
    .all<Publication>();
  return results;
}

/** Cria (ou atualiza) o registro de publicação ligado a um artigo, em 'draft'. */
export async function upsertPublication(
  userId: string,
  articleId: string,
  fields: {
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
  },
): Promise<Publication> {
  const db = requireDb();
  const existing = await getPublicationByArticle(userId, articleId);
  const ts = nowIso();
  if (existing) {
    await db
      .prepare(
        `update publications set slug = ?, title = ?, abstract = ?, keywords = ?, language = ?,
           area = ?, author_name = ?, affiliation = ?, orcid = ?, content = ?, updated_at = ?
         where id = ? and user_id = ?`,
      )
      .bind(
        fields.slug,
        fields.title,
        fields.abstract,
        fields.keywords,
        fields.language,
        fields.area,
        fields.author_name,
        fields.affiliation,
        fields.orcid,
        fields.content,
        ts,
        existing.id,
        userId,
      )
      .run();
    return { ...existing, ...fields, updated_at: ts };
  }
  const id = newId();
  await db
    .prepare(
      `insert into publications (id, user_id, article_id, slug, title, abstract, keywords, language,
         area, author_name, affiliation, orcid, content, status, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)`,
    )
    .bind(
      id,
      userId,
      articleId,
      fields.slug,
      fields.title,
      fields.abstract,
      fields.keywords,
      fields.language,
      fields.area,
      fields.author_name,
      fields.affiliation,
      fields.orcid,
      fields.content,
      ts,
      ts,
    )
    .run();
  return {
    id,
    user_id: userId,
    article_id: articleId,
    ...fields,
    status: "draft",
    review_report: null,
    review_notes: null,
    doi: null,
    review_status: "nao_revisado",
    review_proof_key: null,
    review_proof_filename: null,
    review_proof_mime: null,
    review_claimed_at: null,
    submitted_at: null,
    reviewed_at: null,
    published_at: null,
    created_at: ts,
    updated_at: ts,
  };
}

/**
 * Marca a revisão por pares como comprovada pelo autor: guarda o identificador
 * (DOI/registro) e a chave do comprovante no R2. O artigo passa para a seção
 * "Revisados por pares" do mural.
 */
export async function setReviewProof(
  userId: string,
  id: string,
  fields: {
    doi: string | null;
    proofKey: string | null;
    proofFilename: string | null;
    proofMime: string | null;
  },
): Promise<void> {
  await requireDb()
    .prepare(
      `update publications set review_status = 'revisado', doi = ?, review_proof_key = ?,
         review_proof_filename = ?, review_proof_mime = ?, review_claimed_at = ?, updated_at = ?
       where id = ? and user_id = ?`,
    )
    .bind(
      fields.doi,
      fields.proofKey,
      fields.proofFilename,
      fields.proofMime,
      nowIso(),
      nowIso(),
      id,
      userId,
    )
    .run();
}

/** Remove a comprovação: o artigo volta para "Ainda não revisados". */
export async function clearReviewProof(userId: string, id: string): Promise<void> {
  await requireDb()
    .prepare(
      `update publications set review_status = 'nao_revisado', review_proof_key = null,
         review_proof_filename = null, review_proof_mime = null, review_claimed_at = null,
         updated_at = ?
       where id = ? and user_id = ?`,
    )
    .bind(nowIso(), id, userId)
    .run();
}

/**
 * Atualiza o status da publicação. O fluxo agora é simples: `draft` até o
 * autor publicar (`published`). A revisão por pares é registrada à parte
 * (`setReviewProof`), pois quem revisa são as revistas, não a plataforma.
 */
export async function setPublicationStatus(
  userId: string,
  id: string,
  status: PublicationStatus,
): Promise<void> {
  const ts = nowIso();
  const sets = ["status = ?", "updated_at = ?"];
  const values: unknown[] = [status, ts];
  if (status === "published") {
    sets.push("published_at = ?");
    values.push(ts);
  }
  values.push(id, userId);
  await requireDb()
    .prepare(`update publications set ${sets.join(", ")} where id = ? and user_id = ?`)
    .bind(...values)
    .run();
}

export async function deletePublication(userId: string, id: string): Promise<void> {
  await requireDb()
    .prepare("delete from publications where id = ? and user_id = ?")
    .bind(id, userId)
    .run();
}

/** Garante um slug único entre as publicações existentes. */
export async function uniqueSlug(base: string): Promise<string> {
  const db = requireDb();
  let slug = base;
  for (let i = 2; i < 200; i++) {
    const row = await db
      .prepare("select id from publications where slug = ?")
      .bind(slug)
      .first<{ id: string }>();
    if (!row) return slug;
    slug = `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
}

// --- Matriz de rastreabilidade ---------------------------------------------

export type ClaimRow = {
  id: string;
  article_id: string;
  user_id: string;
  seq: number;
  text: string;
  category: string;
  source_question: string | null;
  source_answer: string | null;
  state: string;
  limitations: string | null;
  created_at: string;
  updated_at: string;
};

export type EvidenceRow = {
  id: string;
  claim_id: string;
  document_id: string | null;
  location: string | null;
  excerpt: string | null;
  match_degree: string | null;
  state: string;
  note: string | null;
  created_at: string;
};

const CLAIM_COLUMNS =
  "id, article_id, user_id, seq, text, category, source_question, source_answer, state, limitations, created_at, updated_at";

export async function listClaims(userId: string, articleId: string): Promise<ClaimRow[]> {
  const { results } = await requireDb()
    .prepare(
      `select ${CLAIM_COLUMNS} from claims where article_id = ? and user_id = ? order by seq`,
    )
    .bind(articleId, userId)
    .all<ClaimRow>();
  return results;
}

export async function getClaim(
  userId: string,
  articleId: string,
  id: string,
): Promise<ClaimRow | null> {
  return requireDb()
    .prepare(`select ${CLAIM_COLUMNS} from claims where id = ? and article_id = ? and user_id = ?`)
    .bind(id, articleId, userId)
    .first<ClaimRow>();
}

/** Insere uma afirmação com o próximo número estável do artigo. */
export async function addClaim(
  userId: string,
  articleId: string,
  claim: {
    text: string;
    category: string;
    sourceQuestion: string | null;
    sourceAnswer: string | null;
    state: string;
  },
): Promise<ClaimRow> {
  const db = requireDb();
  const next = await db
    .prepare(
      "select coalesce(max(seq), 0) + 1 as seq from claims where article_id = ? and user_id = ?",
    )
    .bind(articleId, userId)
    .first<{ seq: number }>();
  const seq = next?.seq ?? 1;
  const id = newId();
  const ts = nowIso();
  await db
    .prepare(
      `insert into claims (id, article_id, user_id, seq, text, category, source_question, source_answer, state, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      articleId,
      userId,
      seq,
      claim.text,
      claim.category,
      claim.sourceQuestion,
      claim.sourceAnswer,
      claim.state,
      ts,
      ts,
    )
    .run();
  return {
    id,
    article_id: articleId,
    user_id: userId,
    seq,
    text: claim.text,
    category: claim.category,
    source_question: claim.sourceQuestion,
    source_answer: claim.sourceAnswer,
    state: claim.state,
    limitations: null,
    created_at: ts,
    updated_at: ts,
  };
}

export async function updateClaim(
  userId: string,
  articleId: string,
  id: string,
  patch: { text?: string; category?: string; state?: string; limitations?: string | null },
): Promise<void> {
  const sets: string[] = [];
  const values: unknown[] = [];
  if (patch.text !== undefined) {
    sets.push("text = ?");
    values.push(patch.text);
  }
  if (patch.category !== undefined) {
    sets.push("category = ?");
    values.push(patch.category);
  }
  if (patch.state !== undefined) {
    sets.push("state = ?");
    values.push(patch.state);
  }
  if (patch.limitations !== undefined) {
    sets.push("limitations = ?");
    values.push(patch.limitations);
  }
  if (!sets.length) return;
  sets.push("updated_at = ?");
  values.push(nowIso());
  values.push(id, articleId, userId);
  await requireDb()
    .prepare(`update claims set ${sets.join(", ")} where id = ? and article_id = ? and user_id = ?`)
    .bind(...values)
    .run();
}

export async function deleteClaim(userId: string, articleId: string, id: string): Promise<void> {
  await requireDb()
    .prepare("delete from claims where id = ? and article_id = ? and user_id = ?")
    .bind(id, articleId, userId)
    .run();
}

export async function clearClaims(userId: string, articleId: string): Promise<void> {
  await requireDb()
    .prepare("delete from claims where article_id = ? and user_id = ?")
    .bind(articleId, userId)
    .run();
}

export async function listEvidence(userId: string, articleId: string): Promise<EvidenceRow[]> {
  const { results } = await requireDb()
    .prepare(
      `select e.id, e.claim_id, e.document_id, e.location, e.excerpt, e.match_degree, e.state, e.note, e.created_at
       from claim_evidence e
       join claims c on c.id = e.claim_id
       where c.article_id = ? and c.user_id = ?
       order by c.seq`,
    )
    .bind(articleId, userId)
    .all<EvidenceRow>();
  return results;
}

export async function addEvidence(
  userId: string,
  claimId: string,
  evidence: {
    documentId: string | null;
    location: string | null;
    excerpt: string | null;
    matchDegree: string | null;
    state: string;
    note: string | null;
  },
): Promise<EvidenceRow> {
  const db = requireDb();
  const owned = await db
    .prepare("select id from claims where id = ? and user_id = ?")
    .bind(claimId, userId)
    .first<{ id: string }>();
  if (!owned) throw new Error("Afirmação não encontrada");
  const id = newId();
  const ts = nowIso();
  await db
    .prepare(
      `insert into claim_evidence (id, claim_id, document_id, location, excerpt, match_degree, state, note, created_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      claimId,
      evidence.documentId,
      evidence.location,
      evidence.excerpt,
      evidence.matchDegree,
      evidence.state,
      evidence.note,
      ts,
    )
    .run();
  return {
    id,
    claim_id: claimId,
    document_id: evidence.documentId,
    location: evidence.location,
    excerpt: evidence.excerpt,
    match_degree: evidence.matchDegree,
    state: evidence.state,
    note: evidence.note,
    created_at: ts,
  };
}

export async function deleteEvidence(userId: string, id: string): Promise<void> {
  const db = requireDb();
  const owned = await db
    .prepare(
      `select e.id from claim_evidence e join claims c on c.id = e.claim_id
       where e.id = ? and c.user_id = ?`,
    )
    .bind(id, userId)
    .first<{ id: string }>();
  if (!owned) return;
  await db.prepare("delete from claim_evidence where id = ?").bind(id).run();
}

// --- Auditorias -------------------------------------------------------------

export type AuditRow = {
  id: string;
  article_id: string;
  user_id: string;
  scope: string;
  scope_ref: string | null;
  report: string;
  summary: string | null;
  created_at: string;
};

const AUDIT_COLUMNS = "id, article_id, user_id, scope, scope_ref, report, summary, created_at";

export async function addAudit(
  userId: string,
  articleId: string,
  audit: { scope: string; scopeRef: string | null; report: string; summary: string | null },
): Promise<AuditRow> {
  const id = newId();
  const ts = nowIso();
  await requireDb()
    .prepare(
      `insert into audits (id, article_id, user_id, scope, scope_ref, report, summary, created_at)
       values (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, articleId, userId, audit.scope, audit.scopeRef, audit.report, audit.summary, ts)
    .run();
  return {
    id,
    article_id: articleId,
    user_id: userId,
    scope: audit.scope,
    scope_ref: audit.scopeRef,
    report: audit.report,
    summary: audit.summary,
    created_at: ts,
  };
}

export async function listAudits(userId: string, articleId: string): Promise<AuditRow[]> {
  const { results } = await requireDb()
    .prepare(
      `select ${AUDIT_COLUMNS} from audits where article_id = ? and user_id = ? order by created_at desc, rowid desc limit 30`,
    )
    .bind(articleId, userId)
    .all<AuditRow>();
  return results;
}

// --- Configuração editorial -------------------------------------------------

export type EditorialRow = {
  article_id: string;
  user_id: string;
  destination: string;
  unit: string | null;
  standard: string;
  language: string;
  guidelines: string | null;
  notes: string | null;
  verified_at: string | null;
  /** JSON com a identificação do trabalho (capa/folha de rosto). */
  layout_json: string | null;
  created_at: string;
  updated_at: string;
};

export async function getEditorialConfig(
  userId: string,
  articleId: string,
): Promise<EditorialRow | null> {
  return requireDb()
    .prepare(
      `select article_id, user_id, destination, unit, standard, language, guidelines, notes, verified_at, layout_json, created_at, updated_at
       from editorial_configs where article_id = ? and user_id = ?`,
    )
    .bind(articleId, userId)
    .first<EditorialRow>();
}

/**
 * Grava apenas a identificação do trabalho (capa/folha de rosto) no
 * `layout_json`, preservando a configuração editorial existente. Usado pelo chat
 * quando o Pracinha registra o ORCID do pesquisador sem mexer em destino/norma.
 * Cria a linha com valores padrão se ainda não existir.
 */
export async function setArticleDocument(
  userId: string,
  articleId: string,
  document: Record<string, unknown>,
): Promise<void> {
  const existing = await getEditorialConfig(userId, articleId);
  // Mescla sobre o que já existe para não apagar campos que a UI do painel
  // editorial tenha gravado (autor, cidade, instituição…).
  let current: Record<string, unknown> = {};
  if (existing?.layout_json) {
    try {
      const parsed = JSON.parse(existing.layout_json) as { document?: Record<string, unknown> };
      current = parsed?.document ?? (parsed as Record<string, unknown>) ?? {};
    } catch {
      current = {};
    }
  }
  const layoutJson = JSON.stringify({ document: { ...current, ...document } });
  if (existing) {
    await requireDb()
      .prepare(
        `update editorial_configs set layout_json = ?, updated_at = ? where article_id = ? and user_id = ?`,
      )
      .bind(layoutJson, nowIso(), articleId, userId)
      .run();
    return;
  }
  await upsertEditorialConfig(userId, articleId, {
    destination: "independente",
    unit: null,
    standard: "abnt",
    language: "pt",
    guidelines: null,
    notes: null,
    layoutJson,
  });
}

export async function upsertEditorialConfig(
  userId: string,
  articleId: string,
  fields: {
    destination: string;
    unit: string | null;
    standard: string;
    language: string;
    guidelines: string | null;
    notes: string | null;
    layoutJson?: string | null;
  },
): Promise<EditorialRow> {
  const db = requireDb();
  const ts = nowIso();
  const existing = await getEditorialConfig(userId, articleId);
  // A data de verificação é marcada sempre que o pesquisador registra diretrizes.
  const verifiedAt = fields.guidelines?.trim() ? ts : null;
  const layoutJson =
    fields.layoutJson === undefined ? (existing?.layout_json ?? null) : fields.layoutJson;
  if (existing) {
    await db
      .prepare(
        `update editorial_configs set destination = ?, unit = ?, standard = ?, language = ?, guidelines = ?, notes = ?, verified_at = ?, layout_json = ?, updated_at = ?
         where article_id = ? and user_id = ?`,
      )
      .bind(
        fields.destination,
        fields.unit,
        fields.standard,
        fields.language,
        fields.guidelines,
        fields.notes,
        verifiedAt,
        layoutJson,
        ts,
        articleId,
        userId,
      )
      .run();
    return {
      ...existing,
      destination: fields.destination,
      unit: fields.unit,
      standard: fields.standard,
      language: fields.language,
      guidelines: fields.guidelines,
      notes: fields.notes,
      layout_json: layoutJson,
      verified_at: verifiedAt,
      updated_at: ts,
    };
  }
  await db
    .prepare(
      `insert into editorial_configs (article_id, user_id, destination, unit, standard, language, guidelines, notes, verified_at, layout_json, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      articleId,
      userId,
      fields.destination,
      fields.unit,
      fields.standard,
      fields.language,
      fields.guidelines,
      fields.notes,
      verifiedAt,
      layoutJson,
      ts,
      ts,
    )
    .run();
  return {
    article_id: articleId,
    user_id: userId,
    destination: fields.destination,
    unit: fields.unit,
    standard: fields.standard,
    language: fields.language,
    guidelines: fields.guidelines,
    notes: fields.notes,
    layout_json: layoutJson,
    verified_at: verifiedAt,
    created_at: ts,
    updated_at: ts,
  };
}

/* ------------------------------------------------------------------ *
 * Metodologia — entidade própria, separada do artigo.
 * ------------------------------------------------------------------ */

export type Methodology = {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type MethodologyMessage = {
  id: string;
  methodology_id: string;
  user_id: string;
  role: string;
  parts: string;
  created_at: string;
};

export type MethodologyDocumentRow = {
  id: string;
  methodology_id: string;
  user_id: string;
  seq: number;
  filename: string;
  mime: string;
  size: number;
  text_content: string | null;
  note: string | null;
  created_at: string;
};

export type MethodologyDocumentWithContent = MethodologyDocumentRow & {
  content: string | null;
  storage_key: string | null;
};

const METHODOLOGY_COLUMNS = "id, user_id, title, content, status, created_at, updated_at";

export async function listMethodologies(userId: string): Promise<Methodology[]> {
  const { results } = await requireDb()
    .prepare(
      `select ${METHODOLOGY_COLUMNS} from methodologies where user_id = ? order by updated_at desc`,
    )
    .bind(userId)
    .all<Methodology>();
  return results;
}

export async function getMethodology(userId: string, id: string): Promise<Methodology | null> {
  return requireDb()
    .prepare(`select ${METHODOLOGY_COLUMNS} from methodologies where id = ? and user_id = ?`)
    .bind(id, userId)
    .first<Methodology>();
}

export async function createMethodology(userId: string, title?: string): Promise<Methodology> {
  const id = newId();
  const ts = nowIso();
  const cleanTitle = title?.trim().slice(0, 200) || "Metodologia sem título";
  await requireDb()
    .prepare(
      "insert into methodologies (id, user_id, title, status, created_at, updated_at) values (?, ?, ?, 'draft', ?, ?)",
    )
    .bind(id, userId, cleanTitle, ts, ts)
    .run();
  return {
    id,
    user_id: userId,
    title: cleanTitle,
    content: null,
    status: "draft",
    created_at: ts,
    updated_at: ts,
  };
}

export async function updateMethodology(
  userId: string,
  id: string,
  patch: { title?: string; content?: string | null; status?: string },
): Promise<void> {
  const sets: string[] = [];
  const values: unknown[] = [];
  if (patch.title !== undefined) {
    sets.push("title = ?");
    values.push(patch.title);
  }
  if (patch.content !== undefined) {
    sets.push("content = ?");
    values.push(patch.content);
  }
  if (patch.status !== undefined) {
    sets.push("status = ?");
    values.push(patch.status);
  }
  sets.push("updated_at = ?");
  values.push(nowIso());
  values.push(id, userId);
  await requireDb()
    .prepare(`update methodologies set ${sets.join(", ")} where id = ? and user_id = ?`)
    .bind(...values)
    .run();
}

export async function setMethodologyStatus(
  userId: string,
  id: string,
  status: string,
): Promise<void> {
  await updateMethodology(userId, id, { status });
}

export async function deleteMethodology(userId: string, id: string): Promise<void> {
  await requireDb()
    .prepare("delete from methodologies where id = ? and user_id = ?")
    .bind(id, userId)
    .run();
}

export async function listMethodologyMessages(
  userId: string,
  methodologyId: string,
): Promise<MethodologyMessage[]> {
  const { results } = await requireDb()
    .prepare(
      "select id, methodology_id, user_id, role, parts, created_at from methodology_messages where methodology_id = ? and user_id = ? order by created_at",
    )
    .bind(methodologyId, userId)
    .all<MethodologyMessage>();
  return results;
}

export async function addMethodologyMessage(
  userId: string,
  methodologyId: string,
  role: string,
  parts: unknown,
): Promise<void> {
  await requireDb()
    .prepare(
      "insert into methodology_messages (id, methodology_id, user_id, role, parts, created_at) values (?, ?, ?, ?, ?, ?)",
    )
    .bind(newId(), methodologyId, userId, role, JSON.stringify(parts), nowIso())
    .run();
}

export async function listMethodologyDocuments(
  userId: string,
  methodologyId: string,
): Promise<MethodologyDocumentRow[]> {
  const { results } = await requireDb()
    .prepare(
      "select id, methodology_id, user_id, seq, filename, mime, size, text_content, note, created_at from methodology_documents where methodology_id = ? and user_id = ? order by seq",
    )
    .bind(methodologyId, userId)
    .all<MethodologyDocumentRow>();
  return results;
}

export async function getMethodologyDocument(
  userId: string,
  methodologyId: string,
  id: string,
): Promise<MethodologyDocumentWithContent | null> {
  return requireDb()
    .prepare(
      "select id, methodology_id, user_id, seq, filename, mime, size, content, storage_key, text_content, note, created_at from methodology_documents where id = ? and methodology_id = ? and user_id = ?",
    )
    .bind(id, methodologyId, userId)
    .first<MethodologyDocumentWithContent>();
}

export async function addMethodologyDocument(
  userId: string,
  methodologyId: string,
  doc: {
    id?: string;
    filename: string;
    mime: string;
    size: number;
    content: string | null;
    storageKey: string | null;
    textContent: string | null;
    note: string | null;
  },
): Promise<MethodologyDocumentRow> {
  const db = requireDb();
  const next = await db
    .prepare(
      "select coalesce(max(seq), 0) + 1 as seq from methodology_documents where methodology_id = ? and user_id = ?",
    )
    .bind(methodologyId, userId)
    .first<{ seq: number }>();
  const seq = next?.seq ?? 1;
  const id = doc.id ?? newId();
  const ts = nowIso();
  await db
    .prepare(
      "insert into methodology_documents (id, methodology_id, user_id, seq, filename, mime, size, content, storage_key, text_content, note, created_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(
      id,
      methodologyId,
      userId,
      seq,
      doc.filename,
      doc.mime,
      doc.size,
      doc.content,
      doc.storageKey,
      doc.textContent,
      doc.note,
      ts,
    )
    .run();
  return {
    id,
    methodology_id: methodologyId,
    user_id: userId,
    seq,
    filename: doc.filename,
    mime: doc.mime,
    size: doc.size,
    text_content: doc.textContent,
    note: doc.note,
    created_at: ts,
  };
}

export async function deleteMethodologyDocument(
  userId: string,
  methodologyId: string,
  id: string,
): Promise<void> {
  await requireDb()
    .prepare(
      "delete from methodology_documents where id = ? and methodology_id = ? and user_id = ?",
    )
    .bind(id, methodologyId, userId)
    .run();
}

/** Acopla (ou desacopla, com `null`) uma metodologia a um artigo. */
export async function setArticleMethodology(
  userId: string,
  articleId: string,
  methodologyId: string | null,
): Promise<void> {
  await updateArticle(userId, articleId, { methodology_id: methodologyId });
}

export async function listArticlesByMethodology(
  userId: string,
  methodologyId: string,
): Promise<Article[]> {
  const { results } = await requireDb()
    .prepare(
      "select id, user_id, title, phase, plan, methodology_id, created_at, updated_at from articles where methodology_id = ? and user_id = ? order by updated_at desc",
    )
    .bind(methodologyId, userId)
    .all<Article>();
  return results;
}

/* ------------------------------------------------------------------ *
 * Stop com amigos (salas)
 * ------------------------------------------------------------------ */

export type StopRoomRow = {
  id: string;
  code: string;
  host_id: string;
  status: string;
  round: number;
  letter: string | null;
  seconds: number;
  categories: string | null;
  auto: number;
  deadline_at: string | null;
  total_rounds: number;
  letters_used: string | null;
  settled_round: number;
  created_at: string;
  updated_at: string;
};

export type StopRoomPlayerRow = {
  room_id: string;
  user_id: string;
  name: string;
  total: number;
  played: number;
  submitted_round: number | null;
  answers: string | null;
  verdicts: string | null;
  round_score: number | null;
  joined_round: number;
  joined_at: string;
  display_name?: string | null;
};

export type StopRoomMessageRow = {
  id: string;
  room_id: string;
  user_id: string;
  name: string;
  body: string;
  created_at: string;
};

const STOP_ROOM_COLUMNS =
  "id, code, host_id, status, round, letter, seconds, categories, auto, deadline_at, total_rounds, letters_used, settled_round, created_at, updated_at";
const STOP_ROOM_PLAYER_COLUMNS =
  "room_id, user_id, name, total, played, submitted_round, answers, verdicts, round_score, joined_round, joined_at";

export async function createStopRoom(input: {
  hostId: string;
  code: string;
  seconds: number;
}): Promise<StopRoomRow> {
  const id = newId();
  const ts = nowIso();
  await requireDb()
    .prepare(
      "insert into stop_rooms (id, code, host_id, status, round, seconds, auto, created_at, updated_at) values (?, ?, ?, 'lobby', 0, ?, 1, ?, ?)",
    )
    .bind(id, input.code, input.hostId, input.seconds, ts, ts)
    .run();
  const row = await requireDb()
    .prepare(`select ${STOP_ROOM_COLUMNS} from stop_rooms where id = ?`)
    .bind(id)
    .first<StopRoomRow>();
  if (!row) throw new Error("Não foi possível abrir a sala.");
  return row;
}

export async function getStopRoomByCode(code: string): Promise<StopRoomRow | null> {
  return requireDb()
    .prepare(`select ${STOP_ROOM_COLUMNS} from stop_rooms where code = ?`)
    .bind(code)
    .first<StopRoomRow>();
}

export async function listStopRoomPlayers(roomId: string): Promise<StopRoomPlayerRow[]> {
  const { results } = await requireDb()
    .prepare(
      `select ${STOP_ROOM_PLAYER_COLUMNS} from stop_room_players where room_id = ? order by joined_at asc`,
    )
    .bind(roomId)
    .all<StopRoomPlayerRow>();
  return results;
}

/** Entrar de novo na mesma sala não duplica a pessoa: só atualiza o apelido.
 *  `joinedRound` fixa a rodada de estreia — quem entra no meio assiste até a próxima. */
export async function upsertStopRoomPlayer(input: {
  roomId: string;
  userId: string;
  name: string;
  joinedRound?: number;
}): Promise<StopRoomPlayerRow> {
  const ts = nowIso();
  await requireDb()
    .prepare(
      `insert into stop_room_players (room_id, user_id, name, joined_round, joined_at) values (?, ?, ?, ?, ?)
       on conflict(room_id, user_id) do update set name = excluded.name`,
    )
    .bind(input.roomId, input.userId, input.name, input.joinedRound ?? 0, ts)
    .run();
  const row = await requireDb()
    .prepare(
      `select ${STOP_ROOM_PLAYER_COLUMNS} from stop_room_players where room_id = ? and user_id = ?`,
    )
    .bind(input.roomId, input.userId)
    .first<StopRoomPlayerRow>();
  if (!row) throw new Error("Não foi possível entrar na sala.");
  return row;
}

export type StopRoomPatch = {
  status?: string;
  round?: number;
  letter?: string | null;
  seconds?: number;
  categories?: string | null;
  auto?: number;
  deadlineAt?: string | null;
  lettersUsed?: string | null;
  settledRound?: number;
};

export async function updateStopRoom(roomId: string, patch: StopRoomPatch): Promise<void> {
  const sets: string[] = [];
  const values: unknown[] = [];
  const push = (column: string, value: unknown) => {
    sets.push(`${column} = ?`);
    values.push(value);
  };
  if (patch.status !== undefined) push("status", patch.status);
  if (patch.round !== undefined) push("round", patch.round);
  if (patch.letter !== undefined) push("letter", patch.letter);
  if (patch.seconds !== undefined) push("seconds", patch.seconds);
  if (patch.categories !== undefined) push("categories", patch.categories);
  if (patch.auto !== undefined) push("auto", patch.auto);
  if (patch.deadlineAt !== undefined) push("deadline_at", patch.deadlineAt);
  if (patch.lettersUsed !== undefined) push("letters_used", patch.lettersUsed);
  if (patch.settledRound !== undefined) push("settled_round", patch.settledRound);
  push("updated_at", nowIso());

  await requireDb()
    .prepare(`update stop_rooms set ${sets.join(", ")} where id = ?`)
    .bind(...values, roomId)
    .run();
}

/** Fecha a rodada para todo mundo: zera entregas e resultado da rodada. */
export async function resetStopRoomRound(roomId: string): Promise<void> {
  await requireDb()
    .prepare(
      "update stop_room_players set submitted_round = null, answers = null, verdicts = null, round_score = null where room_id = ?",
    )
    .bind(roomId)
    .run();
}

/** Guarda respostas e veredictos da rodada. Os pontos só entram no placar
 *  quando a rodada fecha, porque dependem das respostas dos outros jogadores. */
export async function saveStopRoomSubmission(input: {
  roomId: string;
  userId: string;
  round: number;
  answers: string;
  verdicts: string;
}): Promise<void> {
  await requireDb()
    .prepare(
      `update stop_room_players
          set submitted_round = ?, answers = ?, verdicts = ?, round_score = null
        where room_id = ? and user_id = ? and (submitted_round is null or submitted_round <> ?)`,
    )
    .bind(input.round, input.answers, input.verdicts, input.roomId, input.userId, input.round)
    .run();
}

/** Reserva o fechamento da rodada. Só a primeira chamada aplica o placar,
 *  então dois navegadores lendo a sala ao mesmo tempo não somam em dobro. */
export async function claimStopRoomSettlement(roomId: string, round: number): Promise<boolean> {
  const result = await requireDb()
    .prepare(
      "update stop_rooms set settled_round = ?, updated_at = ? where id = ? and settled_round < ?",
    )
    .bind(round, nowIso(), roomId, round)
    .run();
  return Number(result.meta['changes'] ?? 0) > 0;
}

/** Grava o placar da rodada: 10 por resposta inédita, 5 quando repete com alguém. */
export async function applyStopRoomScores(input: {
  roomId: string;
  scores: { userId: string; total: number }[];
}): Promise<void> {
  for (const score of input.scores) {
    await requireDb()
      .prepare(
        `update stop_room_players
            set round_score = ?, total = total + ?, played = played + 1
          where room_id = ? and user_id = ?`,
      )
      .bind(score.total, score.total, input.roomId, score.userId)
      .run();
  }
}

/** Quem entrou no meio da rodada assiste; quem entrou antes joga. */
export async function markStopRoomSpectator(input: {
  roomId: string;
  userId: string;
  round: number;
  answers: string;
  verdicts: string;
}): Promise<void> {
  await requireDb()
    .prepare(
      `update stop_room_players set submitted_round = ?, answers = ?, verdicts = ?
        where room_id = ? and user_id = ?`,
    )
    .bind(input.round, input.answers, input.verdicts, input.roomId, input.userId)
    .run();
}

export async function listStopRoomMessages(
  roomId: string,
  limit = 40,
): Promise<StopRoomMessageRow[]> {
  const { results } = await requireDb()
    .prepare(
      `select id, room_id, user_id, name, body, created_at from stop_room_messages
        where room_id = ? order by created_at desc limit ?`,
    )
    .bind(roomId, limit)
    .all<StopRoomMessageRow>();
  return [...results].reverse();
}

export async function addStopRoomMessage(input: {
  roomId: string;
  userId: string;
  name: string;
  body: string;
}): Promise<StopRoomMessageRow> {
  const id = newId();
  await requireDb()
    .prepare(
      "insert into stop_room_messages (id, room_id, user_id, name, body, created_at) values (?, ?, ?, ?, ?, ?)",
    )
    .bind(id, input.roomId, input.userId, input.name, input.body, nowIso())
    .run();
  const row = await requireDb()
    .prepare(
      "select id, room_id, user_id, name, body, created_at from stop_room_messages where id = ?",
    )
    .bind(id)
    .first<StopRoomMessageRow>();
  if (!row) throw new Error("Não foi possível enviar a mensagem.");
  return row;
}

export async function removeStopRoomPlayer(roomId: string, userId: string): Promise<void> {
  await requireDb()
    .prepare("delete from stop_room_players where room_id = ? and user_id = ?")
    .bind(roomId, userId)
    .run();
}

export async function deleteStopRoom(roomId: string): Promise<void> {
  await requireDb().prepare("delete from stop_rooms where id = ?").bind(roomId).run();
}

/* ------------------------------------------------------------------ *
 * Stop científico (campanha)
 * ------------------------------------------------------------------ */

export type StopProgressRow = {
  user_id: string;
  level_id: string;
  stars: number;
  best_score: number;
  attempts: number;
  updated_at: string;
};

const STOP_PROGRESS_COLUMNS = "user_id, level_id, stars, best_score, attempts, updated_at";

export async function listStopProgress(userId: string): Promise<StopProgressRow[]> {
  const { results } = await requireDb()
    .prepare(`select ${STOP_PROGRESS_COLUMNS} from stop_progress where user_id = ?`)
    .bind(userId)
    .all<StopProgressRow>();
  return results;
}

/**
 * Grava o resultado de uma rodada sem nunca piorar o recorde: estrelas e
 * pontuação só sobem, e cada tentativa é contada.
 */
export async function saveStopResult(
  userId: string,
  levelId: string,
  score: number,
  stars: number,
): Promise<StopProgressRow> {
  const ts = nowIso();
  await requireDb()
    .prepare(
      `insert into stop_progress (user_id, level_id, stars, best_score, attempts, updated_at)
       values (?, ?, ?, ?, 1, ?)
       on conflict(user_id, level_id) do update set
         stars = max(stop_progress.stars, excluded.stars),
         best_score = max(stop_progress.best_score, excluded.best_score),
         attempts = stop_progress.attempts + 1,
         updated_at = excluded.updated_at`,
    )
    .bind(userId, levelId, stars, score, ts)
    .run();

  const row = await requireDb()
    .prepare(
      `select ${STOP_PROGRESS_COLUMNS} from stop_progress where user_id = ? and level_id = ?`,
    )
    .bind(userId, levelId)
    .first<StopProgressRow>();
  if (!row) throw new Error("Não foi possível salvar o progresso do Stop.");
  return row;
}

export async function resetStopProgress(userId: string): Promise<void> {
  await requireDb().prepare("delete from stop_progress where user_id = ?").bind(userId).run();
}
