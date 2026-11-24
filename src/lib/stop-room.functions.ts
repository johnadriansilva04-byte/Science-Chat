import { createServerFn } from "@tanstack/react-start";
import { requireUser } from "@/lib/cf/auth-middleware";
import { consumeRateLimit } from "@/lib/cf/rate-limit.server";
import * as repo from "@/lib/cf/repo.server";
import { judgeRound } from "@/lib/stop-judge.server";
import { type RefereeVerdict } from "@/lib/stop";
import {
  ROOM_TOTAL_ROUNDS,
  STOP_ROOM_LIMITS,
  drawRandomFields,
  drawRoundLetter,
  hostActionError,
  isSpectatorOfRound,
  makeRoomCode,
  normalizeRoomCode,
  playerName,
  rankPlayers,
  roomCodeValid,
  roomSecondsLeft,
  settleRoomRound,
  validateRoomFields,
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
  spectator: boolean;
  answers: string[] | null;
  verdicts: RefereeVerdict[] | null;
  /** Pontos campo a campo: 10 inédito, 5 repetido, 0 inválido. */
  fields: number[];
};

export type StopRoomMessageView = {
  id: string;
  userId: string;
  name: string;
  body: string;
  createdAt: string;
  isSelf: boolean;
};

export type StopRoomView = {
  code: string;
  status: StopRoomStatus;
  round: number;
  totalRounds: number;
  letter: string | null;
  config: StopRoundConfig | null;
  secondsLeft: number;
  roundClosed: boolean;
  settled: boolean;
  isHost: boolean;
  selfId: string;
  selfPlaying: boolean;
  selfSpectator: boolean;
  players: StopRoomPlayerView[];
  ranking: StopRoomPlayerView[];
  messages: StopRoomMessageView[];
};

const DEFAULT_SECONDS = 90;
const CHAT_MAX = 240;

function parseConfig(row: repo.StopRoomRow): StopRoundConfig | null {
  if (!row.categories) return null;
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
  return { letter: row.letter ?? "", seconds: row.seconds, fields, auto: row.auto === 1 };
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

function answersOf(row: repo.StopRoomPlayerRow): string[] {
  const parsed = parseJsonArray(row.answers);
  return parsed ? parsed.map((value) => (typeof value === "string" ? value : "")) : [];
}

function verdictsOf(row: repo.StopRoomPlayerRow): RefereeVerdict[] {
  const parsed = parseJsonArray(row.verdicts);
  return parsed ? (parsed as RefereeVerdict[]) : [];
}

function lettersUsed(row: repo.StopRoomRow): string[] {
  const parsed = parseJsonArray(row.letters_used);
  return parsed ? parsed.map((value) => String(value)) : [];
}

/** Placar da rodada calculado a partir das respostas de todos. */
function pointsByPlayer(
  room: repo.StopRoomRow,
  rows: repo.StopRoomPlayerRow[],
): Map<string, number[]> {
  const playing = rows.filter((row) => !isSpectatorOfRound(row.joined_round, room.round));
  const settled = settleRoomRound(
    playing.map((row) => ({
      userId: row.user_id,
      answers: answersOf(row),
      verdicts: verdictsOf(row),
    })),
  );
  return new Map(settled.map((item) => [item.userId, item.fields]));
}
function toView(
  room: repo.StopRoomRow,
  rows: repo.StopRoomPlayerRow[],
  selfId: string,
  messages: repo.StopRoomMessageRow[] = [],
): StopRoomView {
  const config = parseConfig(room);
  const now = Date.now();
  const settled = room.round > 0 && room.settled_round >= room.round;
  const roundClosed = room.status === "finished" || settled;
  const left =
    room.status === "playing" && !roundClosed ? roomSecondsLeft(room.deadline_at, now) : 0;
  const points = pointsByPlayer(room, rows);

  const players: StopRoomPlayerView[] = rows.map((row) => ({
    userId: row.user_id,
    name: row.name,
    total: row.total,
    roundScore: row.round_score,
    submitted: row.submitted_round === room.round && room.round > 0,
    isHost: row.user_id === room.host_id,
    isSelf: row.user_id === selfId,
    spectator: isSpectatorOfRound(row.joined_round, room.round),
    answers: parseJsonArray(row.answers) ? answersOf(row) : null,
    verdicts: parseJsonArray(row.verdicts) ? verdictsOf(row) : null,
    fields: points.get(row.user_id) ?? [],
  }));

  const self = players.find((player) => player.userId === selfId);

  return {
    code: room.code,
    status: room.status as StopRoomStatus,
    round: room.round,
    totalRounds: room.total_rounds || ROOM_TOTAL_ROUNDS,
    letter: room.letter,
    config,
    secondsLeft: left,
    roundClosed,
    settled,
    isHost: room.host_id === selfId,
    selfId,
    selfPlaying: room.status === "playing" && !Boolean(self?.spectator),
    selfSpectator: Boolean(self?.spectator),
    players,
    ranking: rankPlayers(players),
    messages: messages.map((message) => ({
      id: message.id,
      userId: message.user_id,
      name: message.name,
      body: message.body,
      createdAt: message.created_at,
      isSelf: message.user_id === selfId,
    })),
  };
}

async function loadRoom(code: string) {
  const normalized = normalizeRoomCode(code);
  if (!roomCodeValid(normalized)) throw new Error("Código de sala inválido.");
  const room = await repo.getStopRoomByCode(normalized);
  if (!room) throw new Error("Sala não encontrada. Confira o código.");
  return room;
}

/**
 * Fecha a rodada quando todo mundo que joga já entregou ou quando o relógio
 * zerou. Os pontos só entram aqui — é a única hora em que dá para saber quem
 * repetiu palavra com quem. Depois da décima rodada a partida termina sozinha.
 */
async function settleIfDone(room: repo.StopRoomRow): Promise<repo.StopRoomRow> {
  if (room.status !== "playing" || room.round <= 0) return room;

  let rows = await repo.listStopRoomPlayers(room.id);
  const playing = rows.filter((row) => !isSpectatorOfRound(row.joined_round, room.round));
  const expired = roomSecondsLeft(room.deadline_at) <= 0;
  const allIn = playing.length > 0 && playing.every((row) => row.submitted_round === room.round);
  if (!expired && !allIn) return room;

  if (expired) {
    for (const row of playing) {
      if (row.submitted_round === room.round) continue;
      await repo.saveStopRoomSubmission({
        roomId: room.id,
        userId: row.user_id,
        round: room.round,
        answers: JSON.stringify([]),
        verdicts: JSON.stringify([]),
      });
    }
  }

  rows = await repo.listStopRoomPlayers(room.id);
  if (await repo.claimStopRoomSettlement(room.id, room.round)) {
    const settled = settleRoomRound(
      rows
        .filter((row) => !isSpectatorOfRound(row.joined_round, room.round))
        .map((row) => ({
          userId: row.user_id,
          answers: answersOf(row),
          verdicts: verdictsOf(row),
        })),
    );
    await repo.applyStopRoomScores({
      roomId: room.id,
      scores: settled.map((item) => ({ userId: item.userId, total: item.total })),
    });
    if (room.round >= (room.total_rounds || ROOM_TOTAL_ROUNDS)) {
      await repo.updateStopRoom(room.id, { status: "finished", deadlineAt: null });
    }
  }

  return (await repo.getStopRoomByCode(room.code)) ?? room;
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
      joinedRound: 0,
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

    const players = await repo.listStopRoomPlayers(room.id);
    const alreadyIn = players.some((player) => player.user_id === user.id);
    if (!alreadyIn && players.length >= STOP_ROOM_LIMITS.maxPlayers) {
      throw new Error(`A sala está cheia (${STOP_ROOM_LIMITS.maxPlayers} jogadores).`);
    }

    await repo.upsertStopRoomPlayer({
      roomId: room.id,
      userId: user.id,
      name: playerName(user.display_name, "Pesquisador"),
      joinedRound: room.round,
    });
    return { code: room.code, watchesUntilRound: room.round + 1 };
  });

export const getStopRoomState = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((input: { code: string }) => input)
  .handler(async ({ data, context }): Promise<StopRoomView> => {
    const { user } = context;
    const room = await loadRoom(data.code);
    const rows = await repo.listStopRoomPlayers(room.id);
    if (!rows.some((row) => row.user_id === user.id)) {
      throw new Error("Você não está nesta sala. Entre com o código.");
    }
    const current = await settleIfDone(room);
    const fresh = await repo.listStopRoomPlayers(current.id);
    return toView(current, fresh, user.id, await repo.listStopRoomMessages(current.id));
  });

/** Anfitrião sorteia só as perguntas: a letra é sempre do sistema. */
export const drawStopRoomRound = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((input: { code: string }) => input)
  .handler(async ({ data, context }) => {
    const { user } = context;
    const room = await loadRoom(data.code);
    const rows = await repo.listStopRoomPlayers(room.id);
    const view = toView(room, rows, user.id);
    const error = hostActionError({
      isHost: room.host_id === user.id,
      status: room.status as StopRoomStatus,
      roundClosed: view.roundClosed,
      action: "configure",
    });
    if (error) throw new Error(error);

    const drawn = drawRandomFields();
    await repo.updateStopRoom(room.id, {
      seconds: room.seconds,
      categories: JSON.stringify(drawn.fields),
      auto: 1,
      status: "lobby",
      deadlineAt: null,
    });
    return { fields: drawn.fields };
  });

export const configureStopRoom = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    (input: {
      code: string;
      seconds: number;
      fields: { label: string; hint: string }[];
      auto?: boolean;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { user } = context;
    const room = await loadRoom(data.code);
    const rows = await repo.listStopRoomPlayers(room.id);
    const view = toView(room, rows, user.id);
    const error = hostActionError({
      isHost: room.host_id === user.id,
      status: room.status as StopRoomStatus,
      roundClosed: view.roundClosed,
      action: "configure",
    });
    if (error) throw new Error(error);

    const result = validateRoomFields({
      seconds: data.seconds,
      fields: data.fields,
      auto: data.auto ?? false,
    });
    if (!result.ok) throw new Error(result.error);

    await repo.updateStopRoom(room.id, {
      seconds: result.seconds,
      categories: JSON.stringify(result.fields),
      auto: result.auto ? 1 : 0,
      status: "lobby",
      deadlineAt: null,
    });
    return { fields: result.fields, seconds: result.seconds };
  });
export const startStopRoomRound = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((input: { code: string }) => input)
  .handler(async ({ data, context }) => {
    const { user } = context;
    const room = await loadRoom(data.code);
    const rows = await repo.listStopRoomPlayers(room.id);
    const view = toView(room, rows, user.id);
    const error = hostActionError({
      isHost: room.host_id === user.id,
      status: room.status as StopRoomStatus,
      roundClosed: view.roundClosed,
      action: "start",
    });
    if (error) throw new Error(error);

    const total = room.total_rounds || ROOM_TOTAL_ROUNDS;
    if (room.round >= total) {
      throw new Error(`A partida já teve as ${total} rodadas. Abra outra sala.`);
    }
    const config = parseConfig(room);
    if (!config) throw new Error("Escolha as perguntas antes de começar.");

    const used = lettersUsed(room);
    const letter = drawRoundLetter(used);
    await repo.resetStopRoomRound(room.id);
    const deadline = new Date(Date.now() + config.seconds * 1000).toISOString();
    await repo.updateStopRoom(room.id, {
      status: "playing",
      round: room.round + 1,
      letter,
      lettersUsed: JSON.stringify([...used, letter]),
      deadlineAt: deadline,
    });
    return { round: room.round + 1, letter, deadlineAt: deadline };
  });

export const submitStopRoomAnswers = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((input: { code: string; answers: string[] }) => input)
  .handler(async ({ data, context }) => {
    const { user } = context;
    const room = await settleIfDone(await loadRoom(data.code));
    if (room.status !== "playing") throw new Error("A rodada não está aberta.");

    const rows = await repo.listStopRoomPlayers(room.id);
    const self = rows.find((row) => row.user_id === user.id);
    if (!self) throw new Error("Você não está nesta sala.");
    if (isSpectatorOfRound(self.joined_round, room.round)) {
      throw new Error("Você entrou no meio desta rodada — entra em campo na próxima.");
    }
    if (self.submitted_round === room.round) throw new Error("Você já entregou essa rodada.");

    const config = parseConfig(room);
    if (!config || !config.letter) throw new Error("A rodada não tem letra sorteada.");
    if (roomSecondsLeft(room.deadline_at) <= 0) throw new Error("O tempo desta rodada já acabou.");

    const limit = await consumeRateLimit(`stop-room:submit:${user.id}`, {
      limit: 120,
      windowSec: 3600,
    });
    if (!limit.ok) throw new Error("Muitas entregas em pouco tempo. Espere um pouco.");

    const answers = config.fields.map((_, index) => {
      const value = data.answers[index];
      return typeof value === "string" ? value.trim().slice(0, 60) : "";
    });

    const { verdicts } = await judgeRound({
      letter: config.letter,
      title: `Sala ${room.code} · rodada ${room.round}`,
      fields: config.fields,
      answers,
    });

    await repo.saveStopRoomSubmission({
      roomId: room.id,
      userId: user.id,
      round: room.round,
      answers: JSON.stringify(answers),
      verdicts: JSON.stringify(verdicts),
    });

    return { verdicts };
  });

export const sendStopRoomMessage = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((input: { code: string; body: string }) => input)
  .handler(async ({ data, context }) => {
    const { user } = context;
    const room = await loadRoom(data.code);
    const rows = await repo.listStopRoomPlayers(room.id);
    if (!rows.some((row) => row.user_id === user.id)) {
      throw new Error("Você não está nesta sala.");
    }
    const body = typeof data.body === "string" ? data.body.trim().slice(0, CHAT_MAX) : "";
    if (!body) throw new Error("Escreva algo antes de mandar.");

    const limit = await consumeRateLimit(`stop-room:chat:${user.id}`, {
      limit: 40,
      windowSec: 300,
    });
    if (!limit.ok) throw new Error("Calma no chat — espere um pouco.");

    const message = await repo.addStopRoomMessage({
      roomId: room.id,
      userId: user.id,
      name: playerName(user.display_name, "Pesquisador"),
      body,
    });
    return { messageId: message.id, body: message.body, createdAt: message.created_at };
  });

export const finishStopRoom = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((input: { code: string }) => input)
  .handler(async ({ data, context }) => {
    const { user } = context;
    const room = await loadRoom(data.code);
    const rows = await repo.listStopRoomPlayers(room.id);
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
