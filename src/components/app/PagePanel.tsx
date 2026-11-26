import { useEffect, useState } from "react";
import {
  Check,
  FileText,
  FlaskConical,
  Pencil,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MessageResponse } from "@/components/ai-elements/message";
import { stripMarkers } from "@/lib/article-marker";
import { pagePendingMarkers } from "@/lib/article-pending";
import { MIN_PAGE_WORDS } from "@/lib/article-page";
import { quotaRestMessage } from "@/lib/ai/quota";
import type { WorkspaceMethodology, WorkspacePage } from "@/lib/article.functions";
import {
  approvePage,
  deletePage,
  generatePage,
  reopenPage,
  savePage,
} from "@/lib/article.functions";

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function PagePanel({
  articleId,
  page,
  pageNumber,
  isVirtualNext,
  methodology = null,
  onChanged,
  onApproved,
  onOpenMethodology,
}: {
  articleId: string;
  page: WorkspacePage | null;
  pageNumber: number;
  isVirtualNext: boolean;
  methodology?: WorkspaceMethodology | null;
  onChanged: () => void;
  onApproved?: (pageNumber: number) => void;
  onOpenMethodology?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [feedback, setFeedback] = useState("");
  const [confirmPending, setConfirmPending] = useState(false);

  useEffect(() => {
    setEditing(false);
    setFeedback("");
    setDraftText(page?.content ?? "");
    setConfirmPending(false);
  }, [page?.id, page?.content, pageNumber]);

  async function run(action: () => Promise<unknown>, okMessage: string) {
    setBusy(true);
    try {
      await action();
      toast.success(okMessage);
      onChanged();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      toast.error(quotaRestMessage(msg) ?? (msg || "Algo deu errado"));
    } finally {
      setBusy(false);
    }
  }

  const generate = (withFeedback = false) =>
    run(
      () =>
        generatePage({
          data: {
            articleId,
            pageNumber,
            ...(withFeedback && feedback.trim() ? { feedback: feedback.trim() } : {}),
          },
        }),
      page ? `Página ${pageNumber} refeita` : `Página ${pageNumber} escrita`,
    );

  const pending = pagePendingMarkers(page?.content);

  const approveNow = () =>
    run(async () => {
      await approvePage({ data: { articleId, pageNumber } });
      onApproved?.(pageNumber);
    }, `Página ${pageNumber} aprovada`);

  // Aprovar com `[PENDENTE: …]` no texto deixa a lacuna entrar no documento
  // mestre. O aviso é explícito e a confirmação é do pesquisador.
  const approve = () => {
    if (pending.length > 0) {
      setConfirmPending(true);
      return;
    }
    void approveNow();
  };

  const reopen = () =>
    run(
      () => reopenPage({ data: { articleId, pageNumber } }),
      `Página ${pageNumber} reaberta para edição`,
    );

  const save = () =>
    run(async () => {
      await savePage({ data: { articleId, pageNumber, content: draftText } });
      setEditing(false);
    }, "Alterações salvas");

  const remove = () => {
    if (!confirm(`Excluir a página ${pageNumber}? Esta ação não pode ser desfeita.`)) return;
    void run(() => deletePage({ data: { articleId, pageNumber } }), "Página excluída");
  };

  const status = page?.status ?? "next";
  const isDraft = status === "draft";
  const isApproved = status === "approved";

  return (
    <Card className="flex h-full min-h-0 flex-col">
      <CardHeader className="flex-row items-center justify-between space-y-0 border-b">
        <CardTitle className="flex items-center gap-2 font-serif text-lg">
          <FileText className="size-5 text-primary" />
          {isVirtualNext ? `Próxima página — ${pageNumber}` : `Página ${pageNumber}`}
        </CardTitle>
        {isApproved && (
          <span className="approve-seal">
            <Check className="size-3" />
            Aprovada
          </span>
        )}
        {isDraft && <Badge>Rascunho</Badge>}
        {isVirtualNext && <Badge variant="outline">Não escrita</Badge>}
      </CardHeader>

      <CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed p-2">
          <p className="min-w-0 text-xs text-muted-foreground">
            {methodology ? (
              <>
                Metodologia aplicada:{" "}
                <span className="font-medium text-foreground">{methodology.name}</span>{" "}
                <span className="font-mono">{methodology.formula}</span>
              </>
            ) : (
              "Nenhuma metodologia aplicada ao artigo."
            )}
          </p>
          {onOpenMethodology && (
            <Button size="sm" variant="outline" onClick={onOpenMethodology}>
              <FlaskConical className="size-3.5" />
              Aplicar metodologia
            </Button>
          )}
        </div>

        {!page && (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Esta é a próxima unidade de produção. Escreva-a quando estiver pronto. Você poderá
            revisar, editar ou refazer antes de aprovar.
          </div>
        )}

        {page && !editing && (
          <div key={page.id} className="page-reveal paper-sheet rounded-lg border">
            <MessageResponse>{stripMarkers(page.content)}</MessageResponse>
          </div>
        )}

        {page && editing && (
          <Textarea
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            rows={20}
            className="font-serif text-[1.02rem] leading-relaxed"
          />
        )}

        {page && (
          <p className="text-xs text-muted-foreground">
            {wordCount(page.content)} palavras
            {!isApproved && wordCount(page.content) < MIN_PAGE_WORDS && (
              <span className="ml-2 text-amber-600">
                página curta — peça para refazer com mais desenvolvimento
              </span>
            )}
          </p>
        )}

        {isDraft && pending.length > 0 && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-xs">
            <p className="font-medium text-foreground">
              {pending.length === 1
                ? "1 pendência antes de aprovar"
                : `${pending.length} pendências antes de aprovar`}
            </p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-muted-foreground">
              {pending.slice(0, 5).map((item) => (
                <li key={item} className="break-words">
                  {item}
                </li>
              ))}
            </ul>
            {pending.length > 5 && (
              <p className="mt-1 text-muted-foreground">…e mais {pending.length - 5}.</p>
            )}
            <p className="mt-2 text-muted-foreground">
              Preencha com o pesquisador ou peça a correção à IA. Aprovar assim mesmo deixa a lacuna
              no documento final.
            </p>
          </div>
        )}

        {page && !isApproved && (
          <Textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Pedir correção à IA? Ex.: deixe o parágrafo mais direto; acrescente a citação de X."
            rows={2}
          />
        )}
      </CardContent>

      <div className="flex flex-wrap gap-2 border-t p-3">
        {isVirtualNext && (
          <Button onClick={() => generate(false)} disabled={busy}>
            <Sparkles />
            Escrever página {pageNumber}
          </Button>
        )}

        {isDraft && !editing && (
          <>
            <Button variant="secondary" onClick={approve} disabled={busy}>
              <Check />
              Aprovar
            </Button>
            <Button variant="outline" onClick={() => generate(true)} disabled={busy}>
              <RefreshCw />
              Refazer
            </Button>
            <Button variant="outline" onClick={() => setEditing(true)} disabled={busy}>
              <Pencil />
              Editar
            </Button>
            <Button variant="ghost" onClick={remove} disabled={busy}>
              <Trash2 />
              Excluir
            </Button>
          </>
        )}

        {isDraft && editing && (
          <>
            <Button onClick={save} disabled={busy}>
              <Check />
              Salvar
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setEditing(false);
                setDraftText(page?.content ?? "");
              }}
              disabled={busy}
            >
              <X />
              Cancelar
            </Button>
          </>
        )}

        {isApproved && (
          <>
            <Button variant="outline" onClick={reopen} disabled={busy}>
              <RotateCcw />
              Reabrir para editar
            </Button>
            <Button
              variant="ghost"
              onClick={() =>
                run(
                  () =>
                    generatePage({
                      data: {
                        articleId,
                        pageNumber,
                        feedback: "Refaça esta página mantendo o sentido aprovado.",
                      },
                    }),
                  "Página refeita",
                )
              }
              disabled={busy}
            >
              <RefreshCw />
              Refazer
            </Button>
          </>
        )}
      </div>

      <AlertDialog open={confirmPending} onOpenChange={setConfirmPending}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aprovar com pendências?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta página ainda tem{" "}
              {pending.length === 1
                ? "1 marcação de pendência"
                : `${pending.length} marcações de pendência`}{" "}
              — dados ou referências que a IA não conseguiu confirmar. Aprovar agora leva essas
              lacunas para o documento final.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Revisar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void approveNow()}>
              Aprovar mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
