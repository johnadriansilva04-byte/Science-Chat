import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isLastPage } from "@/lib/article-marker";

type Part = { type: string; text?: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sb = any;

export type WorkspaceMessage = { id: string; role: string; parts: Part[] };
export type WorkspacePage = {
  id: string;
  page_number: number;
  content: string;
  status: string;
  created_at: string;
};
export type WorkspaceArticle = {
  id: string;
  title: string;
  phase: string;
  plan: string | null;
  updated_at: string;
};

async function loadContext(supabase: Sb, articleId: string) {
  const { data: article, error } = await supabase
    .from("articles")
    .select("*")
    .eq("id", articleId)
    .maybeSingle();
  if (error || !article) throw new Error("Artigo não encontrado");
  const { data: msgs } = await supabase
    .from("chat_messages")
    .select("role, parts")
    .eq("article_id", articleId)
    .order("created_at");
  const transcript = (msgs ?? [])
    .map(
      (m: { role: string; parts: Part[] }) =>
        `${m.role === "user" ? "PESQUISADOR" : "SCIENCECHAT"}: ${m.parts.map((p) => p.text ?? "").join("")}`,
    )
    .join("\n\n");
  return { article, transcript };
}

export const getWorkspace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { articleId: string }) => d)
  .handler(async ({ data, context }) => {
    const sb = context.supabase as Sb;
    const { data: article, error } = await sb
      .from("articles")
      .select("id, title, phase, plan, updated_at")
      .eq("id", data.articleId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!article) throw new Error("Artigo não encontrado");

    const { data: msgs } = await sb
      .from("chat_messages")
      .select("id, role, parts")
      .eq("article_id", data.articleId)
      .order("created_at");
    const { data: pages } = await sb
      .from("article_pages")
      .select("id, page_number, content, status, created_at")
      .eq("article_id", data.articleId)
      .order("page_number");

    return {
      article: article as WorkspaceArticle,
      messages: (msgs ?? []) as WorkspaceMessage[],
      pages: (pages ?? []) as WorkspacePage[],
    };
  });

export const generatePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { articleId: string; feedback?: string }) => d)
  .handler(async ({ data, context }) => {
    const { generateFinalText } = await import("@/lib/ai/gateway.server");
    const { PLAN_INSTRUCTIONS } = await import("@/lib/ai/prompts");
    const sb = context.supabase as Sb;
    const { article, transcript } = await loadContext(sb, data.articleId);
    const prompt = `ENTREVISTA:\n${transcript}\n\n${
      article.plan && data.feedback
        ? `PLANO ANTERIOR:\n${article.plan}\n\nAJUSTE PEDIDO PELO PESQUISADOR: ${data.feedback}\n\nRefaça o plano aplicando o ajuste.`
        : "Monte o plano."
    }`;
    const plan = await generateFinalText(prompt, PLAN_INSTRUCTIONS);
    const title =
      plan
        .match(/^#\s+(.+)$/m)?.[1]
        ?.trim()
        .slice(0, 160) ?? article.title;
    const { error } = await sb
      .from("articles")
      .update({ plan, title, phase: "plan", updated_at: new Date().toISOString() })
      .eq("id", data.articleId);
    if (error) throw new Error(error.message);
    return { ok: true, plan, title };
  });

export const setPhase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { articleId: string; phase: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as Sb)
      .from("articles")
      .update({ phase: data.phase, updated_at: new Date().toISOString() })
      .eq("id", data.articleId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateTitle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { articleId: string; title: string }) => d)
  .handler(async ({ data, context }) => {
    const title = data.title.trim().slice(0, 200) || "Novo artigo";
    const { error } = await (context.supabase as Sb)
      .from("articles")
      .update({ title, updated_at: new Date().toISOString() })
      .eq("id", data.articleId);
    if (error) throw new Error(error.message);
    return { ok: true, title };
  });

async function nextPageNumber(sb: Sb, articleId: string): Promise<number> {
  const { data } = await sb
    .from("article_pages")
    .select("page_number")
    .eq("article_id", articleId)
    .order("page_number", { ascending: false })
    .limit(1);
  return ((data?.[0]?.page_number as number | undefined) ?? 0) + 1;
}

export const generatePage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { articleId: string; pageNumber?: number; feedback?: string }) => d)
  .handler(async ({ data, context }) => {
    const { generateFinalText } = await import("@/lib/ai/gateway.server");
    const { PAGE_INSTRUCTIONS } = await import("@/lib/ai/prompts");
    const sb = context.supabase as Sb;
    const { article, transcript } = await loadContext(sb, data.articleId);
    if (!article.plan) throw new Error("Plano ainda não foi criado");

    const { data: pages } = await sb
      .from("article_pages")
      .select("page_number, content, status")
      .eq("article_id", data.articleId)
      .order("page_number");
    const all = (pages ?? []) as { page_number: number; content: string; status: string }[];

    // Target page: explicit, else the single draft, else the next number.
    const draft = all.find((p) => p.status === "draft");
    const number =
      data.pageNumber ?? draft?.page_number ?? (await nextPageNumber(sb, data.articleId));
    const current = all.find((p) => p.page_number === number);
    const approvedBefore = all
      .filter((p) => p.status === "approved" && p.page_number < number)
      .sort((a, b) => a.page_number - b.page_number);
    const prev = approvedBefore[approvedBefore.length - 1];
    const nextApproved = all.find((p) => p.status === "approved" && p.page_number === number + 1);

    const prompt = [
      `PLANO APROVADO:\n${article.plan}`,
      `ENTREVISTA:\n${transcript}`,
      prev ? `PÁGINA ANTERIOR (${prev.page_number}), APROVADA:\n${prev.content}` : "",
      nextApproved
        ? `PRÓXIMA PÁGINA JÁ APROVADA (${nextApproved.page_number}) — mantenha continuidade com ela:\n${nextApproved.content}`
        : "",
      current && data.feedback
        ? `VERSÃO ATUAL DA PÁGINA ${number}:\n${current.content}\n\nCORREÇÃO PEDIDA PELO PESQUISADOR: ${data.feedback}\n\nReescreva a página ${number} aplicando a correção.`
        : `Escreva agora a PÁGINA ${number}.`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const content = await generateFinalText(prompt, PAGE_INSTRUCTIONS);
    const { error } = await sb
      .from("article_pages")
      .upsert(
        { article_id: data.articleId, page_number: number, content, status: "draft" },
        { onConflict: "article_id,page_number" },
      );
    if (error) throw new Error(error.message);
    return { ok: true, pageNumber: number };
  });

export const savePage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { articleId: string; pageNumber: number; content: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as Sb).from("article_pages").upsert(
      {
        article_id: data.articleId,
        page_number: data.pageNumber,
        content: data.content,
        status: "draft",
      },
      { onConflict: "article_id,page_number" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const approvePage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { articleId: string; pageNumber: number }) => d)
  .handler(async ({ data, context }) => {
    const sb = context.supabase as Sb;
    const { data: page, error } = await sb
      .from("article_pages")
      .select("content")
      .eq("article_id", data.articleId)
      .eq("page_number", data.pageNumber)
      .maybeSingle();
    if (error || !page) throw new Error("Página não encontrada");
    const up = await sb
      .from("article_pages")
      .update({ status: "approved" })
      .eq("article_id", data.articleId)
      .eq("page_number", data.pageNumber);
    if (up.error) throw new Error(up.error.message);
    const done = isLastPage(page.content as string);
    if (done) {
      await sb
        .from("articles")
        .update({ phase: "done", updated_at: new Date().toISOString() })
        .eq("id", data.articleId);
    }
    return { ok: true, done };
  });

export const reopenPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { articleId: string; pageNumber: number }) => d)
  .handler(async ({ data, context }) => {
    const sb = context.supabase as Sb;
    const { error } = await sb
      .from("article_pages")
      .update({ status: "draft" })
      .eq("article_id", data.articleId)
      .eq("page_number", data.pageNumber);
    if (error) throw new Error(error.message);
    await sb
      .from("articles")
      .update({ phase: "writing", updated_at: new Date().toISOString() })
      .eq("id", data.articleId);
    return { ok: true };
  });

export const deletePage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { articleId: string; pageNumber: number }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as Sb)
      .from("article_pages")
      .delete()
      .eq("article_id", data.articleId)
      .eq("page_number", data.pageNumber);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
