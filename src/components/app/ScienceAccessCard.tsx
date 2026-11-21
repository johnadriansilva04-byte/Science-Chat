import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  Check,
  ChevronDown,
  ExternalLink,
  GraduationCap,
  IdCard,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  NOT_REQUIRED,
  NOT_REQUIRED_CAVEAT,
  ORCID_REGISTER_URL,
  SCIENCE_STEPS,
  WHAT_COUNTS,
  referencesByRegion,
  type ReferenceRegion,
} from "@/lib/science-access";
import { cn } from "@/lib/utils";

const REGION_LABEL: Record<"brasil" | "uruguai", string> = {
  brasil: "Brasil",
  uruguai: "Uruguai",
};

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
  // A nota é da REGIÃO, não do país: `COUNTRY_PATHS` só tem Brasil e Uruguai, e
  // a aba "Internacional" nunca exibia a sua explicação (o texto existia, mas
  // ficava atrás de uma condição que nunca era verdadeira).
  const regionNote =
    region === "brasil"
      ? "No Brasil, a trajetória é pública e a leitura é aberta: você registra e publica sem vínculo."
      : region === "uruguai"
        ? "No Uruguai, o caminho passa pelo SciELO Uruguay — e o CVUy (ANII) é o currículo público gratuito."
        : "Fora do Brasil e do Uruguai, o caminho é o mesmo em qualquer país: Latindex e Redalyc mostram as revistas da América Latina, e o ORCID e os preprints não dependem de fronteira.";

  if (variant === "compact") {
    return (
      <Link
        to="/ciencia"
        aria-label="Ciência sem crachá — abrir o guia"
        className={cn("cracha-compact card-accent--guide group", className)}
      >
        <span className="cracha-compact__icon">
          <GraduationCap className="size-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="cracha-compact__title flex items-center gap-1.5 font-serif text-sm font-semibold">
            Ciência sem crachá
            <BadgeCheck className="size-3.5" aria-hidden />
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
          Publicar artigo <strong className="font-semibold">não exige</strong> vínculo
          institucional. O que a revista avalia é o trabalho.
        </p>
      </header>

      <div className="mt-3 grid grid-cols-2 gap-2">
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
      <p className="mt-2 text-[0.72rem] leading-snug text-muted-foreground">
        {NOT_REQUIRED_CAVEAT}
      </p>
      {/* Uma linha só: o detalhe vive na etapa 3, não repetido aqui. Quem lê
          "não é exigido vínculo" precisa saber da exceção sem abrir nada. */}
      <p className="cracha-ethics mt-2 rounded-lg border border-amber-500/35 bg-amber-500/8 px-2.5 py-2 text-[0.72rem] leading-snug text-foreground/80">
        <strong className="font-semibold">Exceção honesta:</strong> pesquisa com seres humanos exige
        comitê de ética antes de coletar (CEP no Brasil, comitê acreditado pelo MSP no Uruguai) —
        detalhe na etapa 3.
      </p>

      {/* O caminho com o fundamento de cada etapa. Recolhido por padrão: aberto,
          as 12 etapas empurravam a coletânea para fora da primeira rolagem e o
          card virava um manual na home. O corpo de cada etapa traz o que fazer,
          por que se sustenta e a FONTE oficial — sem a fonte o card seria
          opinião, e quem publica sem vínculo precisa conferir cada afirmação. */}
      <details className="cracha-steps cracha-steps--fold mt-3">
        <summary className="cracha-steps__title">
          <BookOpenCheck className="size-4 shrink-0" aria-hidden />
          {`O caminho em ${SCIENCE_STEPS.length} etapas, com a fonte de cada uma`}
          <ChevronDown className="cracha-sources__chev size-4 shrink-0" aria-hidden />
        </summary>
        <ol className="mt-1.5 grid gap-1">
          {SCIENCE_STEPS.map((step) => (
            <li key={step.n}>
              <details className="cracha-step">
                <summary>
                  <span className="cracha-step__n" aria-hidden>
                    {step.n}
                  </span>
                  <span className="cracha-step__title">{step.title}</span>
                  {step.region && (
                    <span className="cracha-step__tag">{REGION_LABEL[step.region]}</span>
                  )}
                  <ChevronDown className="cracha-step__chevron" aria-hidden />
                </summary>
                <div className="cracha-step__body">
                  <p className="cracha-step__do">{step.do}</p>
                  <p className="cracha-step__why">{step.why}</p>
                  {step.source && (
                    <a
                      href={step.source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="cracha-step__source"
                    >
                      Fonte: {step.source.label}
                      <ExternalLink className="size-3 shrink-0" aria-hidden />
                    </a>
                  )}
                </div>
              </details>
            </li>
          ))}
        </ol>
      </details>

      {/* Fechado por padrão: o card precisa caber numa tela. Quem quer o
          caminho por país abre — e as fontes completas ficam no guia. */}
      <details className="cracha-sources cracha-sources--fold mt-3">
        <summary className="cracha-steps__title">
          <ShieldCheck className="size-4 shrink-0" aria-hidden />
          Onde submeter, com fonte oficial
          <ChevronDown className="cracha-sources__chev size-4 shrink-0" aria-hidden />
        </summary>
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
          <p className="cracha-region-note">{regionNote}</p>
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
      </details>

      <div className="mt-3 flex flex-col gap-2 @2xl:flex-row">
        <a href={ORCID_REGISTER_URL} target="_blank" rel="noreferrer" className="cracha-cta">
          <IdCard className="size-4" aria-hidden />
          Criar meu ORCID (grátis)
        </a>
        <Link to="/ciencia" className="cracha-cta cracha-cta--ghost">
          <BadgeCheck className="size-4" aria-hidden />
          Guia completo, com fontes
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
