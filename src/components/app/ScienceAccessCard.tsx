import { useState } from "react";
import {
  BadgeCheck,
  BookOpenCheck,
  ExternalLink,
  Globe2,
  GraduationCap,
  HelpCircle,
  IdCard,
  ShieldCheck,
  Sparkles,
  Wand2,
  XCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  COUNTRY_PATHS,
  DIRECT_ANSWER_POINTS,
  NOT_REQUIRED,
  ORCID_REGISTER_URL,
  SCIENCE_REFERENCES,
  SCIENCE_STEPS,
  WHAT_COUNTS,
  referencesByRegion,
} from "@/lib/science-access";

/** Semente que o botão "levar para o Pracinha" injeta no artigo novo. */
export const PRACINHA_ACCESS_SEED =
  "Quero publicar como pesquisador(a) independente, sem vínculo institucional. Me ajude a escolher a revista pelo escopo, preencher a afiliação como “Pesquisador(a) independente”, criar meu ORCID e seguir as diretrizes oficiais.";

/**
 * Card educativo da página inicial: ensina que fazer ciência e submeter um
 * artigo a uma revista NÃO depende de crachá ou instituição. Traz a resposta
 * direta com provas, o passo a passo (com o porquê), o que não é exigido, o que
 * realmente conta e as fontes oficiais — com caminhos para o Brasil e o Uruguai.
 *
 * Fica recolhido na home e abre em um diálogo com o conteúdo completo, para não
 * competir com a ação principal (começar o artigo).
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
        className={`group flex w-full items-start gap-3 rounded-xl border border-primary/25 bg-white/70 p-3 text-left backdrop-blur transition-colors hover:border-primary/50 hover:bg-white/90 ${className}`}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <GraduationCap className="size-5" />
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 font-serif text-sm font-semibold">
            Ciência sem crachá
            <Sparkles className="size-3.5 text-primary" />
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Publicar artigo não exige universidade, diploma ou orientador. Veja o porquê — com
            provas — e o passo a passo (Brasil e Uruguai).
          </span>
          <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-primary group-hover:underline">
            Sim, você pode publicar sem vínculo →
          </span>
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-serif">
              <GraduationCap className="size-5 text-primary" />
              Ciência sem crachá: como publicar sem vínculo
            </DialogTitle>
            <DialogDescription>
              Você está certo: dá para fazer ciência e submeter um artigo a uma revista sem
              universidade, diploma ou orientador. O que qualifica o trabalho é o método e a
              responsabilidade do autor — não a grife da instituição. Veja as provas e o caminho.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <section className="rounded-lg border border-primary/30 bg-primary/5 p-3">
              <h3 className="flex items-center gap-1.5 font-serif text-sm font-semibold">
                <HelpCircle className="size-4 text-primary" />
                “Mas eu não sou de instituição… posso publicar?”
              </h3>
              <ul className="mt-3 space-y-2.5">
                {DIRECT_ANSWER_POINTS.map((point) => (
                  <li key={point.claim} className="text-xs">
                    <span className="flex items-center gap-1 font-medium text-foreground">
                      <BadgeCheck className="size-3.5 shrink-0 text-primary" />
                      {point.claim}
                    </span>
                    <span className="mt-0.5 block pl-5 text-muted-foreground">{point.proof}</span>
                    <a
                      href={point.url}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-5 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                    >
                      Fonte: {point.source}
                      <ExternalLink className="size-3" />
                    </a>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-primary/20 pt-3">
                <Button asChild size="sm" className="gap-1.5">
                  <a href={ORCID_REGISTER_URL} target="_blank" rel="noreferrer">
                    <IdCard className="size-4" />
                    Criar meu ORCID agora (grátis)
                  </a>
                </Button>
                <span className="text-[11px] text-muted-foreground">
                  Leva ~3 minutos, só com nome e e-mail. O número é seu e permanente.
                </span>
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-red-200 bg-red-50/70 p-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-red-800">
                  <XCircle className="size-3.5" />O que NÃO é exigido
                </p>
                <ul className="mt-2 space-y-1">
                  {NOT_REQUIRED.map((item) => (
                    <li key={item} className="text-xs text-red-900/80">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                  <BadgeCheck className="size-3.5" />O que realmente conta
                </p>
                <ul className="mt-2 space-y-1">
                  {WHAT_COUNTS.map((item) => (
                    <li key={item} className="text-xs text-emerald-900/80">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section>
              <h3 className="flex items-center gap-1.5 font-serif text-sm font-semibold">
                <BookOpenCheck className="size-4 text-primary" />
                Passo a passo
              </h3>
              <ol className="mt-3 space-y-3">
                {SCIENCE_STEPS.map((step) => (
                  <li key={step.n} className="flex gap-2.5">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                      {step.n}
                    </span>
                    <span className="min-w-0 text-xs">
                      <span className="font-medium">{step.title}</span>
                      <span className="mt-0.5 block">{step.do}</span>
                      <span className="mt-0.5 block italic text-muted-foreground/90">
                        Por quê: {step.why}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </section>

            <section>
              <h3 className="flex items-center gap-1.5 font-serif text-sm font-semibold">
                <Globe2 className="size-4 text-primary" />
                Caminhos por país
              </h3>
              <Tabs defaultValue={COUNTRY_PATHS[0]!.id} className="mt-3">
                <TabsList>
                  {COUNTRY_PATHS.map((path) => (
                    <TabsTrigger key={path.id} value={path.id}>
                      {path.label}
                    </TabsTrigger>
                  ))}
                  <TabsTrigger value="internacional">Internacional</TabsTrigger>
                </TabsList>
                {COUNTRY_PATHS.map((path) => (
                  <TabsContent key={path.id} value={path.id} className="mt-3">
                    <ul className="space-y-1.5">
                      {path.highlights.map((h) => (
                        <li key={h} className="text-xs text-muted-foreground">
                          {h}
                        </li>
                      ))}
                    </ul>
                  </TabsContent>
                ))}
                <TabsContent value="internacional" className="mt-3">
                  <ul className="space-y-1.5">
                    {referencesByRegion("internacional").map((r) => (
                      <li key={r.url} className="text-xs text-muted-foreground">
                        {r.label} — {r.note}
                      </li>
                    ))}
                  </ul>
                </TabsContent>
              </Tabs>
            </section>

            <section>
              <h3 className="flex items-center gap-1.5 font-serif text-sm font-semibold">
                <ShieldCheck className="size-4 text-primary" />
                Fontes oficiais
              </h3>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Nada aqui é norma inventada. Confira sempre a versão oficial da revista de destino.
              </p>
              <ul className="mt-3 space-y-2">
                {SCIENCE_REFERENCES.map((ref) => (
                  <li key={ref.url} className="rounded-md border p-2 text-xs">
                    <a
                      href={ref.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                    >
                      {ref.label}
                      <ExternalLink className="size-3" />
                    </a>
                    <span className="mt-0.5 block text-muted-foreground">{ref.note}</span>
                  </li>
                ))}
              </ul>
            </section>

            <div className="flex flex-wrap items-center gap-2 border-t pt-3">
              {onUseGuide && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onUseGuide(PRACINHA_ACCESS_SEED);
                    setOpen(false);
                  }}
                >
                  <Wand2 className="size-4" />
                  Levar isso para o Pracinha
                </Button>
              )}
              <Button size="sm" onClick={() => setOpen(false)}>
                Entendi, quero começar
              </Button>
              <span className="text-[11px] text-muted-foreground">
                {referencesByRegion("brasil").length} fontes do Brasil ·{" "}
                {referencesByRegion("uruguai").length} do Uruguai ·{" "}
                {referencesByRegion("internacional").length} internacionais
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
