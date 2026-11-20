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
  Lightbulb,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  COUNTRY_PATHS,
  NOT_REQUIRED,
  NOT_REQUIRED_CAVEAT,
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

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="cracha-list cracha-list--no">
          <p className="cracha-list__title">
            <X className="size-3.5" aria-hidden />
            Não é exigido
          </p>
          <ul>
            {NOT_REQUIRED.slice(0, 3).map((item) => (
              <li key={item}>{item}</li>
            ))}
            <li className="cracha-list__more">e mais {NOT_REQUIRED.length - 3}…</li>
          </ul>
        </div>
        <div className="cracha-list cracha-list--yes">
          <p className="cracha-list__title">
            <Check className="size-3.5" aria-hidden />O que conta de verdade
          </p>
          <ul>
            {WHAT_COUNTS.slice(0, 3).map((item) => (
              <li key={item}>{item}</li>
            ))}
            <li className="cracha-list__more">e mais {WHAT_COUNTS.length - 3}…</li>
          </ul>
        </div>
      </div>
      <p className="mt-2 text-[0.72rem] leading-snug text-muted-foreground">
        {NOT_REQUIRED_CAVEAT}
      </p>

      {/* O passo a passo completo (11 etapas, com o "por quê" e o "para que
          serve" de cada uma) vive em /ciencia. Aqui fica o resumo: o card da
          home é a porta de entrada, não o manual — empilhado, ele ocupava 1,7
          telas e empurrava a coletânea para fora da primeira rolagem. */}
      <div className="cracha-steps mt-3">
        <p className="cracha-steps__title">
          <BookOpenCheck className="size-4" aria-hidden />O caminho, em resumo
        </p>
        <ol>
          {SCIENCE_BITES.slice(0, 4).map((bite) => (
            <li key={bite.n} className="cracha-step cracha-step--brief">
              <span className="cracha-step__n" aria-hidden>
                {bite.n}
              </span>
              <span className="cracha-step__title">{bite.title}</span>
            </li>
          ))}
          <li className="cracha-step cracha-step--brief cracha-step--more">
            <span className="cracha-step__n" aria-hidden>
              +{SCIENCE_BITES.length - 4}
            </span>
            <span className="cracha-step__title">Etapas essenciais restantes</span>
          </li>
        </ol>
      </div>

      {/* Fechado por padrão: o card precisa caber numa tela. Quem quer o
          caminho por país abre — e as fontes completas ficam no guia. */}
      <details className="cracha-sources cracha-sources--fold mt-3">
        <summary className="cracha-steps__title">
          <ShieldCheck className="size-4 shrink-0" aria-hidden />
          Onde submeter, com fonte oficial
          <span className="cracha-sources__hint">Brasil · Uruguai · Internacional</span>
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
          {country && (
            <p className="cracha-region-note">
              {region === "brasil"
                ? "No Brasil, a trajetória é pública e a leitura é aberta: você registra e publica sem vínculo."
                : region === "uruguai"
                  ? "No Uruguai, o caminho passa pela Udelar e pelo SciELO Uruguay — e o CVUy já integra o ORCID."
                  : "Fora da América Latina, o ORCID e os preprints abertos são o caminho mais curto para quem não tem vínculo."}
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
