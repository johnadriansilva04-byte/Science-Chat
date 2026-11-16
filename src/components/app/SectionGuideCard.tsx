import { useState } from "react";
import { ChevronDown, ChevronUp, GraduationCap } from "lucide-react";
import { SECTION_GUIDE, protocolSteps } from "@/lib/section-guide";

/**
 * O "modo ensino" visível: mostra o protocolo numerado e o guia de cada parte
 * do artigo (por que existe + um exemplo). É a versão em tela do que o Pracinha
 * explica no chat — o pesquisador aprende o que está construindo.
 *
 * Fica recolhido por padrão: o guia completo é longo e, aberto, afogava o plano.
 */
export function SectionGuideCard() {
  const [open, setOpen] = useState(false);
  const steps = protocolSteps();
  return (
    <div className="rounded-lg border border-primary/20 bg-accent/30 p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 text-sm font-medium"
      >
        <GraduationCap className="size-4 text-primary" />
        Como cada parte funciona
        {open ? (
          <ChevronUp className="ml-auto size-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="ml-auto size-4 text-muted-foreground" />
        )}
      </button>
      <p className="mt-2 text-xs text-muted-foreground">
        Título e palavras-chave são <strong>suas</strong> escolhas — eu mostro exemplos.
      </p>
      {open && (
        <ol className="mt-3 space-y-2">
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
      )}
    </div>
  );
}
