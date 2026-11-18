import { isValidOrcid } from "@/lib/front-matter";
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
const RESEARCH_VERBS = ["pesquis", "busque", "buscar", "procure", "procurar", "encontre", "provoc"];
const ATTACH_VERBS = [
  "anexe",
  "anexar",
  "referencie",
  "cite o anexo",
  "use o anexo",
  "usar o anexo",
];
/** Verbos de LEITURA de anexos ("olhe os documentos", "leia tudo"). */
const READ_VERBS = [
  "leia",
  "ler ",
  "leu",
  "lido",
  "olhe",
  "olha",
  "veja",
  "analis",
  "examine",
  "examin",
  "consulte",
  "confira",
  "acesse",
  "leitura",
];
/** Pedidos de provocação/advogado do diabo: exigem busca de evidência contrária. */
const CHALLENGE_HINTS = [
  "advogado do diabo",
  "objeç",
  "objec",
  "refut",
  "contra-argument",
  "contraargument",
  "contradiz",
  "contrária",
  "contraria",
  "explicação alternativa",
  "explicacao alternativa",
  "provocar minha tese",
];
/** Pedidos de ler TUDO de uma vez (sem citar um anexo específico). */
const READ_ALL_HINTS = ["tudo", "todos", "todas", "os documentos", "os anexos", "os arquivos"];

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

  // ORCID informado pelo pesquisador (16 dígitos, com ou sem separadores). Grava
  // na folha de rosto sem depender de o modelo emitir o tool call. Só dispara se
  // o número passar no dígito verificador: sem isso, uma sequência de anos ou um
  // telefone (ex.: "2021 2022 2023 2024") forçaria a ferramenta por engano.
  const orcidCandidate = text.match(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?[\dx]{4}\b/i)?.[0];
  if (orcidCandidate && isValidOrcid(orcidCandidate)) return "definir_orcid";

  const wantsAppend = has(t, APPEND_VERBS);
  const wantsEdit = has(t, EDIT_VERBS);
  const wantsResearch = has(t, RESEARCH_VERBS);
  const wantsAttach = has(t, ATTACH_VERBS);
  const wantsRead = has(t, READ_VERBS);

  // Provocação/advogado do diabo: precisa buscar evidência real na base.
  if (has(t, CHALLENGE_HINTS)) return "pesquisar_bases";

  // Título: só quando há verbo de edição/renomeação.
  if (wantsEdit && has(t, TITLE_OBJECTS)) return "atualizar_titulo";

  // Anexos: LEITURA vem primeiro. O pesquisador pede para ler/olhar/analisar os
  // documentos ("olhe os anexos", "leia tudo", "e o Anexo 3?"). Sem isso, o
  // modelo narra a leitura como texto e o JSON vaza no chat sem a ferramenta rodar.
  if (wantsRead && has(t, READ_ALL_HINTS)) return "ler_todos_anexos";
  if ((wantsRead || wantsAttach || wantsAppend) && has(t, ATTACH_OBJECTS)) {
    if (has(t, READ_ALL_HINTS) || !/anexo\s*\d/.test(t)) {
      const onlyUse = !has(t, ["anexe", "anexar", "referencie", "cite o anexo"]);
      if (onlyUse || wantsRead) return "ler_todos_anexos";
    }
    if (/anexo\s*\d/.test(t)) return "ler_anexo";
    return "anexar_documento_em_pagina";
  }
  // Pedidos curtos de leitura sem objeto explícito ("leu?", "olhe aí") — só quando
  // a mensagem é curtíssima, para não capturar frases normais ("veja se faz sentido").
  if (
    wantsRead &&
    t.trim().length <= 12 &&
    !has(t, PAGE_OBJECTS) &&
    !has(t, TITLE_OBJECTS) &&
    !has(t, RESEARCH_OBJECTS)
  ) {
    return "ler_todos_anexos";
  }
  // "use o Anexo 3 no artigo" → primeiro LER o anexo; a posição vem depois, com
  // autonomia da IA. Pedidos diretos de inserção ("anexe na página 2") inserem já.
  if (wantsAttach && /anexo\s*\d/.test(t)) return "ler_anexo";

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
