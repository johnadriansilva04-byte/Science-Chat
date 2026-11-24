/**
 * Stop com amigos: regras puras da sala (código, rodada, sorteio e ranking).
 *
 * Nada aqui toca banco ou IA — a tela, o servidor e os testes usam as mesmas
 * funções, então o código da sala, a validação da rodada e o ranking nunca
 * divergem entre quem cria, quem entra e quem julga.
 */

import { STOP_CATEGORY_LIST, type StopCategoryId } from "@/lib/stop";

export type StopRoundField = { label: string; hint: string };

export type StopRoundConfig = {
  letter: string;
  seconds: number;
  fields: StopRoundField[];
  /** `true` quando a rodada veio do sorteio; `false` quando o anfitrião escolheu. */
  auto: boolean;
};

export const STOP_ROOM_LIMITS = {
  minFields: 3,
  maxFields: 8,
  minSeconds: 30,
  maxSeconds: 180,
  maxPlayers: 12,
  labelMax: 40,
  hintMax: 60,
} as const;

/** Sem I, O, 0 e 1: código ditado no telefone não vira letra errada. */
export const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const ROOM_CODE_LENGTH = 6;

/** Letras que rendem resposta sem virar sorte cruel no modo aleatório. */
const RANDOM_LETTERS = "ABCDEFGHJLMPRSTV";

export function makeRoomCode(random: () => number = Math.random): string {
  let code = "";
  for (let index = 0; index < ROOM_CODE_LENGTH; index += 1) {
    const position = Math.min(
      ROOM_CODE_ALPHABET.length - 1,
      Math.floor(random() * ROOM_CODE_ALPHABET.length),
    );
    code += ROOM_CODE_ALPHABET[position];
  }
  return code;
}

export function normalizeRoomCode(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, ROOM_CODE_LENGTH);
}

export function roomCodeValid(value: string): boolean {
  const code = normalizeRoomCode(value);
  if (code.length !== ROOM_CODE_LENGTH) return false;
  return [...code].every((char) => ROOM_CODE_ALPHABET.includes(char));
}

function pick<T>(items: readonly T[], random: () => number): T {
  const index = Math.min(items.length - 1, Math.max(0, Math.floor(random() * items.length)));
  return items[index]!;
}

export function fieldsFromCategoryIds(ids: readonly StopCategoryId[]): StopRoundField[] {
  return ids.map((id) => {
    const category = STOP_CATEGORY_LIST.find((item) => item.id === id);
    return { label: category?.label ?? id, hint: category?.hint ?? "" };
  });
}

/** Sorteio: seis categorias distintas e uma letra amigável. */
export function drawRandomConfig(random: () => number = Math.random): StopRoundConfig {
  const pool = [...STOP_CATEGORY_LIST];
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [pool[index], pool[swap]] = [pool[swap]!, pool[index]!];
  }
  const fields = pool
    .slice(0, 6)
    .map((category) => ({ label: category.label, hint: category.hint }));
  return { letter: pick([...RANDOM_LETTERS], random), seconds: 90, fields, auto: true };
}

/** Campos escolhidos pelo anfitrião (a letra é sempre sorteada pelo sistema). */
export type RoomFieldsResult =
  | { ok: true; seconds: number; fields: StopRoundField[]; auto: boolean }
  | { ok: false; error: string };

export function validateRoomFields(input: unknown): RoomFieldsResult {
  const result = validateRoundConfig({ ...(input as Record<string, unknown>), letter: "A" });
  if (!result.ok) return { ok: false, error: result.error };
  return {
    ok: true,
    seconds: result.config.seconds,
    fields: result.config.fields,
    auto: result.config.auto,
  };
}

/** Sorteia só as perguntas; a letra entra na largada da rodada. */
export function drawRandomFields(random: () => number = Math.random): {
  seconds: number;
  fields: StopRoundField[];
} {
  const drawn = drawRandomConfig(random);
  return { seconds: drawn.seconds, fields: drawn.fields };
}

/** Quem entrou na rodada corrente (ou depois) só assiste: a estreia é na próxima. */
export function isSpectatorOfRound(joinedRound: number, round: number): boolean {
  return joinedRound >= round;
}

function readField(value: unknown): StopRoundField | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const label = typeof row["label"] === "string" ? row["label"].trim().replace(/\s+/g, " ") : "";
  const hint = typeof row["hint"] === "string" ? row["hint"].trim().replace(/\s+/g, " ") : "";
  if (label.length < 2) return null;
  return {
    label: label.slice(0, STOP_ROOM_LIMITS.labelMax),
    hint: hint.slice(0, STOP_ROOM_LIMITS.hintMax),
  };
}

export type RoundConfigResult =
  { ok: true; config: StopRoundConfig } | { ok: false; error: string };

/**
 * O anfitrião pode escrever as próprias perguntas: basta um rótulo e uma dica.
 * Aceita 3 a 8 campos, sem repetir o mesmo rótulo.
 */
export function validateRoundConfig(input: unknown): RoundConfigResult {
  if (!input || typeof input !== "object") return { ok: false, error: "Rodada inválida." };
  const row = input as Record<string, unknown>;

  const letter = typeof row["letter"] === "string" ? row["letter"].trim().toUpperCase() : "";
  if (!/^[A-Z]$/.test(letter)) return { ok: false, error: "Escolha uma letra de A a Z." };

  const seconds = Number(row["seconds"]);
  if (
    !Number.isFinite(seconds) ||
    seconds < STOP_ROOM_LIMITS.minSeconds ||
    seconds > STOP_ROOM_LIMITS.maxSeconds
  ) {
    return {
      ok: false,
      error: `O tempo precisa ficar entre ${STOP_ROOM_LIMITS.minSeconds} e ${STOP_ROOM_LIMITS.maxSeconds} segundos.`,
    };
  }

  const rawFields = Array.isArray(row["fields"]) ? row["fields"] : [];
  if (
    rawFields.length < STOP_ROOM_LIMITS.minFields ||
    rawFields.length > STOP_ROOM_LIMITS.maxFields
  ) {
    return {
      ok: false,
      error: `Escolha entre ${STOP_ROOM_LIMITS.minFields} e ${STOP_ROOM_LIMITS.maxFields} perguntas.`,
    };
  }

  const fields: StopRoundField[] = [];
  const seen = new Set<string>();
  for (const raw of rawFields) {
    const field = readField(raw);
    if (!field) return { ok: false, error: "Toda pergunta precisa de um nome com 2+ letras." };
    const key = field.label.toLowerCase();
    if (seen.has(key)) return { ok: false, error: `A pergunta "${field.label}" está repetida.` };
    seen.add(key);
    fields.push(field);
  }

  return {
    ok: true,
    config: { letter, seconds: Math.round(seconds), fields, auto: Boolean(row["auto"]) },
  };
}

export type StopRoomStatus = "lobby" | "playing" | "finished";

export type StopRoomState<
  P extends { userId: string; total: number; roundScore: number | null; submitted: boolean },
> = {
  code: string;
  status: StopRoomStatus;
  round: number;
  config: StopRoundConfig | null;
  /** Segundos restantes agora; 0 quando a rodada já fechou. */
  secondsLeft: number;
  /** Todos enviaram (ou o tempo acabou): a tela mostra o placar. */
  roundClosed: boolean;
  players: P[];
  ranking: P[];
};

export function roomSecondsLeft(deadlineAt: string | null, now = Date.now()): number {
  if (!deadlineAt) return 0;
  const deadline = Date.parse(deadlineAt);
  if (!Number.isFinite(deadline)) return 0;
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

/** Empate resolvido pelo melhor resultado da última rodada. */
export function rankPlayers<
  P extends { total: number; roundScore: number | null; submitted: boolean },
>(players: P[]): P[] {
  return [...players].sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    const aRound = a.roundScore ?? -1;
    const bRound = b.roundScore ?? -1;
    if (bRound !== aRound) return bRound - aRound;
    return a.submitted === b.submitted ? 0 : a.submitted ? -1 : 1;
  });
}

/** Só o anfitrião mexe na sala — e nunca no meio de uma rodada aberta. */
export function hostActionError(input: {
  isHost: boolean;
  status: StopRoomStatus;
  roundClosed: boolean;
  action: "configure" | "start" | "finish";
}): string | null {
  if (!input.isHost) return "Só quem criou a sala pode fazer isso.";
  if (input.status === "finished") return "A sala já foi encerrada.";
  if (input.action === "configure" && input.status === "playing" && !input.roundClosed) {
    return "Espere a rodada fechar para mudar as perguntas.";
  }
  if (input.action === "start" && input.status === "playing" && !input.roundClosed) {
    return "A rodada atual ainda está correndo.";
  }
  return null;
}

/** Apelido mostrado na sala: o nome do perfil, nunca o e-mail. */
export function playerName(raw: string | null | undefined, fallback = "Pesquisador"): string {
  const clean = (raw ?? "").trim().replace(/\s+/g, " ");
  return clean ? clean.slice(0, 24) : fallback;
}

/* ------------------------------------------------------------------ *
 * Regras de partida: letra sorteada, 10 rodadas, 10 pontos (5 repetido)
 * ------------------------------------------------------------------ */

/** Uma sala é uma partida fechada: dez letras, dez rodadas. */
export const ROOM_TOTAL_ROUNDS = 10;

export const ROOM_POINTS = { unique: 10, duplicate: 5 } as const;

/** Letras boas para resposta, sem Q, X, Y, Z, K e W. */
const PLAYABLE_LETTERS = "ABCDEFGHJLMPRSTV";

/** Compara respostas sem caixa, acento ou espaço sobrando. */
export function normalizeAnswer(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * A letra nunca é escolhida por ninguém: o sistema sorteia uma letra que ainda
 * não saiu nesta partida, então dez rodadas nunca repetem a mesma letra.
 */
export function drawRoundLetter(
  used: readonly string[] = [],
  random: () => number = Math.random,
): string {
  const taken = new Set(used.map((letter) => letter.trim().toUpperCase()));
  const available = [...PLAYABLE_LETTERS].filter((letter) => !taken.has(letter));
  const pool = available.length > 0 ? available : [...PLAYABLE_LETTERS];
  return pick(pool, random);
}

export type RoomSubmission = {
  userId: string;
  answers: string[];
  verdicts: { valid: boolean }[];
};

export type RoomSettled = {
  userId: string;
  /** Pontos por campo: 10 (inédito), 5 (repetido) ou 0 (inválido/branco). */
  fields: number[];
  total: number;
};

/**
 * Placar real do Stop: cada resposta válida vale 10, mas se outra pessoa da
 * sala escreveu a mesma palavra no mesmo campo, vale 5 para os dois.
 */
export function settleRoomRound(submissions: RoomSubmission[]): RoomSettled[] {
  const fieldCount = submissions.reduce(
    (max, submission) => Math.max(max, submission.answers.length),
    0,
  );

  const points = submissions.map(() => new Array<number>(fieldCount).fill(0));

  for (let field = 0; field < fieldCount; field += 1) {
    const seen = new Map<string, number[]>();
    submissions.forEach((submission, index) => {
      const answer = normalizeAnswer(submission.answers[field] ?? "");
      const valid = Boolean(submission.verdicts[field]?.valid);
      if (!valid || !answer) return;
      const owners = seen.get(answer) ?? [];
      owners.push(index);
      seen.set(answer, owners);
    });

    for (const owners of seen.values()) {
      const value = owners.length > 1 ? ROOM_POINTS.duplicate : ROOM_POINTS.unique;
      for (const owner of owners) points[owner]![field] = value;
    }
  }

  return submissions.map((submission, index) => ({
    userId: submission.userId,
    fields: points[index]!,
    total: points[index]!.reduce((sum, value) => sum + value, 0),
  }));
}

/** A partida acabou quando a décima rodada foi jogada. */
export function roomMatchOver(round: number, totalRounds = ROOM_TOTAL_ROUNDS): boolean {
  return round >= totalRounds;
}
