/**
 * Regras da campanha do Stop científico.
 *
 * Tudo aqui é puro (sem banco, sem IA, sem React) para poder ser testado e para
 * que a tela e o servidor cheguem ao mesmo número: a tela mostra a prévia da
 * pontuação, o servidor recalcula ao julgar a rodada.
 *
 * A campanha é uma sequência fixa de fases (letra + tempo + categorias + meta).
 * O acaso não decide nada: a pessoa sabe o que vai enfrentar e o progresso é
 * comparável entre sessões. Quem julga se a resposta existe é a banca (IA), com
 * as regras locais como piso quando a IA não responde.
 */

export type StopCategoryId = "scientist" | "element" | "journal" | "method" | "country" | "lab";

export type StopCategory = { id: StopCategoryId; label: string; hint: string };

export const STOP_CATEGORY_LIST: readonly StopCategory[] = [
  { id: "scientist", label: "Cientista", hint: "Quem pesquisou de verdade" },
  { id: "element", label: "Elemento químico", hint: "Da tabela periódica" },
  { id: "journal", label: "Revista científica", hint: "Periódico que existe" },
  { id: "method", label: "Método", hint: "Procedimento de pesquisa" },
  { id: "country", label: "País", hint: "Estado reconhecido" },
  { id: "lab", label: "Objeto de laboratório", hint: "Peça de bancada" },
];

const ALL_CATEGORIES: StopCategoryId[] = STOP_CATEGORY_LIST.map((c) => c.id);

const CATEGORY_BY_ID: Record<StopCategoryId, StopCategory> = {
  scientist: { id: "scientist", label: "Cientista", hint: "Quem pesquisou de verdade" },
  element: { id: "element", label: "Elemento químico", hint: "Da tabela periódica" },
  journal: { id: "journal", label: "Revista científica", hint: "Periódico que existe" },
  method: { id: "method", label: "Método", hint: "Procedimento de pesquisa" },
  country: { id: "country", label: "País", hint: "Estado reconhecido" },
  lab: { id: "lab", label: "Objeto de laboratório", hint: "Peça de bancada" },
};

export function stopCategory(id: StopCategoryId): StopCategory {
  return CATEGORY_BY_ID[id];
}

export type StopEraId = "observatorio" | "bancada" | "arquivo" | "conselho";

export type StopEra = { id: StopEraId; numeral: string; title: string; subtitle: string };

export const STOP_ERAS: readonly StopEra[] = [
  {
    id: "observatorio",
    numeral: "I",
    title: "Observatório",
    subtitle: "O primeiro turno do telescópio. Letras simples, tempo de sobra.",
  },
  {
    id: "bancada",
    numeral: "II",
    title: "Bancada",
    subtitle: "Bancada limpa, cronômetro ligado. A banca cobra nome certo.",
  },
  {
    id: "arquivo",
    numeral: "III",
    title: "Arquivo",
    subtitle: "Arquivo morto do instituto. Tempo curto, exigência alta.",
  },
  {
    id: "conselho",
    numeral: "IV",
    title: "Conselho",
    subtitle: "A banca está olhando. Só fecha quem entrega rápido e certo.",
  },
];

export type StopLevel = {
  id: string;
  era: StopEraId;
  title: string;
  letter: string;
  seconds: number;
  categories: StopCategoryId[];
  /** Pontuação mínima para a primeira estrela. */
  meta: number;
  brief: string;
};

export const STOP_LEVELS: readonly StopLevel[] = [
  {
    id: "obs-1",
    era: "observatorio",
    title: "Primeiro turno",
    letter: "A",
    seconds: 90,
    categories: ALL_CATEGORIES,
    meta: 35,
    brief: "Aquecimento. Qualquer resposta real vale — nome próprio conta.",
  },
  {
    id: "obs-2",
    era: "observatorio",
    title: "Céu de B",
    letter: "B",
    seconds: 85,
    categories: ALL_CATEGORIES,
    meta: 40,
    brief: "Siglas contam, desde que comecem pela letra e existam de verdade.",
  },
  {
    id: "obs-3",
    era: "observatorio",
    title: "Sem a revista",
    letter: "C",
    seconds: 80,
    categories: ALL_CATEGORIES.filter((c) => c !== "journal"),
    meta: 40,
    brief: "Sem a categoria Revista nesta rodada: cinco campos.",
  },
  {
    id: "ban-1",
    era: "bancada",
    title: "Bancada limpa",
    letter: "D",
    seconds: 80,
    categories: ALL_CATEGORIES,
    meta: 45,
    brief: "A banca cobra o nome certo: sigla não é método.",
  },
  {
    id: "ban-2",
    era: "bancada",
    title: "Precisão",
    letter: "E",
    seconds: 75,
    categories: ALL_CATEGORIES,
    meta: 45,
    brief: "Resposta vaga (\"estudo\", \"experimento\") não passa.",
  },
  {
    id: "ban-3",
    era: "bancada",
    title: "Sem o vidro",
    letter: "F",
    seconds: 70,
    categories: ALL_CATEGORIES.filter((c) => c !== "lab"),
    meta: 42,
    brief: "Sem Objeto de laboratório nesta rodada.",
  },
  {
    id: "arq-1",
    era: "arquivo",
    title: "Caixa G",
    letter: "G",
    seconds: 70,
    categories: ALL_CATEGORIES,
    meta: 50,
    brief: "Revista com G é rara: a banca só aceita periódico que existe.",
  },
  {
    id: "arq-2",
    era: "arquivo",
    title: "Ficha M",
    letter: "M",
    seconds: 65,
    categories: ALL_CATEGORIES,
    meta: 50,
    brief: "Nome estrangeiro conta — vale a primeira letra do nome.",
  },
  {
    id: "arq-3",
    era: "arquivo",
    title: "Pasta P",
    letter: "P",
    seconds: 60,
    categories: ALL_CATEGORIES,
    meta: 55,
    brief: "Cada campo pede uma resposta diferente. Repetir não pontua duas vezes.",
  },
  {
    id: "con-1",
    era: "conselho",
    title: "Arguição",
    letter: "R",
    seconds: 60,
    categories: ALL_CATEGORIES.filter((c) => c !== "journal"),
    meta: 52,
    brief: "Sem Revista: cinco campos, sessenta segundos.",
  },
  {
    id: "con-2",
    era: "conselho",
    title: "Sala S",
    letter: "S",
    seconds: 55,
    categories: ALL_CATEGORIES,
    meta: 58,
    brief: "S tem gente demais na história da ciência. Escolha uma.",
  },
  {
    id: "con-3",
    era: "conselho",
    title: "Tese",
    letter: "T",
    seconds: 50,
    categories: ALL_CATEGORIES,
    meta: 62,
    brief: "Última fase: cinquenta segundos para fechar a expedição.",
  },
];

export const STOP_TOTAL_STARS = STOP_LEVELS.length * 3;

export function stopLevel(id: string): StopLevel | undefined {
  return STOP_LEVELS.find((level) => level.id === id);
}

export function stopLevelIndex(id: string): number {
  return STOP_LEVELS.findIndex((level) => level.id === id);
}

export function levelsOfEra(era: StopEraId): StopLevel[] {
  return STOP_LEVELS.filter((level) => level.era === era);
}

/* ------------------------------------------------------------------ *
 * Normalização e validação local
 * ------------------------------------------------------------------ */

/** Minúsculas, sem acento, sem pontuação nas pontas. "Ácido" e "acido" iguais. */
export function normalizeStopText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const NOT_AN_ANSWER = new Set([
  "nao sei",
  "n a",
  "na",
  "nada",
  "nenhum",
  "nenhuma",
  "sem resposta",
  "passo",
  "pulo",
  "x",
]);

export type StopVerdict = { valid: boolean; reason: string };

/**
 * Piso de validação, sem IA: começa com a letra, tem corpo e não é desistência.
 *
 * Não tenta julgar se "Ada Lovelace" existe — isso é trabalho da banca. Serve
 * para a rodada nunca travar e para a IA não poder aprovar campo em branco.
 */
export function localStopVerdict(answer: string, letter: string): StopVerdict {
  const raw = answer.trim();
  if (!raw) return { valid: false, reason: "Campo em branco." };

  const normalized = normalizeStopText(raw);
  if (!normalized) return { valid: false, reason: "Campo em branco." };
  if (NOT_AN_ANSWER.has(normalized)) return { valid: false, reason: "Isso não é resposta." };
  if (normalized.replace(/\s/g, "").length < 3) {
    return { valid: false, reason: "Curta demais para valer." };
  }
  if (!normalized.startsWith(normalizeStopText(letter))) {
    return { valid: false, reason: `Não começa com ${letter.toUpperCase()}.` };
  }
  return { valid: true, reason: "" };
}

/* ------------------------------------------------------------------ *
 * Pontuação
 * ------------------------------------------------------------------ */

export const STOP_SCORING = {
  perAnswer: 12,
  cleanRound: 18,
  timeBonusMax: 20,
} as const;

export type StopScore = { base: number; clean: number; time: number; total: number };

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

/**
 * Pontuação da rodada. O bônus de tempo usa o que sobrou no cronômetro, então
 * responder rápido e certo vale mais do que responder tudo devagar.
 */
export function scoreStopRound(input: {
  total: number;
  valid: number;
  secondsLeft: number;
  secondsLimit: number;
}): StopScore {
  const total = clampInt(input.total, 0, 12);
  const valid = clampInt(input.valid, 0, total);
  const limit = Math.max(1, clampInt(input.secondsLimit, 1, 600));
  const left = clampInt(input.secondsLeft, 0, limit);

  const base = valid * STOP_SCORING.perAnswer;
  const clean = total > 0 && valid === total ? STOP_SCORING.cleanRound : 0;
  const time = Math.round((left / limit) * STOP_SCORING.timeBonusMax);

  return { base, clean, time, total: base + clean + time };
}

/** Teto teórico da fase — usado nos testes para garantir que 3 estrelas é possível. */
export function maxRoundScore(level: StopLevel): number {
  return scoreStopRound({
    total: level.categories.length,
    valid: level.categories.length,
    secondsLeft: level.seconds,
    secondsLimit: level.seconds,
  }).total;
}

export function starsForScore(score: number, meta: number): 0 | 1 | 2 | 3 {
  if (score >= Math.round(meta * 1.5)) return 3;
  if (score >= Math.round(meta * 1.25)) return 2;
  if (score >= meta) return 1;
  return 0;
}

/** Notas mínimas da fase, na ordem 1★, 2★, 3★. */
export function starThresholds(level: StopLevel): [number, number, number] {
  return [level.meta, Math.round(level.meta * 1.25), Math.round(level.meta * 1.5)];
}

/* ------------------------------------------------------------------ *
 * Progresso, XP e ranking
 * ------------------------------------------------------------------ */

export type StopProgressMap = Record<string, { stars: number; bestScore: number }>;

export function totalStars(progress: StopProgressMap): number {
  return Object.values(progress).reduce((sum, row) => sum + clampInt(row.stars, 0, 3), 0);
}

/** XP = estrelas (peso alto) + melhor pontuação. Rejogar não infla o total. */
export function totalXp(progress: StopProgressMap): number {
  return Object.values(progress).reduce(
    (sum, row) => sum + clampInt(row.stars, 0, 3) * 100 + clampInt(row.bestScore, 0, 999),
    0,
  );
}

export const STOP_RANKS = [
  { at: 0, title: "Calouro" },
  { at: 250, title: "Bolsista de iniciação" },
  { at: 600, title: "Mestrando" },
  { at: 1100, title: "Doutorando" },
  { at: 1800, title: "Pesquisador" },
  { at: 2600, title: "Catedrático" },
] as const;

export type StopRank = {
  title: string;
  index: number;
  nextTitle: string | null;
  nextAt: number | null;
  progress: number;
};

export function stopRank(xp: number): StopRank {
  const value = Math.max(0, xp);
  let index = 0;
  STOP_RANKS.forEach((rank, i) => {
    if (value >= rank.at) index = i;
  });
  const current = STOP_RANKS[index] ?? STOP_RANKS[0];
  const next = STOP_RANKS[index + 1] ?? null;
  const progress = next ? Math.min(1, (value - current.at) / (next.at - current.at)) : 1;
  return {
    title: current.title,
    index,
    nextTitle: next?.title ?? null,
    nextAt: next?.at ?? null,
    progress,
  };
}

/**
 * A primeira fase é livre; as outras abrem com pelo menos uma estrela na
 * anterior. Sem isso a campanha vira uma lista de links e perde a escalada.
 */
export function unlockedLevelIds(progress: StopProgressMap): Set<string> {
  const unlocked = new Set<string>();
  STOP_LEVELS.forEach((level, index) => {
    if (index === 0) {
      unlocked.add(level.id);
      return;
    }
    const previous = STOP_LEVELS[index - 1];
    if (previous && (progress[previous.id]?.stars ?? 0) >= 1) unlocked.add(level.id);
  });
  return unlocked;
}

/** Próxima fase a jogar: a primeira aberta que ainda não tem estrela. */
export function nextLevelToPlay(progress: StopProgressMap): StopLevel | null {
  const unlocked = unlockedLevelIds(progress);
  const pending = STOP_LEVELS.find((level) => unlocked.has(level.id) && (progress[level.id]?.stars ?? 0) < 1);
  if (pending) return pending;
  return STOP_LEVELS.find((level) => unlocked.has(level.id)) ?? null;
}

export function isCampaignComplete(progress: StopProgressMap): boolean {
  return STOP_LEVELS.every((level) => (progress[level.id]?.stars ?? 0) > 0);
}

/* ------------------------------------------------------------------ *
 * Julgamento da banca (IA) — leitura tolerante
 * ------------------------------------------------------------------ */

export type RefereeVerdict = { valid: boolean; reason: string };

/**
 * Lê o JSON da banca. O modelo devolve uma lista indexada; qualquer coisa fora
 * do formato vira `null` naquela posição, e quem chamou completa com as regras
 * locais. Um modelo confuso não pode derrubar a rodada.
 */
export function parseRefereeVerdicts(text: string, total: number): Array<RefereeVerdict | null> | null {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start < 0 || end <= start) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;

  const out: Array<RefereeVerdict | null> = Array.from({ length: total }, () => null);
  let filled = 0;

  parsed.forEach((item, position) => {
    if (!item || typeof item !== "object") return;
    const row = item as Record<string, unknown>;
    const index = typeof row["i"] === "number" ? row["i"] : position;
    if (!Number.isInteger(index) || index < 0 || index >= total) return;
    const flag = typeof row["valida"] === "boolean" ? row["valida"] : row["valid"];
    if (typeof flag !== "boolean") return;
    const reason = typeof row["motivo"] === "string" ? row["motivo"].trim().slice(0, 120) : "";
    out[index] = { valid: flag, reason };
    filled += 1;
  });

  return filled > 0 ? out : null;
}

/** Junta o veredito da IA com o piso local, na ordem das categorias da fase. */
export function mergeVerdicts(
  level: StopLevel,
  answers: string[],
  judged: Array<RefereeVerdict | null> | null,
): RefereeVerdict[] {
  return level.categories.map((_, index) => {
    const local = localStopVerdict(answers[index] ?? "", level.letter);
    const fromAi = judged?.[index] ?? null;
    // A IA não aprova o que o piso local reprova: campo em branco é branco.
    if (!fromAi) return local;
    if (!local.valid) return local;
    return fromAi.valid
      ? { valid: true, reason: fromAi.reason }
      : { valid: false, reason: fromAi.reason || "A banca não reconheceu." };
  });
}

export function scoreFromVerdicts(
  level: StopLevel,
  verdicts: RefereeVerdict[],
  secondsLeft: number,
): StopScore {
  return scoreStopRound({
    total: level.categories.length,
    valid: verdicts.filter((v) => v.valid).length,
    secondsLeft,
    secondsLimit: level.seconds,
  });
}

/* ------------------------------------------------------------------ *
 * Resultado da rodada (contrato entre servidor e tela)
 * ------------------------------------------------------------------ */

export type StopCampaignState = {
  progress: StopProgressMap;
  xp: number;
  stars: number;
  rank: StopRank;
  unlocked: string[];
  nextLevelId: string | null;
};

export type StopRoundResult = {
  score: StopScore;
  stars: number;
  verdicts: StopVerdict[];
  /** `true` quando a banca de IA julgou; `false` quando valeram só as regras locais. */
  judgedByAi: boolean;
  best: { stars: number; bestScore: number };
  xp: number;
  rank: StopRank;
  unlocked: string[];
  nextLevelId: string | null;
};

/** Rodada sem servidor (visita sem conta): só as regras locais julgam. */
export function resolveRoundLocally(
  level: StopLevel,
  answers: string[],
  secondsLeft: number,
): { verdicts: StopVerdict[]; score: StopScore; stars: number } {
  const verdicts = level.categories.map((_, index) =>
    localStopVerdict(answers[index] ?? "", level.letter),
  );
  const score = scoreFromVerdicts(level, verdicts, secondsLeft);
  return { verdicts, score, stars: starsForScore(score.total, level.meta) };
}

/** Estado da campanha a partir de um mapa de progresso (nuvem ou local). */
export function campaignState(progress: StopProgressMap): StopCampaignState {
  const xp = totalXp(progress);
  return {
    progress,
    xp,
    stars: totalStars(progress),
    rank: stopRank(xp),
    unlocked: [...unlockedLevelIds(progress)],
    nextLevelId: nextLevelToPlay(progress)?.id ?? null,
  };
}
