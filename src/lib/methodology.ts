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
