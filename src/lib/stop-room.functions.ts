import { createServerFn } from "@tanstack/react-start";
import { requireUser } from "@/lib/cf/auth-middleware";
import { consumeRateLimit } from "@/lib/cf/rate-limit.server";
import * as repo from "@/lib/cf/repo.server";
import { judgeRound } from "@/lib/stop-judge.server";
import { scoreStopRound, type RefereeVerdict } from "@/lib/stop";
import {
  STOP_ROOM_LIMITS,
  drawRandomConfig,
  hostActionError,
  makeRoomCode,
  normalizeRoomCode,
  playerName,
  rankPlayers,
  roomCodeValid,
  roomSecondsLeft,
  validateRoundConfig,
  type StopRoomStatus,
  type StopRoundConfig,
  type StopRoundField,
} from "@/lib/stop-room";

export type StopRoomPlayerView = {
  userId: string;
  name: string;
  total: number;
  roundScore: number | null;
  submitted: boolean;
  isHost: boolean;
  isSelf: boolean;
  answers: string[] | null;
  verdicts: RefereeVerdict[] | null;
};

export type StopRoomView = {
  code: string;
  status: StopRoomStatus;
  round: number;
  config: StopRoundConfig | null;
  secondsLeft: number;
  roundClosed: boolean;
  isHost: boolean;
  selfId: string;
  players: StopRoomPlayerView[];
  ranking: StopRoomPlayerView[];
  error?: string;
};

const DEFAULT_SECONDS = 90;

function parseConfig(row: repo.StopRoomRow): StopRoundConfig | null {
  if (!row.categories || !row.letter) return null;
  let fields: StopRoundField[] | null = null;
  try {
    const parsed: unknown = JSON.parse(row.categories);
    if (Array.isArray(parsed)) {
      fields = parsed
        .map((item) => {
          const entry = item as Record<string, unknown>;
          const label = typeof entry["label"] === "string" ? entry["label"] : "";
          const hint = typeof entry["hint"] === "string" ? entry["hint"] : "";
          return label ? { label, hint } : null;
        })
        .filter((item): item is StopRoundField => Boolean(item));
    }
  } catch {
    fields = null;
  }
  if (!fields || fields.length === 0) return null;
  return { letter: row.letter, seconds: row.seconds, fields, auto: row.auto === 1 };
}

function parseJsonArray(value: string | null): unknown[] | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function toView(
  room: repo.StopRoomRow,
  rows: repo.StopRoomPlayerRow[],
  selfId: string,
): StopRoomView {
  const config = parseConfig(room);
  const now = Date.now();
  const left = room.status === "playing" ? roomSecondsLeft(room.deadline_at, now) : 0;

  const players: StopRoomPlayerView[] = rows.map((row) => {
    const answers = parseJsonArray(row.answers);
    const verdicts = parseJsonArray(row.verdicts);
    return {
      userId: row.user_id,
      name: row.name,
      total: row.total,
      roundScore: row.round_score,
      submitted: row.submitted_round === room.round && room.round > 0,
      isHost: row.user_id === room.host_id,
      isSelf: row.user_id === selfId,
      answers: answers ? answers.map((value) => (typeof value === "string" ? value : "")) : null,
      verdicts: verdicts as RefereeVerdict[] | null,
    };
  });

  const roundClosed =
    room.status === "playing" &&
    room.round > 0 &&
    players.length > 0 &&
    players.every((player) => player.submitted);

  return {
    code: room.code,
    status: room.status as StopRoomStatus,
    round: room.round,
    config,
    secondsLeft: roundClosed ? 0 : left,
    roundClosed,
    isHost: room.host_id === selfId,
    selfId,
    players,
    ranking: rankPlayers(players),
  };
}

async function loadRoom(code: string) {
  const normalized = normalizeRoomCode(code);
  if (!roomCodeValid(normalized)) throw new Error("Código de sala inválido.");
  const room = await repo.getStopRoomByCode(normalized);
  if (!room) throw new Error("Sala não encontrada. Confira o código.");
  return room;
}

async function loadPlayers(roomId: string): Promise<repo.StopRoomPlayerRow[]> {
  return repo.listStopRoomPlayers(roomId);
}

/** Fecha a rodada vencida para quem não entregou: zero, sem travar o placar. */
async function closeExpiredRound(room: repo.StopRoomRow, rows: repo.StopRoomPlayerRow[]) {
  if (room.status !== "playing") return false;
  if (roomSecondsLeft(room.deadline_at) > 0) return false;
  for (const row of rows) {
    if (row.submitted_round === room.round) continue;
    await repo.saveStopRoomSubmission({
      roomId: room.id,
      userId: row.user_id,
      round: room.round,
      answers: JSON.stringify(room.categories ? [] : []),
      verdicts: JSON.stringify([]),
      score: 0,
    });
  }
  return true;
}

export const createStopRoom = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const { user } = context;
    const limit = await consumeRateLimit(`stop-room:create:${user.id}`, {
      limit: 12,
      windowSec: 3600,
    });
    if (!limit.ok) throw new Error("Muitas salas em pouco tempo. Espere um pouco.");

    let code = makeRoomCode();
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const existing = await repo.getStopRoomByCode(code);
      if (!existing) break;
      code = makeRoomCode();
    }
    const room = await repo.createStopRoom({ hostId: user.id, code, seconds: DEFAULT_SECONDS });
    await repo.upsertStopRoomPlayer({
      roomId: room.id,
      userId: user.id,
      name: playerName(user.display_name, "Anfitrião"),
    });
    return { code: room.code };
  });

export const joinStopRoom = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((input: { code: string }) => input)
  .handler(async ({ data, context }) => {
    const { user } = context;
    const room = await loadRoom(data.code);
    if (room.status === "finished") throw new Error("Esta sala já foi encerrada.");

    const players = await loadPlayers(room.id);
    const alreadyIn = players.some((player) => player.user_id === user.id);
    if (!alreadyIn && players.length >= STOP_ROOM_LIMITS.maxPlayers) {
      throw new Error(`A sala está cheia (${STOP_ROOM_LIMITS.maxPlayers} jogadores).`);
    }

    await repo.upsertStopRoomPlayer({
      roomId: room.id,
      userId: user.id,
      name: playerName(user.display_name, "Pesquisador"),
    });
    return { code: room.code };
  });

export const getStopRoomState = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((input: { code: string }) => input)
  .handler(async ({ data, context }): Promise<StopRoomView> => {
    const { user } = context;
    const room = await loadRoom(data.code);
    let rows = await loadPlayers(room.id);
    if (!rows.some((row) => row.user_id === user.id)) {
      throw new Error("Você não está nesta sala. Entre com o código.");
    }
    if (await closeExpiredRound(room, rows)) rows = await loadPlayers(room.id);
    return toView(room, rows, user.id);
  });

/** Anfitrião sorteia letra e perguntas do catálogo. */
export const drawStopRoomRound = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((input: { code: string }) => input)
  .handler(async ({ data, context }) => {
    const { user } = context;
    const room = await loadRoom(data.code);
    const rows = await loadPlayers(room.id);
    const config = parseConfig(room);
    const view = toView(room, rows, user.id);
    const error = hostActionError({
      isHost: room.host_id === user.id,
      status: room.status as StopRoomStatus,
      roundClosed: view.roundClosed,
      action: "configure",
    });
    if (error) throw new Error(error);

    const drawn = drawRandomConfig();
    await repo.updateStopRoom(room.id, {
      letter: drawn.letter,
      seconds: drawn.seconds,
      categories: JSON.stringify(drawn.fields),
      auto: 1,
      status: "lobby",
      deadlineAt: null,
    });
    return { config: { ...drawn, seconds: config?.seconds ?? drawn.seconds } };
  });

export const configureStopRoom = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    (input: {
      code: string;
      letter: string;
      seconds: number;
      fields: { label: string; hint: string }[];
      auto?: boolean;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { user } = context;
    const room = await loadRoom(data.code);
    const rows = await loadPlayers(room.id);
    const view = toView(room, rows, user.id);
    const error = hostActionError({
      isHost: room.host_id === user.id,
      status: room.status as StopRoomStatus,
      roundClosed: view.roundClosed,
      action: "configure",
    });
    if (error) throw new Error(error);

    const result = validateRoundConfig({
      letter: data.letter,
      seconds: data.seconds,
      fields: data.fields,
      auto: data.auto ?? false,
    });
    if (!result.ok) throw new Error(result.error);

    await repo.updateStopRoom(room.id, {
      letter: result.config.letter,
      seconds: result.config.seconds,
      categories: JSON.stringify(result.config.fields),
      auto: result.config.auto ? 1 : 0,
      status: "lobby",
      deadlineAt: null,
    });
    return { config: result.config };
  });

export const startStopRoomRound = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((input: { code: string }) => input)
  .handler(async ({ data, context }) => {
    const { user } = context;
    const room = await loadRoom(data.code);
    const rows = await loadPlayers(room.id);
    const view = toView(room, rows, user.id);
    const error = hostActionError({
      isHost: room.host_id === user.id,
      status: room.status as StopRoomStatus,
      roundClosed: view.roundClosed,
      action: "start",
    });
    if (error) throw new Error(error);

    const config = parseConfig(room);
    if (!config) throw new Error("Escolha as perguntas antes de começar.");

    await repo.resetStopRoomRound(room.id);
    const deadline = new Date(Date.now() + config.seconds * 1000).toISOString();
    await repo.updateStopRoom(room.id, {
      status: "playing",
      round: room.round + 1,
      deadlineAt: deadline,
    });
    return { round: room.round + 1, deadlineAt: deadline };
  });

export const submitStopRoomAnswers = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((input: { code: string; answers: string[] }) => input)
  .handler(async ({ data, context }) => {
    const { user } = context;
    const room = await loadRoom(data.code);
    if (room.status !== "playing") throw new Error("A rodada não está aberta.");

    const rows = await loadPlayers(room.id);
    const self = rows.find((row) => row.user_id === user.id);
    if (!self) throw new Error("Você não está nesta sala.");
    if (self.submitted_round === room.round) throw new Error("Você já entregou essa rodada.");

    const config = parseConfig(room);
    if (!config) throw new Error("A rodada não tem perguntas configuradas.");

    const limit = await consumeRateLimit(`stop-room:submit:${user.id}`, {
      limit: 120,
      windowSec: 3600,
    });
    if (!limit.ok) throw new Error("Muitas entregas em pouco tempo. Espere um pouco.");

    const answers = config.fields.map((_, index) => {
      const value = data.answers[index];
      return typeof value === "string" ? value.trim().slice(0, 60) : "";
    });
    const left = roomSecondsLeft(room.deadline_at);
    if (left <= 0) throw new Error("O tempo desta rodada já acabou.");

    const { verdicts } = await judgeRound({
      letter: config.letter,
      title: `Sala ${room.code} · rodada ${room.round}`,
      fields: config.fields,
      answers,
    });
    const score = scoreStopRound({
      total: config.fields.length,
      valid: verdicts.filter((verdict) => verdict.valid).length,
      secondsLeft: left,
      secondsLimit: config.seconds,
    });

    await repo.saveStopRoomSubmission({
      roomId: room.id,
      userId: user.id,
      round: room.round,
      answers: JSON.stringify(answers),
      verdicts: JSON.stringify(verdicts),
      score: score.total,
    });

    return { verdicts, score };
  });

export const finishStopRoom = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((input: { code: string }) => input)
  .handler(async ({ data, context }) => {
    const { user } = context;
    const room = await loadRoom(data.code);
    const rows = await loadPlayers(room.id);
    const view = toView(room, rows, user.id);
    const error = hostActionError({
      isHost: room.host_id === user.id,
      status: room.status as StopRoomStatus,
      roundClosed: view.roundClosed,
      action: "finish",
    });
    if (error) throw new Error(error);
    await repo.updateStopRoom(room.id, { status: "finished", deadlineAt: null });
    return { ok: true };
  });

export const leaveStopRoom = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((input: { code: string }) => input)
  .handler(async ({ data, context }) => {
    const { user } = context;
    const room = await loadRoom(data.code);
    await repo.removeStopRoomPlayer(room.id, user.id);
    return { ok: true };
  });
