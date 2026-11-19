/**
 * Reordena `text-end` para depois do texto que os filtros soltam no `flush()`.
 *
 * Os transforms de filtragem (anti-clichê, nomes de ferramenta, JSON vazado)
 * seguram pedaços de texto em buffer e só liberam o resto quando o stream
 * termina. Como o `text-end` de cada parte passa direto, o texto liberado no
 * flush chegava DEPOIS do fechamento da parte — e o AI SDK trata isso como
 * erro (`text part <id> not found`), que o pesquisador via como "Não foi
 * possível enviar. Tente de novo.".
 *
 * Este transform roda por último na cadeia: segura os `text-end` até o fim e
 * os reemite depois do último delta de cada parte.
 */
import type { TextStreamPart, ToolSet } from "ai";

export function holdTextEndTransform(): TransformStream<
  TextStreamPart<ToolSet>,
  TextStreamPart<ToolSet>
> {
  const heldEnds = new Map<string, TextStreamPart<ToolSet>>();
  return new TransformStream<TextStreamPart<ToolSet>, TextStreamPart<ToolSet>>({
    transform(part, controller) {
      if (part.type === "text-end") {
        heldEnds.set(part.id, part);
        return;
      }
      controller.enqueue(part);
    },
    flush(controller) {
      for (const end of heldEnds.values()) controller.enqueue(end);
      heldEnds.clear();
    },
  });
}
