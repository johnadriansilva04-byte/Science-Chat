import { ArrowRight, Shuffle, Sparkles, Star } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import {
  GAME_NAME,
  GAME_PATH,
  GAME_TAGLINE,
  STOP_CAMPAIGN_TITLES,
  STOP_CATEGORIES,
} from "@/lib/game";

const LETTERS = "ABCDEFGHIJLMNOPQRSTUVXZ";

/**
 * Sorteio determinístico: a mesma visita desenha a mesma rodada no servidor e no
 * cliente (nada de `Math.random` no render), e cada visita muda a mão.
 */
function pickDraw(round: number) {
  const start = (round * 3) % STOP_CATEGORIES.length;
  return {
    letter: LETTERS[round % LETTERS.length],
    categories: [0, 1, 2, 3].map((i) => STOP_CATEGORIES[(start + i) % STOP_CATEGORIES.length]),
  };
}

/**
 * Card do Stop científico.
 *
 * Vive nas telas de espera (cota da IA esgotada, página não encontrada) e na
 * home. É uma porta para `/stop` — sem iframe —, mas mostra uma rodada de
 * exemplo: letra sorteada, quatro categorias e um botão de embaralhar, para o
 * card explicar o jogo em vez de listar as 24 categorias.
 */
export function GameCard({
  className,
  visit = 0,
  note,
}: {
  className?: string;
  visit?: number;
  note?: string | undefined;
}) {
  const [seed, setSeed] = useState(0);
  const round = visit + seed;
  const draw = pickDraw(round);

  return (
    <section
      aria-labelledby="game-card-title"
      className={cn(
        "stop-card relative flex h-full flex-col overflow-hidden rounded-2xl border p-4",
        className,
      )}
      title={GAME_TAGLINE}
    >
      <div className="stop-card__glow" aria-hidden />

      <header className="relative flex items-start justify-between gap-2">
        <div>
          <p className="stop-card__word" aria-hidden>
            {GAME_NAME.replace(" científico", "")
              .split("")
              .map((letter, i) => (
                <span key={`${round}-${i}`} data-i={i}>
                  {letter}
                </span>
              ))}
          </p>
          <h2 id="game-card-title" className="stop-card__sub">
            <span className="sr-only">{GAME_NAME}</span>
            <span aria-hidden>
              científico <span>— de bobeira?</span>
            </span>
          </h2>
        </div>
        <span className="stop-card__badge">
          <Star className="size-3" aria-hidden />5 campanhas
        </span>
      </header>

      <div className="stop-card__draw">
        <div className="stop-card__letter">
          <span>letra</span>
          <strong key={round}>{draw.letter}</strong>
        </div>
        <ul className="stop-card__cats">
          {draw.categories.map((category) => (
            <li key={category}>{category}</li>
          ))}
        </ul>
        <button
          type="button"
          className="stop-card__shuffle"
          aria-label="Sortear outra rodada"
          onClick={() => setSeed((s) => s + 1)}
        >
          <Shuffle className="size-3.5" aria-hidden />
        </button>
      </div>

      <ul className="stop-card__campaigns">
        {STOP_CAMPAIGN_TITLES.map((title, i) => (
          <li key={title} data-active={i === 0 ? "true" : "false"}>
            {title}
          </li>
        ))}
      </ul>

      {note && (
        <p className="landing-note landing-note--bottom">
          <Sparkles className="size-3 shrink-0" aria-hidden />
          {note}
        </p>
      )}

      <div className="relative mt-auto flex items-center justify-between gap-2 pt-3">
        <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          estrelas · XP · banca de IA
        </p>
        <a href={GAME_PATH} className="stop-card__cta">
          Jogar agora
          <ArrowRight className="size-3.5" aria-hidden />
        </a>
      </div>
    </section>
  );
}
