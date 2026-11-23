import { describe, expect, it } from "vitest";

import {
  STOP_LEVELS,
  STOP_SCORING,
  STOP_TOTAL_STARS,
  campaignState,
  isCampaignComplete,
  localStopVerdict,
  maxRoundScore,
  mergeVerdicts,
  nextLevelToPlay,
  normalizeStopText,
  parseRefereeVerdicts,
  resolveRoundLocally,
  scoreStopRound,
  starThresholds,
  starsForScore,
  stopLevel,
  stopRank,
  totalStars,
  totalXp,
  unlockedLevelIds,
  type StopProgressMap,
} from "@/lib/stop";

const firstLevel = STOP_LEVELS[0]!;
const sixFields = firstLevel.categories.length;

describe("campanha do Stop", () => {
  it("tem 12 fases, ids únicos e letras de um caractere", () => {
    expect(STOP_LEVELS).toHaveLength(12);
    const ids = new Set(STOP_LEVELS.map((level) => level.id));
    expect(ids.size).toBe(12);
    for (const level of STOP_LEVELS) {
      expect(level.letter).toMatch(/^[A-Z]$/);
      expect(level.seconds).toBeGreaterThan(0);
      expect(level.categories.length).toBeGreaterThanOrEqual(5);
      expect(level.categories.length).toBeLessThanOrEqual(6);
    }
    expect(STOP_TOTAL_STARS).toBe(36);
  });

  it("dá para tirar três estrelas em toda fase", () => {
    for (const level of STOP_LEVELS) {
      const [one, two, three] = starThresholds(level);
      const max = maxRoundScore(level);
      expect(one).toBeLessThanOrEqual(max);
      expect(two).toBeLessThanOrEqual(max);
      expect(three).toBeLessThanOrEqual(max);
    }
  });

  it("só abre a fase seguinte com pelo menos uma estrela na anterior", () => {
    const empty = unlockedLevelIds({});
    expect([...empty]).toEqual([STOP_LEVELS[0]!.id]);

    const oneStar: StopProgressMap = { [STOP_LEVELS[0]!.id]: { stars: 1, bestScore: 40 } };
    expect([...unlockedLevelIds(oneStar)]).toEqual([STOP_LEVELS[0]!.id, STOP_LEVELS[1]!.id]);

    const zeroStars: StopProgressMap = { [STOP_LEVELS[0]!.id]: { stars: 0, bestScore: 30 } };
    expect(unlockedLevelIds(zeroStars).size).toBe(1);
  });

  it("aponta a próxima fase a jogar e detecta campanha completa", () => {
    expect(nextLevelToPlay({})?.id).toBe(STOP_LEVELS[0]!.id);

    const all: StopProgressMap = Object.fromEntries(
      STOP_LEVELS.map((level) => [level.id, { stars: 3, bestScore: 100 }]),
    );
    expect(isCampaignComplete(all)).toBe(true);
    expect(totalStars(all)).toBe(36);
  });
});

describe("pontuação", () => {
  it("soma base, rodada limpa e bônus de tempo", () => {
    const score = scoreStopRound({ total: 6, valid: 6, secondsLeft: 90, secondsLimit: 90 });
    expect(score.base).toBe(6 * STOP_SCORING.perAnswer);
    expect(score.clean).toBe(STOP_SCORING.cleanRound);
    expect(score.time).toBe(STOP_SCORING.timeBonusMax);
    expect(score.total).toBe(110);
  });

  it("não paga bônus de tempo no estouro do cronômetro", () => {
    const score = scoreStopRound({ total: 6, valid: 4, secondsLeft: 0, secondsLimit: 60 });
    expect(score).toEqual({ base: 48, clean: 0, time: 0, total: 48 });
  });

  it("não deixa resposta válida passar do total de campos", () => {
    const score = scoreStopRound({ total: 3, valid: 9, secondsLeft: 10, secondsLimit: 60 });
    expect(score.base).toBe(3 * STOP_SCORING.perAnswer);
    expect(score.clean).toBe(STOP_SCORING.cleanRound);
  });

  it("arredonda e limita tempo negativo ou acima do limite", () => {
    expect(scoreStopRound({ total: 6, valid: 0, secondsLeft: -30, secondsLimit: 60 }).time).toBe(0);
    expect(scoreStopRound({ total: 6, valid: 0, secondsLeft: 900, secondsLimit: 60 }).time).toBe(
      STOP_SCORING.timeBonusMax,
    );
  });
});

describe("estrelas", () => {
  it("usa as metas de 100%, 125% e 150%", () => {
    expect(starsForScore(34, 35)).toBe(0);
    expect(starsForScore(35, 35)).toBe(1);
    expect(starsForScore(43, 35)).toBe(1);
    expect(starsForScore(44, 35)).toBe(2);
    expect(starsForScore(53, 35)).toBe(3);
  });
});

describe("validação local", () => {
  it("ignora acento e caixa na letra", () => {
    expect(localStopVerdict("Ácido acético", "A").valid).toBe(true);
    expect(localStopVerdict("ácido", "A").valid).toBe(true);
    expect(normalizeStopText("  Óptica  ")).toBe("optica");
  });

  it("reprova campo em branco, desistência e resposta curta", () => {
    expect(localStopVerdict("", "A").valid).toBe(false);
    expect(localStopVerdict("não sei", "A").valid).toBe(false);
    expect(localStopVerdict("ab", "A").valid).toBe(false);
  });

  it("reprova resposta que não começa pela letra", () => {
    const verdict = localStopVerdict("Zinco", "A");
    expect(verdict.valid).toBe(false);
    expect(verdict.reason).toContain("A");
  });
});

describe("julgamento da banca", () => {
  it("lê o JSON mesmo com texto em volta", () => {
    const text = 'Claro!\n```json\n[{"i":0,"valida":true},{"i":1,"valida":false,"motivo":"não é elemento"}]\n```';
    const parsed = parseRefereeVerdicts(text, 2);
    expect(parsed?.[0]).toEqual({ valid: true, reason: "" });
    expect(parsed?.[1]).toEqual({ valid: false, reason: "não é elemento" });
  });

  it("devolve null quando o modelo responde fora do formato", () => {
    expect(parseRefereeVerdicts("não consegui julgar", 3)).toBeNull();
    expect(parseRefereeVerdicts('[{"i":0}]', 3)).toBeNull();
    expect(parseRefereeVerdicts("[{", 3)).toBeNull();
  });

  it("ignora índices fora da faixa", () => {
    const parsed = parseRefereeVerdicts('[{"i":7,"valida":true},{"i":1,"valida":true}]', 2);
    expect(parsed?.[0]).toBeNull();
    expect(parsed?.[1]).toEqual({ valid: true, reason: "" });
  });

  it("a IA não aprova campo em branco nem fura o piso local", () => {
    const answers = ["", "Ada Lovelace"];
    const judged = [
      { valid: true, reason: "" },
      { valid: true, reason: "" },
    ];
    const merged = mergeVerdicts(firstLevel, answers, judged);
    expect(merged[0]?.valid).toBe(false);
    expect(merged[1]?.valid).toBe(true);
  });

  it("a IA pode reprovar resposta que o piso local aceitaria", () => {
    const merged = mergeVerdicts(firstLevel, ["Abacaxi", "", "", "", "", ""], [
      { valid: false, reason: "não é cientista" },
      null,
      null,
      null,
      null,
      null,
    ]);
    expect(merged[0]).toEqual({ valid: false, reason: "não é cientista" });
  });

  it("sem julgamento da IA, valem as regras locais", () => {
    const merged = mergeVerdicts(firstLevel, ["Ada Lovelace"], null);
    expect(merged[0]?.valid).toBe(true);
    expect(merged.slice(1).every((v) => !v.valid)).toBe(true);
  });
});

describe("progresso e ranking", () => {
  it("XP soma estrelas e melhor pontuação sem inflar ao rejogar", () => {
    const progress: StopProgressMap = {
      "obs-1": { stars: 2, bestScore: 60 },
      "obs-2": { stars: 1, bestScore: 45 },
    };
    expect(totalXp(progress)).toBe(2 * 100 + 60 + 1 * 100 + 45);
    expect(totalStars(progress)).toBe(3);
  });

  it("sobe de faixa conforme o XP", () => {
    expect(stopRank(0).title).toBe("Calouro");
    expect(stopRank(249).title).toBe("Calouro");
    expect(stopRank(250).title).toBe("Bolsista de iniciação");
    expect(stopRank(2600).title).toBe("Catedrático");
    expect(stopRank(2600).progress).toBe(1);
    expect(stopRank(125).progress).toBeCloseTo(0.5, 2);
  });

  it("monta o estado da campanha a partir do progresso", () => {
    const state = campaignState({ "obs-1": { stars: 3, bestScore: 100 } });
    expect(state.stars).toBe(3);
    expect(state.xp).toBe(400);
    expect(state.unlocked).toContain("obs-2");
    expect(state.nextLevelId).toBe("obs-2");
  });
});

describe("rodada sem servidor", () => {
  it("julga pelas regras locais e pontua", () => {
    const answers = ["Ada Lovelace", "Argônio", "", "", "", ""];
    const round = resolveRoundLocally(firstLevel, answers, 40);
    expect(round.verdicts.filter((v) => v.valid)).toHaveLength(2);
    expect(round.score.base).toBe(24);
    expect(round.score.time).toBe(9);
    expect(round.stars).toBe(0);
  });

  it("não passa do teto de campos da fase", () => {
    expect(firstLevel.categories).toHaveLength(sixFields);
    expect(stopLevel("obs-1")?.id).toBe("obs-1");
    expect(stopLevel("nao-existe")).toBeUndefined();
  });
});
