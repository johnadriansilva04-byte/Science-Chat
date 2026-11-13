import { useEffect, useState } from "react";
import { Check, FileText, Pencil, RefreshCw, RotateCcw, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { MessageResponse } from "@/components/ai-elements/message";
import { stripMarkers } from "@/lib/article-marker";
import type { WorkspacePage } from "@/lib/article.functions";
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
  onChanged,
  onApproved,
}: {
  articleId: string;
  page: WorkspacePage | null;
  pageNumber: number;
  isVirtualNext: boolean;
  onChanged: () => void;
  onApproved?: (pageNumber: number) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    setEditing(false);
    setFeedback("");
    setDraftText(page?.content ?? "");
  }, [page?.id, page?.content, pageNumber]);

  async function run(action: () => Promise<unknown>, okMessage: string) {
    setBusy(true);
    try {
      await action();
      toast.success(okMessage);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Algo deu errado");
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

  const approve = () =>
    run(async () => {
      await approvePage({ data: { articleId, pageNumber } });
      onApproved?.(pageNumber);
    }, `Página ${pageNumber} aprovada`);

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
          <p className="text-xs text-muted-foreground">{wordCount(page.content)} palavras</p>
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
    </Card>
  );
}
