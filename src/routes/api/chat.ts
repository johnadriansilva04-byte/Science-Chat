import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, type UIMessage } from "ai";
import { startResponses } from "@/lib/ai/gateway.server";
import { INTERVIEW_INSTRUCTIONS, WRITING_CHAT_INSTRUCTIONS } from "@/lib/ai/prompts";
import { buildTools } from "@/lib/ai/tools.server";
import { getSessionUser } from "@/lib/cf/auth.server";
import * as repo from "@/lib/cf/repo.server";

async function handle(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return new Response("Não autorizado", { status: 401 });

  const body = (await request.json()) as { messages: UIMessage[]; articleId: string };
  if (!body?.articleId || !Array.isArray(body.messages)) {
    return new Response("Requisição inválida", { status: 400 });
  }

  const article = await repo.getArticle(user.id, body.articleId);
  if (!article) return new Response("Artigo não encontrado", { status: 404 });

  const last = body.messages[body.messages.length - 1];
  if (last?.role === "user") {
    const parts = last.parts.filter((p) => p.type === "text");
    await repo.addMessage(user.id, article.id, "user", parts);
  }

  const instructions =
    article.phase === "interview"
      ? INTERVIEW_INSTRUCTIONS
      : `${WRITING_CHAT_INSTRUCTIONS}\n\nPLANO:\n${article.plan ?? ""}`;

  const { result } = startResponses(
    request,
    await convertToModelMessages(body.messages),
    instructions,
    undefined,
    buildTools({ userId: user.id, articleId: article.id }),
  );
  return result.toUIMessageStreamResponse({
    originalMessages: body.messages,
    sendReasoning: true,
    onFinish: async ({ responseMessage }) => {
      const parts = responseMessage.parts.filter((p) => p.type === "text");
      if (!parts.length) return;
      await repo.addMessage(user.id, article.id, "assistant", parts);
      await repo.updateArticle(user.id, article.id, {});
    },
  });
}

export const Route = createFileRoute("/api/chat")({
  server: { handlers: { POST: ({ request }) => handle(request) } },
});
