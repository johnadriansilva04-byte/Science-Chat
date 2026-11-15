import { GraduationCap } from "lucide-react";
import { SECTION_GUIDE, protocolSteps } from "@/lib/section-guide";

/**
 * O "modo ensino" visível: mostra o protocolo numerado e o guia de cada parte
 * do artigo (por que existe + um exemplo). É a versão em tela do que o Pracinha
 * explica no chat — o pesquisador aprende o que está construindo.
 */
export function SectionGuideCard() {
  const steps = protocolSteps();
  return (
    <div className="rounded-lg border border-primary/20 bg-accent/30 p-3">
      <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
        <GraduationCap className="size-4 text-primary" />
        Como cada parte funciona
      </p>
      <p className="mb-3 text-xs text-muted-foreground">
        Vamos construir nesta ordem, uma parte de cada vez. Título e palavras-chave são{" "}
        <strong>suas</strong> escolhas — eu mostro exemplos.
      </p>
      <ol className="space-y-2">
        {steps.map((s, i) => {
          const guide = SECTION_GUIDE[i];
          if (!guide) return null;
          return (
            <li key={guide.key} className="flex gap-2 text-xs">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                {s.n}
              </span>
              <span className="min-w-0">
                <span className="font-medium">{guide.title}</span>
                <span className="text-muted-foreground"> — {guide.why}</span>
                <span className="mt-0.5 block italic text-muted-foreground/80">
                  Ex.: {guide.example}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
