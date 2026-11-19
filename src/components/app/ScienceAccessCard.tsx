import { Link } from "@tanstack/react-router";
import { ArrowRight, GraduationCap, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Gatilho do guia "Ciência sem crachá".
 *
 * É só a porta: uma linha que diz que publicar não exige vínculo e leva para o
 * atlas (`/ciencia`), onde o conteúdo fica escondido por assunto e a pessoa
 * escolhe o que quer saber. Despejar o guia inteiro na home (ou num diálogo
 * gigante) enterrava a página e obrigava a ler tudo para achar uma resposta.
 */
export function ScienceAccessCard({ className = "" }: { className?: string }) {
  return (
    <Link
      to="/ciencia"
      aria-label="Ciência sem crachá — abrir o guia"
      className={cn(
        "ciencia-trigger group flex w-full items-center gap-3 rounded-xl p-3 pl-4 text-left",
        className,
      )}
    >
      <span className="ciencia-trigger__spine" aria-hidden />
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <GraduationCap className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 font-serif text-sm font-semibold">
          Ciência sem crachá
          <Sparkles className="size-3.5 text-primary" />
        </span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          Publicar artigo não exige universidade, diploma ou orientador.
        </span>
      </span>
      <ArrowRight className="ciencia-trigger__arrow size-4 shrink-0 text-primary" />
    </Link>
  );
}
