import { ArrowRight, Check, ChevronRight, GraduationCap, Lightbulb, Target, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ORCID_REGISTER_URL } from "@/lib/science-access";
import {
  SCIENCE_FLOW_DONE,
  SCIENCE_FLOW_OFFER,
  SCIENCE_BITES_TOTAL,
  currentScienceBite,
  isLastScienceBite,
  scienceFlowCounter,
  scienceFlowNextLabel,
  type ScienceFlowState,
} from "@/lib/science-flow";

/**
 * Card do fluxo "Ciência sem crachá" dentro do chat.
 *
 * Regra de ouro: UM bocado por vez. O pesquisador lê uma ideia, vê o porquê e o
 * para-que-serve, e só então decide avançar. No último, o card vira o convite
 * para criar o artigo — nunca antes.
 */
export function ScienceFlowCard({
  state,
  onStart,
  onNext,
  onDismiss,
  onCreate,
  onCreateFromScratch,
  canCreate = true,
}: {
  state: ScienceFlowState;
  /** Aceitar o convite: mostra o primeiro bocado. */
  onStart: () => void;
  /** Avançar um bocado. */
  onNext: () => void;
  /** Fechar sem seguir (o pesquisador retoma quando quiser). */
  onDismiss: () => void;
  /** Fim do fluxo: criar o artigo com a semente do guia. */
  onCreate: () => void;
  /** Fim do fluxo: continuar a entrevista normalmente, sem a semente. */
  onCreateFromScratch: () => void;
  /**
   * Falso quando o Pracinha está em descanso: o caminho continua legível, mas
   * criar o artigo exige IA. Sem isto o botão falharia em silêncio.
   */
  canCreate?: boolean;
}) {
  if (state.stage === "finished") {
    return (
      <div
        className="ciencia-chat-card ciencia-chat-card--done"
        role="group"
        aria-label="Criar o artigo"
      >
        <div className="flex items-start gap-2.5">
          <span className="ciencia-chat-card__seal" aria-hidden>
            <Check className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-serif text-[0.9rem] font-semibold">Caminho concluído</p>
            <p className="mt-0.5 text-[0.76rem] text-[var(--ci-soft)]">{SCIENCE_FLOW_DONE}</p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Fechar"
            className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full text-[var(--ci-soft)] transition-colors hover:bg-black/5 hover:text-[var(--ci-ink)] sm:size-9"
          >
            <X className="size-4" />
          </button>
        </div>

        {canCreate ? (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button size="sm" className="min-h-11 flex-1 gap-1.5" onClick={onCreate}>
              <GraduationCap className="size-4" />
              Começar meu artigo
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="min-h-11 flex-1 gap-1.5"
              onClick={onCreateFromScratch}
            >
              Tenho outra ideia
              <ArrowRight className="size-4" />
            </Button>
          </div>
        ) : (
          <p className="mt-3 rounded-md bg-black/5 px-2.5 py-2 text-[0.72rem] leading-snug text-[var(--ci-soft)]">
            Quando eu acordar, começamos o artigo juntos — o caminho fica aqui guardado.
          </p>
        )}
      </div>
    );
  }

  if (state.stage !== "running") {
    return (
      <div className="ciencia-chat-card" role="group" aria-label="Publicar sem vínculo">
        <div className="flex items-start gap-2.5">
          <span className="ciencia-chat-card__seal" aria-hidden>
            <GraduationCap className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-serif text-[0.9rem] font-semibold">Ciência sem crachá</p>
            <p className="mt-0.5 text-[0.76rem] text-[var(--ci-soft)]">{SCIENCE_FLOW_OFFER}</p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Fechar"
            className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full text-[var(--ci-soft)] transition-colors hover:bg-black/5 hover:text-[var(--ci-ink)] sm:size-9"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          <Button size="sm" className="min-h-11 flex-1 gap-1.5" onClick={onStart}>
            Ver o caminho
            <ArrowRight className="size-4" />
          </Button>
          <Button size="sm" variant="ghost" className="min-h-11" onClick={onDismiss}>
            Agora não
          </Button>
        </div>
      </div>
    );
  }

  const bite = currentScienceBite(state);
  if (!bite) return null;

  return (
    <div
      className="ciencia-chat-card"
      role="group"
      aria-label={`Passo ${bite.n} de ${SCIENCE_BITES_TOTAL}`}
    >
      <div className="flex items-center gap-2">
        <span className="ciencia-chat-card__step" aria-hidden>
          {bite.n}
        </span>
        <p className="min-w-0 flex-1 font-serif text-[0.9rem] font-semibold leading-snug">
          {bite.title}
        </p>
        <span className="shrink-0 text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--ci-soft)]">
          {scienceFlowCounter(state)}
        </span>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Fechar"
          className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full text-[var(--ci-soft)] transition-colors hover:bg-black/5 hover:text-[var(--ci-ink)] sm:size-9"
        >
          <X className="size-4" />
        </button>
      </div>

      <p className="mt-2.5 text-[0.8rem] leading-relaxed text-[var(--ci-ink)]">{bite.what}</p>

      <dl className="mt-3 space-y-2">
        <div className="ciencia-chat-card__why">
          <dt className="flex items-center gap-1 text-[0.65rem] font-bold uppercase tracking-wider text-[var(--ci-accent)]">
            <Lightbulb className="size-3" aria-hidden />
            Por que importa
          </dt>
          <dd className="mt-0.5 text-[0.76rem] leading-relaxed text-[var(--ci-soft)]">
            {bite.why}
          </dd>
        </div>
        <div className="ciencia-chat-card__use">
          <dt className="flex items-center gap-1 text-[0.65rem] font-bold uppercase tracking-wider text-[var(--ci-accent-2)]">
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
          className="mt-3 inline-flex min-h-11 items-center gap-1 text-[0.75rem] font-semibold text-[var(--ci-accent)] hover:underline"
        >
          Criar meu ORCID (grátis)
          <ChevronRight className="size-3.5" aria-hidden />
        </a>
      )}

      <Button
        size="sm"
        className="mt-3 min-h-11 w-full gap-1.5"
        onClick={onNext}
        aria-label={isLastScienceBite(state) ? "Concluir o caminho" : "Ver o próximo passo"}
      >
        {scienceFlowNextLabel(state)}
        <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}
