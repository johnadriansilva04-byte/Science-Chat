import { Link } from "@tanstack/react-router";
import { ArrowRight, GraduationCap, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Porta do guia "Ciência sem crachá".
 *
 * É UM card, não o guia: responde a dúvida em uma frase e leva para `/ciencia`,
 * onde o conteúdo é escolhido por assunto. O card já foi um boletim com duas
 * listas, dois acordeões e doze etapas — ocupava mais de uma tela da home e
 * empurrava a coletânea para fora da primeira rolagem. A home precisa do convite
 * e da resposta curta; o manual vive no guia.
 */
export function ScienceAccessCard({ className = "" }: { className?: string }) {
  return (
    <section
      aria-labelledby="cracha-title"
      className={cn("cracha-card relative overflow-hidden rounded-2xl border p-3.5", className)}
    >
      <span className="cracha-card__spine" aria-hidden />

      <div className="flex items-start gap-3">
        <span className="cracha-card__icon" aria-hidden>
          <GraduationCap className="size-4" />
        </span>

        <div className="min-w-0 flex-1">
          <h2
            id="cracha-title"
            className="font-serif text-sm font-semibold leading-tight sm:text-base"
          >
            Ciência sem crachá
          </h2>
          <p className="mt-1 text-xs leading-snug text-foreground/80">
            Publicar artigo <strong className="font-semibold">não exige</strong> vínculo
            institucional. O que a revista avalia é o trabalho.
          </p>
        </div>
      </div>

      {/* A exceção fica à vista: quem lê "não exige vínculo" precisa saber que
          pesquisa com seres humanos passa por comitê antes de qualquer coisa.
          O detalhe (CEP, Decreto 158/019, etapa a etapa) está no guia. */}
      <p className="cracha-ethics mt-2.5 flex items-start gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/8 px-2.5 py-1.5 text-[0.7rem] leading-snug text-foreground/80">
        <ShieldCheck className="mt-px size-3.5 shrink-0 text-amber-500/90" aria-hidden />
        <span>
          <strong className="font-semibold">Uma exceção:</strong> pesquisa com seres humanos exige
          comitê de ética antes de coletar.
        </span>
      </p>

      <Link
        to="/ciencia"
        className="cracha-cta cracha-cta--ghost mt-2.5 w-full"
        aria-label="Abrir o guia Ciência sem crachá: passo a passo, Brasil, Uruguai e fontes"
      >
        Passo a passo, Brasil e Uruguai
        <ArrowRight className="size-3.5" aria-hidden />
      </Link>
    </section>
  );
}
