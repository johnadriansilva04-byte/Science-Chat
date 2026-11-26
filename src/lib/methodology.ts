/**
 * Metodologias do pesquisador. A fórmula é DADO: o sistema não conhece "A + B¹/B₂
 * = D" como código fixo — ele lê a fórmula, a legenda de cada símbolo e as
 * instruções de estrutura e monta o bloco que a IA deve obedecer. Assim, o
 * pesquisador pode criar a metodologia que quiser e obter o mesmo rigor.
 *
 * Este módulo é puro (sem D1/Workers) para poder ser testado isoladamente.
 */
export type MethodologySymbol = { symbol: string; meaning: string };

export type Methodology = {
  id: string;
  name: string;
  description: string | null;
  formula: string;
  legend: MethodologySymbol[];
  structureHint: string | null;
};

/** Metodologia de referência: a mesma construída à mão no artigo publicado. */
export const DEFAULT_FORMULA = "A + B¹/B₂ = D";

export const DEFAULT_LEGEND: MethodologySymbol[] = [
  { symbol: "A", meaning: "realidade factual" },
  { symbol: "B¹", meaning: "tese ou prova apresentada pelo pesquisador" },
  { symbol: "B₂", meaning: "resposta ou omissão do Estado" },
  { symbol: "D", meaning: "decisão ou desfecho do caso" },
];

export const DEFAULT_STRUCTURE_HINT = `1. Seções expositivas: apresentam a realidade factual (A) e o problema.
2. Página/bloco próprio da fórmula, com a legenda posicional logo abaixo.
3. Seções de confronto: em cada uma, a tese/prova (B¹) enfrenta a resposta/omissão (B₂) sobre a mesma realidade (A), até a decisão (D).
4. Subseção de replicação/aplicação prática com exemplos reais do corpus documental.
5. Fechamento: "Do histórico documental à próxima manifestação", ligando as provas ao desfecho.`;

/** Nome padrão do fechamento obrigatório (a estrutura do usuário pode trocá-lo). */
export const CLOSING_SECTION = "Do histórico documental à próxima manifestação";

const SUBSCRIPT_TO_DIGIT: Record<string, string> = {
  "₀": "0",
  "₁": "1",
  "₂": "2",
  "₃": "3",
  "₄": "4",
  "₅": "5",
  "₆": "6",
  "₇": "7",
  "₈": "8",
  "₉": "9",
  "⁰": "0",
  "¹": "1",
  "²": "2",
  "³": "3",
  "⁴": "4",
  "⁵": "5",
  "⁶": "6",
  "⁷": "7",
  "⁸": "8",
  "⁹": "9",
};

/** Torna símbolos equivalentes comparáveis: "B¹" e "B1" viram "B1". */
export function normalizeSymbol(symbol: string): string {
  return symbol
    .trim()
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉]/g, (ch) => SUBSCRIPT_TO_DIGIT[ch] ?? ch)
    .replace(/\s+/g, "")
    .toUpperCase();
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function symbolFromEntry(symbol: unknown, meaning: unknown): MethodologySymbol | null {
  const name = clean(symbol);
  const text = clean(meaning);
  if (!name) return null;
  return { symbol: name, meaning: text };
}

/** Aceita `[{symbol, meaning}]`, array de "A = ..." ou objeto {A: "..."}. */
function symbolsFromJson(parsed: unknown): MethodologySymbol[] {
  const out: MethodologySymbol[] = [];
  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      if (typeof item === "string") {
        const parsedLine = parseLegendLine(item);
        if (parsedLine) out.push(parsedLine);
        continue;
      }
      if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        const entry = symbolFromEntry(
          obj["symbol"] ?? obj["simbolo"] ?? obj["sigla"],
          obj["meaning"] ?? obj["significado"] ?? obj["descricao"] ?? obj["description"],
        );
        if (entry) out.push(entry);
      }
    }
    return out;
  }
  if (parsed && typeof parsed === "object") {
    for (const [symbol, meaning] of Object.entries(parsed as Record<string, unknown>)) {
      const entry = symbolFromEntry(symbol, meaning);
      if (entry) out.push(entry);
    }
  }
  return out;
}

/** Lê uma linha "A = realidade factual" (aceita =, :, —, –). */
function parseLegendLine(line: string): MethodologySymbol | null {
  const text = line.replace(/^\s*[-*•]\s*/, "").trim();
  if (!text) return null;
  const match = /^([^\s=:—–]+)\s*(?:=|:|\s—\s|\s–\s)\s*(.+)$/.exec(text);
  if (!match) return null;
  const entry = symbolFromEntry(match[1], match[2]);
  return entry?.meaning ? entry : null;
}

function symbolsFromText(text: string): MethodologySymbol[] {
  const pieces = text
    .split(/\r?\n|;|·/)
    .map((part) => part.trim())
    .filter(Boolean);
  const out: MethodologySymbol[] = [];
  for (const piece of pieces) {
    const entry = parseLegendLine(piece);
    if (entry) out.push(entry);
  }
  return dedupeSymbols(out);
}

function dedupeSymbols(symbols: MethodologySymbol[]): MethodologySymbol[] {
  const seen = new Set<string>();
  const out: MethodologySymbol[] = [];
  for (const item of symbols) {
    const key = normalizeSymbol(item.symbol);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/**
 * Lê a legenda gravada no banco. Aceita JSON (`[{symbol, meaning}]`) ou texto
 * livre com uma definição por linha ("A = realidade factual"). Nunca lança: uma
 * legenda inválida vira lista vazia, e a metodologia continua utilizável.
 */
export function parseLegend(raw: string | null | undefined): MethodologySymbol[] {
  if (!raw) return [];
  const text = raw.trim();
  if (!text) return [];
  if (text.startsWith("[") || text.startsWith("{")) {
    try {
      const parsed = JSON.parse(text) as unknown;
      return dedupeSymbols(symbolsFromJson(parsed));
    } catch {
      // Parece JSON mas não é: melhor não adivinhar e devolver vazio.
      return [];
    }
  }
  return symbolsFromText(text);
}

/** Serializa a legenda para gravar em `methodologies.legend`. */
export function legendToJson(symbols: MethodologySymbol[]): string {
  return JSON.stringify(dedupeSymbols(symbols));
}

/** "A = realidade factual; B¹ = tese do pesquisador" — para exibir e para o prompt. */
export function formatLegend(symbols: MethodologySymbol[]): string {
  return symbols
    .filter((s) => s.symbol.trim())
    .map((s) => (s.meaning ? `${s.symbol.trim()} = ${s.meaning.trim()}` : s.symbol.trim()))
    .join("; ");
}

/** Símbolos citados na fórmula, na ordem em que aparecem. */
export function symbolsInFormula(formula: string): string[] {
  const matches = formula.match(/[A-Z](?:[⁰¹²³⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉]|\d+)*/g) ?? [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const symbol of matches) {
    const key = normalizeSymbol(symbol);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(symbol);
  }
  return out;
}

/**
 * Símbolos usados na fórmula mas ausentes da legenda. A UI usa isso para avisar
 * o pesquisador antes de aplicar — uma fórmula sem legenda gera texto ambíguo.
 */
export function missingLegendSymbols(formula: string, legend: MethodologySymbol[]): string[] {
  const defined = new Set(legend.map((s) => normalizeSymbol(s.symbol)));
  return symbolsInFormula(formula).filter((s) => !defined.has(normalizeSymbol(s)));
}

function legendLines(symbols: MethodologySymbol[]): string {
  return symbols
    .filter((s) => s.symbol.trim())
    .map((s) => `- ${s.symbol.trim()} = ${s.meaning.trim() || "(sem definição)"}`)
    .join("\n");
}

export type MethodologyPromptInput = Pick<
  Methodology,
  "name" | "formula" | "legend" | "structureHint"
> &
  Partial<Pick<Methodology, "description">>;

type MethodologyBlockInput = MethodologyPromptInput;

/** Converte a linha do banco (legenda em texto/JSON) no formato do prompt. */
export function toPromptMethodology(row: {
  name: string;
  description?: string | null;
  formula: string;
  legend?: string | null;
  structure_hint?: string | null;
}): MethodologyPromptInput {
  return {
    name: row.name,
    description: row.description ?? null,
    formula: row.formula,
    legend: parseLegend(row.legend),
    structureHint: row.structure_hint ?? null,
  };
}

/**
 * Monta o bloco de prompt que ensina a IA a usar a metodologia escolhida. A
 * fórmula e os símbolos vêm do pesquisador; as regras de rigor são as mesmas do
 * artigo de referência da plataforma (harmonia dos símbolos, bloco da fórmula com
 * legenda, replicação com exemplos reais, fechamento e citação com página).
 */
export function buildMethodologyPromptBlock(
  methodology: MethodologyBlockInput | null | undefined,
  options: { stage?: "plan" | "page" } = {},
): string {
  const formula = methodology?.formula?.trim();
  if (!methodology || !formula) return "";

  const symbols = dedupeSymbols(methodology.legend ?? []);
  const symbolList = symbols.map((s) => s.symbol.trim()).filter(Boolean);
  const listed = symbolList.length ? symbolList.join(", ") : "os símbolos da fórmula";
  const structure = methodology.structureHint?.trim();
  const stage = options.stage ?? "page";

  return [
    "METODOLOGIA DO PESQUISADOR — OBRIGATÓRIA (não é sugestão)",
    `Nome: ${methodology.name?.trim() || "metodologia do pesquisador"}`,
    methodology.description?.trim() ? `Descrição: ${methodology.description.trim()}` : "",
    `Fórmula: ${formula}`,
    symbols.length
      ? `Legenda posicional (o que cada símbolo significa):\n${legendLines(symbols)}`
      : "Legenda posicional: (o pesquisador ainda não detalhou os símbolos — siga o sentido dado na fórmula)",
    structure ? `Estrutura pedida pelo pesquisador:\n${structure}` : "",
    "",
    "REGRAS DE USO DA FÓRMULA:",
    `1. Harmonia dos símbolos: use ${listed} em TODAS as seções em que o argumento se repete. Nunca deixe uma seção usar os símbolos e outra narrar o mesmo fato sem eles.`,
    `2. Significado fixo: cada símbolo mantém EXATAMENTE a letra e o significado da legenda do começo ao fim do artigo. Não renomeie, não troque de sinal e não crie símbolo fora da legenda.`,
    "3. Confronto nomeado: todo confronto argumentativo opõe os lados previstos na legenda sobre a MESMA realidade/objeto, nomeando o que cada lado sustenta e qual é o desfecho. Nunca apresente o confronto sem nomear os símbolos.",
    "4. Bloco próprio da fórmula: a fórmula ganha uma página ou bloco próprio, com a legenda posicional logo abaixo, símbolo por símbolo (texto corrido; sem tabelas nem blocos de código).",
    "5. Replicação: inclua uma subseção de replicação/aplicação prática que aplique a fórmula a exemplos reais do corpus documental do artigo (Anexos), nunca a exemplos genéricos.",
    `6. Fechamento obrigatório: encerre com uma seção que conecte a prova documental ao desfecho. Se a estrutura acima nomear essa seção, use o nome exato; senão, use "${CLOSING_SECTION}".`,
    "7. Prova primária: cada afirmação factual deve estar ancorada em fonte primária, com referência à página/seção exata do documento (ex.: [Anexo 2, p. 7]). Sem fonte localizada, marque [PENDENTE: descrição] em vez de inventar dado ou referência.",
    stage === "plan"
      ? "8. No plano, liste as seções já na ordem da fórmula, reserve a página/bloco da fórmula com legenda, a subseção de replicação e o fechamento."
      : "8. Na página que você escrever agora, aplique a fórmula onde a seção pedida exigir e mantenha a continuidade com as páginas aprovadas.",
  ]
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Anexa o bloco da metodologia ao prompt de geração (no-op quando não há metodologia). */
export function withMethodologyPrompt(
  prompt: string,
  methodology: MethodologyBlockInput | null | undefined,
  options: { stage?: "plan" | "page" } = {},
): string {
  const block = buildMethodologyPromptBlock(methodology, options);
  return block ? `${prompt}\n\n${block}` : prompt;
}
