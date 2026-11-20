import { Check, Minus } from "lucide-react";

import { cn } from "@/lib/utils";
import type { SectionState } from "@/lib/interview-progress";

const LABEL: Record<string, string> = {
  Introdução: "Intro",
  "Fundamentação teórica": "Teoria",
  Metodologia: "Método",
  Resultados: "Result.",
  Discussão: "Discussão",
  Conclusão: "Conclusão",
};

/**
 * Faixa do mapa da entrevista: as seis seções do artigo, com o estado de cada uma.
 *
 * O pesquisador via a folha sendo preenchida, mas não sabia o que ainda FALTAVA
 * nem quanto do caminho já tinha andado. A faixa responde isso de relance, em uma
 * linha que rola na horizontal no celular — sem tirar espaço da conversa.
 *
 * Cada seção é um `li` com estado acessível por texto, não só por cor: quem usa
 * leitor de tela ouve "Introdução: respondida".
 */
export function InterviewMapRow({
  sections,
  className,
}: {
  sections: { section: string; state: SectionState }[];
  className?: string;
}) {
  if (!sections.length) return null;
  return (
    <div className={cn("interview-map border-b bg-muted/30 px-2 py-1.5", className)}>
      <ol
        aria-label="Mapa da entrevista: seções do artigo"
        className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {sections.map(({ section, state }) => {
          const label =
            state === "answered"
              ? "respondida"
              : state === "skipped"
                ? "pulada"
                : state === "current"
                  ? "perguntando agora"
                  : "em aberto";
          return (
            <li
              key={section}
              data-state={state}
              className="interview-map__item"
              aria-label={`${section}: ${label}`}
              title={`${section}: ${label}`}
            >
              {state === "answered" ? (
                <Check className="size-2.5 shrink-0" aria-hidden />
              ) : state === "skipped" ? (
                <Minus className="size-2.5 shrink-0" aria-hidden />
              ) : (
                <span className="interview-map__dot" aria-hidden />
              )}
              {LABEL[section] ?? section}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
