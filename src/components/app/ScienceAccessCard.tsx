import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  Check,
  ExternalLink,
  GraduationCap,
  IdCard,
  Lightbulb,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  COUNTRY_PATHS,
  NOT_REQUIRED,
  ORCID_REGISTER_URL,
  SCIENCE_STEPS,
  WHAT_COUNTS,
  referencesByRegion,
  type ReferenceRegion,
} from "@/lib/science-access";
import { SCIENCE_BITES } from "@/lib/science-flow";
import { cn } from "@/lib/utils";

const REGION_TABS: { id: ReferenceRegion; label: string }[] = [
  { id: "brasil", label: "Brasil" },
  { id: "uruguai", label: "Uruguai (Udelar)" },
  { id: "internacional", label: "Internacional" },
];

/**
 * Card "Ciência sem crachá" da home.
 *
 * Ensina, na própria página, que publicar não exige vínculo institucional: a
 * resposta direta, o que NÃO é exigido, o que realmente conta, os passos com o
 * fundamento de cada um e os caminhos oficiais no Brasil e no Uruguai. O guia
 * completo (11 etapas, fontes, carta ao editor) continua em `/ciencia` — aqui
 * fica o essencial, com a fonte ao lado de cada afirmação.
 */
type ScienceAccessCardProps = {
  className?: string;
  /**
   * `full` ensina na própria página (home). `compact` é só a porta para o guia
   * — páginas que já têm conteúdo próprio (/auth, /publicacoes, /museu) não
   * precisam repetir o passo a passo.
   */
  variant?: "full" | "compact";
};

export function ScienceAccessCard({ className = "", variant = "full" }: ScienceAccessCardProps) {
  const [region, setRegion] = useState<ReferenceRegion>("brasil");
  const references = referencesByRegion(region);
  const country = COUNTRY_PATHS.find((path) => path.id === region);

  if (variant === "compact") {
    return (
      <Link
        to="/ciencia"
        aria-label="Ciência sem crachá — abrir o guia"
        className={cn("cracha-compact group", className)}
      >
        <span className="cracha-compact__icon">
          <GraduationCap className="size-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 font-serif text-sm font-semibold">
            Ciência sem crachá
            <BadgeCheck className="size-3.5 text-primary" aria-hidden />
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Publicar não exige universidade, diploma ou orientador. Veja o passo a passo.
          </span>
        </span>
        <ArrowRight className="cracha-compact__arrow size-4 shrink-0 text-primary" aria-hidden />
      </Link>
    );
  }

  return (
    <section
      aria-labelledby="cracha-title"
      className={cn(
        "cracha-card @container relative overflow-hidden rounded-2xl border p-4 sm:p-5",
        className,
      )}
    >
      <span className="cracha-card__spine" aria-hidden />

      <header>
        <span className="cracha-card__kicker">
          <GraduationCap className="size-3.5" />
          Boletim do pesquisador independente
        </span>
        <h2 id="cracha-title" className="mt-2 font-serif text-lg font-semibold leading-tight">
          Ciência sem crachá
        </h2>
        <p className="mt-1.5 text-sm text-foreground/85">
          Publicar artigo <strong className="font-semibold">não exige</strong> universidade, diploma
          ou orientador. O que a revista avalia é o trabalho — e o critério de autoria (ICMJE) não
          menciona instituição.
        </p>
      </header>

      <div className="mt-4 grid gap-3 @2xl:grid-cols-2">
        <div className="cracha-list cracha-list--no">
          <p className="cracha-list__title">
            <X className="size-3.5" aria-hidden />
            Não é exigido
          </p>
          <ul>
            {NOT_REQUIRED.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="cracha-list cracha-list--yes">
          <p className="cracha-list__title">
            <Check className="size-3.5" aria-hidden />O que conta de verdade
          </p>
          <ul>
            {WHAT_COUNTS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 grid gap-x-5 gap-y-4 @3xl:grid-cols-[1.15fr_0.85fr] @3xl:items-start">
        <div className="cracha-steps">
          <p className="cracha-steps__title">
            <BookOpenCheck className="size-4" aria-hidden />O caminho, passo a passo
          </p>
          <ol>
            {SCIENCE_BITES.map((bite) => (
              <li key={bite.n}>
                <details className="cracha-step">
                  <summary>
                    <span className="cracha-step__n" aria-hidden>
                      {bite.n}
                    </span>
                    <span className="cracha-step__title">{bite.title}</span>
                    <span className="cracha-step__chevron" aria-hidden />
                  </summary>
                  <div className="cracha-step__body">
                    <p className="cracha-step__do">{bite.what}</p>
                    <p className="cracha-step__why">
                      <span className="cracha-step__tag">Por quê</span>
                      {bite.why}
                    </p>
                    <p className="cracha-step__for">
                      <Lightbulb className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                      {bite.whatFor}
                    </p>
                  </div>
                </details>
              </li>
            ))}
          </ol>
        </div>

        <div className="cracha-sources">
          <p className="cracha-steps__title">
            <ShieldCheck className="size-4" aria-hidden />
            Onde fazer, com fonte oficial
          </p>
          <div
            className="cracha-tabs mt-2"
            role="tablist"
            aria-label="País ou região"
            onKeyDown={(event) => {
              // Roving tabindex: só a aba ativa está na ordem de tabulação; as
              // setas movem entre elas, como manda o padrão WAI-ARIA de abas.
              const dir = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
              if (!dir) return;
              event.preventDefault();
              const index = REGION_TABS.findIndex((t) => t.id === region);
              const next = REGION_TABS[(index + dir + REGION_TABS.length) % REGION_TABS.length]!;
              setRegion(next.id);
              event.currentTarget
                .querySelector<HTMLButtonElement>(`[data-region="${next.id}"]`)
                ?.focus();
            }}
          >
            {REGION_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`cracha-tab-${tab.id}`}
                aria-selected={region === tab.id}
                aria-controls="cracha-panel"
                tabIndex={region === tab.id ? 0 : -1}
                data-region={tab.id}
                className="cracha-tab"
                data-state={region === tab.id ? "active" : "inactive"}
                onClick={() => setRegion(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div
            className="mt-2.5"
            role="tabpanel"
            id="cracha-panel"
            aria-labelledby={`cracha-tab-${region}`}
            tabIndex={0}
          >
            {country && (
              <p className="cracha-region-note">
                {region === "brasil"
                  ? "No Brasil, a trajetória é pública e a leitura é aberta: você registra e publica sem vínculo."
                  : "No Uruguai, o caminho passa pela Udelar e pelo SciELO Uruguay — e o CVUy já integra o ORCID."}
              </p>
            )}
            <ul className="cracha-refs">
              {references.map((ref) => (
                <li key={ref.url}>
                  <a href={ref.url} target="_blank" rel="noreferrer">
                    <span className="cracha-refs__label">
                      {ref.label}
                      <ExternalLink className="size-3 shrink-0 opacity-70" aria-hidden />
                    </span>
                    <span className="cracha-refs__note">{ref.note}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 @2xl:flex-row">
        <a href={ORCID_REGISTER_URL} target="_blank" rel="noreferrer" className="cracha-cta">
          <IdCard className="size-4" aria-hidden />
          Criar meu ORCID (grátis)
        </a>
        <Link to="/ciencia" className="cracha-cta cracha-cta--ghost">
          <BadgeCheck className="size-4" aria-hidden />
          Guia completo: {SCIENCE_STEPS.length} etapas
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>

      <p className="mt-3 text-[11px] leading-snug text-muted-foreground">
        Quem publica sem vínculo é o alvo preferido das revistas predatórias. Antes de pagar
        qualquer taxa, passe a revista pelo checklist do{" "}
        <a
          href="https://thinkchecksubmit.org/journals/"
          target="_blank"
          rel="noreferrer"
          className="font-medium text-primary hover:underline"
        >
          Think. Check. Submit.
        </a>
      </p>
    </section>
  );
}
