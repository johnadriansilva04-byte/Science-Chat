/**
 * Interpreta comandos de edição do documento escritos em linguagem natural e os
 * converte em uma operação determinística sobre uma página.
 *
 * Motivo: o llama-3.3 no Workers AI frequentemente NARRA a chamada ("vou usar a
 * ferramenta…") ou responde em prosa ("Qual é o próximo passo?") em vez de emitir
 * um tool call estruturado — e o provider só "salva" chamadas vazadas no caminho
 * não-streaming. Resultado prático: a página nunca muda e o assistente afirma que
 * mudou. Para o pesquisador não ter de nomear a ferramenta, o servidor reconhece
 * o pedido e aplica a mudança diretamente, de forma confiável.
 *
 * A heurística é deliberadamente estreita: só dispara quando há (a) intenção clara
 * de editar/acrescentar, (b) número de página explícito e (c) um CONTEÚDO LITERAL
 * delimitado ("com a palavra exata: X", "adicione exatamente: X", "conteúdo: X").
 * Sem conteúdo literal (ex.: "reescreva do zero em 120 palavras"), devolve null e
 * o fluxo normal de IA assume.
 */

export type PageCommand = {
  action: "edit" | "append";
  pagina: number;
  conteudo: string;
};

const PAGE_RE = /(?:p[áa]gina|page)\s*=?\s*(\d+)/i;
const EDIT_TOOL_RE = /editar_pagina/i;
const APPEND_TOOL_RE = /acrescentar_na_pagina/i;
const EDIT_VERBS =
  /(?:reescrev|edit|substitu|troqu|corrij|corrig|alter|atualiz|mude|muda|deixe|defina|\bset\b)/i;
const APPEND_VERBS = /(?:acrescent|adicion|insir|inser|inclu|coloque|complement)/i;

/** Delimitadores do conteúdo literal. `wordish` remove pontuação final (é 1 palavra). */
const DELIMITERS: { re: RegExp; wordish?: boolean }[] = [
  { re: /(?:a\s+)?palavra\s+exata\s*:\s*/i, wordish: true },
  { re: /exact\s+word\s*:\s*/i, wordish: true },
  { re: /(?:a\s+)?palavra\s*:\s*/i, wordish: true },
  { re: /(?:a\s+)?frase\s+exata\s*:\s*/i },
  { re: /exact\s+(?:phrase|text)\s*:\s*/i },
  { re: /(?:o\s+)?texto\s+exato\s*:\s*/i },
  { re: /(?:o\s+)?texto\s*:\s*/i },
  { re: /exatamente\s*:\s*/i },
  { re: /conte[uú]do\s*(?:=|:)\s*/i },
  { re: /(?:adicione|acrescente|insira|inclua|coloque)\s*:\s*/i },
  { re: /(?:para\s+o\s+texto|com\s+o\s+texto)\s*:\s*/i },
];

/** Remove instruções de rodapé ("Use a ferramenta …", "Use the tool …"). */
function stripTrailingMeta(text: string): string {
  return text
    .replace(/\s*(?:^|\s)use\s+(?:a\s+ferramenta|the\s+tool)\b[\s\S]*$/i, "")
    .replace(/\s*(?:^|\s)use\s+(?:editar_pagina|acrescentar_na_pagina)\b[\s\S]*$/i, "")
    .trim();
}

function extractLiteral(text: string): { conteudo: string; wordish: boolean } | null {
  let best: { index: number; conteudo: string; wordish: boolean } | null = null;
  for (const { re, wordish } of DELIMITERS) {
    const m = re.exec(text);
    if (!m) continue;
    const start = m.index + m[0].length;
    const payload = stripTrailingMeta(text.slice(start).trim());
    if (!payload) continue;
    if (best === null || m.index < best.index) {
      best = { index: m.index, conteudo: payload, wordish: Boolean(wordish) };
    }
  }
  if (!best) return null;
  let conteudo = best.conteudo;
  if (best.wordish) conteudo = conteudo.replace(/[.;!?]+\s*$/, "").trim();
  // Placeholders (<…>, […]) são instruções, não conteúdo literal: não aplicar.
  if (/^[<[].*[>\]]\.?$/.test(conteudo)) return null;
  if (!conteudo) return null;
  return { conteudo, wordish: best.wordish };
}

/**
 * Devolve o comando de página reconhecido, ou null quando não há conteúdo literal
 * inequívoco a aplicar.
 */
export function parsePageCommand(text: string): PageCommand | null {
  const t = text.trim();
  if (!t || t.length > 1200) return null;

  const pageMatch = PAGE_RE.exec(t);
  if (!pageMatch) return null;
  const pagina = Number.parseInt(pageMatch[1]!, 10);
  if (!Number.isInteger(pagina) || pagina < 1) return null;

  const literal = extractLiteral(t);
  if (!literal) return null;

  // A menção explícita da ferramenta vence; senão, o verbo decide (edição > acréscimo).
  let action: "edit" | "append";
  if (APPEND_TOOL_RE.test(t)) action = "append";
  else if (EDIT_TOOL_RE.test(t)) action = "edit";
  else if (EDIT_VERBS.test(t)) action = "edit";
  else if (APPEND_VERBS.test(t)) action = "append";
  else return null;

  return { action, pagina, conteudo: literal.conteudo };
}

export type RewriteRequest = { pagina: number; instruction: string };

const REWRITE_VERBS =
  /(?:reescrev|refa[çz]|reescrita|regener|melhor\w*\s+(?:a\s+)?p[áa]gina|aprimor\w*\s+(?:a\s+)?p[áa]gina|revis\w*\s+(?:a\s+)?p[áa]gina)/i;

/**
 * Detecta um pedido de REESCRITA de página em linguagem natural, SEM conteúdo
 * literal ("reescreva a página 1 acrescentando um resumo", "melhore a página 3").
 * Nesses casos o conteúdo tem de ser GERADO pela IA (não é literal), então o
 * chamador usa o motor de produção em vez do comando determinístico.
 */
export function parseRewriteRequest(text: string): RewriteRequest | null {
  const t = text.trim();
  if (!t || t.length > 800) return null;
  const page = PAGE_RE.exec(t);
  if (!page || !REWRITE_VERBS.test(t)) return null;
  const pagina = Number.parseInt(page[1]!, 10);
  if (!Number.isInteger(pagina) || pagina < 1) return null;
  return { pagina, instruction: t };
}
