import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  ShieldQuestion,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addClaim,
  deleteClaim,
  deleteEvidence,
  extractClaimsFn,
  getMatrix,
  linkEvidence,
  updateClaim,
  type MatrixClaim,
  type TraceabilityMatrix,
} from "@/lib/traceability.functions";
import {
  CLAIM_CATEGORIES,
  CLAIM_STATES,
  categoryLabel,
  stateLabel,
  type ClaimCategory,
  type ClaimState,
} from "@/lib/traceability";
import type { WorkspaceDocument } from "@/lib/article.functions";

const STATE_STYLE: Partial<Record<ClaimState, string>> = {
  sustentada: "border-emerald-500/40 bg-emerald-50 text-emerald-800",
  parcialmente_sustentada: "border-amber-500/40 bg-amber-50 text-amber-800",
  indiretamente_sustentada: "border-amber-400/40 bg-amber-50/60 text-amber-700",
  contradita: "border-red-500/40 bg-red-50 text-red-800",
  nao_localizada: "border-slate-400/40 bg-slate-50 text-slate-700",
  nao_verificavel: "border-slate-400/40 bg-slate-50 text-slate-700",
};

function StateIcon({ state }: { state: ClaimState }) {
  if (state === "sustentada") return <CheckCircle2 className="size-3.5" />;
  if (state === "contradita") return <AlertTriangle className="size-3.5" />;
  if (state === "nao_localizada" || state === "nao_verificavel")
    return <HelpCircle className="size-3.5" />;
  return <ShieldQuestion className="size-3.5" />;
}

export function TraceabilityPanel({
  articleId,
  documents,
}: {
  articleId: string;
  documents: WorkspaceDocument[];
}) {
  const [matrix, setMatrix] = useState<TraceabilityMatrix | null>(null);
  const [busy, setBusy] = useState(false);
  const [newClaim, setNewClaim] = useState("");

  const reload = useCallback(async () => {
    const data = await getMatrix({ data: { articleId } });
    setMatrix(data);
  }, [articleId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function run(action: () => Promise<unknown>, ok: string) {
    setBusy(true);
    try {
      await action();
      await reload();
      toast.success(ok);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Algo deu errado");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 font-serif text-base">
            <Link2 className="size-4 text-primary" />
            Matriz de rastreabilidade
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Cada afirmação ligada às evidências que a sustentam. A ausência de documento nunca
            significa que a afirmação seja falsa — apenas que não foi localizada prova.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() =>
                run(() => extractClaimsFn({ data: { articleId } }), "Afirmações extraídas")
              }
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Extrair da entrevista
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() =>
                run(
                  () => extractClaimsFn({ data: { articleId, replace: true } }),
                  "Matriz reconstruída",
                )
              }
            >
              Reconstruir
            </Button>
          </div>

          {matrix && (
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              {CLAIM_STATES.filter((s) => (matrix.counts[s.id] ?? 0) > 0).map((s) => (
                <span
                  key={s.id}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${
                    STATE_STYLE[s.id] ?? "border-muted"
                  }`}
                >
                  <StateIcon state={s.id} />
                  {s.label}: {matrix.counts[s.id]}
                </span>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Input
              value={newClaim}
              onChange={(e) => setNewClaim(e.target.value)}
              placeholder="Acrescentar uma afirmação manualmente…"
              className="h-8 text-xs"
            />
            <Button
              size="sm"
              variant="secondary"
              disabled={busy || !newClaim.trim()}
              onClick={() =>
                run(async () => {
                  await addClaim({ data: { articleId, text: newClaim } });
                  setNewClaim("");
                }, "Afirmação adicionada")
              }
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {matrix?.claims.length === 0 && (
        <p className="rounded-md border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
          Nenhuma afirmação ainda. Extraia da entrevista ou acrescente manualmente.
        </p>
      )}

      <div className="space-y-2">
        {matrix?.claims.map((claim) => (
          <ClaimCard
            key={claim.id}
            claim={claim}
            articleId={articleId}
            documents={documents}
            busy={busy}
            onRun={run}
          />
        ))}
      </div>
    </div>
  );
}

function ClaimCard({
  claim,
  articleId,
  documents,
  busy,
  onRun,
}: {
  claim: MatrixClaim;
  articleId: string;
  documents: WorkspaceDocument[];
  busy: boolean;
  onRun: (action: () => Promise<unknown>, ok: string) => void;
}) {
  const [documentId, setDocumentId] = useState<string>("");
  const [text, setText] = useState(claim.text);

  return (
    <Card>
      <CardContent className="space-y-2 p-3">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
            {claim.seq}
          </span>
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => {
              if (text.trim() && text !== claim.text) {
                onRun(
                  () => updateClaim({ data: { articleId, claimId: claim.id, text: text.trim() } }),
                  "Afirmação atualizada",
                );
              }
            }}
            className="h-8 flex-1 text-xs"
          />
          <Button
            size="icon"
            variant="ghost"
            className="size-7 shrink-0"
            disabled={busy}
            aria-label={`Remover afirmação ${claim.seq}`}
            onClick={() =>
              onRun(
                () => deleteClaim({ data: { articleId, claimId: claim.id } }),
                "Afirmação removida",
              )
            }
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={claim.category}
            onValueChange={(v) =>
              onRun(
                () =>
                  updateClaim({
                    data: { articleId, claimId: claim.id, category: v as ClaimCategory },
                  }),
                "Categoria atualizada",
              )
            }
          >
            <SelectTrigger className="h-7 w-40 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CLAIM_CATEGORIES.map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-xs">
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${
              STATE_STYLE[claim.state] ?? "border-muted bg-muted/40"
            }`}
          >
            <StateIcon state={claim.state} />
            {stateLabel(claim.state)}
          </span>
        </div>

        {claim.evidence.length > 0 && (
          <ul className="space-y-1">
            {claim.evidence.map((ev) => (
              <li key={ev.id} className="rounded-md border bg-muted/30 p-2 text-[11px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">
                    {ev.documentSeq
                      ? `Anexo ${ev.documentSeq} — ${ev.documentName}`
                      : "Sem documento"}
                    {ev.matchDegree ? ` · correspondência ${ev.matchDegree}` : ""}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-6"
                    disabled={busy}
                    aria-label="Remover evidência"
                    onClick={() =>
                      onRun(
                        () => deleteEvidence({ data: { evidenceId: ev.id } }),
                        "Evidência removida",
                      )
                    }
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
                {ev.excerpt && <p className="mt-1 italic text-muted-foreground">“{ev.excerpt}”</p>}
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center gap-2">
          <Select value={documentId} onValueChange={setDocumentId}>
            <SelectTrigger className="h-7 flex-1 text-xs">
              <SelectValue placeholder="Vincular um documento do dossiê…" />
            </SelectTrigger>
            <SelectContent>
              {documents.length === 0 && (
                <SelectItem value="__none__" disabled className="text-xs">
                  Nenhum documento anexado
                </SelectItem>
              )}
              {documents.map((d) => (
                <SelectItem key={d.id} value={d.id} className="text-xs">
                  Anexo {d.seq} — {d.filename}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-xs"
            disabled={busy || !documentId || documentId === "__none__"}
            onClick={() =>
              onRun(
                () => linkEvidence({ data: { articleId, claimId: claim.id, documentId } }),
                "Evidência vinculada",
              )
            }
          >
            <Link2 className="size-3.5" />
            Verificar
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            {categoryLabel(claim.category)}
          </Badge>
          {claim.sourceQuestion && (
            <span className="truncate text-[11px] text-muted-foreground">
              De: {claim.sourceQuestion}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
