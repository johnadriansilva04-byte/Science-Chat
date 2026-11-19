import { useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  Check,
  ChevronDown,
  ClipboardCopy,
  ExternalLink,
  FileText,
  Globe2,
  GraduationCap,
  HelpCircle,
  IdCard,
  Landmark,
  ShieldCheck,
  Sparkles,
  Wand2,
  XCircle,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  COUNTRY_PATHS,
  COVER_LETTER_TEMPLATE,
  DIRECT_ANSWER_POINTS,
  NOT_REQUIRED,
  ORCID_REGISTER_URL,
  SCIENCE_REFERENCES,
  SCIENCE_STEPS,
  WHAT_COUNTS,
  referencesByRegion,
  type ReferenceRegion,
} from "@/lib/science-access";
import { SCIENCE_FLOW_SEED } from "@/lib/science-flow";
import { ScienceBiteStepper } from "@/components/app/ScienceBiteStepper";

/** Semente que o botão "levar para o Pracinha" injeta no artigo novo. */
export const PRACINHA_ACCESS_SEED = SCIENCE_FLOW_SEED;

/** Cor de cada região/aba, para dar identidade visual sem depender do tema. */
const REGION_COLOR: Record<ReferenceRegion, string> = {
  brasil: "oklch(0.52 0.13 155)",
  uruguai: "oklch(0.5 0.13 245)",
  internacional: "oklch(0.56 0.14 55)",
};

const REGION_LABEL: Record<ReferenceRegion, string> = {
  brasil: "Brasil",
  uruguai: "Uruguai",
  internacional: "Internacional",
};

function useDisclosure(initial = false) {
  const [open, setOpen] = useState(initial);
  return [open, () => setOpen((v) => !v)] as const;
}

/** Botão "copiar" com confirmação temporária; usa o clipboard quando disponível. */
function CopyButton({
  text,
  label = "Copiar modelo",
  className = "",
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className={`min-h-11 gap-1.5 sm:min-h-8 ${className}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          // Sem clipboard (http/iframe): seleciona o texto para o usuário copiar.
          const area = document.createElement("textarea");
          area.value = text;
          area.style.position = "fixed";
          area.style.opacity = "0";
          document.body.appendChild(area);
          area.select();
          document.execCommand("copy");
          area.remove();
        }
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check className="size-4" /> : <ClipboardCopy className="size-4" />}
      {copied ? "Copiado!" : label}
    </Button>
  );
}

/** Prova verificável, recolhida: abre a explicação e a fonte sem sair do card. */
function ProofCard({ point }: { point: (typeof DIRECT_ANSWER_POINTS)[number] }) {
  const [open, toggle] = useDisclosure();
  return (
    <li className="ciencia-proof px-3.5 py-3" data-open={open}>
      <span className="ciencia-proof__bar" aria-hidden />
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex min-h-11 w-full cursor-pointer items-center gap-2.5 text-left"
      >
        <BadgeCheck className="size-4 shrink-0 text-[var(--ci-accent)]" />
        <span className="flex-1 text-[0.82rem] font-semibold leading-snug">{point.claim}</span>
        <ChevronDown className="ciencia-proof__chev size-4 shrink-0 text-[var(--ci-soft)]" />
      </button>
      <div className="ciencia-acc" data-open={open}>
        <div className="ciencia-acc__inner">
          <p className="pt-2 text-[0.78rem] leading-relaxed text-[var(--ci-soft)]">{point.proof}</p>
          <a
            href={point.url}
            target="_blank"
            rel="noreferrer"
            className="mt-1.5 inline-flex min-h-11 items-center gap-1 py-1.5 text-[0.75rem] font-semibold text-[var(--ci-accent)] hover:underline sm:min-h-9"
          >
            Fonte: {point.source}
            <ExternalLink className="size-3" />
          </a>
        </div>
      </div>
    </li>
  );
}

/** Fonte oficial, recolhida: mostra a nota só quando o leitor pede. */
function SourceCard({ reference }: { reference: (typeof SCIENCE_REFERENCES)[number] }) {
  const [open, toggle] = useDisclosure();
  const color = REGION_COLOR[reference.region];
  return (
    <li className="ciencia-src px-3 py-2.5">
      <div className="flex items-center gap-2">
        <a
          href={reference.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 flex-1 items-center gap-1.5 text-[0.8rem] font-semibold text-[var(--ci-ink)] hover:text-[var(--ci-accent)] hover:underline"
        >
          {reference.label}
          <ExternalLink className="size-3 opacity-60" />
        </a>
        <span
          className="ciencia-chip"
          style={{ background: `color-mix(in oklab, ${color} 14%, transparent)`, color }}
        >
          {REGION_LABEL[reference.region]}
        </span>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-label={`Por que ${reference.label} importa`}
          className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full border border-[var(--ci-rule)] text-[var(--ci-soft)] transition-colors hover:border-[var(--ci-accent)] hover:text-[var(--ci-accent)]"
        >
          <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>
      <div className="ciencia-acc" data-open={open}>
        <div className="ciencia-acc__inner">
          <p className="pt-1.5 text-[0.76rem] leading-relaxed text-[var(--ci-soft)]">
            {reference.note}
          </p>
        </div>
      </div>
    </li>
  );
}

/** Selo do ORCID: a identidade de pesquisador que não depende de instituição. */
function OrcidSeal() {
  return (
    <section className="mt-6 flex flex-col items-start gap-4 rounded-2xl border border-[var(--ci-rule)] bg-[color-mix(in_oklab,oklch(1_0_0)_45%,transparent)] p-4 sm:flex-row sm:items-center">
      <span className="ciencia-seal" aria-hidden>
        <IdCard className="size-7" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-serif text-[0.98rem] font-semibold">
          Sua assinatura de pesquisador — o ORCID
        </p>
        <p className="mt-0.5 text-[0.78rem] leading-relaxed text-[var(--ci-soft)]">
          Um número único, permanente e <strong>gratuito</strong> (formato 0000-0000-0000-0000). É
          seu, pessoal, e independe de vínculo: distingue você de homônimos e fixa a autoria. Aceito
          por revistas e universidades.
        </p>
      </div>
      <Button asChild size="lg" className="w-full shrink-0 gap-1.5 sm:w-auto">
        <a href={ORCID_REGISTER_URL} target="_blank" rel="noreferrer">
          <IdCard className="size-4" />
          Criar meu ORCID (grátis)
        </a>
      </Button>
    </section>
  );
}

function NotRequiredPanel() {
  return (
    <div className="rounded-2xl border border-red-200/70 bg-red-50/50 p-3.5">
      <p className="flex items-center gap-1.5 text-[0.8rem] font-semibold text-red-800">
        <XCircle className="size-4" />O que NÃO é exigido
      </p>
      <ul className="mt-2 space-y-1.5">
        {NOT_REQUIRED.map((item) => (
          <li key={item} className="flex gap-1.5 text-[0.78rem] text-red-900/80">
            <span className="mt-1.5 size-1 shrink-0 rounded-full bg-red-400" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function WhatCountsPanel() {
  return (
    <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/50 p-3.5">
      <p className="flex items-center gap-1.5 text-[0.8rem] font-semibold text-emerald-800">
        <BadgeCheck className="size-4" />O que realmente conta
      </p>
      <ul className="mt-2 space-y-1.5">
        {WHAT_COUNTS.map((item) => (
          <li key={item} className="flex gap-1.5 text-[0.78rem] text-emerald-900/80">
            <span className="mt-1.5 size-1 shrink-0 rounded-full bg-emerald-400" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Passo a passo. `compact` mostra os 4 primeiros e libera o resto sob demanda. */
function StepsSection({ compact = false }: { compact?: boolean }) {
  const [all, setAll] = useState(!compact);
  const shown = all ? SCIENCE_STEPS : SCIENCE_STEPS.slice(0, 4);
  return (
    <section className="mt-6">
      <h3 className="flex items-center gap-2 font-serif text-[0.95rem] font-semibold">
        <BookOpenCheck className="size-4 text-[var(--ci-accent)]" />
        Passo a passo
      </h3>
      <p className="mt-1 text-[0.74rem] text-[var(--ci-soft)]">
        Do zero ao artigo publicado. Em cada passo, o porquê acompanha a ação.
      </p>
      <ol className="ciencia-rail mt-4">
        {shown.map((step) => (
          <li key={step.n} className="ciencia-step">
            <span className="ciencia-step__dot" aria-hidden>
              {step.n}
            </span>
            <p className="text-[0.84rem] font-semibold leading-snug">{step.title}</p>
            <p className="text-[0.78rem] text-[var(--ci-soft)]">{step.do}</p>
            <p className="ciencia-step__why text-[0.75rem] italic text-[var(--ci-soft)]">
              Por quê: {step.why}
            </p>
          </li>
        ))}
      </ol>
      {!all && (
        <Button
          variant="ghost"
          className="mt-2 min-h-11 w-full gap-1.5 text-[0.8rem]"
          onClick={() => setAll(true)}
        >
          <ChevronDown className="size-4" />
          Ver os outros {SCIENCE_STEPS.length - shown.length} passos
        </Button>
      )}
    </section>
  );
}

/** Caminhos por país: Brasil, Uruguai e o caminho internacional. */
function CountriesSection() {
  return (
    <section className="mt-6">
      <h3 className="flex items-center gap-2 font-serif text-[0.95rem] font-semibold">
        <Globe2 className="size-4 text-[var(--ci-accent)]" />
        Caminhos por país
      </h3>
      <Tabs defaultValue={COUNTRY_PATHS[0]!.id} className="mt-3">
        <TabsList className="ciencia-tabs h-auto justify-start bg-transparent p-0">
          {COUNTRY_PATHS.map((path) => (
            <TabsTrigger
              key={path.id}
              value={path.id}
              className="ciencia-tab"
              style={{ ["--ci-tab" as string]: REGION_COLOR[path.id] }}
            >
              {path.label}
            </TabsTrigger>
          ))}
          <TabsTrigger
            value="internacional"
            className="ciencia-tab"
            style={{ ["--ci-tab" as string]: REGION_COLOR.internacional }}
          >
            Internacional
          </TabsTrigger>
        </TabsList>
        {COUNTRY_PATHS.map((path) => (
          <TabsContent
            key={path.id}
            value={path.id}
            className="ciencia-tab-panel mt-3"
            style={{ ["--ci-tab" as string]: REGION_COLOR[path.id] }}
          >
            <ul className="space-y-2">
              {path.highlights.map((h) => (
                <li key={h} className="ciencia-path-item text-[0.78rem]">
                  <span className="min-w-0">{h}</span>
                </li>
              ))}
            </ul>
          </TabsContent>
        ))}
        <TabsContent
          value="internacional"
          className="ciencia-tab-panel mt-3"
          style={{ ["--ci-tab" as string]: REGION_COLOR.internacional }}
        >
          <ul className="space-y-2">
            {referencesByRegion("internacional").map((r) => (
              <li key={r.url} className="ciencia-path-item text-[0.78rem]">
                <span className="min-w-0">
                  <span className="font-semibold">{r.label}</span> — {r.note}
                </span>
              </li>
            ))}
          </ul>
        </TabsContent>
      </Tabs>
    </section>
  );
}

/** Todas as fontes oficiais, com a nota de por que cada uma importa. */
function ReferencesSection() {
  return (
    <section className="mt-6">
      <h3 className="flex items-center gap-2 font-serif text-[0.95rem] font-semibold">
        <ShieldCheck className="size-4 text-[var(--ci-accent)]" />
        Fontes oficiais
      </h3>
      <p className="mt-1 text-[0.74rem] text-[var(--ci-soft)]">
        Nada aqui é norma inventada. Confira sempre a versão oficial da revista de destino.
      </p>
      <ul className="mt-3 space-y-2">
        {SCIENCE_REFERENCES.map((ref) => (
          <SourceCard key={ref.url} reference={ref} />
        ))}
      </ul>
    </section>
  );
}

/** Carta de apresentação pronta para preencher e copiar. */
function CoverLetterSection() {
  return (
    <section className="mt-6">
      <h3 className="flex items-center gap-2 font-serif text-[0.95rem] font-semibold">
        <FileText className="size-4 text-[var(--ci-accent)]" />
        Carta de apresentação (modelo)
      </h3>
      <p className="mt-1 text-[0.74rem] text-[var(--ci-soft)]">
        Muitas revistas pedem uma carta ao editor junto com o manuscrito. Não é exigência de vínculo
        — é documento de autoria. Preencha os campos entre [ ] e a afiliação já vem resolvida como
        “Pesquisador(a) independente”.
      </p>
      <div className="mt-3 rounded-2xl border border-[var(--ci-rule)] bg-[color-mix(in_oklab,oklch(1_0_0)_45%,transparent)] p-3.5">
        <pre className="ciencia-letter max-h-72 overflow-auto whitespace-pre-wrap break-words text-[0.76rem] leading-relaxed text-[var(--ci-ink)]">
          {COVER_LETTER_TEMPLATE}
        </pre>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <CopyButton text={COVER_LETTER_TEMPLATE} />
          <span className="text-[0.72rem] text-[var(--ci-soft)]">
            Cole no seu editor de texto e ajuste ao pedido de cada revista.
          </span>
        </div>
      </div>
    </section>
  );
}

/** Aprofundamento do guia: países, fontes e carta-modelo. */
function GuideContent({
  onUseGuide,
  onClose,
}: {
  onUseGuide?: ((seed: string) => void) | undefined;
  onClose: () => void;
}) {
  return (
    <>
      <CountriesSection />
      <ReferencesSection />
      <CoverLetterSection />

      <hr className="ciencia-rule mt-6" />

      <footer className="mt-4 flex flex-wrap items-center gap-2">
        {onUseGuide && (
          <Button
            size="sm"
            variant="outline"
            className="min-h-11 sm:min-h-8"
            onClick={() => {
              onUseGuide(PRACINHA_ACCESS_SEED);
              onClose();
            }}
          >
            <Wand2 className="size-4" />
            Levar isso para o Pracinha
          </Button>
        )}
        <Button size="sm" className="min-h-11 sm:min-h-8" onClick={onClose}>
          Entendi, quero começar
        </Button>
        <span className="text-[0.72rem] text-[var(--ci-soft)]">
          {referencesByRegion("brasil").length} fontes do Brasil ·{" "}
          {referencesByRegion("uruguai").length} do Uruguai ·{" "}
          {referencesByRegion("internacional").length} internacionais
        </span>
      </footer>
    </>
  );
}

/** Cabeçalho de boletim, usado no modo inline e no diálogo. */
function GuideHeader({ compact = false }: { compact?: boolean }) {
  return (
    <>
      <header className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--ci-accent)] text-[oklch(0.99_0.01_85)]">
          <GraduationCap className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <span className="ciencia-kicker">
            <Landmark className="size-3.5" /> Boletim do pesquisador independente
          </span>
          <h2
            className={`ciencia-title mt-1 leading-[1.05] ${
              compact ? "text-[1.55rem] sm:text-[1.9rem]" : "text-[1.7rem] sm:text-[2rem]"
            }`}
          >
            Ciência sem crachá
          </h2>
        </div>
      </header>

      <p className="ciencia-lede mt-3">
        Dá para fazer ciência e submeter um artigo a uma revista{" "}
        <strong>sem universidade, diploma ou orientador</strong>. O que qualifica o trabalho é o{" "}
        <strong>método</strong> e a <strong>responsabilidade do autor</strong> — não a grife da
        instituição.
      </p>
    </>
  );
}

/** As cinco provas de que publicar não depende de vínculo. */
function DirectAnswerSection({ hint = false }: { hint?: boolean }) {
  return (
    <section className="mt-5">
      <h3 className="flex items-center gap-2 font-serif text-[0.95rem] font-semibold">
        <HelpCircle className="size-4 text-[var(--ci-accent)]" />
        “Mas eu não sou de instituição… posso publicar?”
      </h3>
      {hint && (
        <p className="mt-1 text-[0.74rem] text-[var(--ci-soft)]">
          Toque em cada prova para ver o fundamento e a fonte oficial.
        </p>
      )}
      <ul className="mt-3 space-y-2.5">
        {DIRECT_ANSWER_POINTS.map((point) => (
          <ProofCard key={point.claim} point={point} />
        ))}
      </ul>
    </section>
  );
}

/**
 * Guia "Ciência sem crachá": ensina que fazer ciência e submeter um artigo a
 * uma revista NÃO depende de crachá ou instituição.
 *
 * Dois modos:
 * - `inline` (home): o fundamento e o passo a passo ficam À VISTA. Quem chega
 *   precisando dessa resposta não pode ter que descobrir que ela existe.
 * - padrão: uma chamada compacta que abre o guia completo num diálogo.
 */
export function ScienceAccessCard({
  className = "",
  onUseGuide,
  inline = false,
}: {
  className?: string;
  /** Cria um artigo com a semente do guia (a home preenche a ideia e navega). */
  onUseGuide?: (seed: string) => void;
  /** Conteúdo ensinado direto na página, sem clique para revelar. */
  inline?: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (inline) {
    return (
      <section className={`ciencia-inline ${className}`} aria-labelledby="ciencia-inline-title">
        <div className="ciencia-inline__body">
          <h2 id="ciencia-inline-title" className="sr-only">
            Ciência sem crachá: como publicar sem vínculo institucional
          </h2>
          <GuideHeader compact />

          <hr className="ciencia-rule ciencia-rule--double mt-4" />

          <DirectAnswerSection />

          {/* O caminho é servido em partes: um bocado por vez, com o porquê e o
              para-que-serve. Ninguém lê dez passos de uma vez — e a dúvida aqui
              é "posso?", não "me dê o manual". */}
          <ScienceBiteStepper />

          <section className="mt-5 grid gap-3 sm:grid-cols-2">
            <NotRequiredPanel />
            <WhatCountsPanel />
          </section>

          <OrcidSeal />

          <footer className="mt-5 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="min-h-11 gap-1.5"
              onClick={() => setOpen(true)}
            >
              <ShieldCheck className="size-4" />
              Fontes, países e carta-modelo
            </Button>
            {onUseGuide && (
              <Button
                size="sm"
                className="min-h-11 gap-1.5"
                onClick={() => onUseGuide(PRACINHA_ACCESS_SEED)}
              >
                <Wand2 className="size-4" />
                Levar isso para o Pracinha
              </Button>
            )}
          </footer>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-h-[94vh] overflow-hidden border-0 bg-transparent p-0 shadow-none sm:max-w-3xl">
            <DialogTitle className="sr-only">
              Ciência sem crachá: fontes, países e carta-modelo
            </DialogTitle>
            <div className="ciencia-dialog max-h-[94vh] overflow-y-auto">
              <div className="ciencia-dialog__body p-5 sm:p-7">
                <GuideContent onUseGuide={onUseGuide} onClose={() => setOpen(false)} />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </section>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ciência sem crachá — abrir o guia"
        className={`ciencia-trigger group flex w-full items-start gap-3 rounded-xl p-3 pl-4 text-left ${className}`}
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
            Publicar artigo não exige universidade, diploma ou orientador. Veja o porquê — com
            provas — e o passo a passo (Brasil e Uruguai).
          </span>
          <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-primary">
            Sim, você pode publicar sem vínculo
            <ArrowRight className="ciencia-trigger__arrow size-3" />
          </span>
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[94vh] overflow-hidden border-0 bg-transparent p-0 shadow-none sm:max-w-3xl">
          <DialogTitle className="sr-only">
            Ciência sem crachá: como publicar sem vínculo
          </DialogTitle>
          <div className="ciencia-dialog max-h-[94vh] overflow-y-auto">
            <div className="ciencia-dialog__body p-5 sm:p-7">
              <GuideHeader />

              <hr className="ciencia-rule ciencia-rule--double mt-5" />

              <DirectAnswerSection hint />
              <OrcidSeal />

              <section className="mt-5 grid gap-3 sm:grid-cols-2">
                <NotRequiredPanel />
                <WhatCountsPanel />
              </section>

              <StepsSection />

              <GuideContent onUseGuide={onUseGuide} onClose={() => setOpen(false)} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
