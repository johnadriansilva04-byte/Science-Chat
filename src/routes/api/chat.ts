import { createFileRoute } from "@tanstack/react-router";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  type UIMessage,
} from "ai";
import { startResponses, generateFinalText } from "@/lib/ai/gateway.server";
import {
  INTERVIEW_INSTRUCTIONS,
  PAGE_INSTRUCTIONS,
  WRITING_CHAT_INSTRUCTIONS,
} from "@/lib/ai/prompts";
import { countWords, MIN_PAGE_WORDS, normalizePageText, pickLongerText } from "@/lib/article-page";
import { stripMarkers } from "@/lib/article-marker";
import { buildTools, TOOL_NAMES } from "@/lib/ai/tools.server";
import { stripLeakedToolCalls } from "@/lib/ai/leaked-tool-call";
import { errorTextStream } from "@/lib/ai/error-stream";
import { cleanAssistantText, collectAssistantSentences } from "@/lib/ai/anti-repeat";
import { isQuotaError, QUOTA_MARKER } from "@/lib/ai/quota";
import { pickForcedTool } from "@/lib/ai/tool-intent";
import { parsePageCommand, parseRewriteRequest, type PageCommand } from "@/lib/ai/page-command";
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
      part.type === "text"
        ? { ...part, text: cleanAssistantText(stripLeakedToolCalls(part.text, TOOL_NAMES)) }
        : part,
    );
    return { ...message, parts };
  });
}

/**
 * Monta o contexto do documento atual (páginas já escritas) para o modelo. Sem
 * isto, o chat só via o PLANO e, ao pedir "reescreva a página 1", a IA inventava
 * o texto do zero e destruía a introdução existente. Com o conteúdo à vista, ela
 * sabe o que já existe e edita preservando o que o pesquisador aprovou.
 */
async function documentContext(userId: string, articleId: string): Promise<string> {
  const pages = await repo.listPages(userId, articleId);
  if (!pages.length) return "\n\nDOCUMENTO ATUAL: (ainda não há páginas escritas)";
  const body = pages
    .sort((a, b) => a.page_number - b.page_number)
    .map((p) => `### Página ${p.page_number} [${p.status}]\n${p.content.trim()}`)
    .join("\n\n");
  return `\n\nDOCUMENTO ATUAL (é isto que existe hoje — preserve o que não foi pedido para mudar):\n${body}`;
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

/**
 * Reescreve uma página pelo MESMO motor da aba Produção (texto puro com
 * PAGE_INSTRUCTIONS). Motivo: o llama-3.3 degrada textos longos quando eles vão
 * dentro do JSON de uma tool call — perde acentuação e trunca o JSON —, então
 * pedidos de reescrita feitos pelo chat passam por aqui para sair com a
 * qualidade da produção (acentos, parágrafos e tamanho de página corretos).
 */
function runPageRewrite(
  userId: string,
  articleId: string,
  plan: string,
  title: string,
  request: { pagina: number; instruction: string },
) {
  const toolCallId = `pgrewrite-${generateId()}`;
  return createUIMessageStream({
    execute: async ({ writer }) => {
      let ok = true;
      let result: string;
      let finalContent = "";
      try {
        const all = await repo.listPages(userId, articleId);
        const current = all.find((p) => p.page_number === request.pagina);
        const ordered = [...all].sort((a, b) => a.page_number - b.page_number);
        const prev = ordered.filter((p) => p.page_number < request.pagina).pop();
        const next = ordered.find((p) => p.page_number > request.pagina);
        const prompt = [
          `PLANO APROVADO:\n${plan}`,
          title ? `TÍTULO DO ARTIGO (use exatamente este no H1, se houver H1): ${title}` : "",
          prev
            ? `PÁGINA ANTERIOR (${prev.page_number}) — mantenha continuidade:\n${prev.content}`
            : "",
          next
            ? `PRÓXIMA PÁGINA (${next.page_number}) — mantenha continuidade:\n${next.content}`
            : "",
          current
            ? `VERSÃO ATUAL DA PÁGINA ${request.pagina} (preserve o que o pesquisador não pediu para mudar):\n${current.content}`
            : "",
          `PEDIDO DO PESQUISADOR: ${request.instruction}`,
          `Reescreva agora a PÁGINA ${request.pagina}, em Markdown, com acentuação correta do português e parágrafos separados por linha em branco. Siga o pedido ao pé da letra (se pedir um Resumo de 5 a 7 linhas, escreva exatamente isso). NÃO acrescente parágrafos genéricos de encerramento ("Além disso, é fundamental considerar…", "A contribuição principal deste ensaio é…"): termine quando o conteúdo pedido acabar.`,
        ]
          .filter(Boolean)
          .join("\n\n");
        finalContent = normalizePageText(await generateFinalText(prompt, PAGE_INSTRUCTIONS));
        if (countWords(stripMarkers(finalContent)) < MIN_PAGE_WORDS) {
          const retryPrompt = `${prompt}\n\nATENÇÃO: a versão anterior ficou curta demais (menos de ${MIN_PAGE_WORDS} palavras). Escreva novamente a PÁGINA ${request.pagina} com pelo menos ${MIN_PAGE_WORDS} palavras, em 4 a 6 parágrafos separados por linha em branco, sem repetir ideias.`;
          const retry = normalizePageText(await generateFinalText(retryPrompt, PAGE_INSTRUCTIONS));
          finalContent = pickLongerText(finalContent, retry);
        }
        await repo.upsertPage(
          userId,
          articleId,
          request.pagina,
          finalContent,
          current?.status ?? "draft",
        );
        result = `Página ${request.pagina} reescrita (${countWords(stripMarkers(finalContent))} palavras).`;
      } catch (error) {
        ok = false;
        result = error instanceof Error ? error.message : "Não foi possível reescrever a página.";
      }

      writer.write({
        type: "tool-input-available",
        toolCallId,
        toolName: "editar_pagina",
        input: { pagina: request.pagina, conteudo: finalContent },
      });
      writer.write(
        ok
          ? { type: "tool-output-available", toolCallId, output: result }
          : { type: "tool-output-error", toolCallId, errorText: result },
      );

      const textId = generateId();
      const delta = ok
        ? `Feito — página ${request.pagina} reescrita com a qualidade da produção.`
        : `Não consegui reescrever a página ${request.pagina}.`;
      writer.write({ type: "text-start", id: textId });
      writer.write({ type: "text-delta", id: textId, delta });
      writer.write({ type: "text-end", id: textId });

      await repo.addMessage(userId, articleId, "assistant", [{ type: "text", text: delta }]);
      await repo.updateArticle(userId, articleId, {});
    },
    onError: () => "Não foi possível reescrever a página. Tente novamente.",
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
      : `${WRITING_CHAT_INSTRUCTIONS}\n\nPLANO:\n${article.plan ?? ""}${await documentContext(
          user.id,
          article.id,
        )}`;

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

    // Pedido de REESCRITA sem conteúdo literal ("reescreva a página 1 acrescentando
    // um resumo"): reescrevemos pelo motor de produção (texto puro), que preserva
    // acentuação e tamanho de página — o JSON de tool call degradaria o texto.
    const rewrite = parseRewriteRequest(lastUserText ?? "");
    if (rewrite)
      return createUIMessageStreamResponse({
        stream: runPageRewrite(
          user.id,
          article.id,
          article.plan ?? "",
          article.title ?? "",
          rewrite,
        ),
      });
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
    "definir_orcid",
  ]);
  const forcedTool =
    article.phase === "interview" ? (forced && interviewTools.has(forced) ? forced : null) : forced;
  const modelMessages = await convertToModelMessages(sanitized);
  // Semeia o filtro anti-repetição com o que o Pracinha JÁ disse no histórico,
  // para ele não repetir, turno após turno, a mesma pergunta ou o mesmo fecho.
  const antiRepeatSeed = collectAssistantSentences(modelMessages);
  let started: ReturnType<typeof startResponses>;
  try {
    started = startResponses(
      request,
      modelMessages,
      instructions,
      undefined,
      buildTools({ userId: user.id, articleId: article.id }),
      forcedTool,
      antiRepeatSeed,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[chat-error] falha ao iniciar a geração:", message);
    return createUIMessageStreamResponse({
      stream: errorTextStream(
        "Não consegui falar com o motor de IA agora. Tente novamente em alguns instantes; se continuar, avise o suporte.",
      ),
    });
  }
  const { result } = started;
  return result.toUIMessageStreamResponse({
    originalMessages: sanitized,
    sendReasoning: true,
    // A cota diária da Workers AI pode esgotar no meio da conversa. Em vez de
    // derrubar o chat, emitimos um marcador que o cliente troca por um aviso
    // amigável ("o Pracinha vai descansar e volta às HH:MM").
    onError: (error) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[chat-error]", message, error instanceof Error ? error.stack : "");
      if (isQuotaError(message)) return QUOTA_MARKER;
      return "Não foi possível concluir a resposta. Tente novamente.";
    },
    onFinish: async ({ responseMessage }) => {
      // Roda DEPOIS de o texto já ter ido para a tela: uma falha aqui não pode
      // derrubar a requisição nem virar erro para o pesquisador. A resposta já
      // está visível; o pior caso é ela não ficar salva.
      try {
        const parts = responseMessage.parts
          .filter((p) => p.type === "text")
          .map((p) => ({
            ...p,
            text: cleanAssistantText(stripLeakedToolCalls(p.text, TOOL_NAMES)),
          }))
          .filter((p) => p.text.trim().length > 0);
        if (!parts.length) return;
        await repo.addMessage(user.id, article.id, "assistant", parts);
        await repo.updateArticle(user.id, article.id, {});
      } catch (error) {
        console.error(
          "[chat-error] resposta entregue, mas não foi salva:",
          error instanceof Error ? error.message : String(error),
        );
      }
    },
  });
}

export const Route = createFileRoute("/api/chat")({
  server: { handlers: { POST: ({ request }) => handle(request) } },
});
