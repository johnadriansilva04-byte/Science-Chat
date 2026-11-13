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
      "select id, user_id, title, phase, plan, created_at, updated_at from articles where user_id = ? order by updated_at desc",
    )
    .bind(userId)
    .all<Article>();
  return results;
}

export async function getArticle(userId: string, articleId: string): Promise<Article | null> {
  return requireDb()
    .prepare(
      "select id, user_id, title, phase, plan, created_at, updated_at from articles where id = ? and user_id = ?",
    )
    .bind(articleId, userId)
    .first<Article>();
}

export async function createArticle(userId: string): Promise<Article> {
  const id = newId();
  const ts = nowIso();
  await requireDb()
    .prepare(
      "insert into articles (id, user_id, title, phase, created_at, updated_at) values (?, ?, 'Novo artigo', 'interview', ?, ?)",
    )
    .bind(id, userId, ts, ts)
    .run();
  return {
    id,
    user_id: userId,
    title: "Novo artigo",
    phase: "interview",
    plan: null,
    created_at: ts,
    updated_at: ts,
  };
}

export async function updateArticle(
  userId: string,
  articleId: string,
  patch: { title?: string; phase?: string; plan?: string | null },
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

export type PublicationStatus =
  "draft" | "submitted" | "in_review" | "accepted" | "rejected" | "published";

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
  submitted_at: string | null;
  reviewed_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

const PUBLICATION_COLUMNS =
  "id, user_id, article_id, slug, title, abstract, keywords, language, area, author_name, affiliation, orcid, content, status, review_report, review_notes, doi, submitted_at, reviewed_at, published_at, created_at, updated_at";

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
    submitted_at: null,
    reviewed_at: null,
    published_at: null,
    created_at: ts,
    updated_at: ts,
  };
}

/**
 * Atualiza o status da publicação e as datas correspondentes. O fluxo é
 * `draft -> submitted -> in_review -> accepted -> published` (ou `rejected`).
 * Só `published` aparece na área pública.
 */
export async function setPublicationStatus(
  userId: string,
  id: string,
  status: PublicationStatus,
  extras?: { reviewReport?: string | null; doi?: string | null; reviewNotes?: string | null },
): Promise<void> {
  const ts = nowIso();
  const sets = ["status = ?", "updated_at = ?"];
  const values: unknown[] = [status, ts];
  if (status === "submitted") {
    sets.push("submitted_at = ?");
    values.push(ts);
  }
  if (status === "accepted" || status === "rejected") {
    sets.push("reviewed_at = ?");
    values.push(ts);
    if (extras?.reviewReport !== undefined) {
      sets.push("review_report = ?");
      values.push(extras.reviewReport);
    }
  }
  if (status === "published") {
    sets.push("published_at = ?");
    values.push(ts);
    if (extras?.doi !== undefined) {
      sets.push("doi = ?");
      values.push(extras.doi);
    }
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
  created_at: string;
  updated_at: string;
};

export async function getEditorialConfig(
  userId: string,
  articleId: string,
): Promise<EditorialRow | null> {
  return requireDb()
    .prepare(
      `select article_id, user_id, destination, unit, standard, language, guidelines, notes, verified_at, created_at, updated_at
       from editorial_configs where article_id = ? and user_id = ?`,
    )
    .bind(articleId, userId)
    .first<EditorialRow>();
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
  },
): Promise<EditorialRow> {
  const db = requireDb();
  const ts = nowIso();
  const existing = await getEditorialConfig(userId, articleId);
  // A data de verificação é marcada sempre que o pesquisador registra diretrizes.
  const verifiedAt = fields.guidelines?.trim() ? ts : null;
  if (existing) {
    await db
      .prepare(
        `update editorial_configs set destination = ?, unit = ?, standard = ?, language = ?, guidelines = ?, notes = ?, verified_at = ?, updated_at = ?
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
        ts,
        articleId,
        userId,
      )
      .run();
    return { ...existing, ...fields, verified_at: verifiedAt, updated_at: ts };
  }
  await db
    .prepare(
      `insert into editorial_configs (article_id, user_id, destination, unit, standard, language, guidelines, notes, verified_at, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      ts,
      ts,
    )
    .run();
  return {
    article_id: articleId,
    user_id: userId,
    ...fields,
    verified_at: verifiedAt,
    created_at: ts,
    updated_at: ts,
  };
}
