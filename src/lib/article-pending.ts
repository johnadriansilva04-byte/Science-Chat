/**
 * Pendências deixadas pela IA no texto de uma página: `[PENDENTE: …]`,
 * `[REFERÊNCIA A CONFIRMAR]` e equivalentes. A auditoria já as detecta no
 * artigo inteiro; aqui elas viram um aviso LOCAL, antes de o pesquisador
 * aprovar uma página que ainda tem lacuna explícita.
 */
import { pendingData, pendingReferences } from "@/lib/audit";

/** Marcadores únicos de pendência, na ordem em que aparecem no texto. */
export function pagePendingMarkers(content: string | null | undefined): string[] {
  if (!content) return [];
  const unique = new Map<string, string>();
  for (const raw of [...pendingData(content), ...pendingReferences(content)]) {
    const clean = raw.replace(/\s+/g, " ").trim();
    if (clean && !unique.has(clean)) unique.set(clean, clean);
  }
  return [...unique.values()];
}

export function hasPagePendingMarkers(content: string | null | undefined): boolean {
  return pagePendingMarkers(content).length > 0;
}
