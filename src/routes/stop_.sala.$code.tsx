import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Copy,
  Crown,
  Dices,
  Eye,
  Flag,
  Play,
  Plus,
  Send,
  Swords,
  Timer,
  Trophy,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { AppHeader } from "@/components/app/AppHeader";
import { useAuth } from "@/hooks/useAuth";
import { STOP_CATEGORY_LIST } from "@/lib/stop";
import {
  STOP_ROOM_LIMITS,
  normalizeRoomCode,
  roomCodeValid,
  type StopRoundField,
} from "@/lib/stop-room";
import {
  configureStopRoom,
  drawStopRoomRound,
  finishStopRoom,
  getStopRoomState,
  joinStopRoom,
  leaveStopRoom,
  sendStopRoomMessage,
  startStopRoomRound,
  submitStopRoomAnswers,
  type StopRoomMessageView,
  type StopRoomPlayerView,
  type StopRoomView,
} from "@/lib/stop-room.functions";

export const Route = createFileRoute("/stop_/sala/$code")({
  head: () => ({
    meta: [
      { title: "Arena do Stop — duelo de palavras · ScienceChat" },
      {
        name: "description",
        content:
          "Arena do Stop: dez rodadas, letra sorteada pelo sistema, 10 pontos por resposta inédita e 5 quando repete com alguém.",
      },
    ],
  }),
  component: RoomPage,
});

const POLL_MS = 2000;

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return "Não foi possível falar com a arena agora.";
}

function RoomPage() {
  const params = Route.useParams();
  const code = normalizeRoomCode(params.code ?? "");
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [state, setState] = useState<StopRoomView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [answers, setAnswers] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [syncedAt, setSyncedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [draft, setDraft] = useState<{ seconds: number; fields: StopRoundField[] }>({
    seconds: 90,
    fields: [],
  });
  const [dirty, setDirty] = useState(false);
  const lastRound = useRef(-1);

  const refresh = useCallback(async () => {
    try {
      const view = await getStopRoomState({ data: { code } });
      setState(view);
      setSyncedAt(Date.now());
      setError(null);
      return view;
    } catch (caught) {
      setError(errorMessage(caught));
      return null;
    }
  }, [code]);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    joinStopRoom({ data: { code } })
      .then(() => {
        if (alive) setJoined(true);
      })
      .catch((caught) => {
        if (alive) setError(errorMessage(caught));
      });
    return () => {
      alive = false;
    };
  }, [user, code]);

  useEffect(() => {
    if (!joined) return;
    void refresh();
    const id = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(id);
  }, [joined, refresh]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!state) return;
    if (state.round !== lastRound.current) {
      lastRound.current = state.round;
      setAnswers(state.config ? state.config.fields.map(() => "") : []);
    }
  }, [state]);

  const configKey = state?.config
    ? `${state.config.seconds}|${state.config.fields.map((field) => field.label).join(",")}`
    : "";

  useEffect(() => {
    if (dirty || !state?.config) return;
    setDraft({ seconds: state.config.seconds, fields: state.config.fields });
  }, [configKey, dirty, state?.config]);

  const self = useMemo(() => state?.players.find((player) => player.isSelf) ?? null, [state]);

  const remaining = useMemo(() => {
    if (!state || state.status !== "playing" || state.roundClosed) return 0;
    const drift = Math.floor((now - syncedAt) / 1000);
    return Math.max(0, state.secondsLeft - drift);
  }, [state, now, syncedAt]);

  const run = async (action: () => Promise<unknown>, fallback: string) => {
    setBusy(true);
    try {
      await action();
      await refresh();
    } catch (caught) {
      toast.error(errorMessage(caught) || fallback);
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!state?.config) return;
    setBusy(true);
    try {
      await submitStopRoomAnswers({ data: { code, answers } });
      await refresh();
    } catch (caught) {
      toast.error(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const startRound = (extra?: () => Promise<unknown>) =>
    void run(async () => {
      if (extra) await extra();
      await startStopRoomRound({ data: { code } });
      setDirty(false);
    }, "Não foi possível abrir a rodada.");

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`Código ${code} copiado.`);
    } catch {
      toast.info(`Código da arena: ${code}`);
    }
  };

  if (!roomCodeValid(code)) return <ArenaShell code="—" error="Código de arena inválido." />;
  if (loading) return <ArenaShell code={code} />;

  if (!user) {
    return (
      <ArenaShell code={code}>
        <div className="arena-gate">
          <Swords className="size-6" aria-hidden />
          <h1>Entre para entrar no ringue</h1>
          <p>
            O placar de cada partida fica no seu perfil. Sem conta dá para assistir, mas não para
            jogar.
          </p>
          <Link to="/auth" className="arena-btn arena-btn--primary">
            Entrar na arena
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        </div>
      </ArenaShell>
    );
  }

  if (error && !state) return <ArenaShell code={code} error={error} />;
  if (!state) return <ArenaShell code={code} />;

  const fields = state.config?.fields ?? [];
  const playing = state.status === "playing";
  const spectating = playing && !state.roundClosed && state.selfSpectator;
  const answering = playing && !state.roundClosed && state.selfPlaying && !self?.submitted;

  return (
    <ArenaShell code={code} status={state.status}>
      <ArenaHud code={code} state={state} remaining={remaining} onCopy={() => void copyCode()} />

      <div className="arena-grid">
        <div className="arena-main">
          {state.status === "lobby" && (
            <LobbyArena
              state={state}
              code={code}
              config={state.config}
              draft={draft}
              dirty={dirty}
              busy={busy}
              onChange={(next) => {
                setDraft(next);
                setDirty(true);
              }}
              onResetDirty={() => setDirty(false)}
              onDraw={() =>
                void run(async () => {
                  await drawStopRoomRound({ data: { code } });
                  setDirty(false);
                }, "Não foi possível sortear as perguntas.")
              }
              onApply={() =>
                void run(async () => {
                  await configureStopRoom({
                    data: { code, seconds: draft.seconds, fields: draft.fields, auto: false },
                  });
                  setDirty(false);
                }, "Não foi possível salvar as perguntas.")
              }
              onStart={() =>
                startRound(async () => {
                  if (!dirty) return;
                  await configureStopRoom({
                    data: { code, seconds: draft.seconds, fields: draft.fields, auto: false },
                  });
                })
              }
            />
          )}

          {answering && state.config && (
            <BattleStage
              letter={state.letter ?? state.config.letter}
              seconds={state.config.seconds}
              round={state.round}
              fields={fields}
              answers={answers}
              busy={busy}
              onChange={(index, value) =>
                setAnswers((previous) => {
                  const next = [...previous];
                  next[index] = value;
                  return next;
                })
              }
              onSubmit={() => void submit()}
            />
          )}

          {spectating && state.config && (
            <SpectatorBooth
              letter={state.letter ?? state.config.letter}
              fields={fields}
              round={state.round}
              remaining={remaining}
              delivered={state.players.filter((player) => player.submitted).length}
              playing={state.players.filter((player) => !player.spectator).length}
            />
          )}

          {playing && !state.roundClosed && self?.submitted && (
            <WaitingArena players={state.players.filter((player) => !player.spectator)} />
          )}

          {playing && state.roundClosed && (
            <RoundResult
              state={state}
              busy={busy}
              onNext={() => startRound()}
              onShuffle={() =>
                void run(async () => {
                  await drawStopRoomRound({ data: { code } });
                  await startStopRoomRound({ data: { code } });
                }, "Não foi possível sortear outra rodada.")
              }
              onFinish={() =>
                void run(async () => {
                  await finishStopRoom({ data: { code } });
                }, "Não foi possível encerrar a partida.")
              }
            />
          )}

          {state.status === "finished" && (
            <MatchEnd
              state={state}
              busy={busy}
              onLeave={() =>
                void run(async () => {
                  await leaveStopRoom({ data: { code } });
                  void navigate({ to: "/stop" });
                }, "Não foi possível sair da arena.")
              }
            />
          )}
        </div>

        <aside className="arena-aside">
          <Scoreboard state={state} />
          <ChatDock code={code} messages={state.messages} />
        </aside>
      </div>
    </ArenaShell>
  );
}

function ArenaHud({
  code,
  state,
  remaining,
  onCopy,
}: {
  code: string;
  state: StopRoomView;
  remaining: number;
  onCopy: () => void;
}) {
  const live = state.status === "playing" && !state.roundClosed;
  return (
    <header className="arena-hud">
      <div className="arena-hud__id">
        <span className="arena-hud__eyebrow">
          <Swords className="size-3" aria-hidden />
          Arena · sala
        </span>
        <strong className="arena-hud__code">{code}</strong>
        <button type="button" onClick={onCopy} className="arena-hud__copy">
          <Copy className="size-3" aria-hidden />
          copiar
        </button>
      </div>

      <div className="arena-hud__rounds">
        <span className="arena-hud__eyebrow">Rodada</span>
        <div className="arena-pips" aria-hidden>
          {Array.from({ length: state.totalRounds }, (_, index) => {
            const number = index + 1;
            const done = number < state.round || (number === state.round && state.roundClosed);
            const current = number === state.round && !state.roundClosed;
            return (
              <span
                key={number}
                className={done ? "arena-pip is-done" : current ? "arena-pip is-live" : "arena-pip"}
              />
            );
          })}
        </div>
        <span className="arena-hud__count">
          {Math.max(1, state.round)}
          <em>/{state.totalRounds}</em>
        </span>
      </div>

      <TimerRing remaining={remaining} total={state.config?.seconds ?? 90} live={live} />

      <div className="arena-hud__live">
        <span className={live ? "arena-live-dot is-live" : "arena-live-dot"} aria-hidden />
        <span>
          {state.status === "finished"
            ? "Partida encerrada"
            : state.status === "lobby"
              ? "Sala de espera"
              : state.roundClosed
                ? "Rodada fechada"
                : "Rodada aberta"}
        </span>
        <span className="arena-hud__meta">
          {state.players.length}/{STOP_ROOM_LIMITS.maxPlayers}
        </span>
      </div>
    </header>
  );
}

function TimerRing({
  remaining,
  total,
  live,
}: {
  remaining: number;
  total: number;
  live: boolean;
}) {
  const ratio = total > 0 ? Math.min(1, Math.max(0, remaining / total)) : 0;
  const circumference = 2 * Math.PI * 26;
  const tone = !live ? "is-idle" : remaining <= 10 ? "is-danger" : remaining <= 25 ? "is-warn" : "";
  return (
    <div className={`arena-timer ${tone}`} role="timer" aria-live="off">
      <svg viewBox="0 0 64 64" aria-hidden>
        <circle className="arena-timer__track" cx="32" cy="32" r="26" />
        <circle
          className="arena-timer__arc"
          cx="32"
          cy="32"
          r="26"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
        />
      </svg>
      <span className="arena-timer__value">
        {live ? remaining : "—"}
        {live && <em>s</em>}
      </span>
      {!live && <Timer className="arena-timer__icon" aria-hidden />}
    </div>
  );
}

function Scoreboard({ state }: { state: StopRoomView }) {
  const leader = state.ranking[0]?.total ?? 0;
  return (
    <section className="arena-board" aria-label="Placar ao vivo">
      <header className="arena-board__head">
        <h2>
          Placar
          {state.status === "playing" && !state.roundClosed && (
            <span className="arena-board__live">ao vivo</span>
          )}
        </h2>
        <span className="arena-board__round">
          rodada {Math.max(1, state.round)}/{state.totalRounds}
        </span>
      </header>

      {state.ranking.length === 0 ? (
        <p className="arena-board__empty">Ninguém no ringue ainda.</p>
      ) : (
        <ol className="arena-board__list">
          {state.ranking.map((player, index) => {
            const width = leader > 0 ? Math.max(4, Math.round((player.total / leader) * 100)) : 0;
            return (
              <li
                key={player.userId}
                className={
                  player.isSelf
                    ? "arena-board__row is-self"
                    : player.spectator
                      ? "arena-board__row is-spectator"
                      : "arena-board__row"
                }
              >
                <span className="arena-board__pos">{index + 1}</span>
                <span
                  className="arena-board__avatar"
                  style={{ "--avatar-hue": avatarHue(player.name) } as React.CSSProperties}
                  aria-hidden
                >
                  {player.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="arena-board__who">
                  <span className="arena-board__name">
                    {player.name}
                    {player.isHost && <Crown className="size-3" aria-label="anfitrião" />}
                    {player.spectator && <Eye className="size-3" aria-label="espectador" />}
                    {player.isSelf && <em>você</em>}
                  </span>
                  <span className="arena-board__bar" aria-hidden>
                    <span style={{ width: `${width}%` }} />
                  </span>
                </span>
                <span className="arena-board__delta">
                  {player.roundScore !== null && player.roundScore !== undefined
                    ? `+${player.roundScore}`
                    : ""}
                </span>
                <strong className="arena-board__total">{player.total}</strong>
              </li>
            );
          })}
        </ol>
      )}

      <footer className="arena-board__foot">
        <span>10 inédita · 5 repetida</span>
        <span>10 rodadas</span>
      </footer>
    </section>
  );
}

function avatarHue(name: string): number {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) % 360;
  }
  return hash;
}

function ChatDock({ code, messages }: { code: string; messages: StopRoomMessageView[] }) {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages.length]);

  const send = async () => {
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await sendStopRoomMessage({ data: { code, body: text } });
      setBody("");
    } catch (caught) {
      toast.error(errorMessage(caught));
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="arena-chat" aria-label="Resenha da sala">
      <header className="arena-chat__head">
        <h2>Resenha</h2>
        <span className="arena-chat__count">{messages.length}</span>
      </header>

      <div className="arena-chat__list" ref={listRef} role="log" aria-live="polite">
        {messages.length === 0 ? (
          <p className="arena-chat__empty">
            Provoca a galera enquanto a rodada não abre. Aqui vale zoação, não resposta.
          </p>
        ) : (
          messages.map((message) => (
            <p
              key={message.id}
              className={message.isSelf ? "arena-chat__bubble is-self" : "arena-chat__bubble"}
              style={{ "--bubble-hue": avatarHue(message.name) } as React.CSSProperties}
            >
              <strong>{message.isSelf ? "você" : message.name}</strong>
              <span>{message.body}</span>
            </p>
          ))
        )}
      </div>

      <form
        className="arena-chat__form"
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        <input
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Manda a resenha…"
          aria-label="Mensagem da sala"
          maxLength={240}
          autoComplete="off"
        />
        <button type="submit" disabled={sending || !body.trim()} aria-label="Enviar mensagem">
          <Send className="size-4" aria-hidden />
        </button>
      </form>
    </section>
  );
}

function BattleStage({
  letter,
  seconds,
  round,
  fields,
  answers,
  busy,
  onChange,
  onSubmit,
}: {
  letter: string;
  seconds: number;
  round: number;
  fields: StopRoundField[];
  answers: string[];
  busy: boolean;
  onChange: (index: number, value: string) => void;
  onSubmit: () => void;
}) {
  const filled = answers.filter((answer) => answer.trim()).length;

  return (
    <section className="arena-stage">
      <span className="arena-stage__watermark" aria-hidden>
        rodada {String(round).padStart(2, "0")}
      </span>
      <aside className="arena-stage__plate">
        <span className="arena-stage__eyebrow">Letra da rodada</span>
        <div key={`${round}-${letter}`} className="arena-stage__letter">
          {letter}
          <span className="arena-stage__scan" aria-hidden />
        </div>
        <p className="arena-stage__meta">
          rodada {round} · {seconds}s
        </p>
        <p className="arena-stage__rule">A letra é sorteada pelo sistema. Não dá para escolher.</p>
      </aside>

      <div className="arena-stage__board">
        <div className="arena-slots">
          {fields.map((field, index) => {
            const value = answers[index] ?? "";
            const clean = value.trim();
            const matches =
              clean.length > 0 &&
              clean
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
                .startsWith(letter.toLowerCase());
            return (
              <label
                key={`${field.label}-${index}`}
                className={
                  matches ? "arena-slot is-hit" : clean ? "arena-slot is-off" : "arena-slot"
                }
              >
                <span className="arena-slot__key">{String(index + 1).padStart(2, "0")}</span>
                <span className="arena-slot__body">
                  <span className="arena-slot__label">
                    {field.label}
                    {field.hint && <em>{field.hint}</em>}
                  </span>
                  <input
                    value={value}
                    onChange={(event) => onChange(index, event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter") return;
                      event.preventDefault();
                      const inputs = event.currentTarget
                        .closest(".arena-slots")
                        ?.querySelectorAll("input");
                      const position = Array.from(inputs ?? []).indexOf(event.currentTarget);
                      const next = inputs?.[position + 1];
                      if (next) next.focus();
                      else onSubmit();
                    }}
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={60}
                    placeholder={`${letter}…`}
                    aria-label={field.label}
                  />
                </span>
                <span className="arena-slot__mark" aria-hidden>
                  {matches ? <Check className="size-4" /> : null}
                </span>
              </label>
            );
          })}
        </div>

        <footer className="arena-stage__foot">
          <div className="arena-stage__meter">
            <span className="arena-stage__count">
              <strong>{filled}</strong>/{fields.length}
            </span>
            <span className="arena-stage__track" aria-hidden>
              <span style={{ width: `${(filled / Math.max(1, fields.length)) * 100}%` }} />
            </span>
          </div>
          <button
            type="button"
            onClick={onSubmit}
            disabled={busy}
            className="arena-stop"
            aria-label="Enviar respostas e parar a rodada"
          >
            <span className="arena-stop__word">STOP</span>
            <span className="arena-stop__hint">enter</span>
          </button>
        </footer>
      </div>
    </section>
  );
}

function SpectatorBooth({
  letter,
  fields,
  round,
  remaining,
  delivered,
  playing,
}: {
  letter: string;
  fields: StopRoundField[];
  round: number;
  remaining: number;
  delivered: number;
  playing: number;
}) {
  return (
    <section className="arena-booth">
      <header className="arena-booth__head">
        <span className="arena-booth__tag">
          <Eye className="size-3.5" aria-hidden />
          Camarote
        </span>
        <span className="arena-booth__timer">{remaining}s</span>
      </header>
      <h2 className="arena-booth__title">
        Você entrou com a rodada {round} rolando — entra em campo na {round + 1}
      </h2>
      <p className="arena-booth__lead">
        Daqui você vê a letra, as perguntas e o relógio. As respostas dos outros só aparecem quando
        a rodada fecha.
      </p>

      <div className="arena-booth__board">
        <span className="arena-booth__letter">{letter}</span>
        <ul className="arena-booth__fields">
          {fields.map((field, index) => (
            <li key={`${field.label}-${index}`}>
              <strong>{field.label}</strong>
              {field.hint && <em>{field.hint}</em>}
            </li>
          ))}
        </ul>
      </div>

      <p className="arena-booth__status">
        {delivered}/{playing} entregaram · aguardando o fim da rodada
      </p>
    </section>
  );
}

function WaitingArena({ players }: { players: StopRoomPlayerView[] }) {
  const delivered = players.filter((player) => player.submitted).length;
  return (
    <section className="arena-wait">
      <div className="arena-wait__radar" aria-hidden>
        <span />
        <span />
        <span />
      </div>
      <p className="arena-wait__eyebrow">Resposta entregue</p>
      <h2 className="arena-wait__title">Aguardando a mesa fechar</h2>
      <p className="arena-wait__lead">
        O placar abre quando todos entregarem — ou quando o relógio zerar.
      </p>
      <ul className="arena-wait__list">
        {players.map((player) => (
          <li key={player.userId} className={player.submitted ? "is-in" : ""}>
            <span className="arena-wait__dot" aria-hidden />
            {player.name}
            {player.isHost && <Crown className="size-3" aria-label="anfitrião" />}
            <em>{player.submitted ? "entregou" : "na cabeça"}</em>
          </li>
        ))}
      </ul>
      <p className="arena-wait__count">
        {delivered}/{players.length}
      </p>
    </section>
  );
}

function RoundResult({
  state,
  busy,
  onNext,
  onShuffle,
  onFinish,
}: {
  state: StopRoomView;
  busy: boolean;
  onNext: () => void;
  onShuffle: () => void;
  onFinish: () => void;
}) {
  const self = state.players.find((player) => player.isSelf) ?? null;
  const fields = state.config?.fields ?? [];
  const playing = state.players.filter((player) => !player.spectator);
  const mvp = playing.reduce<StopRoomPlayerView | null>(
    (best, player) => ((player.roundScore ?? 0) > (best?.roundScore ?? -1) ? player : best),
    null,
  );
  const lastRound = state.round >= state.totalRounds;

  return (
    <section className="arena-result">
      <header className="arena-result__head">
        <div>
          <p className="arena-result__eyebrow">Rodada {state.round} fechada</p>
          <h2 className="arena-result__title">
            {mvp && (mvp.roundScore ?? 0) > 0
              ? `${mvp.isSelf ? "Você" : mvp.name} levou a rodada`
              : "Ninguém pontuou"}
          </h2>
        </div>
        <span className="arena-result__badge">
          {lastRound ? "última rodada" : `${state.totalRounds - state.round} restantes`}
        </span>
      </header>

      <div className="arena-result__grid">
        <div className="arena-result__self">
          <p className="arena-result__score">
            +{self?.roundScore ?? 0}
            <span> na rodada</span>
          </p>
          <ul className="arena-breakdown">
            {fields.map((field, index) => {
              const verdict = self?.verdicts?.[index];
              const answer = self?.answers?.[index] ?? "";
              const points = self?.fields[index] ?? 0;
              return (
                <li
                  key={`${field.label}-${index}`}
                  className={
                    points === 10
                      ? "arena-breakdown__row is-unique"
                      : points === 5
                        ? "arena-breakdown__row is-duplicate"
                        : "arena-breakdown__row is-miss"
                  }
                >
                  <span className="arena-breakdown__label">{field.label}</span>
                  <span className="arena-breakdown__answer">{answer.trim() || "—"}</span>
                  <span className="arena-breakdown__points">
                    {points === 5 ? "5 · repetiu" : points === 10 ? "10" : "0"}
                  </span>
                  {points === 0 && verdict?.reason && (
                    <em className="arena-breakdown__reason">{verdict.reason}</em>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <ol className="arena-rank">
          {state.ranking.map((player, index) => (
            <li
              key={player.userId}
              className={player.isSelf ? "arena-rank__row is-self" : "arena-rank__row"}
            >
              <span className="arena-rank__pos">{index + 1}</span>
              <span
                className="arena-rank__avatar"
                style={{ "--avatar-hue": avatarHue(player.name) } as React.CSSProperties}
                aria-hidden
              >
                {player.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="arena-rank__name">
                {player.name}
                {player.isHost && <Crown className="size-3" aria-label="anfitrião" />}
              </span>
              <span className="arena-rank__delta">+{player.roundScore ?? 0}</span>
              <strong className="arena-rank__total">{player.total}</strong>
            </li>
          ))}
        </ol>
      </div>

      <footer className="arena-actions">
        {state.isHost ? (
          <>
            <button
              type="button"
              disabled={busy || lastRound}
              onClick={onNext}
              className="arena-btn arena-btn--primary"
            >
              <Play className="size-4" aria-hidden />
              {lastRound ? "Partida completa" : `Abrir rodada ${state.round + 1}`}
            </button>
            {!lastRound && (
              <button type="button" disabled={busy} onClick={onShuffle} className="arena-btn">
                <Dices className="size-4" aria-hidden />
                Sortear outras perguntas
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={onFinish}
              className="arena-btn arena-btn--ghost"
            >
              <Flag className="size-4" aria-hidden />
              Encerrar partida
            </button>
          </>
        ) : (
          <p className="arena-actions__hint">
            <span className="arena-live-dot is-live" aria-hidden />O anfitrião abre a próxima
            rodada…
          </p>
        )}
      </footer>
    </section>
  );
}

function MatchEnd({
  state,
  busy,
  onLeave,
}: {
  state: StopRoomView;
  busy: boolean;
  onLeave: () => void;
}) {
  const podium = state.ranking.slice(0, 3);
  const rest = state.ranking.slice(3);
  const champion = podium[0] ?? null;

  return (
    <section className="arena-final">
      <header className="arena-final__head">
        <Trophy className="size-5" aria-hidden />
        <p className="arena-final__eyebrow">Partida encerrada · {state.totalRounds} rodadas</p>
        <h2 className="arena-final__title">
          {champion ? `${champion.isSelf ? "Você" : champion.name} venceu a arena` : "Sem vencedor"}
        </h2>
      </header>

      <ol className="arena-podium">
        {podium.map((player, index) => (
          <li
            key={player.userId}
            className={`arena-podium__place is-${index + 1}${player.isSelf ? " is-self" : ""}`}
          >
            <span className="arena-podium__medal">{index + 1}</span>
            <span
              className="arena-podium__avatar"
              style={{ "--avatar-hue": avatarHue(player.name) } as React.CSSProperties}
              aria-hidden
            >
              {player.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="arena-podium__name">
              {player.name}
              {player.isHost && <Crown className="size-3" aria-label="anfitrião" />}
            </span>
            <strong className="arena-podium__total">{player.total}</strong>
            <span className="arena-podium__block" aria-hidden />
          </li>
        ))}
      </ol>

      {rest.length > 0 && (
        <ol className="arena-rank arena-rank--rest">
          {rest.map((player, index) => (
            <li
              key={player.userId}
              className={player.isSelf ? "arena-rank__row is-self" : "arena-rank__row"}
            >
              <span className="arena-rank__pos">{index + 4}</span>
              <span className="arena-rank__name">{player.name}</span>
              <strong className="arena-rank__total">{player.total}</strong>
            </li>
          ))}
        </ol>
      )}

      <footer className="arena-actions">
        <Link to="/stop" className="arena-btn arena-btn--primary">
          Voltar ao Stop
          <ChevronRight className="size-4" aria-hidden />
        </Link>
        <button
          type="button"
          className="arena-btn arena-btn--ghost"
          disabled={busy}
          onClick={onLeave}
        >
          Sair da arena
        </button>
      </footer>
    </section>
  );
}

function LobbyArena({
  state,
  code,
  config,
  draft,
  dirty,
  busy,
  onChange,
  onResetDirty,
  onDraw,
  onApply,
  onStart,
}: {
  state: StopRoomView;
  code: string;
  config: StopRoomView["config"];
  draft: { seconds: number; fields: StopRoundField[] };
  dirty: boolean;
  busy: boolean;
  onChange: (next: { seconds: number; fields: StopRoundField[] }) => void;
  onResetDirty: () => void;
  onDraw: () => void;
  onApply: () => void;
  onStart: () => void;
}) {
  return (
    <section className="arena-lobby">
      <header className="arena-lobby__head">
        <p className="arena-lobby__eyebrow">Sala de espera</p>
        <h2 className="arena-lobby__title">
          Chama a galera com o código <strong>{code}</strong>
        </h2>
        <p className="arena-lobby__lead">
          Até {STOP_ROOM_LIMITS.maxPlayers} pessoas. Dez rodadas, letra sorteada a cada uma, 10
          pontos por resposta inédita e 5 se repetir com alguém.
        </p>
        <ul className="arena-roster">
          {state.players.map((player) => (
            <li key={player.userId} className={player.isSelf ? "is-self" : ""}>
              <span
                className="arena-roster__avatar"
                style={{ "--avatar-hue": avatarHue(player.name) } as React.CSSProperties}
                aria-hidden
              >
                {player.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="arena-roster__name">
                {player.name}
                {player.isSelf && <em>você</em>}
              </span>
              {player.isHost && (
                <span className="arena-roster__tag">
                  <Crown className="size-3" aria-hidden />
                  anfitrião
                </span>
              )}
              <span className="arena-roster__total">{player.total} pts</span>
            </li>
          ))}
        </ul>
      </header>

      {state.isHost ? (
        <HostLoadout
          draft={draft}
          dirty={dirty}
          busy={busy}
          round={state.round}
          totalRounds={state.totalRounds}
          onChange={onChange}
          onDraw={onDraw}
          onApply={onApply}
          onStart={onStart}
          onResetDirty={onResetDirty}
        />
      ) : (
        <div className="arena-preview">
          <h3>Perguntas escolhidas</h3>
          {config ? (
            <>
              <p className="arena-preview__meta">
                {config.seconds}s por rodada · {config.fields.length} categorias
                {config.auto && <span className="arena-preview__tag">sorteadas</span>}
              </p>
              <ul className="arena-preview__fields">
                {config.fields.map((field, index) => (
                  <li key={`${field.label}-${index}`}>
                    <strong>{field.label}</strong>
                    {field.hint && <em>{field.hint}</em>}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="arena-preview__empty">
              O anfitrião ainda está montando o arsenal. Vai chamando o pessoal.
            </p>
          )}
          <p className="arena-preview__hint">
            <span className="arena-live-dot is-live" aria-hidden />A rodada abre para todos no mesmo
            instante.
          </p>
        </div>
      )}
    </section>
  );
}

function HostLoadout({
  draft,
  dirty,
  busy,
  round,
  totalRounds,
  onChange,
  onDraw,
  onApply,
  onStart,
  onResetDirty,
}: {
  draft: { seconds: number; fields: StopRoundField[] };
  dirty: boolean;
  busy: boolean;
  round: number;
  totalRounds: number;
  onChange: (next: { seconds: number; fields: StopRoundField[] }) => void;
  onDraw: () => void;
  onApply: () => void;
  onStart: () => void;
  onResetDirty: () => void;
}) {
  const [customLabel, setCustomLabel] = useState("");
  const [customHint, setCustomHint] = useState("");

  const has = (label: string) =>
    draft.fields.some((field) => field.label.toLowerCase() === label.toLowerCase());

  const toggle = (label: string, hint: string) => {
    if (has(label)) {
      onChange({ ...draft, fields: draft.fields.filter((field) => field.label !== label) });
      return;
    }
    onChange({ ...draft, fields: [...draft.fields, { label, hint }] });
  };

  const addCustom = () => {
    const label = customLabel.trim();
    if (label.length < 2) {
      toast.error("Dê um nome à categoria (2+ letras).");
      return;
    }
    if (has(label)) {
      toast.error("Essa categoria já está no arsenal.");
      return;
    }
    onChange({ ...draft, fields: [...draft.fields, { label, hint: customHint.trim() }] });
    setCustomLabel("");
    setCustomHint("");
  };

  const full = draft.fields.length >= STOP_ROOM_LIMITS.maxFields;
  const enough = draft.fields.length >= STOP_ROOM_LIMITS.minFields;

  return (
    <div className="arena-loadout">
      <div className="arena-loadout__bar">
        <label className="arena-loadout__clock">
          <span>Relógio</span>
          <select
            value={draft.seconds}
            onChange={(event) => onChange({ ...draft, seconds: Number(event.target.value) })}
          >
            {[45, 60, 75, 90, 120, 150].map((seconds) => (
              <option key={seconds} value={seconds}>
                {seconds}s
              </option>
            ))}
          </select>
        </label>

        <p className="arena-loadout__hint">
          <Dices className="size-3.5" aria-hidden />A letra é sorteada pelo sistema a cada rodada —
          nenhuma se repete.{" "}
          <strong>
            rodada {Math.min(round + 1, totalRounds)} de {totalRounds}
          </strong>
        </p>

        <button type="button" onClick={onDraw} disabled={busy} className="arena-btn">
          <Dices className="size-4" aria-hidden />
          Sortear categorias
        </button>
      </div>

      <fieldset className="arena-loadout__catalog">
        <legend>Arsenal de categorias</legend>
        <div className="arena-loadout__chips">
          {STOP_CATEGORY_LIST.map((category) => {
            const active = has(category.label);
            return (
              <button
                key={category.id}
                type="button"
                aria-pressed={active}
                onClick={() => toggle(category.label, category.hint)}
                disabled={!active && full}
                className={active ? "arena-chip is-on" : "arena-chip"}
              >
                {category.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="arena-loadout__custom">
        <p className="arena-loadout__label">Categoria caseira</p>
        <div className="arena-loadout__row">
          <input
            value={customLabel}
            onChange={(event) => setCustomLabel(event.target.value)}
            placeholder="Ex.: Música que começa com…"
            aria-label="Nome da categoria"
            maxLength={STOP_ROOM_LIMITS.labelMax}
          />
          <input
            value={customHint}
            onChange={(event) => setCustomHint(event.target.value)}
            placeholder="Dica (opcional)"
            aria-label="Dica da categoria"
            maxLength={STOP_ROOM_LIMITS.hintMax}
          />
          <button type="button" onClick={addCustom} disabled={full} className="arena-btn">
            <Plus className="size-4" aria-hidden />
            Adicionar
          </button>
        </div>
      </div>

      <div className="arena-loadout__chosen">
        <p className="arena-loadout__label">
          No arsenal <strong>{draft.fields.length}</strong>/{STOP_ROOM_LIMITS.maxFields}
        </p>
        {draft.fields.length === 0 ? (
          <p className="arena-preview__empty">
            Nada escolhido ainda — marca no arsenal, escreve a sua ou sorteia tudo.
          </p>
        ) : (
          <ol className="arena-loadout__list">
            {draft.fields.map((field, index) => (
              <li key={`${field.label}-${index}`}>
                <span className="arena-loadout__num">{String(index + 1).padStart(2, "0")}</span>
                <span>
                  {field.label}
                  {field.hint && <em>{field.hint}</em>}
                </span>
                <button
                  type="button"
                  aria-label={`Remover ${field.label}`}
                  onClick={() =>
                    onChange({ ...draft, fields: draft.fields.filter((_, i) => i !== index) })
                  }
                >
                  <X className="size-3" aria-hidden />
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="arena-actions">
        <button
          type="button"
          onClick={onStart}
          disabled={busy || !enough}
          className="arena-btn arena-btn--primary arena-btn--go"
        >
          <Play className="size-4" aria-hidden />
          Começar a rodada
        </button>
        <button type="button" onClick={onApply} disabled={busy || !dirty} className="arena-btn">
          Salvar arsenal
        </button>
        {dirty && (
          <button type="button" onClick={onResetDirty} className="arena-btn arena-btn--ghost">
            Desfazer
          </button>
        )}
      </div>
      {!enough && (
        <p className="arena-loadout__warn">
          Escolha entre {STOP_ROOM_LIMITS.minFields} e {STOP_ROOM_LIMITS.maxFields} categorias.
        </p>
      )}
    </div>
  );
}

function ArenaShell({
  code,
  status,
  error,
  onCopy,
  children,
}: {
  code: string;
  status?: StopRoomView["status"];
  error?: string | null;
  onCopy?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className={`arena-page arena-page--${status ?? "boot"}`}>
      <div className="arena-page__sky" aria-hidden />
      <div className="arena-page__grid" aria-hidden />
      <AppHeader />
      <div className="lab-rule" aria-hidden />

      <main className="arena-shell">
        <div className="arena-topbar">
          <Link to="/stop" className="arena-back">
            <ArrowLeft className="size-4" aria-hidden />
            Stop
          </Link>
          <p className="arena-topbar__title">
            <Swords className="size-3.5" aria-hidden />
            Arena <strong>{code}</strong>
          </p>
          {onCopy && (
            <button type="button" onClick={onCopy} className="arena-topbar__copy">
              <Copy className="size-3.5" aria-hidden />
              copiar código
            </button>
          )}
        </div>

        {error ? (
          <div className="arena-gate">
            <X className="size-5" aria-hidden />
            <h1>Não deu para abrir a arena</h1>
            <p>{error}</p>
            <Link to="/stop" className="arena-btn arena-btn--primary">
              Voltar ao Stop
            </Link>
          </div>
        ) : (
          (children ?? (
            <p className="arena-boot">
              <Timer className="size-4" aria-hidden /> Entrando na arena…
            </p>
          ))
        )}
      </main>
    </div>
  );
}
