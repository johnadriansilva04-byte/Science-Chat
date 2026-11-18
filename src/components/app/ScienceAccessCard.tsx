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

/** Semente que o botão "levar para o Pracinha" injeta no artigo novo. */
export const PRACINHA_ACCESS_SEED =
  "Quero publicar como pesquisador(a) independente, sem vínculo institucional. Me ajude a escolher a revista pelo escopo, preencher a afiliação como “Pesquisador(a) independente”, criar meu ORCID e seguir as diretrizes oficiais.";

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
            className="mt-1.5 inline-flex min-h-9 items-center gap-1 py-1 text-[0.72rem] font-semibold text-[var(--ci-accent)] hover:underline"
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

/**
 * Card educativo da página inicial: ensina que fazer ciência e submeter um
 * artigo a uma revista NÃO depende de crachá ou instituição. Estética de boletim
 * científico: papel quente com grão, filetes de jornal, provas e fontes
 * recolhidas (não poluem a leitura) e o selo de cera do ORCID como assinatura de
 * quem pesquisa sem vínculo. Traz Brasil, Uruguai e o caminho internacional.
 */
export function ScienceAccessCard({
  className = "",
  onUseGuide,
}: {
  className?: string;
  /** Cria um artigo com a semente do guia (a home preenche a ideia e navega). */
  onUseGuide?: (seed: string) => void;
}) {
  const [open, setOpen] = useState(false);

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
              {/* Cabeçalho de boletim */}
              <header className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--ci-accent)] text-[oklch(0.99_0.01_85)]">
                  <GraduationCap className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="ciencia-kicker">
                    <Landmark className="size-3.5" /> Boletim do pesquisador independente
                  </span>
                  <h2 className="ciencia-title mt-1 text-[1.7rem] leading-[1.05] sm:text-[2rem]">
                    Ciência sem crachá
                  </h2>
                </div>
              </header>

              <p className="ciencia-lede mt-3">
                Você está certo: dá para fazer ciência e submeter um artigo a uma revista{" "}
                <strong>sem universidade, diploma ou orientador</strong>. O que qualifica o trabalho
                é o <strong>método</strong> e a <strong>responsabilidade do autor</strong> — não a
                grife da instituição.
              </p>

              <hr className="ciencia-rule ciencia-rule--double mt-5" />

              {/* Resposta direta — provas recolhidas */}
              <section className="mt-5">
                <h3 className="flex items-center gap-2 font-serif text-[0.95rem] font-semibold">
                  <HelpCircle className="size-4 text-[var(--ci-accent)]" />
                  “Mas eu não sou de instituição… posso publicar?”
                </h3>
                <p className="mt-1 text-[0.74rem] text-[var(--ci-soft)]">
                  Toque em cada prova para ver o fundamento e a fonte oficial.
                </p>
                <ul className="mt-3 space-y-2.5">
                  {DIRECT_ANSWER_POINTS.map((point) => (
                    <ProofCard key={point.claim} point={point} />
                  ))}
                </ul>
              </section>

              {/* Selo de cera: ORCID */}
              <section className="mt-6 flex flex-col items-start gap-4 rounded-2xl border border-[var(--ci-rule)] bg-[color-mix(in_oklab,oklch(1_0_0)_45%,transparent)] p-4 sm:flex-row sm:items-center">
                <span className="ciencia-seal" aria-hidden>
                  <IdCard className="size-7" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-[0.98rem] font-semibold">
                    Sua assinatura de pesquisador — o ORCID
                  </p>
                  <p className="mt-0.5 text-[0.78rem] leading-relaxed text-[var(--ci-soft)]">
                    Um número único, permanente e <strong>gratuito</strong> (formato
                    0000-0000-0000-0000). É seu, pessoal, e independe de vínculo: distingue você de
                    homônimos e fixa a autoria. Aceito por revistas e universidades.
                  </p>
                </div>
                <Button asChild size="lg" className="shrink-0 gap-1.5">
                  <a href={ORCID_REGISTER_URL} target="_blank" rel="noreferrer">
                    <IdCard className="size-4" />
                    Criar meu ORCID (grátis)
                  </a>
                </Button>
              </section>

              {/* O que não é exigido × o que realmente conta */}
              <section className="mt-5 grid gap-3 sm:grid-cols-2">
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
              </section>

              {/* Passo a passo — trilho com "porquê" no hover */}
              <section className="mt-6">
                <h3 className="flex items-center gap-2 font-serif text-[0.95rem] font-semibold">
                  <BookOpenCheck className="size-4 text-[var(--ci-accent)]" />
                  Passo a passo
                </h3>
                <p className="mt-1 text-[0.74rem] text-[var(--ci-soft)]">
                  Dez movimentos do crachá ao artigo publicado. Em cada passo, o porquê acompanha a
                  ação.
                </p>
                <ol className="ciencia-rail mt-4">
                  {SCIENCE_STEPS.map((step) => (
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
              </section>

              {/* Caminhos por país */}
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

              {/* Fontes oficiais */}
              <section className="mt-6">
                <h3 className="flex items-center gap-2 font-serif text-[0.95rem] font-semibold">
                  <ShieldCheck className="size-4 text-[var(--ci-accent)]" />
                  Fontes oficiais
                </h3>
                <p className="mt-1 text-[0.74rem] text-[var(--ci-soft)]">
                  Nada aqui é norma inventada. Confira sempre a versão oficial da revista de
                  destino.
                </p>
                <ul className="mt-3 space-y-2">
                  {SCIENCE_REFERENCES.map((ref) => (
                    <SourceCard key={ref.url} reference={ref} />
                  ))}
                </ul>
              </section>

              {/* Carta de apresentação pronta para preencher */}
              <section className="mt-6">
                <h3 className="flex items-center gap-2 font-serif text-[0.95rem] font-semibold">
                  <FileText className="size-4 text-[var(--ci-accent)]" />
                  Carta de apresentação (modelo)
                </h3>
                <p className="mt-1 text-[0.74rem] text-[var(--ci-soft)]">
                  Muitas revistas pedem uma carta ao editor junto com o manuscrito. Não é exigência
                  de vínculo — é documento de autoria. Preencha os campos entre [ ] e a afiliação já
                  vem resolvida como “Pesquisador(a) independente”.
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

              <hr className="ciencia-rule mt-6" />

              <footer className="mt-4 flex flex-wrap items-center gap-2">
                {onUseGuide && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="min-h-11 sm:min-h-8"
                    onClick={() => {
                      onUseGuide(PRACINHA_ACCESS_SEED);
                      setOpen(false);
                    }}
                  >
                    <Wand2 className="size-4" />
                    Levar isso para o Pracinha
                  </Button>
                )}
                <Button size="sm" className="min-h-11 sm:min-h-8" onClick={() => setOpen(false)}>
                  Entendi, quero começar
                </Button>
                <span className="text-[0.72rem] text-[var(--ci-soft)]">
                  {referencesByRegion("brasil").length} fontes do Brasil ·{" "}
                  {referencesByRegion("uruguai").length} do Uruguai ·{" "}
                  {referencesByRegion("internacional").length} internacionais
                </span>
              </footer>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
