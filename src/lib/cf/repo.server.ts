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
