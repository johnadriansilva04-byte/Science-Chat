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

export type StopCategoryId =
  | "nome"
  | "cidade"
  | "animal"
  | "fruta"
  | "cor"
  | "objeto"
  | "comida"
  | "artista"
  | "filme"
  | "time"
  | "marca"
  | "profissao"
  | "sogra"
  | "bebida"
  | "personagem"
  | "jogo"
  | "esporte"
  | "atleta"
  | "pais"
  | "disciplina"
  | "elemento"
  | "cientista";

export type StopCategory = { id: StopCategoryId; label: string; hint: string };

/** As categorias populares do Stop brasileiro, mais as da bancada. */
export const STOP_CATEGORY_LIST: readonly StopCategory[] = [
  { id: "nome", label: "Nome", hint: "Nome próprio de gente" },
  { id: "cidade", label: "Cidade", hint: "Cidade ou capital" },
  { id: "animal", label: "Animal", hint: "Bicho que existe" },
  { id: "fruta", label: "Fruta", hint: "Fruta de verdade" },
  { id: "cor", label: "Cor", hint: "Cor que existe" },
  { id: "objeto", label: "Objeto", hint: "Coisa que cabe em casa" },
  { id: "comida", label: "Comida", hint: "Prato ou lanche" },
  { id: "artista", label: "Artista", hint: "Cantor, ator ou banda" },
  { id: "filme", label: "Filme ou série", hint: "Título que existe" },
  { id: "time", label: "Time", hint: "Clube de futebol" },
  { id: "marca", label: "Marca", hint: "Marca de produto" },
  { id: "profissao", label: "Profissão", hint: "Trabalho de gente" },
  { id: "sogra", label: "Minha sogra é…", hint: "Um adjetivo para a sogra" },
  { id: "bebida", label: "Bebida", hint: "Algo pra beber" },
  { id: "personagem", label: "Personagem", hint: "De desenho, filme ou jogo" },
  { id: "jogo", label: "Jogo", hint: "Jogo ou brincadeira" },
  { id: "esporte", label: "Esporte", hint: "Modalidade esportiva" },
  { id: "atleta", label: "Atleta", hint: "Atleta ou técnico" },
  { id: "pais", label: "País", hint: "País que existe" },
  { id: "disciplina", label: "Matéria da escola", hint: "Disciplina escolar" },
  { id: "elemento", label: "Elemento químico", hint: "Da tabela periódica" },
  { id: "cientista", label: "Cientista", hint: "Quem pesquisou de verdade" },
];

const CATEGORY_BY_ID = new Map(STOP_CATEGORY_LIST.map((category) => [category.id, category]));

export function stopCategory(id: StopCategoryId): StopCategory {
  const found = CATEGORY_BY_ID.get(id);
  if (!found) throw new Error(`Categoria desconhecida: ${id}`);
  return found;
}

export type StopCampaignId = "classico" | "brasil" | "pop" | "esportes" | "bancada";

export type StopCampaign = {
  id: StopCampaignId;
  numeral: string;
  title: string;
  tagline: string;
  subtitle: string;
};

/**
 * Campanhas por tema. Cada uma abre na primeira fase, então a pessoa escolhe
 * por onde quer começar; dentro da campanha a dificuldade cresce fase a fase.
 */
export const STOP_CAMPAIGNS: readonly StopCampaign[] = [
  {
    id: "classico",
    numeral: "I",
    title: "Clássico",
    tagline: "O Stop de sempre",
    subtitle: "Nome, cidade, animal e cor: seis campos que todo mundo sabe responder.",
  },
  {
    id: "brasil",
    numeral: "II",
    title: "Brasil",
    tagline: "Cidade, comida e time",
    subtitle: "Comida típica, artista daqui e time de futebol — o país em seis campos.",
  },
  {
    id: "pop",
    numeral: "III",
    title: "Cultura pop",
    tagline: "Artista, filme e jogo",
    subtitle: "Cantor, série de streaming, personagem e marca que todo mundo conhece.",
  },
  {
    id: "esportes",
    numeral: "IV",
    title: "Esportes",
    tagline: "Time, atleta e jogo",
    subtitle: "Clube, modalidade e atleta de qualquer época. O cronômetro aperta.",
  },
  {
    id: "bancada",
    numeral: "V",
    title: "Bancada",
    tagline: "A versão científica",
    subtitle: "Cientista, elemento e matéria da escola: o Stop com sotaque de laboratório.",
  },
];

export type StopLevel = {
  id: string;
  campaign: StopCampaignId;
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
    id: "cla-1",
    campaign: "classico",
    title: "Rodada de sempre",
    letter: "M",
    seconds: 90,
    categories: ["nome", "cidade", "animal", "fruta", "cor", "objeto"],
    meta: 32,
    brief: "O Stop clássico: seis campos que qualquer pessoa responde sem pensar muito.",
  },
  {
    id: "cla-2",
    campaign: "classico",
    title: "S de sempre",
    letter: "S",
    seconds: 85,
    categories: ["nome", "cidade", "animal", "comida", "cor", "profissao"],
    meta: 36,
    brief: "Fruta sai, comida entra; objeto sai, profissão entra. Cronômetro ligado.",
  },
  {
    id: "cla-3",
    campaign: "classico",
    title: "H de aperto",
    letter: "H",
    seconds: 80,
    categories: ["nome", "cidade", "animal", "fruta", "objeto", "marca"],
    meta: 40,
    brief: "H tem cidade, animal e marca na ponta da língua — mas travar é perder.",
  },
  {
    id: "bra-1",
    campaign: "brasil",
    title: "Brasa",
    letter: "C",
    seconds: 85,
    categories: ["cidade", "comida", "artista", "time", "fruta", "cor"],
    meta: 34,
    brief: "Aqui vale sotaque: comida típica, time de futebol e artista daqui contam.",
  },
  {
    id: "bra-2",
    campaign: "brasil",
    title: "Ginga",
    letter: "G",
    seconds: 80,
    categories: ["cidade", "comida", "artista", "time", "profissao", "objeto"],
    meta: 38,
    brief: "Artista brasileiro conta até apelido conhecido. G pede jogo de cintura.",
  },
  {
    id: "bra-3",
    campaign: "brasil",
    title: "Jejum",
    letter: "J",
    seconds: 75,
    categories: ["cidade", "comida", "artista", "time", "animal", "marca"],
    meta: 40,
    brief: "J tem cidade, comida e time — mas o cronômetro já está correndo.",
  },
  {
    id: "pop-1",
    campaign: "pop",
    title: "Playlist B",
    letter: "B",
    seconds: 80,
    categories: ["artista", "filme", "personagem", "jogo", "marca", "esporte"],
    meta: 36,
    brief: "Vale artista internacional, série de streaming e jogo antigo.",
  },
  {
    id: "pop-2",
    campaign: "pop",
    title: "R de replay",
    letter: "R",
    seconds: 75,
    categories: ["artista", "filme", "personagem", "jogo", "marca", "bebida"],
    meta: 38,
    brief: "Personagem pode ser de desenho, de filme ou de videogame.",
  },
  {
    id: "pop-3",
    campaign: "pop",
    title: "K de cult",
    letter: "K",
    seconds: 70,
    categories: ["artista", "filme", "personagem", "jogo", "marca", "time"],
    meta: 40,
    brief: "K é letra rara: apelido artístico, game asiático e clube valem.",
  },
  {
    id: "esp-1",
    campaign: "esportes",
    title: "Campo F",
    letter: "F",
    seconds: 80,
    categories: ["time", "esporte", "atleta", "jogo", "pais", "objeto"],
    meta: 36,
    brief: "Time de qualquer liga, atleta de qualquer época, jogo de qualquer década.",
  },
  {
    id: "esp-2",
    campaign: "esportes",
    title: "V de vitória",
    letter: "V",
    seconds: 70,
    categories: ["time", "esporte", "atleta", "jogo", "cidade", "marca"],
    meta: 40,
    brief: "Cidade pode ser de fora do país; marca de material esportivo vale.",
  },
  {
    id: "esp-3",
    campaign: "esportes",
    title: "W de wildcard",
    letter: "W",
    seconds: 65,
    categories: ["atleta", "esporte", "jogo", "cidade", "comida", "marca"],
    meta: 42,
    brief: "Letra ingrata: nome estrangeiro, prato e jogo antigo salvam a rodada.",
  },
  {
    id: "ban-1",
    campaign: "bancada",
    title: "Amostra A",
    letter: "A",
    seconds: 85,
    categories: ["cientista", "elemento", "disciplina", "animal", "pais", "cidade"],
    meta: 34,
    brief: "Ciência de escola: Arquimedes, argônio, artes, anta, Argentina, Aracaju.",
  },
  {
    id: "ban-2",
    campaign: "bancada",
    title: "Amostra M",
    letter: "M",
    seconds: 75,
    categories: ["cientista", "elemento", "disciplina", "animal", "pais", "cidade"],
    meta: 38,
    brief: "M tem Marie Curie, magnésio, matemática, macaco e Manaus.",
  },
  {
    id: "ban-3",
    campaign: "bancada",
    title: "Amostra Z",
    letter: "Z",
    seconds: 70,
    categories: ["elemento", "animal", "cidade", "pais", "objeto", "nome"],
    meta: 40,
    brief: "Fechamento: zinco, zebra, Zurique, Zâmbia, zíper — a banca confere.",
  },
];

export const STOP_TOTAL_STARS = STOP_LEVELS.length * 3;

export function stopLevel(id: string): StopLevel | undefined {
  return STOP_LEVELS.find((level) => level.id === id);
}

export function stopLevelIndex(id: string): number {
  return STOP_LEVELS.findIndex((level) => level.id === id);
}

export function levelsOfCampaign(campaign: StopCampaignId): StopLevel[] {
  return STOP_LEVELS.filter((level) => level.campaign === campaign);
}

export function campaignOfLevel(level: StopLevel): StopCampaign {
  const found = STOP_CAMPAIGNS.find((campaign) => campaign.id === level.campaign);
  return found ?? STOP_CAMPAIGNS[0]!;
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
 * Cada campanha abre na primeira fase — a pessoa escolhe o tema — e as
 * seguintes pedem pelo menos uma estrela na fase anterior da mesma campanha.
 */
export function unlockedLevelIds(progress: StopProgressMap): Set<string> {
  const unlocked = new Set<string>();
  STOP_CAMPAIGNS.forEach((campaign) => {
    levelsOfCampaign(campaign.id).forEach((level, index) => {
      if (index === 0) {
        unlocked.add(level.id);
        return;
      }
      const previous = levelsOfCampaign(campaign.id)[index - 1];
      if (previous && (progress[previous.id]?.stars ?? 0) >= 1) unlocked.add(level.id);
    });
  });
  return unlocked;
}

/** Próxima fase a jogar: a primeira aberta que ainda não tem estrela. */
export function nextLevelToPlay(progress: StopProgressMap): StopLevel | null {
  const unlocked = unlockedLevelIds(progress);
  for (const campaign of STOP_CAMPAIGNS) {
    const next = levelsOfCampaign(campaign.id).find(
      (level) => unlocked.has(level.id) && (progress[level.id]?.stars ?? 0) < 1,
    );
    if (next) return next;
  }
  return STOP_LEVELS.find((level) => unlocked.has(level.id)) ?? null;
}

/** Estrelas conquistadas em uma campanha (teto de fases × 3). */
export function campaignStars(progress: StopProgressMap, campaign: StopCampaignId): number {
  return levelsOfCampaign(campaign).reduce(
    (sum, level) => sum + clampInt(progress[level.id]?.stars ?? 0, 0, 3),
    0,
  );
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
export function parseRefereeVerdicts(
  text: string,
  total: number,
): Array<RefereeVerdict | null> | null {
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
