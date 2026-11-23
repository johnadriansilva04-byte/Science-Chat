import { createServerFn } from "@tanstack/react-start";
import { requireUser } from "@/lib/cf/auth-middleware";
import { consumeRateLimit } from "@/lib/cf/rate-limit.server";
import * as repo from "@/lib/cf/repo.server";
import {
  STOP_LEVELS,
  campaignState,
  mergeVerdicts,
  parseRefereeVerdicts,
  scoreFromVerdicts,
  starsForScore,
  stopCategory,
  stopLevel,
  type RefereeVerdict,
  type StopCampaignState,
  type StopLevel,
  type StopProgressMap,
  type StopRoundResult,
} from "@/lib/stop";

function toProgressMap(rows: repo.StopProgressRow[]): StopProgressMap {
  const map: StopProgressMap = {};
  for (const row of rows) map[row.level_id] = { stars: row.stars, bestScore: row.best_score };
  return map;
}

export type StopCampaignView = StopCampaignState & {
  levels: { id: string; stars: number; bestScore: number; attempts: number }[];
};

function campaignView(rows: repo.StopProgressRow[]): StopCampaignView {
  const state = campaignState(toProgressMap(rows));
  return {
    ...state,
    levels: STOP_LEVELS.map((level) => ({
      id: level.id,
      stars: state.progress[level.id]?.stars ?? 0,
      bestScore: state.progress[level.id]?.bestScore ?? 0,
      attempts: rows.find((row) => row.level_id === level.id)?.attempts ?? 0,
    })),
  };
}

/** Texto que a banca recebe. Respostas entre aspas para não confundir com o rótulo. */
function refereePrompt(level: StopLevel, answers: string[]): string {
  const fields = level.categories
    .map(
      (id, index) => `${index}. ${stopCategory(id).label} = ${JSON.stringify(answers[index] ?? "")}`,
    )
    .join("\n");
  return `LETRA SORTEADA: ${level.letter}\nFASE: ${level.title}\nCAMPOS:\n${fields}`;
}

/** A banca não pode segurar a rodada: passou do teto, julgam as regras locais. */
const REFEREE_TIMEOUT_MS = 12_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  promise.catch(() => undefined);
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("A banca demorou demais.")), ms);
    }),
  ]);
}

export const getStopCampaign = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const rows = await repo.listStopProgress(context.user.id);
    return campaignView(rows);
  });

export const judgeStopRound = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((data: { levelId: string; answers: string[]; secondsLeft: number }) => data)
  .handler(async ({ data, context }): Promise<StopRoundResult> => {
    const level = stopLevel(data.levelId);
    if (!level) throw new Error("Fase desconhecida.");

    const answers = level.categories.map((_, index) => {
      const raw = data.answers?.[index];
      return typeof raw === "string" ? raw.slice(0, 120) : "";
    });
    const secondsLeft = Math.min(
      level.seconds,
      Math.max(0, Math.round(Number(data.secondsLeft) || 0)),
    );

    let judged: Array<RefereeVerdict | null> | null = null;
    if (answers.some((answer) => answer.trim())) {
      try {
        const limit = await consumeRateLimit(`stop:${context.user.id}`, {
          limit: 60,
          windowSec: 3600,
        });
        if (limit.ok) {
          const [{ generateFinalText, INTERVIEW_MODEL }, { STOP_REFEREE_INSTRUCTIONS }] =
            await Promise.all([
              import("@/lib/ai/gateway.server"),
              import("@/lib/ai/prompts"),
            ]);
          const text = await withTimeout(
            generateFinalText(
              refereePrompt(level, answers),
              STOP_REFEREE_INSTRUCTIONS,
              400,
              INTERVIEW_MODEL,
            ),
            REFEREE_TIMEOUT_MS,
          );
          judged = parseRefereeVerdicts(text, level.categories.length);
        }
      } catch {
        judged = null;
      }
    }

    const verdicts = mergeVerdicts(level, answers, judged);
    const score = scoreFromVerdicts(level, verdicts, secondsLeft);
    const stars = starsForScore(score.total, level.meta);

    const saved = await repo.saveStopResult(context.user.id, level.id, score.total, stars);
    const rows = await repo.listStopProgress(context.user.id);
    const state = campaignState(toProgressMap(rows));

    return {
      score,
      stars,
      verdicts,
      judgedByAi: Boolean(judged),
      best: { stars: saved.stars, bestScore: saved.best_score },
      xp: state.xp,
      rank: state.rank,
      unlocked: state.unlocked,
      nextLevelId: state.nextLevelId,
    };
  });

export const resetStopCampaign = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    await repo.resetStopProgress(context.user.id);
    return { ok: true };
  });
