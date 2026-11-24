import { useEffect, useState } from "react";
import { BookOpen, ChevronRight, Lock, Play, Sparkles, Star, Trophy } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  STOP_CAMPAIGNS,
  STOP_RANKS,
  STOP_SCORING,
  STOP_TOTAL_STARS,
  campaignStars,
  levelsOfCampaign,
  stopLevel,
  type StopCampaignState,
} from "@/lib/stop";

const PHRASES = [
  "Quinze fases. Cinco campanhas. Uma letra por rodada.",
  "A banca confere se o nome existe.",
  "Errar de letra custa o campo.",
  "Quem chega primeiro ao STOP! escreve a ata.",
];

type Props = {
  state: StopCampaignState;
  onEnter: () => void;
  signedIn: boolean;
};

export function CampaignIntro({ state, onEnter, signedIn }: Props) {
  const [rules, setRules] = useState(false);
  const [phrase, setPhrase] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setPhrase((value) => value + 1), 3400);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onEnter();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onEnter]);

  const hasProgress = state.xp > 0;
  const nextTitle = state.nextLevelId ? (stopLevel(state.nextLevelId)?.title ?? null) : null;

  return (
    <div
      className="stop-intro"
      role="dialog"
      aria-modal="true"
      aria-label="Abertura da Expedição Stop"
    >
      <div className="stop-intro__sky" aria-hidden>
        <div className="stop-intro__orbit stop-intro__orbit--a" />
        <div className="stop-intro__orbit stop-intro__orbit--b" />
        <div className="stop-intro__orbit stop-intro__orbit--c" />
        <div className="stop-intro__flare" />
      </div>

      <div className="stop-intro__body">
        <span className="stop-intro__kicker">
          <Sparkles className="size-3.5" aria-hidden />
          Campanha de férias · ScienceChat
        </span>

        <h1 className="stop-intro__title">
          <span className="stop-intro__title-line">Expedição</span>
          <span className="stop-intro__wordmark" aria-label="Stop">
            {"STOP".split("").map((letter, index) => (
              <span
                key={`${letter}-${index}`}
                className="stop-intro__letter"
                style={{ animationDelay: `${260 + index * 110}ms` }}
                aria-hidden
              >
                {letter}
              </span>
            ))}
          </span>
        </h1>

        <p className="stop-intro__phrase" key={phrase}>
          {PHRASES[phrase % PHRASES.length]}
        </p>

        {hasProgress && (
          <div className="stop-intro__resume">
            <Trophy className="size-4" aria-hidden />
            <div>
              <p className="stop-intro__resume-title">{state.rank.title}</p>
              <p className="stop-intro__resume-meta">
                {state.xp} XP · {state.stars}/{STOP_TOTAL_STARS} estrelas
                {nextTitle ? ` · próxima: ${nextTitle}` : " · expedição completa"}
              </p>
            </div>
            <Star className="size-4 stop-intro__resume-star" aria-hidden />
          </div>
        )}

        <div className="stop-intro__actions">
          <button type="button" onClick={onEnter} className="stop-intro__start">
            <Play className="size-4 fill-current" aria-hidden />
            {hasProgress ? "Continuar expedição" : "Entrar na expedição"}
            <ChevronRight className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setRules((value) => !value)}
            className="stop-intro__howto"
            aria-expanded={rules}
          >
            <BookOpen className="size-4" aria-hidden />
            {rules ? "Fechar regras" : "Como se joga"}
          </button>
        </div>

        <div className={cn("stop-intro__rules", rules && "is-open")} hidden={!rules}>
          <p>
            <strong>A letra manda.</strong> Cada fase sorteia uma letra; resposta que não começa com
            ela não pontua.
          </p>
          <p>
            <strong>A banca confere.</strong> Nome inventado, palavra vaga e campo em branco ficam
            de fora, campo a campo.
          </p>
          <p>
            <strong>O relógio decide.</strong> {STOP_SCORING.perAnswer} pontos por resposta válida,
            +{STOP_SCORING.cleanRound} por rodada limpa e até +{STOP_SCORING.timeBonusMax} pelo
            tempo que sobrar.
          </p>
          <p>
            <strong>As estrelas sobem.</strong> Cada fase guarda o melhor resultado;{" "}
            {STOP_RANKS.length} patentes separam o calouro do catedrático.
          </p>
        </div>

        <ul className="stop-intro__eras" aria-label="Campanhas da expedição">
          {STOP_CAMPAIGNS.map((campaign, index) => {
            const levels = levelsOfCampaign(campaign.id);
            const stars = campaignStars(state.progress, campaign.id);
            const total = levels.length * 3;
            const open = levels.some((level) => state.unlocked.includes(level.id));
            return (
              <li
                key={campaign.id}
                className={cn(
                  "stop-intro__era",
                  open && "is-open",
                  stars === total && total > 0 && "is-full",
                )}
                style={{ animationDelay: `${420 + index * 90}ms` }}
              >
                <span className="stop-intro__era-numeral" aria-hidden>
                  {campaign.numeral}
                </span>
                <span className="stop-intro__era-title">{campaign.title}</span>
                <span className="stop-intro__era-stars">
                  {open ? `${stars}/${total}` : <Lock className="size-3" aria-hidden />}
                </span>
              </li>
            );
          })}
        </ul>

        <p className="stop-intro__foot">
          {signedIn
            ? "Progresso salvo na sua conta · banca de IA ligada"
            : "Sem conta: progresso neste navegador, banca com as regras básicas"}
          <span aria-hidden> · </span>
          <kbd>Enter</kbd> para entrar
        </p>
      </div>
    </div>
  );
}
