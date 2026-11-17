import { createFileRoute } from "@tanstack/react-router";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  type UIMessage,
} from "ai";
import { startResponses } from "@/lib/ai/gateway.server";
import { INTERVIEW_INSTRUCTIONS, WRITING_CHAT_INSTRUCTIONS } from "@/lib/ai/prompts";
import { buildTools, TOOL_NAMES } from "@/lib/ai/tools.server";
import { stripLeakedToolCalls } from "@/lib/ai/leaked-tool-call";
import { isQuotaError, QUOTA_MARKER } from "@/lib/ai/quota";
import { pickForcedTool } from "@/lib/ai/tool-intent";
import { parsePageCommand, type PageCommand } from "@/lib/ai/page-command";
import { getSessionUser } from "@/lib/cf/auth.server";
import { CHAT_POLICY, consumeRateLimit, tooManyRequests } from "@/lib/cf/rate-limit.server";
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

/**
 * Executa um comando de página reconhecido (editar/acrescentar com conteúdo
 * literal) DIRETAMENTE no banco, sem depender de o modelo emitir o tool call.
 * Emite, no stream, o mesmo par de partes que uma ferramenta real produziria
 * (`tool-input-available` + `tool-output-available`) e uma confirmação curta —
 * assim a folha recarrega na tela e o pesquisador vê exatamente o que mudou.
 */
function runPageCommand(userId: string, articleId: string, cmd: PageCommand) {
  const toolName = cmd.action === "edit" ? "editar_pagina" : "acrescentar_na_pagina";
  const toolCallId = `pgcmd-${generateId()}`;
  return createUIMessageStream({
    execute: async ({ writer }) => {
      let result: string;
      let ok = true;
      try {
        const current = await repo.getPage(userId, articleId, cmd.pagina);
        const next =
          cmd.action === "edit"
            ? cmd.conteudo.trim()
            : current?.content
              ? `${current.content.trimEnd()}\n\n${cmd.conteudo.trim()}`
              : cmd.conteudo.trim();
        await repo.upsertPage(userId, articleId, cmd.pagina, next, current?.status ?? "draft");
        result =
          cmd.action === "edit"
            ? `Página ${cmd.pagina} reescrita (${next.split(/\s+/).length} palavras).`
            : `Conteúdo acrescentado à página ${cmd.pagina}.`;
      } catch (error) {
        ok = false;
        result = error instanceof Error ? error.message : "Não foi possível alterar a página.";
      }

      const input =
        cmd.action === "edit"
          ? { pagina: cmd.pagina, conteudo: cmd.conteudo }
          : { pagina: cmd.pagina, texto: cmd.conteudo };
      writer.write({ type: "tool-input-available", toolCallId, toolName, input });
      writer.write(
        ok
          ? { type: "tool-output-available", toolCallId, output: result }
          : { type: "tool-output-error", toolCallId, errorText: result },
      );

      const textId = generateId();
      const delta = ok
        ? `Feito — página ${cmd.pagina} ${cmd.action === "edit" ? "reescrita" : "atualizada"}.`
        : `Não consegui alterar a página ${cmd.pagina}.`;
      writer.write({ type: "text-start", id: textId });
      writer.write({ type: "text-delta", id: textId, delta });
      writer.write({ type: "text-end", id: textId });

      await repo.addMessage(userId, articleId, "assistant", [{ type: "text", text: delta }]);
      await repo.updateArticle(userId, articleId, {});
    },
    onError: () => "Não foi possível alterar a página. Tente novamente.",
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

  const limit = await consumeRateLimit(`chat:${user.id}`, CHAT_POLICY);
  if (!limit.ok) return tooManyRequests(limit);

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

  // Caminho determinístico: quando o pedido traz um conteúdo LITERAL inequívoco
  // ("página 1, com a palavra exata: X"), aplicamos a edição direto no banco. Isso
  // contorna a falha do llama-3.3, que narra a chamada em vez de emitir o tool call
  // e deixa o documento intacto — obrigando o pesquisador a nomear a ferramenta.
  if (article.phase !== "interview") {
    const cmd = parsePageCommand(lastUserText ?? "");
    if (cmd)
      return createUIMessageStreamResponse({ stream: runPageCommand(user.id, article.id, cmd) });
  }

  const forced = pickForcedTool(lastUserText ?? "");
  // Na entrevista o documento ainda é preliminar: forçamos a BUSCA (provocação/
  // evidência) e a LEITURA de anexos (o pesquisador anexa documentos durante a
  // entrevista). Edições de título/página só são forçadas na fase de produção.
  const interviewTools = new Set([
    "pesquisar_bases",
    "ler_anexo",
    "ler_todos_anexos",
    "listar_anexos",
  ]);
  const forcedTool =
    article.phase === "interview" ? (forced && interviewTools.has(forced) ? forced : null) : forced;
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
