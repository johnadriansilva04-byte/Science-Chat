/**
 * Rede de segurança contra o turno VAZIO na fase de produção.
 *
 * Defeito observado no chat real ("o chat não responde nada"): na fase de
 * escrita o modelo pode gastar todos os passos em ferramentas e terminar sem
 * texto, ou devolver só espaços. A entrevista já tinha essa proteção
 * (`interviewQuestionTransform`), a escrita não — e o pesquisador ficava olhando
 * uma bolha vazia, sem saber se a mensagem tinha sido enviada, se o documento
 * mudou ou se o app travou.
 *
 * Aqui o texto passa ao vivo e, no fim, se NADA foi dito, entra uma frase curta
 * dizendo o que fazer. Diferente da entrevista, a fase de escrita não inventa
 * pergunta: ela confirma o que o pesquisador pediu e devolve o controle.
 *
 * Puro de propósito (só transforma o stream): testável sem o binding `AI`.
 */

import type { TextStreamPart, ToolSet } from "ai";

/** O que dizer quando o turno de escrita não produziu texto nenhum. */
export const EMPTY_REPLY_TEXT =
  "Não escrevi nada neste turno — a resposta saiu vazia. Se o documento não mudou, peça de novo com mais detalhe (por exemplo: “reescreva a página 2 com este texto: …”).";

/**
 * Stream que garante um turno não vazio.
 *
 * A mensagem é genérica de propósito: o texto do turno não diz se o documento
 * mudou (a ferramenta pode ter rodado sem o modelo escrever nada), então o aviso
 * manda o pesquisador conferir a folha em vez de afirmar que nada aconteceu.
 */
export function emptyReplyGuard(
  text: string = EMPTY_REPLY_TEXT,
): TransformStream<TextStreamPart<ToolSet>, TextStreamPart<ToolSet>> {
  let seen = "";
  let lastId = "";

  return new TransformStream<TextStreamPart<ToolSet>, TextStreamPart<ToolSet>>({
    transform(part, controller) {
      if (part.type === "text-delta") {
        lastId = part.id;
        seen += part.text;
      }
      controller.enqueue(part);
    },
    flush(controller) {
      if (seen.trim()) return;
      // Sem nenhum delta de texto antes, a mensagem não tem id para receber o
      // texto: abrimos um bloco novo (mesmo tratamento da entrevista).
      if (!lastId) {
        const id = `empty-reply-guard-${crypto.randomUUID()}`;
        controller.enqueue({ type: "text-start", id });
        controller.enqueue({ type: "text-delta", id, text });
        controller.enqueue({ type: "text-end", id });
        return;
      }
      controller.enqueue({ type: "text-delta", id: lastId, text });
    },
  });
}
