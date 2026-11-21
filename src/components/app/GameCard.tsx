import { useState } from "react";
import { ArrowRight, Gamepad2 } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GAME_NAME, GAME_TAGLINE, STOP_CATEGORIES, gameEmbedUrl } from "@/lib/game";

/**
 * Card compacto do joguinho: uma linha com ícone, categorias e botão.
 *
 * Vive nas telas de espera (cota da IA esgotada, página não encontrada) e na
 * home, onde a pessoa descobre que o jogo existe. Nunca no meio da produção do
 * artigo: ali o foco é o texto, e um convite para jogar seria ruído.
 *
 * O jogo não mora aqui. Este card é o encaixe: quando `VITE_GAME_URL` está
 * definida, o botão abre o jogo num diálogo; sem ela, o botão fica desabilitado
 * e o card ainda mostra as categorias.
 */
export function GameCard({ className }: { className?: string }) {
  const embedUrl = gameEmbedUrl();
  const [open, setOpen] = useState(false);

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
        </div>
        <button
          type="button"
          disabled={!embedUrl}
          onClick={() => setOpen(true)}
          className="game-card__cta"
        >
          {embedUrl ? "Jogar" : "Em breve"}
          {embedUrl && <ArrowRight className="size-3.5" aria-hidden />}
        </button>
      </div>

      {embedUrl && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-3xl gap-2 p-3 sm:p-4">
            <DialogHeader className="px-1 text-left">
              <DialogTitle className="font-serif text-base">{GAME_NAME}</DialogTitle>
              <DialogDescription className="text-xs">{GAME_TAGLINE}</DialogDescription>
            </DialogHeader>
            <iframe
              src={embedUrl}
              title={GAME_NAME}
              className="game-card__frame"
              loading="lazy"
              allow="clipboard-write"
            />
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
}
