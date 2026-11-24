import { useState } from "react";
import { Lock, Star } from "lucide-react";

import { cn } from "@/lib/utils";
import { duelForLevel, squadLabel } from "@/lib/stop-saga";
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

function StarRow({ stars }: { stars: number }) {
  return (
    <span className="journey__stars" aria-label={`${stars} de 3 estrelas`}>
      {[0, 1, 2].map((index) => (
        <Star
          key={index}
          size={11}
          className={cn("journey__star", index < stars && "is-on")}
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
  const next = state.nextLevelId ? stopLevel(state.nextLevelId) : undefined;
  const [picked, setPicked] = useState<StopCampaignId | null>(next?.campaign ?? null);
  const active = STOP_CAMPAIGNS.find((campaign) => campaign.id === picked) ?? STOP_CAMPAIGNS[0]!;
  const levels = levelsOfCampaign(active.id);
  const activeStars = campaignStars(state.progress, active.id);
  const total = levels.length * 3;

  return (
    <section className="journey" aria-label="Campanhas e fases">
      <div className="journey__rail" role="tablist" aria-label="Escolha a campanha">
        {STOP_CAMPAIGNS.map((campaign) => {
          const campaignLevels = levelsOfCampaign(campaign.id);
          const stars = campaignStars(state.progress, campaign.id);
          const campaignTotal = campaignLevels.length * 3;
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
                "journey__chip",
                selected && "is-active",
                open && "is-open",
                stars === campaignTotal && campaignTotal > 0 && "is-full",
              )}
            >
              <span className="journey__chip-num" aria-hidden>
                {campaign.numeral}
              </span>
              <span className="journey__chip-label">{campaign.title}</span>
              <span className="journey__chip-count">
                {open ? `${stars}/${campaignTotal}` : <Lock size={11} aria-hidden />}
              </span>
            </button>
          );
        })}
      </div>

      <header className="journey__head">
        <div className="journey__head-text">
          <h2 className="journey__title">{active.title}</h2>
          <p className="journey__sub">{active.subtitle}</p>
        </div>
        <div className="journey__meter">
          <span className="journey__meter-num">
            {activeStars}
            <em>/{total}</em>
            <Star size={11} aria-hidden />
          </span>
          <span className="journey__meter-bar" aria-hidden>
            <span style={{ width: `${Math.round((activeStars / total) * 100)}%` }} />
          </span>
        </div>
      </header>

      <ol className="journey__track">
        {levels.map((level, index) => {
          const unlocked = state.unlocked.includes(level.id);
          const stars = state.progress[level.id]?.stars ?? 0;
          const current = state.nextLevelId === level.id;
          const done = stars > 0 && !current;
          const thresholds = starThresholds(level);
          const duel = duelForLevel(level);
          const previous = index > 0 ? levels[index - 1] : undefined;
          const lockLabel = previous
            ? `vença ${duelForLevel(previous).rival.name}`
            : "esquadrão oculto";

          return (
            <li
              key={level.id}
              className={cn(
                "journey__stop",
                done && "is-done",
                current && "is-current",
                !unlocked && "is-locked",
              )}
            >
              <button
                type="button"
                onClick={() => onPlay(level)}
                disabled={!unlocked}
                title={
                  unlocked
                    ? `${level.seconds}s · ${level.categories.length} campos · metas ${thresholds.join(" · ")}`
                    : "Conclua a fase anterior"
                }
                aria-label={
                  unlocked
                    ? `Jogar ${level.title}`
                    : `${level.title} bloqueada: conclua a fase anterior`
                }
                className="journey__plaque"
              >
                <span className="journey__letter">
                  {unlocked ? level.letter : <Lock size={17} aria-hidden />}
                </span>
              </button>

              {current ? <span className="journey__tag">próxima</span> : null}
              {done ? <span className="journey__tag is-done">feita</span> : null}

              <strong className="journey__stop-title">{level.title}</strong>
              <span className="journey__stop-rival">
                {unlocked ? `${squadLabel(duel.squad)} · ${duel.rival.name}` : lockLabel}
              </span>
              <StarRow stars={stars} />
            </li>
          );
        })}
      </ol>
    </section>
  );
}
