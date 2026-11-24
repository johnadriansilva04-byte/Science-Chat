import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { BookOpen, Flame, LogIn, RotateCcw, Sparkles, Star, Trophy } from "lucide-react";
import { toast } from "sonner";

import { AppHeader } from "@/components/app/AppHeader";
import { CampaignIntro } from "@/components/stop/CampaignIntro";
import { CampaignMap } from "@/components/stop/CampaignMap";
import { StopArena } from "@/components/stop/StopArena";
import { useAuth } from "@/hooks/useAuth";
import { getStopCampaign, judgeStopRound, resetStopCampaign } from "@/lib/stop.functions";
import {
  STOP_LEVELS,
  STOP_TOTAL_STARS,
  campaignState,
  isCampaignComplete,
  resolveRoundLocally,
  stopLevel,
  type StopCampaignState,
  type StopLevel,
  type StopProgressMap,
  type StopRoundResult,
} from "@/lib/stop";

export const Route = createFileRoute("/stop")({
  head: () => ({
    meta: [
      { title: "Stop científico — expedição em 12 fases · ScienceChat" },
      {
        name: "description",
        content:
          "O Stop de sempre com categorias de ciência, agora como campanha: 12 fases, quatro eras, estrelas, XP e uma banca de IA que confere cada resposta.",
      },
      { property: "og:title", content: "Stop científico — expedição em 12 fases" },
    ],
  }),
  component: StopPage,
});

/** Progresso de quem joga sem conta: fica no navegador, sem promessa de nuvem. */
const LOCAL_KEY = "sciencechat.stop.progress.v1";
/** A abertura aparece uma vez; depois fica a um clique em "Como jogar". */
const INTRO_KEY = "sciencechat.stop.intro.v1";

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

function StopPage() {
  const { user, loading } = useAuth();
  const [campaign, setCampaign] = useState<StopCampaignState>(() => campaignState({}));
  const [playing, setPlaying] = useState<StopLevel | null>(null);
  const [ready, setReady] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [intro, setIntro] = useState(true);

  useEffect(() => {
    if (loading) return;
    let active = true;

    if (!user) {
      setCampaign(campaignState(readLocalProgress()));
      setReady(true);
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
      })
      .finally(() => {
        if (active) setReady(true);
      });

    return () => {
      active = false;
    };
  }, [user, loading]);

  useEffect(() => {
    if (!ready) return;
    try {
      if (window.localStorage.getItem(INTRO_KEY)) setIntro(false);
    } catch {
      // Sem storage: a abertura continua visível.
    }
  }, [ready]);

  const enterCampaign = useCallback(() => {
    try {
      window.localStorage.setItem(INTRO_KEY, "1");
    } catch {
      // Sem storage: a abertura volta na próxima visita, nada quebra.
    }
    setIntro(false);
  }, []);

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

  const complete = isCampaignComplete(campaign.progress);
  const doneLevels = STOP_LEVELS.filter(
    (level) => (campaign.progress[level.id]?.stars ?? 0) > 0,
  ).length;

  return (
    <div className="stop-page">
      <div className="stop-page__sky" aria-hidden />
      <AppHeader />
      <div className="lab-rule" aria-hidden />

      {intro && !playing ? (
        <CampaignIntro state={campaign} onEnter={enterCampaign} signedIn={Boolean(user)} />
      ) : (
        <main className="stop-shell">
          <header className="stop-head">
            <div className="stop-head__text">
              <span className="stop-head__kicker">
                <Flame className="size-3.5" aria-hidden />
                Campanha de férias
              </span>
              <h1 className="stop-head__title">
                Expedição <em>Stop</em>
              </h1>
              <p className="stop-head__lead">
                Doze fases, quatro eras e uma letra por rodada. Você preenche os campos de ciência,
                a banca confere se o nome existe — e o cronômetro decide o resto.
              </p>
            </div>

            <aside className="stop-rank-card" aria-label="Seu progresso">
              <div className="stop-rank-card__top">
                <Trophy className="size-4 text-[var(--stop-amber)]" aria-hidden />
                <span className="stop-rank-card__title">{campaign.rank.title}</span>
                <span className="stop-rank-card__xp">{campaign.xp} XP</span>
              </div>
              <div className="stop-rank-card__bar" aria-hidden>
                <span style={{ width: `${Math.round(campaign.rank.progress * 100)}%` }} />
              </div>
              <p className="stop-rank-card__next">
                {campaign.rank.nextTitle
                  ? `${campaign.rank.nextTitle} a partir de ${campaign.rank.nextAt} XP`
                  : "Faixa máxima da expedição"}
              </p>
              <div className="stop-rank-card__stats">
                <span>
                  <Star className="size-3.5" aria-hidden />
                  {campaign.stars}/{STOP_TOTAL_STARS} estrelas
                </span>
                <span>
                  {doneLevels}/{STOP_LEVELS.length} fases
                </span>
              </div>
            </aside>
          </header>

          {!user && ready && (
            <p className="stop-guest">
              <LogIn className="size-3.5" aria-hidden />
              Jogando sem conta: o progresso fica neste navegador e a banca usa as regras básicas.{" "}
              <Link to="/auth">Entrar</Link> para salvar na nuvem e ter a banca de IA.
            </p>
          )}

          {complete && (
            <p className="stop-complete">
              <Sparkles className="size-4" aria-hidden />
              Expedição fechada. Rejogue as fases para trocar uma estrela por três.
            </p>
          )}

          <CampaignMap state={campaign} onPlay={(level) => setPlaying(level)} />

          <footer className="stop-foot">
            <p>
              As respostas são julgadas por categoria: nome inventado, palavra vaga e campo em
              branco não pontuam.
            </p>
            <div className="stop-foot__actions">
              <button type="button" onClick={() => setIntro(true)} className="stop-ghost">
                <BookOpen className="size-3.5" aria-hidden />
                Como jogar
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={resetting}
                className="stop-ghost"
              >
                <RotateCcw className="size-3.5" aria-hidden />
                Recomeçar expedição
              </button>
            </div>
          </footer>
        </main>
      )}

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
