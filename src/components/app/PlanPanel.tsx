import { useEffect, useState } from "react";
import { Check, ListChecks, RefreshCw, Type } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { MessageResponse } from "@/components/ai-elements/message";
import { generatePlan, setPhase, updateTitle } from "@/lib/article.functions";

export function PlanPanel({
  articleId,
  plan,
  currentTitle,
  autoBuild = false,
  onChanged,
  onApproved,
}: {
  articleId: string;
  plan: string | null;
  currentTitle?: string;
  autoBuild?: boolean;
  onChanged: () => void;
  onApproved: () => void;
}) {
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);

  async function build() {
    setBusy(true);
    try {
      const trimmed = feedback.trim();
      const res = await generatePlan({
        data: { articleId, ...(plan && trimmed ? { feedback: trimmed } : {}) },
      });
      setFeedback("");
      toast.success(plan ? "Plano refeito" : "Plano montado");
      if (res.proposedTitle && res.proposedTitle !== currentTitle) {
        toast.message("O plano propõe um título", {
          description: `"${res.proposedTitle}" — use o botão "Usar este título" para aplicá-lo.`,
        });
      }
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível montar o plano");
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  const proposedTitle = plan?.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? null;
  const titleIsPending = proposedTitle === "Título a definir com o pesquisador";

  async function applyProposedTitle() {
    if (!proposedTitle || titleIsPending) return;
    setBusy(true);
    try {
      await updateTitle({ data: { articleId, title: proposedTitle } });
      toast.success("Título aplicado");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível aplicar o título");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (autoBuild) void build();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoBuild]);

  async function approve() {
    setBusy(true);
    try {
      await setPhase({ data: { articleId, phase: "writing" } });
      toast.success("Estrutura aprovada. Vamos escrever página por página.");
      onApproved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível aprovar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-serif">
            <ListChecks className="size-5 text-primary" />
            Plano de produção
          </CardTitle>
          <CardDescription>
            Revise como o artigo será organizado antes de começar a escrever. Nada é escrito antes
            da sua aprovação.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {plan && proposedTitle && proposedTitle !== currentTitle && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-accent/40 p-3 text-sm">
              <Type className="size-4 text-primary" />
              <span className="min-w-0 flex-1">
                {titleIsPending ? (
                  <>
                    O plano ainda não tem título. O título é <strong>sua</strong> decisão —
                    informe-o no chat ou use o lápis no topo do documento.
                  </>
                ) : (
                  <>
                    Título proposto pelo plano: <strong>{proposedTitle}</strong>
                  </>
                )}
              </span>
              {!titleIsPending && (
                <Button size="sm" variant="secondary" onClick={applyProposedTitle} disabled={busy}>
                  <Check />
                  Usar este título
                </Button>
              )}
            </div>
          )}
          {plan ? (
            <div className="prose-sm max-w-none rounded-lg border bg-paper p-4">
              <MessageResponse>{plan}</MessageResponse>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Ainda não há um plano. Conclua a entrevista e monte o plano de produção.
            </p>
          )}

          <div className="space-y-2">
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder={
                plan
                  ? "Quer ajustar algo? Ex.: acrescente uma seção de limitações; o destino é a revista X."
                  : "Alguma observação para o plano? (opcional)"
              }
              rows={2}
            />
            <div className="flex flex-wrap gap-2">
              <Button onClick={build} disabled={busy}>
                {plan ? <RefreshCw /> : <ListChecks />}
                {plan ? "Refazer plano" : "Montar plano"}
              </Button>
              {plan && (
                <Button variant="secondary" onClick={approve} disabled={busy}>
                  <Check />
                  Aprovar estrutura
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
