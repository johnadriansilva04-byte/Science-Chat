import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, type UIMessage } from "ai";
import { startResponses } from "@/lib/ai/gateway.server";
import { withLovableAiGatewayRunIdHeader } from "@/lib/ai/run-id.server";
import { INTERVIEW_INSTRUCTIONS, WRITING_CHAT_INSTRUCTIONS } from "@/lib/ai/prompts";
import { userClientFromRequest } from "@/lib/supabase-user.server";

async function handle(request: Request) {
  const ctx = await userClientFromRequest(request);
  if (!ctx) return new Response("Não autorizado", { status: 401 });
  const body = (await request.json()) as { messages: UIMessage[]; articleId: string };
  if (!body?.articleId || !Array.isArray(body.messages)) return new Response("Requisição inválida", { status: 400 });

  const { data: article } = await ctx.supabase.from("articles").select("id, phase, plan").eq("id", body.articleId).maybeSingle();
  if (!article) return new Response("Artigo não encontrado", { status: 404 });

  const last = body.messages[body.messages.length - 1];
  if (last?.role === "user") {
    const { error } = await ctx.supabase.from("chat_messages").insert({ article_id: article.id, role: "user", parts: last.parts as never });
    if (error) return new Response("Falha ao salvar mensagem", { status: 500 });
  }

  const instructions =
    article.phase === "interview"
      ? INTERVIEW_INSTRUCTIONS
      : `${WRITING_CHAT_INSTRUCTIONS}\n\nPLANO:\n${article.plan ?? ""}`;

  const { result, runIdFetch } = startResponses(request, await convertToModelMessages(body.messages), instructions);
  const response = result.toUIMessageStreamResponse({
    originalMessages: body.messages,
    sendReasoning: true,
    onFinish: async ({ responseMessage }) => {
      const parts = responseMessage.parts.filter((p) => p.type === "text");
      if (!parts.length) return;
      const { error } = await ctx.supabase.from("chat_messages").insert({ article_id: article.id, role: "assistant", parts: parts as never });
      if (error) console.error("Falha ao salvar resposta", error);
      await ctx.supabase.from("articles").update({ updated_at: new Date().toISOString() }).eq("id", article.id);
    },
  });
  return withLovableAiGatewayRunIdHeader(response, runIdFetch);
}

export const Route = createFileRoute("/api/chat")({
  server: { handlers: { POST: ({ request }) => handle(request) } },
});
