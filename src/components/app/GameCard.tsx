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
 * Card discreto do joguinho.
 *
 * Aparece só em momentos de espera — quando a cota da IA acabou ou quando a
 * pessoa caiu numa página que não existe. Nunca no meio da produção do artigo:
 * ali o foco é o texto, e um convite para jogar seria ruído.
 *
 * O jogo não mora aqui. Este card é o encaixe: quando `VITE_GAME_URL` está
 * definida, o botão abre o jogo num diálogo; sem ela, o botão fica desabilitado
 * e o card ainda explica o que é o jogo.
 */
export function GameCard({ className }: { className?: string }) {
  const embedUrl = gameEmbedUrl();
  const [open, setOpen] = useState(false);

  return (
    <section
      aria-labelledby="game-card-title"
      className={cn("game-card rounded-xl border p-3.5", className)}
    >
      <div className="flex items-start gap-3">
        <span className="game-card__icon" aria-hidden>
          <Gamepad2 className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p
            id="game-card-title"
            className="flex flex-wrap items-baseline gap-x-1.5 text-sm font-medium"
          >
            {GAME_NAME}
            <span className="text-xs font-normal text-muted-foreground">— de bobeira?</span>
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{GAME_TAGLINE}</p>

          <ul className="mt-2 flex flex-wrap gap-1">
            {STOP_CATEGORIES.slice(0, 4).map((category) => (
              <li key={category} className="game-card__chip">
                {category}
              </li>
            ))}
            <li className="game-card__chip game-card__chip--more">+{STOP_CATEGORIES.length - 4}</li>
          </ul>

          <button
            type="button"
            disabled={!embedUrl}
            onClick={() => setOpen(true)}
            className="game-card__cta mt-2.5"
          >
            {embedUrl ? "Jogar agora" : "Em breve"}
            {embedUrl && <ArrowRight className="size-3.5" aria-hidden />}
          </button>
          {!embedUrl && (
            <p className="mt-1.5 text-[0.7rem] text-muted-foreground">
              O jogo está sendo finalizado. Enquanto isso, o Pracinha volta com fôlego novo.
            </p>
          )}
        </div>
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
