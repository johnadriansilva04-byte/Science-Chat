import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, Flame, Play, RotateCcw, Star } from "lucide-react";
import { toast } from "sonner";

import { AppHeader } from "@/components/app/AppHeader";
import { CampaignMap } from "@/components/stop/CampaignMap";
import { StopArena } from "@/components/stop/StopArena";
import { useAuth } from "@/hooks/useAuth";
import { getStopCampaign, judgeStopRound, resetStopCampaign } from "@/lib/stop.functions";
import { STOP_SAGA_STAKE, duelForLevel, squadLabel } from "@/lib/stop-saga";
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

export const Route = createFileRoute("/stop_/campanha")({
  head: () => ({
    meta: [
      { title: "Campanha de férias — Expedição Stop · ScienceChat" },
      {
        name: "description",
        content:
          "Quinze fases, cinco campanhas e uma letra por rodada. A banca confere cada resposta e o cronômetro decide o resto.",
      },
    ],
  }),
  component: CampaignPage,
});

/** Progresso de quem joga sem conta: fica no navegador, sem promessa de nuvem. */
const LOCAL_KEY = "sciencechat.stop.progress.v1";

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

function CampaignPage() {
  const { user, loading } = useAuth();
  const [campaign, setCampaign] = useState<StopCampaignState>(() => campaignState({}));
  const [playing, setPlaying] = useState<StopLevel | null>(null);
  const [resetting, setResetting] = useState(false);

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

  const complete = isCampaignComplete(campaign.progress);
  const doneLevels = STOP_LEVELS.filter(
    (level) => (campaign.progress[level.id]?.stars ?? 0) > 0,
  ).length;
  const nextLevel = campaign.nextLevelId ? stopLevel(campaign.nextLevelId) : undefined;
  const hero = nextLevel ?? STOP_LEVELS[0]!;
  const duel = duelForLevel(hero);

  return (
    <div className="stop-page">
      <div className="stop-page__sky" aria-hidden />
      <AppHeader />
      <div className="lab-rule" aria-hidden />

      <main className="run">
        <Link to="/stop" className="run__back">
          <ChevronLeft size={14} aria-hidden />
          Stop
        </Link>

        <header className="run__head">
          <div className="run__intro">
            <span className="run__kicker">
              <Flame size={13} aria-hidden />
              Campanha de férias · {duel.act.act}
            </span>
            <h1 className="run__title">
              Expedição <em>Stop</em>
            </h1>
            <div className="run__chips">
              <span className="run__chip">
                {doneLevels}/{STOP_LEVELS.length} fases
              </span>
              <span className="run__chip">
                <Star size={11} aria-hidden />
                {campaign.stars}/{STOP_TOTAL_STARS}
              </span>
              <span className="run__chip">{campaign.rank.title}</span>
              <span className="run__chip">{campaign.xp} XP</span>
            </div>
          </div>

          <button type="button" className="run__play" onClick={() => setPlaying(hero)}>
            <Play size={17} aria-hidden />
            <span className="run__play-main">{complete ? "Rejogar" : "Enfrentar"}</span>
            <span className="run__play-sub">
              {hero.letter} · {duel.rival.name} · {squadLabel(duel.squad)}
            </span>
          </button>
        </header>

        <aside className="saga" aria-label="A história do campeonato">
          <span className="saga__act">
            {duel.act.act} · {duel.act.title}
          </span>
          <p className="saga__hook">{duel.act.hook}</p>
          <span className="saga__stake">{STOP_SAGA_STAKE} Quem perde é riscado do mapa.</span>
        </aside>

        <CampaignMap state={campaign} onPlay={(level) => setPlaying(level)} />

        <footer className="run__foot">
          <details className="run__how">
            <summary>Como jogar</summary>
            <p>
              Cada fase sorteia uma letra: todo campo tem de começar por ela. A banca confere
              categoria por categoria e o cronômetro decide. Três metas, até três estrelas; a fase
              seguinte abre sozinha.
            </p>
            {!user ? (
              <p>
                Jogando sem conta o progresso fica neste navegador. <Link to="/auth">Entrar</Link>{" "}
                salva na nuvem e libera a banca de IA.
              </p>
            ) : null}
          </details>

          <button type="button" onClick={handleReset} disabled={resetting} className="run__ghost">
            <RotateCcw size={13} aria-hidden />
            Recomeçar expedição
          </button>
        </footer>
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
