import { useState } from "react";
import { Lock, Play, Star, Trophy } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  STOP_CAMPAIGNS,
  campaignStars,
  levelsOfCampaign,
  starThresholds,
  stopLevel,
  type StopCampaignId,
  type StopCampaignState,
  type StopLevel,
} from "@/lib/stop";

function StarRow({ stars, size = 12 }: { stars: number; size?: number }) {
  return (
    <span className="stop-stars" aria-label={`${stars} de 3 estrelas`}>
      {[0, 1, 2].map((index) => (
        <Star
          key={index}
          width={size}
          height={size}
          className={cn("stop-star", index < stars && "is-on")}
          aria-hidden
        />
      ))}
    </span>
  );
}

type Props = {
  state: StopCampaignState;
  onPlay: (level: StopLevel) => void;
};

export function CampaignMap({ state, onPlay }: Props) {
  const playing = state.nextLevelId ? stopLevel(state.nextLevelId) : undefined;
  const [picked, setPicked] = useState<StopCampaignId | null>(playing?.campaign ?? null);
  const active = STOP_CAMPAIGNS.find((campaign) => campaign.id === picked) ?? STOP_CAMPAIGNS[0]!;
  const levels = levelsOfCampaign(active.id);
  const activeStars = campaignStars(state.progress, active.id);

  return (
    <div className="stop-map">
      <div className="stop-campaigns" role="tablist" aria-label="Escolha a campanha">
        {STOP_CAMPAIGNS.map((campaign) => {
          const campaignLevels = levelsOfCampaign(campaign.id);
          const stars = campaignStars(state.progress, campaign.id);
          const total = campaignLevels.length * 3;
          const open = campaignLevels.some((level) => state.unlocked.includes(level.id));
          const selected = campaign.id === active.id;

          return (
            <button
              key={campaign.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setPicked(campaign.id)}
              className={cn(
                "stop-campaign-tab",
                selected && "is-active",
                open && "is-open",
                stars === total && total > 0 && "is-full",
              )}
            >
              <span className="stop-campaign-tab__numeral" aria-hidden>
                {campaign.numeral}
              </span>
              <span className="stop-campaign-tab__text">
                <span className="stop-campaign-tab__title">{campaign.title}</span>
                <span className="stop-campaign-tab__tagline">{campaign.tagline}</span>
              </span>
              <span className="stop-campaign-tab__stars">
                {open ? `${stars}/${total}` : <Lock className="size-3" aria-hidden />}
              </span>
            </button>
          );
        })}
      </div>

      <section key={active.id} className="stop-era is-active">
        <header className="stop-era__head">
          <span className="stop-era__numeral" aria-hidden>
            {active.numeral}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="stop-era__title">{active.title}</h2>
            <p className="stop-era__subtitle">{active.subtitle}</p>
          </div>
          <span className="stop-era__count">
            {activeStars}
            <span className="text-muted-foreground">/{levels.length * 3}</span>
          </span>
        </header>

        <ol className="stop-era__track">
          {levels.map((level) => {
            const unlocked = state.unlocked.includes(level.id);
            const progress = state.progress[level.id];
            const stars = progress?.stars ?? 0;
            const isCurrent = state.nextLevelId === level.id;
            const [one, two, three] = starThresholds(level);

            return (
              <li key={level.id} className="stop-era__slot">
                <button
                  type="button"
                  onClick={() => onPlay(level)}
                  disabled={!unlocked}
                  aria-label={
                    unlocked
                      ? `Fase ${level.title}, letra ${level.letter}${stars ? `, ${stars} estrelas` : ""}`
                      : `Fase ${level.title} bloqueada`
                  }
                  className={cn(
                    "stop-node",
                    unlocked && stars > 0 && "is-done",
                    unlocked && stars === 0 && "is-open",
                    !unlocked && "is-locked",
                    isCurrent && "is-current",
                  )}
                >
                  <span className="stop-node__ring" aria-hidden />
                  <span className="stop-node__letter">
                    {unlocked ? level.letter : <Lock className="size-4" />}
                  </span>
                  {unlocked && isCurrent && (
                    <span className="stop-node__play" aria-hidden>
                      <Play className="size-3 fill-current" />
                    </span>
                  )}
                </button>

                <p className="stop-node__title">{level.title}</p>
                <StarRow stars={stars} />
                <p className="stop-node__meta">
                  {unlocked ? (
                    <>
                      {level.seconds}s · {level.categories.length} campos
                      {progress?.bestScore ? ` · recorde ${progress.bestScore}` : ""}
                    </>
                  ) : (
                    "Conclua a fase anterior"
                  )}
                </p>
                {unlocked && (
                  <p className="stop-node__thresholds" title="Pontuação para 1, 2 e 3 estrelas">
                    {one} · {two} · {three}
                    <Trophy className="size-2.5" aria-hidden />
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
