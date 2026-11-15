/**
 * Apresentação das ferramentas que o Pracinha executa no chat. Em vez de mostrar
 * só "pesquisando…", exibimos também o RESULTADO (ex.: as referências achadas nas
 * bases), para o pesquisador ver de onde vieram as citações. Helpers puros e
 * testáveis, separados do componente.
 */

export const TOOL_LABELS: Record<string, string> = {
  pesquisar_bases: "pesquisando bases científicas",
  listar_anexos: "lendo os anexos",
  ler_anexo: "lendo o anexo",
  atualizar_titulo: "alterando o título",
  editar_pagina: "reescrevendo uma página",
  acrescentar_na_pagina: "acrescentando ao documento",
  anexar_documento_em_pagina: "posicionando o anexo",
};

/** Rótulo em gerúndio para a ferramenta; genérico quando o nome é desconhecido. */
export function toolLabel(name: string): string {
  return TOOL_LABELS[name] ?? "alterando o documento";
}

/**
 * Extrai o texto do resultado de uma ferramenta. O AI SDK entrega a saída ora
 * como string, ora como objeto (`{ value }`/`{ text }`, dependendo do provider).
 */
export function toolOutputText(output: unknown): string {
  if (typeof output === "string") return output;
  if (output && typeof output === "object") {
    const candidate = (output as { value?: unknown }).value ?? (output as { text?: unknown }).text;
    if (typeof candidate === "string") return candidate;
  }
  return "";
}

/** A chamada já terminou com sucesso? */
export function toolSucceeded(state: string | undefined): boolean {
  return state === "output-available";
}

/** A chamada terminou com erro? */
export function toolFailed(state: string | undefined): boolean {
  return state === "output-error";
}
