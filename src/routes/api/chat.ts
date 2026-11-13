import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, type UIMessage } from "ai";
import { startResponses } from "@/lib/ai/gateway.server";
import { INTERVIEW_INSTRUCTIONS, WRITING_CHAT_INSTRUCTIONS } from "@/lib/ai/prompts";
import { buildTools, TOOL_NAMES } from "@/lib/ai/tools.server";
import { stripLeakedToolCalls } from "@/lib/ai/leaked-tool-call";
import { isQuotaError, QUOTA_MARKER } from "@/lib/ai/quota";
import { pickForcedTool } from "@/lib/ai/tool-intent";
import { getSessionUser } from "@/lib/cf/auth.server";
import * as repo from "@/lib/cf/repo.server";

/**
 * Remove do texto o JSON de chamadas de ferramenta que o modelo tenha vazado
 * como prosa. Histórico com esse texto "envenena" as respostas seguintes,
 * fazendo o modelo repetir o vazamento em vez de chamar a ferramenta.
 */
function sanitizeMessages(messages: UIMessage[]): UIMessage[] {
  return messages.map((message) => {
    if (message.role !== "assistant") return message;
    const parts = message.parts.map((part) =>
      part.type === "text" ? { ...part, text: stripLeakedToolCalls(part.text, TOOL_NAMES) } : part,
    );
    return { ...message, parts };
  });
}

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

  const sanitized = sanitizeMessages(body.messages);
  const lastUserText = [...sanitized]
    .reverse()
    .find((m) => m.role === "user")
    ?.parts.filter((p) => p.type === "text")
    .map((p) => (p as { text: string }).text)
    .join(" ");
  const forced = pickForcedTool(lastUserText ?? "");
  // Na entrevista o documento ainda é preliminar: só forçamos a BUSCA (provocação/
  // evidência). Edições de título/página só são forçadas na fase de produção.
  const forcedTool =
    article.phase === "interview" ? (forced === "pesquisar_bases" ? forced : null) : forced;
  const { result } = startResponses(
    request,
    await convertToModelMessages(sanitized),
    instructions,
    undefined,
    buildTools({ userId: user.id, articleId: article.id }),
    forcedTool,
  );
  return result.toUIMessageStreamResponse({
    originalMessages: sanitized,
    sendReasoning: true,
    // A cota diária da Workers AI pode esgotar no meio da conversa. Em vez de
    // derrubar o chat, emitimos um marcador que o cliente troca por um aviso
    // amigável ("o Pracinha vai descansar e volta às HH:MM").
    onError: (error) => {
      const message = error instanceof Error ? error.message : String(error);
      if (isQuotaError(message)) return QUOTA_MARKER;
      return "Não foi possível concluir a resposta. Tente novamente.";
    },
    onFinish: async ({ responseMessage }) => {
      const parts = responseMessage.parts
        .filter((p) => p.type === "text")
        .map((p) => ({ ...p, text: stripLeakedToolCalls(p.text, TOOL_NAMES) }))
        .filter((p) => p.text.trim().length > 0);
      if (!parts.length) return;
      await repo.addMessage(user.id, article.id, "assistant", parts);
      await repo.updateArticle(user.id, article.id, {});
    },
  });
}

export const Route = createFileRoute("/api/chat")({
  server: { handlers: { POST: ({ request }) => handle(request) } },
});
