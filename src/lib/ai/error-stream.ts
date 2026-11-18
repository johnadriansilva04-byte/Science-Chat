import { createUIMessageStream, generateId } from "ai";

/**
 * Stream de UI que carrega uma única mensagem de erro amigável.
 *
 * Usado quando a geração não pôde nem COMEÇAR: `startResponses` constrói o modelo
 * antes de abrir o stream e, se o binding `AI` faltar (ou as credenciais
 * REST estiverem incompletas), lança de forma SÍNCRONA. Nesse caso o `onError`
 * do stream nunca roda e o cliente recebe um 500 opaco. Emitir este stream
 * converte a falha em uma resposta 200 com texto que o pesquisador entende.
 */
export function errorTextStream(message: string) {
  return createUIMessageStream({
    execute: ({ writer }) => {
      const textId = generateId();
      writer.write({ type: "text-start", id: textId });
      writer.write({ type: "text-delta", id: textId, delta: message });
      writer.write({ type: "text-end", id: textId });
    },
    onError: () => message,
  });
}
