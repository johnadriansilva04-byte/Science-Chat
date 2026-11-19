import { useState } from "react";
import { ArrowRight, Lightbulb, RotateCcw, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ORCID_REGISTER_URL } from "@/lib/science-access";
import {
  SCIENCE_BITES,
  SCIENCE_BITES_TOTAL,
  advanceScienceFlow,
  currentScienceBite,
  isLastScienceBite,
  scienceFlowCounter,
  scienceFlowNextLabel,
  startScienceFlow,
  type ScienceFlowState,
} from "@/lib/science-flow";

/**
 * O caminho "Ciência sem crachá" na home, em BOCADOS.
 *
 * Antes a home mostrava dez passos de uma vez. Quem chega com a dúvida ("posso
 * publicar sem instituição?") já recebe a resposta curta acima; aqui ele
 * percorre o resto no ritmo dele — um bocado, o porquê e o para-que-serve — em
 * vez de encarar um manual. Mesmo conteúdo do card do chat, mesma fonte.
 */
export function ScienceBiteStepper() {
  const [state, setState] = useState<ScienceFlowState>(() => startScienceFlow());
  const bite = currentScienceBite(state);

  return (
    <section className="mt-5" aria-labelledby="ciencia-caminho-title">
      <div className="flex items-baseline justify-between gap-2">
        <h3 id="ciencia-caminho-title" className="font-serif text-[0.95rem] font-semibold">
          O caminho, em partes
        </h3>
        <span className="shrink-0 text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--ci-soft)]">
          {scienceFlowCounter(state)}
        </span>
      </div>

      <div className="mt-2 flex gap-1" aria-hidden>
        {SCIENCE_BITES.map((b, i) => (
          <span
            key={b.n}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= state.index ? "bg-[var(--ci-accent)]" : "bg-black/10"
            }`}
          />
        ))}
      </div>

      {bite && (
        <div className="mt-3 rounded-lg border border-[var(--ci-rule)] bg-white/60 p-3">
          <div className="flex items-start gap-2">
            <span className="ciencia-step__dot shrink-0" aria-hidden>
              {bite.n}
            </span>
            <p className="min-w-0 flex-1 font-serif text-[0.88rem] font-semibold leading-snug">
              {bite.title}
            </p>
          </div>

          <p className="mt-2 text-[0.8rem] leading-relaxed">{bite.what}</p>

          <dl className="mt-2.5 space-y-2">
            <div>
              <dt className="flex items-center gap-1 text-[0.62rem] font-bold uppercase tracking-wider text-[var(--ci-accent)]">
                <Lightbulb className="size-3" aria-hidden />
                Por que importa
              </dt>
              <dd className="mt-0.5 text-[0.76rem] leading-relaxed text-[var(--ci-soft)]">
                {bite.why}
              </dd>
            </div>
            <div>
              <dt className="flex items-center gap-1 text-[0.62rem] font-bold uppercase tracking-wider text-[var(--ci-accent-2)]">
                <Target className="size-3" aria-hidden />
                Para que serve
              </dt>
              <dd className="mt-0.5 text-[0.76rem] leading-relaxed text-[var(--ci-soft)]">
                {bite.whatFor}
              </dd>
            </div>
          </dl>

          {bite.n === 3 && (
            <a
              href={ORCID_REGISTER_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex min-h-11 items-center gap-1 text-[0.75rem] font-semibold text-[var(--ci-accent)] hover:underline sm:min-h-9"
            >
              Criar meu ORCID (grátis)
              <ArrowRight className="size-3.5" aria-hidden />
            </a>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {isLastScienceBite(state) ? (
          <Button
            size="sm"
            variant="outline"
            className="min-h-11 gap-1.5"
            onClick={() => setState(startScienceFlow())}
          >
            <RotateCcw className="size-4" />
            Rever do começo
          </Button>
        ) : (
          <Button
            size="sm"
            className="min-h-11 flex-1 gap-1.5 sm:flex-none"
            onClick={() => setState(advanceScienceFlow(state))}
          >
            {scienceFlowNextLabel(state)}
            <ArrowRight className="size-4" />
          </Button>
        )}
        <span className="text-[0.7rem] text-[var(--ci-soft)]">
          {isLastScienceBite(state)
            ? "Você viu o caminho inteiro."
            : `Faltam ${SCIENCE_BITES_TOTAL - state.index - 1} partes.`}
        </span>
      </div>
    </section>
  );
}
