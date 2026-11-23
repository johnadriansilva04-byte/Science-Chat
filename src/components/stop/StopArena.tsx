import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  RotateCcw,
  Sparkles,
  Star,
  Trophy,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  STOP_SCORING,
  localStopVerdict,
  scoreStopRound,
  starThresholds,
  stopCategory,
  type StopLevel,
  type StopRoundResult,
} from "@/lib/stop";

const JUDGING_PHRASES = [
  "Conferindo se o nome existe…",
  "Separando método de palavra vaga…",
  "Consultando o arquivo do instituto…",
  "Fechando a ata da banca…",
];

function TimerRing({ remaining, total }: { remaining: number; total: number }) {
  const ratio = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0;
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  return (
    <div
      className={cn(
        "stop-timer",
        ratio <= 0.34 && "is-warn",
        ratio <= 0.15 && "is-danger",
      )}
      role="timer"
      aria-live="off"
      aria-label={`${remaining} segundos restantes`}
    >
      <svg viewBox="0 0 64 64" aria-hidden>
        <circle cx="32" cy="32" r={radius} className="stop-timer__track" />
        <circle
          cx="32"
          cy="32"
          r={radius}
          className="stop-timer__fill"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
        />
      </svg>
      <span className="stop-timer__value">{remaining}</span>
    </div>
  );
}

type Props = {
  level: StopLevel;
  bestScore: number;
  onSubmit: (answers: string[], secondsLeft: number) => Promise<StopRoundResult>;
  onExit: () => void;
  onNext: (levelId: string) => void;
};

type Phase = "brief" | "playing" | "judging" | "result";

export function StopArena({ level, bestScore, onSubmit, onExit, onNext }: Props) {
  const [phase, setPhase] = useState<Phase>("brief");
  const [answers, setAnswers] = useState<string[]>(() => level.categories.map(() => ""));
  const [remaining, setRemaining] = useState(level.seconds);
  const [result, setResult] = useState<StopRoundResult | null>(null);
  const [phrase, setPhrase] = useState(0);
  const [runId, setRunId] = useState(0);

  const answersRef = useRef(answers);
  const submittedRef = useRef(false);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const total = level.categories.length;
  const [one, , three] = starThresholds(level);

  const filled = answers.filter((answer) => answer.trim()).length;
  const locallyValid = useMemo(
    () =>
      answers.filter((answer, index) => {
        const category = level.categories[index];
        if (!category) return false;
        return localStopVerdict(answer, level.letter).valid;
      }).length,
    [answers, level.categories, level.letter],
  );
  const preview = useMemo(
    () =>
      scoreStopRound({
        total,
        valid: locallyValid,
        secondsLeft: remaining,
        secondsLimit: level.seconds,
      }).total,
    [locallyValid, remaining, total, level.seconds],
  );

  const submit = useCallback(
    async (secondsLeft: number) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setPhase("judging");
      try {
        const view = await onSubmit(answersRef.current, Math.max(0, Math.min(level.seconds, secondsLeft)));
        setResult(view);
      } catch {
        setResult(null);
      } finally {
        setPhase("result");
      }
    },
    [level.seconds, onSubmit],
  );

  // Cronômetro por relógio de parede: aba em segundo plano não ganha tempo.
  useEffect(() => {
    if (phase !== "playing") return;
    const startedAt = Date.now();
    const duration = level.seconds;
    setRemaining(duration);

    const tick = () => {
      const left = Math.max(0, duration - Math.floor((Date.now() - startedAt) / 1000));
      setRemaining(left);
      if (left <= 0) {
        void submit(0);
        return true;
      }
      return false;
    };

    if (tick()) return;
    const id = window.setInterval(() => {
      if (tick()) window.clearInterval(id);
    }, 250);
    return () => window.clearInterval(id);
  }, [phase, level.seconds, runId, submit]);

  useEffect(() => {
    if (phase !== "judging") return;
    const id = window.setInterval(() => setPhrase((value) => value + 1), 1400);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase === "playing") inputsRef.current[0]?.focus();
  }, [phase, runId]);

  const start = () => {
    submittedRef.current = false;
    answersRef.current = level.categories.map(() => "");
    setAnswers(level.categories.map(() => ""));
    setResult(null);
    setRemaining(level.seconds);
    setRunId((value) => value + 1);
    setPhase("playing");
  };

  const updateAnswer = (index: number, value: string) => {
    setAnswers((previous) => {
      const next = [...previous];
      next[index] = value;
      answersRef.current = next;
      return next;
    });
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const next = inputsRef.current[index + 1];
    if (next) next.focus();
    else void submit(remaining);
  };

  return (
    <div className="stop-arena" role="dialog" aria-modal="true" aria-label={`Fase ${level.title}`}>
      <div className="stop-arena__glow" aria-hidden />

      <header className="stop-arena__bar">
        <button type="button" onClick={onExit} className="stop-ghost">
          <ArrowLeft className="size-4" aria-hidden />
          Mapa
        </button>
        <div className="stop-arena__id">
          <span className="stop-arena__kicker">Fase {level.letter}</span>
          <h2 className="stop-arena__title">{level.title}</h2>
        </div>
        <div className="stop-arena__clock">
          {phase === "playing" || phase === "judging" ? (
            <TimerRing remaining={remaining} total={level.seconds} />
          ) : (
            <span className="stop-arena__limit">{level.seconds}s</span>
          )}
        </div>
      </header>

      {phase === "brief" && (
        <div className="stop-brief">
          <div className="stop-letter-card">
            <span className="stop-letter-card__kicker">Sua letra</span>
            <span className="stop-letter-card__letter">{level.letter}</span>
            <span className="stop-letter-card__meta">
              {level.categories.length} campos · {level.seconds}s
            </span>
          </div>

          <div className="stop-brief__body">
            <p className="stop-brief__lead">{level.brief}</p>
            <ul className="stop-brief__fields">
              {level.categories.map((id) => {
                const category = stopCategory(id);
                return (
                  <li key={id}>
                    <span>{category.label}</span>
                    <small>{category.hint}</small>
                  </li>
                );
              })}
            </ul>
            <div className="stop-brief__rules">
              <p>
                Cada resposta certa vale <strong>{STOP_SCORING.perAnswer}</strong> pontos. Preencher
                todos os campos vale <strong>+{STOP_SCORING.cleanRound}</strong>; o tempo que sobrar
                vale até <strong>+{STOP_SCORING.timeBonusMax}</strong>.
              </p>
              <p>
                A banca confere se o nome existe. Meta da fase: <strong>{one}</strong> para a
                primeira estrela, <strong>{three}</strong> para as três.
                {bestScore > 0 && ` Seu recorde aqui: ${bestScore}.`}
              </p>
            </div>
            <button type="button" onClick={start} className="stop-primary">
              <Sparkles className="size-4" aria-hidden />
              {bestScore > 0 ? "Jogar de novo" : "Começar a rodada"}
            </button>
          </div>
        </div>
      )}

      {(phase === "playing" || phase === "judging") && (
        <div className="stop-board">
          <div className="stop-board__letter" aria-hidden>
            {level.letter}
          </div>

          <div className="stop-board__fields">
            {level.categories.map((id, index) => {
              const category = stopCategory(id);
              const value = answers[index] ?? "";
              const verdict = value.trim() ? localStopVerdict(value, level.letter) : null;
              return (
                <label key={id} className={cn("stop-field", value.trim() && "is-filled")}>
                  <span className="stop-field__label">
                    {category.label}
                    {verdict && !verdict.valid && <em>{verdict.reason}</em>}
                  </span>
                  <div className="stop-field__input">
                    <input
                      ref={(node) => {
                        inputsRef.current[index] = node;
                      }}
                      value={value}
                      onChange={(event) => updateAnswer(index, event.target.value)}
                      onKeyDown={(event) => handleKeyDown(index, event)}
                      disabled={phase === "judging"}
                      autoComplete="off"
                      spellCheck={false}
                      maxLength={60}
                      placeholder={`${level.letter}…`}
                      aria-label={category.label}
                    />
                    <span className="stop-field__mark" aria-hidden>
                      {verdict?.valid ? <Check className="size-3.5" /> : null}
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
                  {filled}/{total}
                </strong>{" "}
                preenchidos
              </span>
              <span>
                em jogo: <strong>{preview}</strong> pts
              </span>
            </div>
            <button
              type="button"
              onClick={() => void submit(remaining)}
              disabled={phase === "judging"}
              className="stop-stop-btn"
            >
              STOP!
            </button>
          </footer>
        </div>
      )}

      {phase === "judging" && (
        <div className="stop-judging" role="status">
          <div className="stop-judging__dots" aria-hidden>
            <span />
            <span />
            <span />
          </div>
          <p className="stop-judging__title">A banca está conferindo</p>
          <p className="stop-judging__phrase">{JUDGING_PHRASES[phrase % JUDGING_PHRASES.length]}</p>
        </div>
      )}

      {phase === "result" && (
        <div className="stop-result">
          {result ? (
            <>
              <div className="stop-result__hero">
                <div className="stop-result__stars" aria-label={`${result.stars} de 3 estrelas`}>
                  {[0, 1, 2].map((index) => (
                    <Star
                      key={index}
                      className={cn("stop-result__star", index < result.stars && "is-on")}
                      style={{ animationDelay: `${index * 140}ms` }}
                      aria-hidden
                    />
                  ))}
                </div>
                <p className="stop-result__score">{result.score.total}</p>
                <p className="stop-result__caption">
                  {result.stars === 3
                    ? "Rodada de conselho: a banca aprovou sem ressalvas."
                    : result.stars === 2
                      ? "Boa rodada. Falta pouco para as três estrelas."
                      : result.stars === 1
                        ? "Fase concluída. Dá para subir a nota repetindo."
                        : "Não foi dessa vez. A meta era " + level.meta + "."}
                </p>
              </div>

              <div className="stop-result__grid">
                <ul className="stop-verdicts">
                  {level.categories.map((id, index) => {
                    const category = stopCategory(id);
                    const verdict = result.verdicts[index];
                    const answer = answers[index]?.trim();
                    return (
                      <li
                        key={id}
                        className={cn("stop-verdict", verdict?.valid ? "is-ok" : "is-no")}
                      >
                        <span className="stop-verdict__icon" aria-hidden>
                          {verdict?.valid ? <Check className="size-3.5" /> : <X className="size-3.5" />}
                        </span>
                        <span className="stop-verdict__category">{category.label}</span>
                        <span className="stop-verdict__answer">{answer || "—"}</span>
                        {!verdict?.valid && verdict?.reason && (
                          <span className="stop-verdict__reason">{verdict.reason}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>

                <aside className="stop-result__aside">
                  <div className="stop-breakdown">
                    <p>
                      <span>Respostas válidas</span>
                      <strong>
                        {result.score.base} <small>({result.score.base / STOP_SCORING.perAnswer})</small>
                      </strong>
                    </p>
                    <p>
                      <span>Rodada limpa</span>
                      <strong>{result.score.clean ? `+${result.score.clean}` : "—"}</strong>
                    </p>
                    <p>
                      <span>Bônus de tempo</span>
                      <strong>{result.score.time ? `+${result.score.time}` : "—"}</strong>
                    </p>
                  </div>

                  <div className="stop-result__rank">
                    <Trophy className="size-4" aria-hidden />
                    <div>
                      <p className="stop-result__rank-title">{result.rank.title}</p>
                      <p className="stop-result__rank-xp">{result.xp} XP na expedição</p>
                    </div>
                  </div>

                  <p className="stop-result__judge">
                    {result.judgedByAi
                      ? "Julgada pela banca de IA."
                      : "Banca offline: valeram as regras básicas."}
                  </p>

                  {result.best.bestScore === result.score.total && result.stars > 0 && (
                    <p className="stop-result__record">Novo recorde nesta fase.</p>
                  )}
                </aside>
              </div>

              <div className="stop-result__actions">
                <button type="button" onClick={start} className="stop-ghost">
                  <RotateCcw className="size-4" aria-hidden />
                  Jogar de novo
                </button>
                <button type="button" onClick={onExit} className="stop-ghost">
                  <ArrowLeft className="size-4" aria-hidden />
                  Voltar ao mapa
                </button>
                {result.nextLevelId && result.nextLevelId !== level.id && (
                  <button
                    type="button"
                    onClick={() => onNext(result.nextLevelId as string)}
                    className="stop-primary"
                  >
                    Próxima fase
                    <ArrowRight className="size-4" aria-hidden />
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="stop-result__hero">
              <p className="stop-result__caption">
                Não foi possível julgar a rodada agora. Tente de novo em instantes.
              </p>
              <button type="button" onClick={onExit} className="stop-primary">
                Voltar ao mapa
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
