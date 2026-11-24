import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Copy,
  Crown,
  Dices,
  Flag,
  LogIn,
  Play,
  Plus,
  Timer,
  Trophy,
  Users,
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
  startStopRoomRound,
  submitStopRoomAnswers,
  type StopRoomView,
} from "@/lib/stop-room.functions";

export const Route = createFileRoute("/stop_/sala/$code")({
  head: () => ({
    meta: [
      { title: "Sala do Stop — jogue com amigos · ScienceChat" },
      {
        name: "description",
        content:
          "Sala do Stop científico: o anfitrião escolhe ou sorteia as perguntas e todo mundo responde na mesma letra e no mesmo cronômetro.",
      },
    ],
  }),
  component: RoomPage,
});

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return "Não foi possível falar com a sala agora.";
}

const POLL_MS = 2000;

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
  const [draft, setDraft] = useState<{ letter: string; seconds: number; fields: StopRoundField[] }>(
    {
      letter: "",
      seconds: 90,
      fields: [],
    },
  );
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
    ? `${state.config.letter}|${state.config.seconds}|${state.config.fields
        .map((field) => field.label)
        .join(",")}`
    : "";

  useEffect(() => {
    if (dirty || !state?.config) return;
    setDraft({
      letter: state.config.letter,
      seconds: state.config.seconds,
      fields: state.config.fields,
    });
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

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`Código ${code} copiado.`);
    } catch {
      toast.info(`Código da sala: ${code}`);
    }
  };

  if (!roomCodeValid(code)) return <RoomShell code="—" error="Código de sala inválido." />;
  if (loading) return <RoomShell code={code} />;

  if (!user) {
    return (
      <RoomShell code={code}>
        <div className="room-gate">
          <LogIn className="size-5" aria-hidden />
          <p>Entre na sua conta para jogar nesta sala — o placar fica salvo no seu perfil.</p>
          <Link to="/auth" className="room-cta">
            Entrar
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        </div>
      </RoomShell>
    );
  }

  if (error && !state) return <RoomShell code={code} error={error} />;
  if (!state) return <RoomShell code={code} />;

  const config = state.config;
  const fields = config?.fields ?? [];
  const selfSubmitted = Boolean(self?.submitted);
  const showBoard = state.status === "playing" && !state.roundClosed && !selfSubmitted && config;

  return (
    <RoomShell code={code} onCopy={() => void copyCode()}>
      <header className="room-head">
        <div className="room-head__id">
          <span className="room-head__label">Sala</span>
          <strong className="room-head__code">{code}</strong>
          <button type="button" onClick={() => void copyCode()} className="room-head__copy">
            <Copy className="size-3.5" aria-hidden />
            copiar
          </button>
        </div>

        <div className="room-head__meta">
          <span className={`room-chip room-chip--${state.status}`}>
            {state.status === "lobby"
              ? "Preparando"
              : state.status === "playing"
                ? "Rodada aberta"
                : "Encerrada"}
          </span>
          <span className="room-chip">
            <Users className="size-3" aria-hidden />
            {state.players.length}/{STOP_ROOM_LIMITS.maxPlayers}
          </span>
          {state.round > 0 && <span className="room-chip">rodada {state.round}</span>}
          {state.status === "playing" && !state.roundClosed && (
            <span className={`room-timer ${remaining <= 15 ? "is-warn" : ""}`}>
              <Timer className="size-3.5" aria-hidden />
              {remaining}s
            </span>
          )}
        </div>
      </header>

      {showBoard && config && (
        <section className="room-board-wrap">
          <div className="stop-board">
            <div className="stop-board__letter" aria-hidden>
              {config.letter}
            </div>

            <div className="stop-board__fields">
              {fields.map((field, index) => {
                const value = answers[index] ?? "";
                const startsRight =
                  value.trim().length > 0 &&
                  value
                    .trim()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .toLowerCase()
                    .startsWith(config.letter.toLowerCase());
                return (
                  <label key={`${field.label}-${index}`} className="stop-field">
                    <span className="stop-field__label">
                      {field.label}
                      {field.hint && <em>{field.hint}</em>}
                    </span>
                    <div className="stop-field__input">
                      <input
                        value={value}
                        onChange={(event) =>
                          setAnswers((previous) => {
                            const next = [...previous];
                            next[index] = event.target.value;
                            return next;
                          })
                        }
                        onKeyDown={(event) => {
                          if (event.key !== "Enter") return;
                          event.preventDefault();
                          const inputs = event.currentTarget
                            .closest(".stop-board__fields")
                            ?.querySelectorAll("input");
                          const position = Array.from(inputs ?? []).indexOf(event.currentTarget);
                          const next = inputs?.[position + 1];
                          if (next) next.focus();
                          else void submit();
                        }}
                        autoComplete="off"
                        spellCheck={false}
                        maxLength={60}
                        placeholder={`${config.letter}…`}
                        aria-label={field.label}
                      />
                      <span className="stop-field__mark" aria-hidden>
                        {startsRight ? <Check className="size-3.5" /> : null}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>

            <footer className="stop-board__foot">
              <div className="stop-board__stats">
                <span>
                  <strong>
                    {answers.filter((answer) => answer.trim()).length}/{fields.length}
                  </strong>{" "}
                  preenchidos
                </span>
                <span>
                  letra <strong>{config.letter}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={busy}
                className="stop-stop-btn"
              >
                STOP!
              </button>
            </footer>
          </div>
        </section>
      )}

      {state.status === "playing" && !state.roundClosed && selfSubmitted && (
        <section className="room-wait">
          <div className="room-wait__pulse" aria-hidden>
            <span />
            <span />
            <span />
          </div>
          <h2 className="room-wait__title">Resposta entregue</h2>
          <p className="room-wait__lead">
            {state.players.filter((player) => player.submitted).length}/{state.players.length}{" "}
            jogadores já entregaram. O placar abre quando todos fecharem — ou quando o tempo acabar.
          </p>
          <ul className="room-wait__list">
            {state.players.map((player) => (
              <li key={player.userId} className={player.submitted ? "is-in" : ""}>
                {player.submitted ? (
                  <Check className="size-3" aria-hidden />
                ) : (
                  <Timer className="size-3" aria-hidden />
                )}
                {player.name}
                {player.isHost && <Crown className="size-3" aria-label="anfitrião" />}
              </li>
            ))}
          </ul>
        </section>
      )}

      {state.status === "playing" && state.roundClosed && (
        <section className="room-result">
          <h2 className="room-result__title">Placar da rodada {state.round}</h2>
          <div className="room-result__grid">
            {self && (
              <div className="room-result__self">
                <p className="room-result__score">{self.roundScore ?? 0}</p>
                <p className="room-result__caption">seus pontos na rodada</p>
                {self.verdicts && config && (
                  <ul className="stop-verdicts">
                    {fields.map((field, index) => {
                      const verdict = self.verdicts?.[index];
                      const answer = self.answers?.[index] ?? "";
                      return (
                        <li
                          key={`${field.label}-${index}`}
                          className={verdict?.valid ? "stop-verdict is-ok" : "stop-verdict is-no"}
                        >
                          <span className="stop-verdict__icon" aria-hidden>
                            {verdict?.valid ? (
                              <Check className="size-3" />
                            ) : (
                              <X className="size-3" />
                            )}
                          </span>
                          <span className="stop-verdict__label">{field.label}</span>
                          <span className="stop-verdict__answer">{answer.trim() || "—"}</span>
                          {!verdict?.valid && verdict?.reason && (
                            <em className="stop-verdict__reason">{verdict.reason}</em>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}

            <ol className="room-ranking">
              {state.ranking.map((player, index) => (
                <li key={player.userId} className={player.isSelf ? "is-self" : ""}>
                  <span className="room-ranking__pos">{index + 1}</span>
                  <span className="room-ranking__name">
                    {player.name}
                    {player.isHost && <Crown className="size-3" aria-label="anfitrião" />}
                  </span>
                  <span className="room-ranking__round">+{player.roundScore ?? 0}</span>
                  <strong className="room-ranking__total">{player.total}</strong>
                </li>
              ))}
            </ol>
          </div>

          <div className="room-actions">
            {state.isHost ? (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await startStopRoomRound({ data: { code } });
                    }, "Não foi possível começar a próxima rodada.")
                  }
                  className="room-cta"
                >
                  <Play className="size-4" aria-hidden />
                  Próxima rodada
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await drawStopRoomRound({ data: { code } });
                      await startStopRoomRound({ data: { code } });
                    }, "Não foi possível sortear outra rodada.")
                  }
                  className="room-ghost"
                >
                  <Dices className="size-4" aria-hidden />
                  Sortear outra
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await finishStopRoom({ data: { code } });
                    }, "Não foi possível encerrar.")
                  }
                  className="room-ghost"
                >
                  <Flag className="size-4" aria-hidden />
                  Encerrar sala
                </button>
              </>
            ) : (
              <p className="room-actions__hint">Aguardando o anfitrião abrir a próxima rodada…</p>
            )}
          </div>
        </section>
      )}

      {state.status === "lobby" && (
        <section className="room-lobby">
          <div className="room-lobby__players">
            <h2 className="room-section-title">
              <Users className="size-4" aria-hidden />
              Quem está na sala
            </h2>
            <ul className="room-players">
              {state.players.map((player) => (
                <li key={player.userId}>
                  <span className="room-players__avatar" aria-hidden>
                    {player.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="room-players__name">
                    {player.name}
                    {player.isSelf && <em> você</em>}
                  </span>
                  {player.isHost && (
                    <span className="room-players__host">
                      <Crown className="size-3" aria-hidden />
                      anfitrião
                    </span>
                  )}
                  <span className="room-players__total">{player.total} pts</span>
                </li>
              ))}
            </ul>
            <p className="room-players__hint">
              Manda o código <strong>{code}</strong> no grupo. Até {STOP_ROOM_LIMITS.maxPlayers}{" "}
              pessoas na mesma sala.
            </p>
          </div>

          <div className="room-lobby__setup">
            <h2 className="room-section-title">
              {state.isHost ? "Perguntas desta rodada" : "Perguntas escolhidas"}
            </h2>

            {state.isHost ? (
              <HostSetup
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
                  }, "Não foi possível sortear.")
                }
                onApply={() =>
                  void run(async () => {
                    await configureStopRoom({
                      data: {
                        code,
                        letter: draft.letter,
                        seconds: draft.seconds,
                        fields: draft.fields,
                        auto: false,
                      },
                    });
                    setDirty(false);
                  }, "Não foi possível salvar as perguntas.")
                }
                onStart={() =>
                  void run(async () => {
                    await configureStopRoom({
                      data: {
                        code,
                        letter: draft.letter,
                        seconds: draft.seconds,
                        fields: draft.fields,
                        auto: false,
                      },
                    });
                    await startStopRoomRound({ data: { code } });
                    setDirty(false);
                  }, "Não foi possível começar a rodada.")
                }
              />
            ) : (
              <div className="room-preview">
                {config ? (
                  <>
                    <p className="room-preview__letter">
                      Letra <strong>{config.letter}</strong> · {config.seconds}s
                      {config.auto && <span className="room-preview__tag">sorteada</span>}
                    </p>
                    <ul className="room-preview__fields">
                      {config.fields.map((field, index) => (
                        <li key={`${field.label}-${index}`}>
                          <strong>{field.label}</strong>
                          {field.hint && <span>{field.hint}</span>}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="room-preview__empty">
                    O anfitrião ainda está escolhendo as perguntas. Pode ir chamando o pessoal.
                  </p>
                )}
                <p className="room-actions__hint">
                  <Timer className="size-3.5" aria-hidden /> A rodada abre para todos ao mesmo
                  tempo.
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {state.status === "finished" && (
        <section className="room-result">
          <h2 className="room-result__title">
            <Trophy className="size-4" aria-hidden /> Placar final
          </h2>
          <ol className="room-ranking">
            {state.ranking.map((player, index) => (
              <li key={player.userId} className={player.isSelf ? "is-self" : ""}>
                <span className="room-ranking__pos">{index + 1}</span>
                <span className="room-ranking__name">
                  {player.name}
                  {player.isHost && <Crown className="size-3" aria-label="anfitrião" />}
                </span>
                <strong className="room-ranking__total">{player.total}</strong>
              </li>
            ))}
          </ol>
          <div className="room-actions">
            <Link to="/stop" className="room-cta">
              Voltar ao Stop
              <ChevronRight className="size-4" aria-hidden />
            </Link>
            <button
              type="button"
              className="room-ghost"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await leaveStopRoom({ data: { code } });
                  void navigate({ to: "/stop" });
                }, "Não foi possível sair.")
              }
            >
              Sair da sala
            </button>
          </div>
        </section>
      )}
    </RoomShell>
  );
}

function RoomShell({
  code,
  error,
  onCopy,
  children,
}: {
  code: string;
  error?: string | null;
  onCopy?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="stop-page">
      <div className="stop-page__sky" aria-hidden />
      <AppHeader />
      <div className="lab-rule" aria-hidden />

      <main className="stop-shell room-shell">
        <div className="room-topbar">
          <Link to="/stop" className="room-back">
            <ArrowLeft className="size-4" aria-hidden />
            Stop
          </Link>
          <p className="room-topbar__title">
            Sala <strong>{code}</strong>
          </p>
        </div>

        {error ? (
          <div className="room-error">
            <X className="size-5" aria-hidden />
            <p>{error}</p>
            <Link to="/stop" className="room-cta">
              Voltar
            </Link>
          </div>
        ) : (
          (children ?? (
            <p className="room-loading">
              <Timer className="size-4" aria-hidden /> Abrindo a sala…
            </p>
          ))
        )}
      </main>
    </div>
  );
}

function HostSetup({
  draft,
  dirty,
  busy,
  onChange,
  onDraw,
  onApply,
  onStart,
  onResetDirty,
}: {
  draft: { letter: string; seconds: number; fields: StopRoundField[] };
  dirty: boolean;
  busy: boolean;
  onChange: (next: { letter: string; seconds: number; fields: StopRoundField[] }) => void;
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
      toast.error("Dê um nome à pergunta (2+ letras).");
      return;
    }
    if (has(label)) {
      toast.error("Essa pergunta já está na rodada.");
      return;
    }
    onChange({ ...draft, fields: [...draft.fields, { label, hint: customHint.trim() }] });
    setCustomLabel("");
    setCustomHint("");
  };

  const full = draft.fields.length >= STOP_ROOM_LIMITS.maxFields;
  const enough = draft.fields.length >= STOP_ROOM_LIMITS.minFields;
  const letterOk = /^[A-Z]$/.test(draft.letter);

  return (
    <div className="room-setup">
      <div className="room-setup__row">
        <label className="room-setup__letter">
          <span>Letra</span>
          <select
            value={draft.letter}
            onChange={(event) => onChange({ ...draft, letter: event.target.value })}
          >
            <option value="">—</option>
            {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) => (
              <option key={letter} value={letter}>
                {letter}
              </option>
            ))}
          </select>
        </label>

        <label className="room-setup__seconds">
          <span>Tempo</span>
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

        <button
          type="button"
          onClick={onDraw}
          disabled={busy}
          className="room-ghost room-setup__draw"
        >
          <Dices className="size-4" aria-hidden />
          Sortear tudo
        </button>
      </div>

      <fieldset className="room-setup__catalog">
        <legend>Categorias do catálogo</legend>
        <div className="room-setup__chips">
          {STOP_CATEGORY_LIST.map((category) => {
            const active = has(category.label);
            return (
              <button
                key={category.id}
                type="button"
                aria-pressed={active}
                onClick={() => toggle(category.label, category.hint)}
                disabled={!active && full}
                className={active ? "room-chip-toggle is-on" : "room-chip-toggle"}
              >
                {category.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="room-setup__custom">
        <p className="room-setup__label">Escreva a sua</p>
        <div className="room-setup__custom-row">
          <input
            value={customLabel}
            onChange={(event) => setCustomLabel(event.target.value)}
            placeholder="Pergunta (ex.: Música que começa com…)"
            aria-label="Nome da pergunta"
            maxLength={STOP_ROOM_LIMITS.labelMax}
          />
          <input
            value={customHint}
            onChange={(event) => setCustomHint(event.target.value)}
            placeholder="Dica (opcional)"
            aria-label="Dica da pergunta"
            maxLength={STOP_ROOM_LIMITS.hintMax}
          />
          <button type="button" onClick={addCustom} disabled={full} className="room-ghost">
            <Plus className="size-4" aria-hidden />
            Adicionar
          </button>
        </div>
      </div>

      <div className="room-setup__chosen">
        <p className="room-setup__label">
          Na rodada <strong>{draft.fields.length}</strong>/{STOP_ROOM_LIMITS.maxFields}
        </p>
        {draft.fields.length === 0 ? (
          <p className="room-preview__empty">
            Nenhuma pergunta ainda — marque no catálogo, escreva a sua ou sorteie.
          </p>
        ) : (
          <ol className="room-setup__list">
            {draft.fields.map((field, index) => (
              <li key={`${field.label}-${index}`}>
                <span>{field.label}</span>
                {field.hint && <em>{field.hint}</em>}
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

      <div className="room-actions">
        <button
          type="button"
          onClick={onStart}
          disabled={busy || !enough || !letterOk}
          className="room-cta"
        >
          <Play className="size-4" aria-hidden />
          Começar rodada
        </button>
        <button type="button" onClick={onApply} disabled={busy || !dirty} className="room-ghost">
          Salvar perguntas
        </button>
        {dirty && (
          <button type="button" onClick={onResetDirty} className="room-ghost">
            Desfazer
          </button>
        )}
      </div>
      {!enough && (
        <p className="room-setup__hint">
          Escolha pelo menos {STOP_ROOM_LIMITS.minFields} perguntas (máximo{" "}
          {STOP_ROOM_LIMITS.maxFields}).
        </p>
      )}
    </div>
  );
}
