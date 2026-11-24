import { ArrowRight, Gamepad2, Star } from "lucide-react";

import { cn } from "@/lib/utils";
import { GAME_NAME, GAME_PATH, GAME_TAGLINE, STOP_CATEGORIES } from "@/lib/game";

/**
 * Card compacto do Stop científico.
 *
 * Vive nas telas de espera (cota da IA esgotada, página não encontrada) e na
 * home. O jogo é interno (`/stop`), então o card é só uma porta: link direto,
 * sem iframe e sem URL de ambiente.
 */
export function GameCard({ className }: { className?: string }) {
  return (
    <section
      aria-labelledby="game-card-title"
      className={cn("game-card rounded-xl border px-3 py-2.5", className)}
    >
      <div className="relative z-10 flex items-center gap-2.5">
        <span className="game-card__icon" aria-hidden>
          <Gamepad2 className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p
            id="game-card-title"
            className="flex flex-wrap items-baseline gap-x-1.5 text-sm font-medium"
          >
            {GAME_NAME}
            <span className="text-[0.7rem] font-normal text-muted-foreground">— de bobeira?</span>
          </p>
          <ul className="mt-1.5 flex flex-wrap gap-1">
            {STOP_CATEGORIES.map((category) => (
              <li key={category} className="game-card__chip">
                {category}
              </li>
            ))}
          </ul>
          <p className="mt-1.5 flex items-center gap-1 text-[0.68rem] text-muted-foreground">
            <Star className="size-3 text-[oklch(0.79_0.15_78)]" aria-hidden />5 campanhas ·
            estrelas, XP e banca de IA
          </p>
        </div>
        <a href={GAME_PATH} className="game-card__cta" title={GAME_TAGLINE}>
          Jogar
          <ArrowRight className="size-3.5" aria-hidden />
        </a>
      </div>
    </section>
  );
}
