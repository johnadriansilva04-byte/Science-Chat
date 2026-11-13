/**
 * Detecta quando a mensagem do pesquisador pede uma AÇÃO concreta sobre o
 * documento e escolhe qual ferramenta forçar no primeiro passo da geração.
 *
 * Motivo: com histórico longo, o llama-3.3 costuma NARRAR ("vou usar a
 * ferramenta…") em vez de emitir um tool call estruturado, e a ferramenta nunca
 * executa. O provider só recupera chamadas "vazadas como texto" quando a escolha
 * de ferramenta é forçada. Forçar no passo 0 (e só nele) garante a execução; nos
 * passos seguintes o modelo volta ao modo automático para escrever a confirmação.
 *
 * A heurística exige VERBO de ação + OBJETO reconhecível, para não disparar em
 * frases avaliativas ("o título está bom").
 */

const APPEND_VERBS = [
  "acrescent",
  "adicion",
  "insir",
  "inser",
  "coloque",
  "inclu",
  "escreva",
  "adicione",
  "complement",
  "continue",
  "desenvolv",
];
const EDIT_VERBS = [
  "edite",
  "edita",
  "reescrev",
  "corrij",
  "corrig",
  "ajust",
  "alter",
  "atualiz",
  "mude",
  "muda",
  "mudar",
  "troque",
  "troca",
  "trocar",
  "melhore",
  "melhorar",
  "encurt",
  "objetiv",
  "deixe",
  "renomeie",
  "revise",
  "apague",
  "remova",
  "exclua",
  "delete",
];
const RESEARCH_VERBS = ["pesquis", "busque", "buscar", "procure", "procurar", "encontre"];
const ATTACH_VERBS = ["anexe", "anexar", "referencie", "cite o anexo"];

const TITLE_OBJECTS = ["título", "titulo"];
const PAGE_OBJECTS = [
  "página",
  "pagina",
  "parágrafo",
  "paragrafo",
  "trecho",
  "seção",
  "secao",
  "texto",
  "linha",
];
const RESEARCH_OBJECTS = ["literatura", "referência", "referencia", "artigos", "fontes", "estudos"];
const ATTACH_OBJECTS = ["anexo", "documento", "arquivo"];

function has(text: string, list: string[]): boolean {
  return list.some((w) => text.includes(w));
}

/**
 * Retorna o nome da ferramenta a forçar no passo 0, ou null quando não há
 * intenção de ação clara (deixa o modelo decidir livremente).
 */
export function pickForcedTool(text: string): string | null {
  const t = text.toLowerCase();
  if (t.length > 800) return null;

  const wantsAppend = has(t, APPEND_VERBS);
  const wantsEdit = has(t, EDIT_VERBS);
  const wantsResearch = has(t, RESEARCH_VERBS);
  const wantsAttach = has(t, ATTACH_VERBS);

  // Título: só quando há verbo de edição/renomeação.
  if (wantsEdit && has(t, TITLE_OBJECTS)) return "atualizar_titulo";

  // Anexos.
  if ((wantsAttach || wantsAppend) && has(t, ATTACH_OBJECTS)) return "anexar_documento_em_pagina";

  // Pesquisa de literatura.
  if (wantsResearch && (has(t, RESEARCH_OBJECTS) || t.includes("sobre"))) return "pesquisar_bases";

  // Texto em páginas: distinguir acrescentar de editar. Verbos de edição
  // ("reescreva") contêm verbos de acréscimo ("escreva"), então edição vence.
  if (has(t, PAGE_OBJECTS)) {
    if (wantsEdit) return "editar_pagina";
    if (wantsAppend) return "acrescentar_na_pagina";
  }
  if (wantsEdit) return "editar_pagina";
  if (wantsAppend) return "acrescentar_na_pagina";

  return null;
}
