/**
 * Traduz a falha de um envio do chat em uma reação para a tela.
 *
 * O status HTTP vem em `error.statusCode` (o SDK monta `APICallError` com o
 * status real e o CORPO da resposta em `message`), não como texto "429" na
 * mensagem — procurar o número no texto nunca casava e todo erro virava o mesmo
 * "Não foi possível enviar. Tente de novo.", inclusive sessão expirada.
 *
 * Puro de propósito: a tabela de status é o que o pesquisador lê, então é
 * testável sem montar o chat.
 */
import { isQuotaError, retryAfterFromBody } from "@/lib/ai/quota";

export type ChatErrorAction = { kind: "rest" } | { kind: "toast"; message: string };

export function chatErrorAction(
  message: string | undefined | null,
  statusCode?: number,
): ChatErrorAction {
  const body = message ?? "";

  // Cota diária da Workers AI: o Pracinha descansa e volta sozinho à meia-noite.
  if (body.includes("PRACINHA_QUOTA_EXHAUSTED") || isQuotaError(body)) return { kind: "rest" };

  switch (statusCode) {
    case 401:
      return { kind: "toast", message: "Sua sessão expirou. Entre novamente para continuar." };
    case 404:
      return {
        kind: "toast",
        message: "Este artigo não existe mais. Volte ao início e abra outro.",
      };
    case 402:
      return { kind: "toast", message: "Créditos de IA esgotados." };
    case 429: {
      const wait = retryAfterFromBody(body);
      return {
        kind: "toast",
        message: wait
          ? `Muitas requisições. Tente de novo em ${wait}.`
          : "Muitas requisições. Aguarde um pouco.",
      };
    }
    default:
      return { kind: "toast", message: "Não foi possível enviar. Tente de novo." };
  }
}
