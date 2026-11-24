import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  BookOpen,
  ChevronRight,
  Flame,
  LogIn,
  Play,
  RotateCcw,
  Sparkles,
  Star,
  Swords,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { AppHeader } from "@/components/app/AppHeader";
import { CampaignMap } from "@/components/stop/CampaignMap";
import { RoomBar } from "@/components/stop/RoomBar";
import { StopArena } from "@/components/stop/StopArena";
import { useAuth } from "@/hooks/useAuth";
import { getStopCampaign, judgeStopRound, resetStopCampaign } from "@/lib/stop.functions";
import {
  STOP_CAMPAIGNS,
  STOP_CATEGORY_LIST,
  STOP_LEVELS,
  STOP_TOTAL_STARS,
  campaignState,
  campaignStars,
  isCampaignComplete,
  levelsOfCampaign,
  resolveRoundLocally,
  starThresholds,
  stopLevel,
  type StopCampaignState,
  type StopLevel,
  type StopProgressMap,
  type StopRoundResult,
} from "@/lib/stop";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/stop")({
  head: () => ({
    meta: [
      { title: "Stop — campanha de férias e sala com amigos · ScienceChat" },
      {
        name: "description",
        content:
          "Duas formas de jogar Stop: a expedição solo em cinco campanhas, com estrelas e XP, ou a sala online com até doze pessoas na mesma letra e no mesmo cronômetro.",
      },
      { property: "og:title", content: "Stop — campanha de férias e sala com amigos" },
    ],
  }),
  component: StopPage,
});

/** Progresso de quem joga sem conta: fica no navegador, sem promessa de nuvem. */
const LOCAL_KEY = "sciencechat.stop.progress.v1";

type World = "campanha" | "amigos";

function readLocalProgress(): StopProgressMap {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, { stars?: unknown; bestScore?: unknown }>;
    const clean: StopProgressMap = {};
    for (const [levelId, row] of Object.entries(parsed)) {
      const stars = Number(row?.stars);
      const bestScore = Number(row?.bestScore);
      if (!stopLevel(levelId)) continue;
      clean[levelId] = {
        stars: Number.isFinite(stars) ? Math.max(0, Math.min(3, Math.round(stars))) : 0,
        bestScore: Number.isFinite(bestScore) ? Math.max(0, Math.round(bestScore)) : 0,
      };
    }
    return clean;
  } catch {
    return {};
  }
}

function writeLocalProgress(progress: StopProgressMap) {
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(progress));
  } catch {
    // Navegador sem storage: a partida continua, só não fica guardada.
  }
}

function Fold({
  title,
  hint,
  children,
  defaultOpen = false,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={cn("hub-fold", open && "is-open")}>
      <button
        type="button"
        className="hub-fold__btn"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <ChevronRight className="hub-fold__chev" size={14} aria-hidden />
        <span className="hub-fold__title">{title}</span>
        {hint ? <span className="hub-fold__hint">{hint}</span> : null}
      </button>
      <div className="hub-fold__body">
        <div className="hub-fold__inner">{children}</div>
      </div>
    </section>
  );
}

function StopPage() {
  const { user, loading } = useAuth();
  const [campaign, setCampaign] = useState<StopCampaignState>(() => campaignState({}));
  const [playing, setPlaying] = useState<StopLevel | null>(null);
  const [resetting, setResetting] = useState(false);
  const [world, setWorld] = useState<World>("campanha");

  useEffect(() => {
    if (loading) return;
    let active = true;

    if (!user) {
      setCampaign(campaignState(readLocalProgress()));
      return () => {
        active = false;
      };
    }

    getStopCampaign()
      .then((view) => {
        if (!active) return;
        setCampaign(campaignState(view.progress));
      })
      .catch(() => {
        if (active) setCampaign(campaignState({}));
      });

    return () => {
      active = false;
    };
  }, [user, loading]);

  const handleSubmit = useCallback(
    async (answers: string[], secondsLeft: number): Promise<StopRoundResult> => {
      const level = playing;
      if (!level) throw new Error("Nenhuma fase em andamento.");

      if (user) {
        try {
          const view = await judgeStopRound({
            data: { levelId: level.id, answers, secondsLeft },
          });
          setCampaign((previous) =>
            campaignState({
              ...previous.progress,
              [level.id]: view.best,
            }),
          );
          return view;
        } catch {
          // Servidor fora do ar: a rodada continua com as regras locais.
        }
      }

      const local = resolveRoundLocally(level, answers, secondsLeft);
      const previousBest = campaign.progress[level.id] ?? { stars: 0, bestScore: 0 };
      const merged: StopProgressMap = {
        ...campaign.progress,
        [level.id]: {
          stars: Math.max(previousBest.stars, local.stars),
          bestScore: Math.max(previousBest.bestScore, local.score.total),
        },
      };
      writeLocalProgress(merged);
      const state = campaignState(merged);
      setCampaign(state);

      return {
        ...local,
        judgedByAi: false,
        best: merged[level.id] ?? { stars: 0, bestScore: 0 },
        xp: state.xp,
        rank: state.rank,
        unlocked: state.unlocked,
        nextLevelId: state.nextLevelId,
      };
    },
    [playing, user, campaign.progress],
  );

  const handleReset = async () => {
    if (!window.confirm("Apagar o progresso da expedição e voltar à primeira fase?")) return;
    setResetting(true);
    try {
      if (user) await resetStopCampaign();
      writeLocalProgress({});
      setCampaign(campaignState({}));
      toast.success("Expedição reiniciada.");
    } catch {
      toast.error("Não foi possível reiniciar agora.");
    } finally {
      setResetting(false);
    }
  };

  const doneLevels = STOP_LEVELS.filter(
    (level) => (campaign.progress[level.id]?.stars ?? 0) > 0,
  ).length;
  const complete = isCampaignComplete(campaign.progress);
  const nextLevel = campaign.nextLevelId ? stopLevel(campaign.nextLevelId) : undefined;
  const heroLevel = nextLevel ?? STOP_LEVELS[0]!;
  const heroCampaign = STOP_CAMPAIGNS.find((entry) => entry.id === heroLevel.campaign);
  const thresholds = starThresholds(heroLevel);
  const trailLevels = heroCampaign ? levelsOfCampaign(heroCampaign.id) : [];
  const trailStars = heroCampaign ? campaignStars(campaign.progress, heroCampaign.id) : 0;

  return (
    <div className={cn("stop-page stop-hub", playing && "is-playing")}>
      <div className="stop-page__sky" aria-hidden />
      <AppHeader />
      <div className="lab-rule" aria-hidden />

      <main className="hub">
        <header className="hub__head">
          <div className="hub__headtext">
            <span className="hub__kicker">
              <Flame size={13} aria-hidden />
              Stop
            </span>
            <h1 className="hub__title">
              Duas formas de <em>jogar</em>
            </h1>
          </div>

          <div className="hub__chips" aria-label="Seu progresso na expedição">
            <span className="hub-chip">
              <Swords size={12} aria-hidden />
              {campaign.rank.title}
            </span>
            <span className="hub-chip">{campaign.xp} XP</span>
            <span className="hub-chip">
              <Star size={12} aria-hidden />
              {campaign.stars}/{STOP_TOTAL_STARS}
            </span>
            <span className="hub-chip">
              {doneLevels}/{STOP_LEVELS.length} fases
            </span>
          </div>
        </header>

        <div className="hub__doors" role="tablist" aria-label="Escolha o modo de jogo">
          <button
            type="button"
            role="tab"
            aria-selected={world === "campanha"}
            onClick={() => setWorld("campanha")}
            className={cn("hub-door", "is-campanha", world === "campanha" && "is-active")}
          >
            <span className="hub-door__icon">
              <Flame size={18} aria-hidden />
            </span>
            <span className="hub-door__body">
              <span className="hub-door__kicker">Campanha de férias</span>
              <strong className="hub-door__title">Expedição Stop</strong>
              <span className="hub-door__meta">
                Cinco campanhas, quinze fases · solo, com estrelas e XP
              </span>
            </span>
            <span className="hub-door__cta">abrir</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={world === "amigos"}
            onClick={() => setWorld("amigos")}
            className={cn("hub-door", "is-amigos", world === "amigos" && "is-active")}
          >
            <span className="hub-door__icon">
              <Users size={18} aria-hidden />
            </span>
            <span className="hub-door__body">
              <span className="hub-door__kicker">Stop com amigos</span>
              <strong className="hub-door__title">Sala online</strong>
              <span className="hub-door__meta">
                Até doze pessoas · mesma letra, mesmo cronômetro
              </span>
            </span>
            <span className="hub-door__cta">abrir</span>
          </button>
        </div>

        {world === "campanha" ? (
          <section className="hub-panel is-campanha" aria-label="Campanha de férias">
            <div className="hub-hero is-campanha">
              <span className="hub-hero__mark" aria-hidden>
                {heroCampaign?.numeral}
              </span>
              <div className="hub-hero__stage">
                <div className="hub-hero__text">
                  <span className="hub-hero__label">
                    {complete ? "Expedição fechada" : "Sua próxima fase"}
                    {heroCampaign ? ` · ${heroCampaign.title}` : ""}
                  </span>
                  <h2 className="hub-hero__title">{heroLevel.title}</h2>
                  <p className="hub-hero__meta">
                    {heroLevel.seconds}s · {heroLevel.categories.length} campos · metas{" "}
                    {thresholds.join(" · ")}
                  </p>
                  <p className="hub-hero__meta hub-hero__meta--soft">{heroLevel.brief}</p>
                </div>
                <div className="hub-hero__cta">
                  <span className="hub-letter" aria-hidden>
                    {heroLevel.letter}
                  </span>
                  <button type="button" className="hub-play" onClick={() => setPlaying(heroLevel)}>
                    <Play size={16} aria-hidden />
                    {complete ? "Rejogar" : "Jogar a fase"}
                  </button>
                </div>
              </div>
              <div className="hub-trail">
                <span className="hub-trail__head">
                  <span>
                    {heroCampaign?.numeral} · {heroCampaign?.title}
                  </span>
                  <span>
                    {trailStars}/{trailLevels.length * 3} estrelas
                  </span>
                </span>
                <div className="hub-trail__row">
                  {trailLevels.map((level) => {
                    const unlocked = campaign.unlocked.includes(level.id);
                    const stars = campaign.progress[level.id]?.stars ?? 0;
                    const current = level.id === heroLevel.id;
                    return (
                      <button
                        key={level.id}
                        type="button"
                        disabled={!unlocked}
                        onClick={() => setPlaying(level)}
                        className={cn(
                          "hub-trail__step",
                          stars > 0 && "is-done",
                          current && "is-current",
                          !unlocked && "is-locked",
                        )}
                      >
                        <span className="hub-trail__letter">{level.letter}</span>
                        <span className="hub-trail__name">{level.title}</span>
                        <span className="hub-trail__stars">
                          {unlocked ? `${stars}/3` : "bloqueada"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="hub-folds">
              <Fold title="Campanhas e fases" hint="I–V · 15 fases">
                <CampaignMap state={campaign} onPlay={(level) => setPlaying(level)} />
              </Fold>

              <Fold
                title="Seu progresso"
                hint={`${campaign.xp} XP · ${campaign.stars}/${STOP_TOTAL_STARS} estrelas`}
              >
                <div className="hub-progress">
                  <div className="hub-progress__rank">
                    <strong>{campaign.rank.title}</strong>
                    <span>
                      {campaign.rank.nextTitle
                        ? `${campaign.rank.nextTitle} a partir de ${campaign.rank.nextAt} XP`
                        : "Faixa máxima da expedição"}
                    </span>
                  </div>
                  <div className="hub-progress__bar" aria-hidden>
                    <span style={{ width: `${Math.round(campaign.rank.progress * 100)}%` }} />
                  </div>
                  <div className="hub-progress__actions">
                    <button
                      type="button"
                      onClick={handleReset}
                      disabled={resetting}
                      className="hub-ghost"
                    >
                      <RotateCcw size={13} aria-hidden />
                      Recomeçar expedição
                    </button>
                    {!loading && !user ? (
                      <Link to="/auth" className="hub-ghost">
                        <LogIn size={13} aria-hidden />
                        Entrar para salvar na nuvem
                      </Link>
                    ) : null}
                  </div>
                </div>
              </Fold>

              <Fold title="Como jogar" hint="regras e pontuação">
                <div className="hub-rules">
                  {!loading && !user ? (
                    <p>
                      Sem conta, o progresso fica neste navegador e a banca usa as regras básicas.
                    </p>
                  ) : null}
                  <ul>
                    <li>Cada fase sorteia uma letra; todo campo tem de começar por ela.</li>
                    <li>
                      A banca confere categoria por categoria: nome inventado, palavra vaga e campo
                      em branco não pontuam.
                    </li>
                    <li>
                      Uma estrela por meta batida, até três; estrelas viram XP e XP vira faixa.
                    </li>
                    <li>A fase seguinte abre quando a anterior é concluída.</li>
                  </ul>
                  {complete ? (
                    <p>
                      <Sparkles size={13} aria-hidden /> Expedição fechada: rejogue para trocar uma
                      estrela por três.
                    </p>
                  ) : null}
                </div>
              </Fold>
            </div>
          </section>
        ) : (
          <section className="hub-panel is-amigos" aria-label="Stop com amigos">
            <div className="hub-hero is-amigos">
              <div className="hub-hero__text">
                <span className="hub-hero__label">Sala online</span>
                <h2 className="hub-hero__title">Chama a galera</h2>
                <p className="hub-hero__meta">
                  Quem cria escolhe as perguntas a dedo ou deixa o sorteio decidir.
                </p>
              </div>
              <RoomBar />
            </div>

            <div className="hub-folds">
              <Fold title="Como funciona a sala" hint="10 rodadas · 10 e 5 pontos">
                <div className="hub-rules">
                  <ul>
                    <li>Todo mundo recebe a mesma letra e o mesmo cronômetro.</li>
                    <li>Resposta inédita vale 10 pontos; repetida com alguém vale 5.</li>
                    <li>A rodada fecha quando todos mandam o STOP ou o tempo acaba.</li>
                    <li>São dez rodadas; quem somar mais leva a ata da partida.</li>
                    <li>Quem entra depois assiste de camarote até a próxima rodada.</li>
                  </ul>
                </div>
              </Fold>

              <Fold title="Categorias do arsenal" hint={`${STOP_CATEGORY_LIST.length} campos`}>
                <div className="hub-cats">
                  {STOP_CATEGORY_LIST.map((category) => (
                    <span key={category.id} className="hub-cat">
                      {category.label}
                    </span>
                  ))}
                </div>
              </Fold>

              <Fold title="Antes de abrir" hint="conta e convite">
                <div className="hub-rules">
                  <ul>
                    <li>
                      É preciso entrar na conta para criar ou jogar uma sala; assistir é livre.
                    </li>
                    <li>O código tem seis caracteres e vale como convite.</li>
                    <li>O placar de cada partida fica no seu perfil.</li>
                  </ul>
                  <p>
                    <BookOpen size={13} aria-hidden /> Dica: combine o relógio (45s a 150s) antes de
                    começar; todo mundo joga no mesmo tempo.
                  </p>
                </div>
              </Fold>
            </div>
          </section>
        )}
      </main>

      {playing && (
        <StopArena
          key={playing.id}
          level={playing}
          bestScore={campaign.progress[playing.id]?.bestScore ?? 0}
          onSubmit={handleSubmit}
          onExit={() => setPlaying(null)}
          onNext={(levelId) => setPlaying(stopLevel(levelId) ?? null)}
        />
      )}
    </div>
  );
}
