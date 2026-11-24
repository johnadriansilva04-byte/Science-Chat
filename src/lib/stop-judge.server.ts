import { INTERVIEW_MODEL, generateFinalText } from "@/lib/ai/gateway.server";
import { STOP_REFEREE_INSTRUCTIONS } from "@/lib/ai/prompts";
import { localStopVerdict, parseRefereeVerdicts, type RefereeVerdict } from "@/lib/stop";
import type { StopRoundField } from "@/lib/stop-room";

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

function refereePrompt(input: {
  letter: string;
  title: string;
  fields: StopRoundField[];
  answers: string[];
}): string {
  const fields = input.fields
    .map(
      (field, index) =>
        `${index}. ${field.label} (${field.hint || "categoria do Stop"}) = ${JSON.stringify(input.answers[index] ?? "")}`,
    )
    .join("\n");
  return `LETRA SORTEADA: ${input.letter}\nRODADA: ${input.title}\nCAMPOS:\n${fields}`;
}

export type JudgedRound = { verdicts: RefereeVerdict[]; byAi: boolean };

/**
 * Julga uma rodada (campanha ou sala) com a mesma banca. O piso local roda
 * primeiro: campo em branco nunca passa, nem quando a IA se empolga.
 */
export async function judgeRound(input: {
  letter: string;
  title: string;
  fields: StopRoundField[];
  answers: string[];
}): Promise<JudgedRound> {
  let judged: Array<RefereeVerdict | null> | null = null;
  try {
    const text = await withTimeout(
      generateFinalText(refereePrompt(input), STOP_REFEREE_INSTRUCTIONS, 400, INTERVIEW_MODEL),
      REFEREE_TIMEOUT_MS,
    );
    judged = parseRefereeVerdicts(text, input.fields.length);
  } catch {
    judged = null;
  }

  const verdicts = input.fields.map((_, index) => {
    const local = localStopVerdict(input.answers[index] ?? "", input.letter);
    const fromAi = judged?.[index] ?? null;
    if (!fromAi) return local;
    if (!local.valid) return local;
    return fromAi.valid
      ? { valid: true, reason: fromAi.reason }
      : { valid: false, reason: fromAi.reason || "A banca não reconheceu." };
  });

  return { verdicts, byAi: judged !== null };
}
