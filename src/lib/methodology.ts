/**
 * Regras puras da Metodologia — sem banco, sem IA, sem React.
 *
 * A metodologia é uma entidade independente do artigo: tem chat e spec próprios
 * e só pode ser acoplada depois de aprovada. As funções abaixo concentram as
 * duas decisões que não podem variar entre servidor e tela:
 *  1. quando a spec entra no prompt de uma página (só `approved` e não vazia);
 *  2. quando um vínculo é permitido (existe, é do mesmo usuário, está aprovada).
 */

export type MethodologyLike = {
  id: string;
  user_id: string;
  status: string;
  content: string | null;
  title?: string;
};

export const METHODOLOGY_STATUS = {
  draft: "draft",
  approved: "approved",
} as const;

export type MethodologyStatus = (typeof METHODOLOGY_STATUS)[keyof typeof METHODOLOGY_STATUS];

/** Seções fixas da spec — a mesma ordem usada por METHODOLOGY_INSTRUCTIONS. */
export const METHODOLOGY_SPEC_SECTIONS = [
  "Tipo de estudo e justificativa",
  "Corpus e fontes",
  "Procedimento analítico",
  "Instrumento analítico",
  "Regras inegociáveis do método",
  "Categoria analítica",
  "Limitações",
] as const;

/**
 * Bloco injetado no prompt de página quando o artigo tem metodologia aprovada.
 * Devolve string vazia quando não há nada a injetar: o comportamento sem spec
 * continua exatamente o de antes.
 */
export function methodologySpecBlock(methodology: MethodologyLike | null | undefined): string {
  if (!methodology) return "";
  if (methodology.status !== METHODOLOGY_STATUS.approved) return "";
  const content = methodology.content?.trim();
  if (!content) return "";
  return [
    "METODOLOGIA APROVADA (spec vinculada)",
    "A spec abaixo foi escrita e aprovada pelo pesquisador ANTES desta página.",
    "Ela é o contrato de método do artigo: não a contrarie nem a reescreva.",
    "",
    content,
  ].join("\n");
}

/**
 * Valida um vínculo artigo ↔ metodologia. Devolve `null` quando pode vincular,
 * ou a mensagem do motivo da recusa (em pt-BR, pronta para a tela).
 */
export function methodologyLinkError(
  methodology: MethodologyLike | null | undefined,
  userId: string,
): string | null {
  if (!methodology) return "Metodologia não encontrada";
  if (methodology.user_id !== userId) return "Esta metodologia não é sua";
  if (methodology.status !== METHODOLOGY_STATUS.approved) {
    return "A metodologia precisa estar aprovada antes de ser vinculada";
  }
  return null;
}

/** Remove acentos, pontuação e caixa para comparar títulos de seção. */
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Palavras que identificam cada seção da spec (aceita variações de título). */
const SECTION_HINTS: Record<(typeof METHODOLOGY_SPEC_SECTIONS)[number], string[]> = {
  "Tipo de estudo e justificativa": ["tipo de estudo", "tipo de pesquisa", "delineamento"],
  "Corpus e fontes": ["corpus", "fontes"],
  "Procedimento analítico": ["procedimento"],
  "Instrumento analítico": ["instrumento"],
  "Regras inegociáveis do método": ["regra"],
  "Categoria analítica": ["categoria"],
  Limitações: ["limitac"],
};

/**
 * Mede quais seções fixas já aparecem na spec. Usado pelo medidor do caderno e
 * pelo botão que leva o cursor à seção. Procura primeiro em títulos de Markdown
 * e, se não achar, no corpo (o pesquisador pode escrever sem `#`).
 */
export function specSectionCoverage(content: string | null | undefined): {
  section: (typeof METHODOLOGY_SPEC_SECTIONS)[number];
  present: boolean;
}[] {
  const raw = content ?? "";
  const headings = raw
    .split("\n")
    .filter((line) => /^\s{0,3}#{1,6}\s/.test(line))
    .map((line) => normalize(line.replace(/^\s*#{1,6}\s*/, "")));
  const body = normalize(raw);
  return METHODOLOGY_SPEC_SECTIONS.map((section) => {
    const hints = SECTION_HINTS[section];
    const inHeading = headings.some((h) => hints.some((hint) => h.includes(hint)));
    const inBody = hints.some((hint) => body.includes(hint));
    return { section, present: inHeading || inBody };
  });
}

/** Quantas das sete seções já estão cobertas (para o medidor do cabeçalho). */
export function specCoverageRatio(content: string | null | undefined): number {
  const coverage = specSectionCoverage(content);
  const present = coverage.filter((c) => c.present).length;
  return present / coverage.length;
}

/**
 * Código estável de protocolo exibido no cabeçalho do caderno (ex.: PROT-3F9A21).
 * Derivado do id, não é um segredo — serve para dar identidade ao documento.
 */
export function methodologyProtocolCode(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return `PROT-${hash.toString(16).toUpperCase().padStart(6, "0").slice(-6)}`;
}

/**
 * Título inicial a partir da semente digitada na home ("Que método você quer
 * usar?"). Sem semente, um padrão honesto — nunca inventa um método.
 */
export function methodologyTitleFromSeed(seed?: string): string {
  const clean = seed?.trim().replace(/\s+/g, " ");
  if (!clean) return "Metodologia sem título";
  return clean.slice(0, 120);
}

/**
 * O modelo leve às vezes continua a transcrição em vez de responder: emenda
 * "PESQUISADOR: …" e passa a inventar falas do pesquisador. Cortamos a resposta
 * no primeiro rótulo de fala que apareça depois do começo e no excesso de
 * tamanho — o turno é uma fala curta, não um diálogo.
 */
const SPEAKER_LABEL =
  /^\s*(?:\*\*)?(?:\[\d+\]\s*)?(pesquisador|sciencechat|assistente|pracinha)(?:\*\*)?\s*[:(]/i;

export function cleanInterviewReply(raw: string, maxChars = 1200): string {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const kept: string[] = [];
  for (const line of lines) {
    if (SPEAKER_LABEL.test(line) && kept.some((l) => l.trim() !== "")) break;
    kept.push(line);
  }
  let text = kept.join("\n").trim();
  text = text.replace(SPEAKER_LABEL, "").trim();
  text = text.replace(/^\*\*(.*?)\*\*\s*[:(]\s*/s, "").trim();
  if (text.length > maxChars) {
    const cut = text.slice(0, maxChars);
    const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("? "), cut.lastIndexOf("! "));
    text = end > maxChars * 0.5 ? cut.slice(0, end + 1) : cut.trimEnd() + "…";
  }
  return text.trim();
}

function normalizeReference(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const REFERENCE_STOPWORDS = new Set([
  "a",
  "o",
  "as",
  "os",
  "de",
  "da",
  "do",
  "das",
  "dos",
  "e",
  "em",
  "para",
  "por",
  "um",
  "uma",
  "metodologia",
  "metodo",
  "use",
  "usar",
  "usa",
  "aplicar",
  "aplica",
  "neste",
  "neste",
  "artigo",
  "essa",
  "esse",
  "esta",
  "este",
]);

/** Palavras que carregam significado no nome da metodologia. */
function referenceTokens(value: string): string[] {
  return normalizeReference(value)
    .split(" ")
    .filter((t) => t.length > 2 && !REFERENCE_STOPWORDS.has(t));
}

/**
 * Resolve "use a metodologia X" para uma das metodologias do pesquisador.
 * Aceita o código do protocolo, o título exato ou o nome por partes ("a de
 * eugenia burocrática"). Quando mais de uma casa com o pedido, devolve
 * candidatos em vez de escolher sozinho.
 */
export function matchMethodologyReference<T extends { id: string; title: string; status: string }>(
  rows: T[],
  reference: string,
): { match: T | null; candidates: T[] } {
  const trimmed = reference.trim();
  const flat = normalizeReference(trimmed);
  if (!flat) return { match: null, candidates: [] };

  const byId = rows.find((r) => r.id.toLowerCase() === trimmed.toLowerCase());
  if (byId) return { match: byId, candidates: [] };

  const entries = rows.map((row) => ({
    row,
    title: normalizeReference(row.title),
    code: normalizeReference(methodologyProtocolCode(row.id)),
    titleTokens: new Set(referenceTokens(row.title)),
  }));

  const byCode = entries.find((e) => flat.includes(e.code));
  if (byCode) return { match: byCode.row, candidates: [] };

  const exact = entries.find((e) => e.title === flat);
  if (exact) return { match: exact.row, candidates: [] };

  const refTokens = referenceTokens(trimmed);
  const scored = entries
    .map((e) => ({
      row: e.row,
      score: refTokens.length
        ? refTokens.filter((t) => e.titleTokens.has(t)).length / refTokens.length
        : 0,
    }))
    .filter((e) => e.score >= 0.6)
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  const second = scored[1];
  if (best && (!second || best.score > second.score)) return { match: best.row, candidates: [] };
  return { match: null, candidates: scored.slice(0, 4).map((e) => e.row) };
}

const METHODOLOGY_COMMAND =
  /(?:^|\b)(?:use|usar|usa|aplica|aplicar|acopla|acoplar|acople|vincula|vincular|vincule|adota|adotar)\b[^.!?\n]{0,40}?\bmetodologia\b\s*(?:de|do|da|dos|das|:)?\s*([^.!?\n]{3,120})/i;

/**
 * Lê o comando "use a metodologia X" no chat do artigo. Aplicado no servidor,
 * sem depender de o modelo emitir o tool call (o modelo leve narra a ação em vez
 * de chamar a ferramenta).
 */
export function parseMethodologyCommand(text: string): string | null {
  const match = METHODOLOGY_COMMAND.exec(text.trim());
  if (!match) return null;
  const ref = (match[1] ?? "")
    .replace(/^(?:a|o|as|os)\s+/i, "")
    .replace(/["“”'«»]/g, "")
    .replace(/[.,;:!?]+$/, "")
    .trim();
  return referenceTokens(ref).length > 0 ? ref : null;
}

const METHODOLOGY_SECTION_HEADING = /^#{1,3}[ \t]*(?:\d+\.?[ \t]*)?Metodologia\b[^\n]*$/gim;

/**
 * Recorta a seção de Metodologia de uma página do artigo, do título até o
 * próximo título de nível igual ou superior. Usado para importar a redação
 * original do pesquisador como fonte da spec.
 */
export function methodologySectionText(content: string): string | null {
  const heading = new RegExp(METHODOLOGY_SECTION_HEADING.source, "im").exec(content);
  if (!heading) return null;
  const level = (heading[0].match(/^#+/) ?? ["#"])[0].length;
  const after = content.slice(heading.index + heading[0].length);
  const next = new RegExp(`^#{1,${level}}[ \\t]\\S`, "m").exec(after);
  const body = next ? after.slice(0, next.index) : after;
  return `${heading[0]}\n${body}`.trim();
}

const META_ANYWHERE =
  /^(?:isso me faz pensar|pelo que entendi|ao que parece|parece que voc|ou seja|resumindo|isso indica que|em outras palavras|nesse sentido, voc)/i;

const ECHO_SENTENCE =
  /^(?:entendi|perfeito|ótimo|otimo|certo|compreendi|excelente|interessante|beleza|ok\b|bom\b|isso me faz pensar|pelo que entendi|ao que parece|parece que|ou seja|resumindo|voc[eê]\s+(?:está|esta|estava|quer|pretende|vai|busca)(?:\s|$))/i;

/**
 * O modelo leve abre todo turno com "Entendi que você…", devolve a fala do
 * pesquisador em outras palavras ("Você está considerando…") e às vezes emenda
 * duas perguntas. Isso deixa o registro ilegível. Cortamos essas aberturas e as
 * perguntas extras, preservando a pergunta final.
 */
export function cleanMethodologyReply(raw: string): string {
  const text = cleanInterviewReply(raw);
  const sentences = (text.match(SENTENCE) ?? []).map((s) => s.trim()).filter(Boolean);
  let start = 0;
  while (
    start < sentences.length - 1 &&
    start < 3 &&
    !(sentences[start] ?? "").includes("?") &&
    ECHO_SENTENCE.test(sentences[start] ?? "")
  ) {
    start += 1;
  }
  const kept = sentences
    .slice(start)
    .filter((sentence) => !META_ANYWHERE.test(sentence) || sentence.includes("?"));
  const first = kept.findIndex((s) => s.includes("?"));
  if (first < 0) return kept.join(" ").trim();
  // fica com a primeira pergunta; perguntas emendadas depois dela são cortadas
  const tail = kept.slice(first + 1).filter((s) => !s.includes("?"));
  return [...kept.slice(0, first + 1), ...tail].join(" ").trim();
}

const SENTENCE = /[^.!?]+[.!?]+|[^.!?]+$/g;

/** Separa a fala em contexto (o porquê) e a pergunta final, que é o que o pesquisador responde. */
export function splitMethodReply(text: string): { context: string; question: string } {
  const sentences = (text.match(SENTENCE) ?? []).map((s) => s.trim()).filter(Boolean);
  const index = sentences.map((s) => s.includes("?")).lastIndexOf(true);
  if (index <= 0) return { context: "", question: text.trim() };
  return {
    context: sentences.slice(0, index).join(" ").trim(),
    question: sentences.slice(index).join(" ").trim(),
  };
}
