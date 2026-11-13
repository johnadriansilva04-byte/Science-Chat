import { useCallback, useEffect, useState } from "react";
import { ClipboardCheck, Loader2, ScanSearch } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageResponse } from "@/components/ai-elements/message";
import { listAudits, runAudit, type AuditView } from "@/lib/audit.functions";

const SEVERITY_BADGE: Record<string, string> = {
  alta: "bg-red-100 text-red-800 border-red-300",
  media: "bg-amber-100 text-amber-800 border-amber-300",
  baixa: "bg-slate-100 text-slate-700 border-slate-300",
};

/**
 * Auditoria científica independente. Roda separada da geração, verifica coerência
 * científica, documental e integridade textual, e guarda o relatório. Nada é
 * alterado no documento automaticamente.
 */
export function AuditPanel({ articleId }: { articleId: string }) {
  const [audits, setAudits] = useState<AuditView[]>([]);
  const [selected, setSelected] = useState<AuditView | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const rows = await listAudits({ data: { articleId } });
    setAudits(rows);
    setSelected((current) => current ?? rows[0] ?? null);
  }, [articleId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function audit(scope: "article" | "page") {
    setBusy(true);
    try {
      const res = await runAudit({ data: { articleId, scope } });
      setSelected(res.audit);
      await reload();
      toast.success(`Auditoria concluída — ${res.audit.summary ?? ""}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível auditar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 font-serif text-base">
            <ScanSearch className="size-4 text-primary" />
            Auditoria científica
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Verifica coerência problema→objetivo→método→resultado→conclusão, integridade das
            referências e sustentação documental. O auditor nunca reescreve o texto.
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button size="sm" disabled={busy} onClick={() => audit("article")}>
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ClipboardCheck className="size-4" />
            )}
            Auditar o artigo
          </Button>
        </CardContent>
      </Card>

      {audits.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {audits.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setSelected(a)}
              className={`rounded-md border px-2 py-1 text-[11px] ${
                selected?.id === a.id ? "border-primary bg-accent" : "hover:bg-muted"
              }`}
            >
              {a.scope === "article" ? "Artigo" : `Página ${a.scopeRef}`} · {a.summary ?? ""}
            </button>
          ))}
        </div>
      )}

      {selected ? (
        <Card>
          <CardContent className="prose-sm max-w-none p-4">
            <MessageResponse>{selected.report}</MessageResponse>
          </CardContent>
        </Card>
      ) : (
        <p className="rounded-md border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
          Nenhuma auditoria ainda. Rode a auditoria do artigo quando houver páginas.
        </p>
      )}
    </div>
  );
}
