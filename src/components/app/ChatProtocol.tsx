import { useState } from "react";
import { ChevronDown, Compass } from "lucide-react";
import { SECTION_GUIDE, protocolSteps } from "@/lib/section-guide";
import { cn } from "@/lib/utils";

/**
 * O protocolo de montagem, numa linha só.
 *
 * O chat empilhava até cinco cartões acima do campo (plano, sugestões, ciência,
 * ORCID, aviso), o que empurrava o texto e escondia o compositor. Aqui o
 * protocolo é UMA faixa discreta: mostra onde estamos e, se a pessoa quiser,
 * abre a ordem completa. Nada é despejado por padrão.
 */
export function ChatProtocol({
  current,
  className,
}: {
  /** Índice (1-based) da parte em produção; 0 = ainda na entrevista. */
  current?: number;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const steps = protocolSteps();
  const active = current && current > 0 ? steps[current - 1] : undefined;
  const guide = active ? SECTION_GUIDE[current! - 1] : undefined;

  return (
    <div className={cn("chat-protocol", className)} data-open={open}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="chat-protocol__bar"
      >
        <Compass className="size-3.5 shrink-0 text-primary" />
        <span className="min-w-0 flex-1 truncate text-left">
          {active ? (
            <>
              <span className="tabular-nums text-muted-foreground">
                {active.n}/{steps.length}
              </span>{" "}
              {active.title}
            </>
          ) : (
            "Como o artigo é montado"
          )}
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="chat-protocol__body">
          {guide && (
            <p className="mb-2 text-[11px] leading-relaxed text-muted-foreground">{guide.why}</p>
          )}
          <ul className="chat-protocol__list">
            {steps.map((s) => (
              <li key={s.n} data-active={s.n === current || undefined}>
                <span className="tabular-nums">{s.n}</span>
                {s.title}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[10px] text-muted-foreground">
            Uma parte por vez. Você decide o que é autoral — título, palavras-chave e recorte.
          </p>
        </div>
      )}
    </div>
  );
}
