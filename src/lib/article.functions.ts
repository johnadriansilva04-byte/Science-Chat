import { createServerFn } from "@tanstack/react-start";
import { requireUser } from "@/lib/cf/auth-middleware";
import { isLastPage, stripMarkers } from "@/lib/article-marker";
import { countWords, MIN_PAGE_WORDS } from "@/lib/article-page";
import * as repo from "@/lib/cf/repo.server";

type Part = { type: string; text?: string };

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

export type ArticleListItem = { id: string; title: string; phase: string; updated_at: string };

function parseParts(raw: string): Part[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Part[]) : [];
  } catch {
    return [{ type: "text", text: raw }];
  }
}

async function loadTranscript(userId: string, articleId: string): Promise<string> {
  const msgs = await repo.listMessages(userId, articleId);
  return msgs
    .map((m) => {
      const text = parseParts(m.parts)
        .map((p) => p.text ?? "")
        .join("");
      return `${m.role === "user" ? "PESQUISADOR" : "SCIENCECHAT"}: ${text}`;
    })
    .join("\n\n");
}

export const listArticles = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const rows = await repo.listArticles(context.user.id);
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      phase: r.phase,
      updated_at: r.updated_at,
    }));
  });

export const createArticle = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const article = await repo.createArticle(context.user.id);
    return { id: article.id };
  });

export const deleteArticle = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((d: { articleId: string }) => d)
  .handler(async ({ data, context }) => {
    await repo.deleteArticle(context.user.id, data.articleId);
    return { ok: true };
  });

export const getWorkspace = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((d: { articleId: string }) => d)
  .handler(async ({ data, context }) => {
    const article = await repo.getArticle(context.user.id, data.articleId);
    if (!article) throw new Error("Artigo não encontrado");
    const messages = await repo.listMessages(context.user.id, data.articleId);
    const pages = await repo.listPages(context.user.id, data.articleId);

    return {
      article: {
        id: article.id,
        title: article.title,
        phase: article.phase,
        plan: article.plan,
        updated_at: article.updated_at,
      } as WorkspaceArticle,
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        parts: parseParts(m.parts),
      })) as WorkspaceMessage[],
      pages: pages.map((p) => ({
        id: p.id,
        page_number: p.page_number,
        content: p.content,
        status: p.status,
        created_at: p.created_at,
      })) as WorkspacePage[],
    };
  });

export const generatePlan = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((d: { articleId: string; feedback?: string }) => d)
  .handler(async ({ data, context }) => {
    const { generateFinalText } = await import("@/lib/ai/gateway.server");
    const { PLAN_INSTRUCTIONS } = await import("@/lib/ai/prompts");
    const article = await repo.getArticle(context.user.id, data.articleId);
    if (!article) throw new Error("Artigo não encontrado");
    const transcript = await loadTranscript(context.user.id, data.articleId);
    const prompt = `ENTREVISTA:\n${transcript}\n\n${
      article.plan && data.feedback
        ? `PLANO ANTERIOR:\n${article.plan}\n\nAJUSTE PEDIDO PELO PESQUISADOR: ${data.feedback}\n\nRefaça o plano aplicando o ajuste.`
        : "Monte o plano."
    }`;
    const plan = await generateFinalText(prompt, PLAN_INSTRUCTIONS);
    // O título pertence ao pesquisador: o plano apenas o propõe. Nunca sobrescrevemos
    // o título do artigo aqui — a aplicação é um ato explícito do usuário.
    const proposedTitle =
      plan
        .match(/^#\s+(.+)$/m)?.[1]
        ?.trim()
        .slice(0, 160) || null;
    await repo.updateArticle(context.user.id, data.articleId, { plan, phase: "plan" });
    return { ok: true, plan, proposedTitle };
  });

export const setPhase = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((d: { articleId: string; phase: string }) => d)
  .handler(async ({ data, context }) => {
    await repo.updateArticle(context.user.id, data.articleId, { phase: data.phase });
    return { ok: true };
  });

export const updateTitle = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((d: { articleId: string; title: string }) => d)
  .handler(async ({ data, context }) => {
    const title = data.title.trim().slice(0, 200) || "Novo artigo";
    await repo.updateArticle(context.user.id, data.articleId, { title });
    return { ok: true, title };
  });

export const generatePage = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((d: { articleId: string; pageNumber?: number; feedback?: string }) => d)
  .handler(async ({ data, context }) => {
    const { generateFinalText } = await import("@/lib/ai/gateway.server");
    const { PAGE_INSTRUCTIONS } = await import("@/lib/ai/prompts");
    const userId = context.user.id;
    const article = await repo.getArticle(userId, data.articleId);
    if (!article) throw new Error("Artigo não encontrado");
    if (!article.plan) throw new Error("Plano ainda não foi criado");

    const all = await repo.listPages(userId, data.articleId);
    const draft = all.find((p) => p.status === "draft");
    const maxNumber = all.reduce((max, p) => Math.max(max, p.page_number), 0);
    const number = data.pageNumber ?? draft?.page_number ?? maxNumber + 1;
    const current = all.find((p) => p.page_number === number);
    const approvedBefore = all
      .filter((p) => p.status === "approved" && p.page_number < number)
      .sort((a, b) => a.page_number - b.page_number);
    const prev = approvedBefore[approvedBefore.length - 1];
    const nextApproved = all.find((p) => p.status === "approved" && p.page_number === number + 1);

    const transcript = await loadTranscript(userId, data.articleId);
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
    // A página precisa preencher uma folha A4; uma resposta curta demais indica corte
    // ou omissão da IA. Reforçamos o pedido uma vez antes de aceitar.
    let finalContent = content;
    if (countWords(stripMarkers(content)) < MIN_PAGE_WORDS) {
      const retryPrompt = `${prompt}\n\nATENÇÃO: a versão anterior ficou curta demais (menos de ${MIN_PAGE_WORDS} palavras). Escreva novamente a PÁGINA ${number} com pelo menos ${MIN_PAGE_WORDS} palavras, em 3 a 5 parágrafos desenvolvidos, sem repetir ideias.`;
      finalContent = await generateFinalText(retryPrompt, PAGE_INSTRUCTIONS);
    }
    await repo.upsertPage(userId, data.articleId, number, finalContent, "draft");
    return { ok: true, pageNumber: number };
  });

export const savePage = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((d: { articleId: string; pageNumber: number; content: string }) => d)
  .handler(async ({ data, context }) => {
    await repo.upsertPage(context.user.id, data.articleId, data.pageNumber, data.content, "draft");
    return { ok: true };
  });

export const approvePage = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((d: { articleId: string; pageNumber: number }) => d)
  .handler(async ({ data, context }) => {
    const userId = context.user.id;
    const page = await repo.getPage(userId, data.articleId, data.pageNumber);
    if (!page) throw new Error("Página não encontrada");
    await repo.setPageStatus(userId, data.articleId, data.pageNumber, "approved");
    const done = isLastPage(page.content);
    if (done) await repo.updateArticle(userId, data.articleId, { phase: "done" });
    return { ok: true, done };
  });

export const reopenPage = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((d: { articleId: string; pageNumber: number }) => d)
  .handler(async ({ data, context }) => {
    const userId = context.user.id;
    await repo.setPageStatus(userId, data.articleId, data.pageNumber, "draft");
    await repo.updateArticle(userId, data.articleId, { phase: "writing" });
    return { ok: true };
  });

export const deletePage = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((d: { articleId: string; pageNumber: number }) => d)
  .handler(async ({ data, context }) => {
    await repo.deletePage(context.user.id, data.articleId, data.pageNumber);
    return { ok: true };
  });
