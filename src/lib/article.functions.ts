import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Part = { type: string; text?: string };

async function loadContext(supabase: any, articleId: string) {
  const { data: article, error } = await supabase.from("articles").select("*").eq("id", articleId).maybeSingle();
  if (error || !article) throw new Error("Artigo não encontrado");
  const { data: msgs } = await supabase.from("chat_messages").select("role, parts").eq("article_id", articleId).order("created_at");
  const transcript = (msgs ?? [])
    .map((m: { role: string; parts: Part[] }) => `${m.role === "user" ? "PESQUISADOR" : "SCIENCECHAT"}: ${m.parts.map((p) => p.text ?? "").join("")}`)
    .join("\n\n");
  return { article, transcript };
}

export const generatePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { articleId: string; feedback?: string }) => d)
  .handler(async ({ data, context }) => {
    const { generateFinalText } = await import("@/lib/ai/gateway.server");
    const { PLAN_INSTRUCTIONS } = await import("@/lib/ai/prompts");
    const { article, transcript } = await loadContext(context.supabase, data.articleId);
    const prompt = `ENTREVISTA:\n${transcript}\n\n${article.plan && data.feedback ? `PLANO ANTERIOR:\n${article.plan}\n\nAJUSTE PEDIDO PELO PESQUISADOR: ${data.feedback}\n\nRefaça o plano aplicando o ajuste.` : "Monte o plano."}`;
    const plan = await generateFinalText(prompt, PLAN_INSTRUCTIONS);
    const title = plan.match(/^#\s+(.+)$/m)?.[1]?.trim().slice(0, 160) ?? article.title;
    const { error } = await context.supabase.from("articles").update({ plan, title, phase: "plan", updated_at: new Date().toISOString() }).eq("id", data.articleId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const generatePage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { articleId: string; feedback?: string }) => d)
  .handler(async ({ data, context }) => {
    const { generateFinalText } = await import("@/lib/ai/gateway.server");
    const { PAGE_INSTRUCTIONS } = await import("@/lib/ai/prompts");
    const { article, transcript } = await loadContext(context.supabase, data.articleId);
    if (!article.plan) throw new Error("Plano ainda não foi criado");
    const { data: pages } = await context.supabase.from("article_pages").select("*").eq("article_id", data.articleId).order("page_number");
    const all = (pages ?? []) as { page_number: number; content: string; status: string }[];
    const draft = all.find((p) => p.status === "draft");
    const approved = all.filter((p) => p.status === "approved");
    const number = draft ? draft.page_number : approved.length + 1;
    const prev = approved[approved.length - 1];
    const prompt = `PLANO APROVADO:\n${article.plan}\n\nENTREVISTA:\n${transcript}\n\n${prev ? `PÁGINA ANTERIOR (${prev.page_number}), APROVADA:\n${prev.content}\n\n` : ""}${draft && data.feedback ? `VERSÃO ATUAL DA PÁGINA ${number}:\n${draft.content}\n\nCORREÇÃO PEDIDA PELO PESQUISADOR: ${data.feedback}\n\nReescreva a página ${number} aplicando a correção.` : `Escreva agora a PÁGINA ${number}.`}`;
    const content = await generateFinalText(prompt, PAGE_INSTRUCTIONS);
    const { error } = await context.supabase
      .from("article_pages")
      .upsert({ article_id: data.articleId, page_number: number, content, status: "draft" }, { onConflict: "article_id,page_number" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
