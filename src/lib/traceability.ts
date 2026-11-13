/**
 * Matriz de rastreabilidade científica. Liga cada afirmação do pesquisador às
 * evidências documentais que a sustentam, distinguindo SEMPRE três coisas:
 *
 *   1. o que o pesquisador afirma            (a afirmação e sua categoria);
 *   2. o que os documentos demonstram        (o trecho localizado e o grau);
 *   3. o que permanece sem comprovação        (o estado da verificação).
 *
 * Regra inegociável: a AUSÊNCIA de documento NÃO significa falsidade. Por isso
 * "não localizada" nunca vira "falsa"; no máximo "não verificável com os
 * materiais apresentados".
 */

/** Categoria científica de uma afirmação. */
export type ClaimCategory =
  "tese" | "hipotese" | "resultado" | "metodo" | "dado" | "citacao" | "contribuicao" | "declaracao";

/** Estado da verificação de uma afirmação. */
export type ClaimState =
  | "sustentada"
  | "parcialmente_sustentada"
  | "indiretamente_sustentada"
  | "nao_localizada"
  | "contradita"
  | "nao_verificavel"
  | "declarada"
  | "hipotese_em_investigacao"
  | "contribuicao_original"
  | "aguardando_validacao";

/** Grau de correspondência entre a afirmação e o trecho localizado. */
export type MatchDegree = "direta" | "parcial" | "indireta" | "nenhuma";

export const CLAIM_CATEGORIES: { id: ClaimCategory; label: string }[] = [
  { id: "tese", label: "Tese" },
  { id: "hipotese", label: "Hipótese" },
  { id: "resultado", label: "Resultado" },
  { id: "metodo", label: "Procedimento/método" },
  { id: "dado", label: "Dado" },
  { id: "citacao", label: "Citação/obra" },
  { id: "contribuicao", label: "Contribuição original" },
  { id: "declaracao", label: "Declaração" },
];

export const CLAIM_STATES: { id: ClaimState; label: string }[] = [
  { id: "sustentada", label: "Diretamente sustentada" },
  { id: "parcialmente_sustentada", label: "Parcialmente sustentada" },
  { id: "indiretamente_sustentada", label: "Indiretamente sustentada" },
  { id: "nao_localizada", label: "Não localizada nos documentos" },
  { id: "contradita", label: "Contradita por evidência disponível" },
  { id: "nao_verificavel", label: "Não verificável com os materiais apresentados" },
  { id: "declarada", label: "Informação declarada pelo pesquisador" },
  { id: "hipotese_em_investigacao", label: "Hipótese em investigação" },
  { id: "contribuicao_original", label: "Contribuição teórica original" },
  { id: "aguardando_validacao", label: "Aguardando validação" },
];

export function categoryLabel(id: ClaimCategory): string {
  return CLAIM_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export function stateLabel(id: ClaimState): string {
  return CLAIM_STATES.find((s) => s.id === id)?.label ?? id;
}

/** Categorias que NÃO exigem comprovação documental direta. */
export function exemptFromEvidence(category: ClaimCategory): boolean {
  return category === "hipotese" || category === "contribuicao" || category === "tese";
}

/** Palavras significativas (sem acento, minúsculas, > 4 letras, sem stopwords). */
const STOPWORDS = new Set([
  "sobre",
  "entre",
  "tambem",
  "ainda",
  "porque",
  "quando",
  "onde",
  "todos",
  "todas",
  "para",
  "pelo",
  "pela",
  "seus",
  "suas",
  "como",
  "mais",
  "menos",
  "muito",
  "pode",
  "deve",
  "seria",
  "foram",
  "serao",
  "esse",
  "essa",
  "isso",
  "este",
  "esta",
  "aquilo",
  "nao",
  "sim",
  "cada",
  "qual",
  "quais",
  "seja",
  "apos",
  "antes",
  "durante",
]);

export function significantTokens(text: string): Set<string> {
  const normalized = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const tokens = normalized.match(/[a-z0-9]{5,}/g) ?? [];
  return new Set(tokens.filter((t) => !STOPWORDS.has(t)));
}

/** Fração dos termos da afirmação presentes no documento (0–1). */
export function overlapRatio(claim: string, document: string): number {
  const claimTokens = significantTokens(claim);
  if (claimTokens.size === 0) return 0;
  const docTokens = significantTokens(document);
  let hits = 0;
  for (const token of claimTokens) if (docTokens.has(token)) hits += 1;
  return hits / claimTokens.size;
}

/** Melhor trecho (frase) do documento para uma afirmação, com sua pontuação. */
export function bestExcerpt(claim: string, document: string): { excerpt: string; ratio: number } {
  const sentences = document
    .split(/(?<=[.!?])\s+|\n{2,}/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);
  let best = "";
  let bestRatio = 0;
  for (const sentence of sentences) {
    const ratio = overlapRatio(claim, sentence);
    if (ratio > bestRatio) {
      bestRatio = ratio;
      best = sentence;
    }
  }
  return { excerpt: best.slice(0, 400), ratio: bestRatio };
}

/** Grau de correspondência a partir da fração de termos coincidentes. */
export function matchDegree(ratio: number): MatchDegree {
  if (ratio >= 0.7) return "direta";
  if (ratio >= 0.4) return "parcial";
  if (ratio >= 0.2) return "indireta";
  return "nenhuma";
}

export function matchDegreeLabel(id: MatchDegree): string {
  return { direta: "Direta", parcial: "Parcial", indireta: "Indireta", nenhuma: "Não localizada" }[
    id
  ];
}

/**
 * Estado da verificação de uma afirmação. Quando o grau é "nenhuma" o estado
 * NUNCA é "falsa": se a categoria dispensa prova (hipótese/tese/contribuição),
 * registra-se como tal; caso contrário, "não localizada" ou "não verificável"
 * (quando não há documento algum associado).
 */
export function claimStateFor(input: {
  category: ClaimCategory;
  degree: MatchDegree;
  hasDocument: boolean;
  contradicted?: boolean;
}): ClaimState {
  const { category, degree, hasDocument, contradicted = false } = input;
  if (contradicted) return "contradita";
  if (degree === "direta") return "sustentada";
  if (degree === "parcial") return "parcialmente_sustentada";
  if (degree === "indireta") return "indiretamente_sustentada";
  if (category === "hipotese") return "hipotese_em_investigacao";
  if (category === "contribuicao") return "contribuicao_original";
  if (category === "tese") return "declarada";
  return hasDocument ? "nao_localizada" : "nao_verificavel";
}

const CONTRADICTION_PAIRS: [RegExp, RegExp][] = [
  [/\baument\w*/i, /\b(redu|diminu|queda|decresc)\w*/i],
  [/\b(redu|diminu|queda|decresc)\w*/i, /\baument\w*/i],
  [/\bsignificativ\w*/i, /\bn[ãa]o\s+significativ\w*/i],
  [/\bpositiv\w*/i, /\bnegativ\w*/i],
];

/**
 * Sinal simples de contradição: a afirmação e o trecho apontam direções opostas
 * para o mesmo fenômeno (ex.: "aumento" na afirmação, "redução" no documento).
 * É uma pista para revisão humana, nunca um veredito automático.
 */
export function looksContradicted(claim: string, excerpt: string): boolean {
  return CONTRADICTION_PAIRS.some(([a, b]) => a.test(claim) && b.test(excerpt));
}

export type ClaimLike = {
  id: string;
  seq: number;
  text: string;
  category: ClaimCategory;
  state: ClaimState;
  source_question: string | null;
  limitations: string | null;
};

export type EvidenceLike = {
  claim_id: string;
  document_id: string | null;
  location: string | null;
  excerpt: string | null;
  match_degree: MatchDegree | null;
  state: string;
};

export type MatrixRow = {
  claim: ClaimLike;
  evidence: EvidenceLike[];
};

/** Monta a matriz (afirmações + evidências) na ordem estável de numeração. */
export function buildMatrix(claims: ClaimLike[], evidence: EvidenceLike[]): MatrixRow[] {
  const byClaim = new Map<string, EvidenceLike[]>();
  for (const e of evidence) {
    const list = byClaim.get(e.claim_id);
    if (list) list.push(e);
    else byClaim.set(e.claim_id, [e]);
  }
  return [...claims]
    .sort((a, b) => a.seq - b.seq)
    .map((claim) => ({ claim, evidence: byClaim.get(claim.id) ?? [] }));
}

/** Contagem por estado, para o resumo da matriz. */
export function stateCounts(rows: MatrixRow[]): Record<ClaimState, number> {
  const counts = Object.fromEntries(CLAIM_STATES.map((s) => [s.id, 0])) as Record<
    ClaimState,
    number
  >;
  for (const row of rows) counts[row.claim.state] = (counts[row.claim.state] ?? 0) + 1;
  return counts;
}

/** Classifica a categoria provável de uma afirmação pelo seu texto. */
export function guessCategory(text: string): ClaimCategory {
  const t = text.toLowerCase();
  if (/\b(hip[óo]tese|suposi[çc][ãa]o|supõe|acredit\w+ que)\b/.test(t)) return "hipotese";
  if (/\b(resultado|observ\w+|verificou|apresentou|aument\w+|redu\w+|med\w+)\b/.test(t))
    return "resultado";
  if (
    /\b(amostra|coleta|instrumento|procedimento|metod\w+|entrevista|question[áa]rio|simula\w+)\b/.test(
      t,
    )
  )
    return "metodo";
  if (/\b(dados?|planilha|tabela|s[ée]rie|censo|dataset)\b/.test(t)) return "dado";
  if (/\b(segundo|conforme|de acordo com|autor|obra|cita)\b/.test(t)) return "citacao";
  if (/\b(contribui\w+|original|in[ée]dit|prop[õo]e|argument\w+)\b/.test(t)) return "contribuicao";
  if (/\b(defendo|sustento|minha tese|argumento central)\b/.test(t)) return "tese";
  return "declaracao";
}

/**
 * Extrai afirmações candidatas das respostas da entrevista. Só considera
 * respostas com conteúdo real (não "pular"/"não sei") e longas o suficiente
 * para conter uma afirmação. É uma heurística transparente: o pesquisador pode
 * editar a categoria e o texto.
 */
export function extractClaims(
  notes: { question: string; answer: string }[],
): { text: string; category: ClaimCategory; question: string }[] {
  const skip = /^(pular|n[ãa]o se aplica|ainda n[ãa]o sei|quero responder depois)/i;
  const out: { text: string; category: ClaimCategory; question: string }[] = [];
  for (const note of notes) {
    const answer = note.answer.trim();
    if (!answer || skip.test(answer)) continue;
    // Uma resposta longa pode conter várias afirmações; separa por frase final.
    const sentences = answer
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.split(/\s+/).length >= 6);
    if (!sentences.length) continue;
    for (const sentence of sentences.slice(0, 4)) {
      out.push({
        text: sentence.slice(0, 600),
        category: guessCategory(sentence),
        question: note.question,
      });
    }
  }
  return out;
}
