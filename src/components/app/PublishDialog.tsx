import { useEffect, useState } from "react";
import {
  BadgeCheck,
  BookUp,
  ClipboardCheck,
  ExternalLink,
  Loader2,
  Send,
  Trash2,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MessageResponse } from "@/components/ai-elements/message";
import {
  deletePublication,
  getArticlePublication,
  preparePublication,
  publishPublication,
  runPeerReview,
  submitPublication,
  type PublicationView,
} from "@/lib/publication.functions";

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  submitted: "Submetido",
  in_review: "Em revisão por pares",
  accepted: "Aceito — pronto para publicar",
  rejected: "Rejeitado na revisão",
  published: "Publicado",
};

/**
 * Ciclo de publicação de um artigo: preparar (a partir das páginas aprovadas),
 * submeter à revisão por pares, receber o parecer e — só então — publicar na
 * área pública. Só o status 'published' aparece em /publicacoes.
 */
export function PublishDialog({
  articleId,
  open,
  onOpenChange,
  defaultAuthor,
  onPublished,
}: {
  articleId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultAuthor?: string;
  onPublished?: () => void;
}) {
  const [pub, setPub] = useState<PublicationView | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const [author, setAuthor] = useState(defaultAuthor ?? "");
  const [affiliation, setAffiliation] = useState("");
  const [orcid, setOrcid] = useState("");
  const [language, setLanguage] = useState("pt");
  const [area, setArea] = useState("");
  const [doi, setDoi] = useState("");

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    getArticlePublication({ data: { articleId } })
      .then((row) => {
        if (!active) return;
        setPub(row);
        if (row) {
          setAuthor(row.author_name);
          setAffiliation(row.affiliation ?? "");
          setOrcid(row.orcid ?? "");
          setLanguage(row.language);
          setArea(row.area ?? "");
          setDoi(row.doi ?? "");
        }
      })
      .catch(() => active && setPub(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [open, articleId]);

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    try {
      await fn();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Operação falhou");
    } finally {
      setBusy(null);
    }
  }

  const prepare = () =>
    run("prepare", async () => {
      const row = await preparePublication({
        data: { articleId, authorName: author, affiliation, orcid, language, area },
      });
      setPub(row);
      toast.success("Publicação preparada a partir das páginas aprovadas.");
    });

  const submit = () =>
    run("submit", async () => {
      await submitPublication({ data: { articleId } });
      setPub((p) => (p ? { ...p, status: "submitted" } : p));
      toast.success("Submetido à revisão por pares.");
    });

  const review = () =>
    run("review", async () => {
      const res = await runPeerReview({ data: { articleId } });
      setPub((p) =>
        p ? { ...p, status: res.accepted ? "accepted" : "rejected", review_report: res.report } : p,
      );
      toast[res.accepted ? "success" : "error"](
        res.accepted ? "Parecer favorável — você já pode publicar." : "O revisor pediu ajustes.",
      );
    });

  const publish = () =>
    run("publish", async () => {
      const res = await publishPublication({ data: { articleId, doi } });
      setPub((p) => (p ? { ...p, status: "published", doi: doi || null, slug: res.slug } : p));
      toast.success("Publicado na área pública de artigos.");
      onPublished?.();
    });

  const remove = () =>
    run("delete", async () => {
      await deletePublication({ data: { articleId } });
      setPub(null);
      toast.success("Publicação removida.");
    });

  const canPrepare = !pub || pub.status === "draft";
  const canSubmit = pub?.status === "draft";
  const canReview = pub?.status === "submitted" || pub?.status === "in_review";
  const canPublish = pub?.status === "accepted" || pub?.status === "published";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif">
            <BookUp className="size-5 text-primary" />
            Publicar artigo
          </DialogTitle>
          <DialogDescription>
            O artigo só entra na área pública depois de submeter à revisão por pares e receber
            parecer favorável. A autoria é sempre sua.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            <Loader2 className="mx-auto mb-2 size-5 animate-spin" />
            Carregando…
          </p>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Estado:</span>
              <Badge variant={pub?.status === "published" ? "default" : "outline"}>
                {pub ? (STATUS_LABEL[pub.status] ?? pub.status) : "Ainda não preparado"}
              </Badge>
            </div>

            {(canPrepare || !pub) && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="pub-author">Nome do autor</Label>
                  <Input
                    id="pub-author"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Como você quer ser citado"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pub-area">Área</Label>
                  <Input
                    id="pub-area"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="Ex.: Direito, Educação…"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pub-aff">Vínculo (opcional)</Label>
                  <Input
                    id="pub-aff"
                    value={affiliation}
                    onChange={(e) => setAffiliation(e.target.value)}
                    placeholder="Deixe vazio se for pesquisador independente"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pub-orcid">ORCID (opcional)</Label>
                  <Input
                    id="pub-orcid"
                    value={orcid}
                    onChange={(e) => setOrcid(e.target.value)}
                    placeholder="0000-0000-0000-0000"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pub-lang">Idioma</Label>
                  <Input
                    id="pub-lang"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    placeholder="pt"
                  />
                </div>
              </div>
            )}

            {pub?.review_report && (
              <div className="rounded-lg border bg-muted/40 p-4">
                <p className="mb-2 text-sm font-medium">Parecer da revisão</p>
                <div className="max-h-64 overflow-y-auto text-sm">
                  <MessageResponse>{pub.review_report}</MessageResponse>
                </div>
              </div>
            )}

            {canPublish && (
              <div className="space-y-1.5">
                <Label htmlFor="pub-doi">DOI (opcional)</Label>
                <Input
                  id="pub-doi"
                  value={doi}
                  onChange={(e) => setDoi(e.target.value)}
                  placeholder="10.xxxx/xxxxx — deixe vazio se ainda não tiver"
                />
              </div>
            )}

            {pub?.status === "published" && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-accent/40 p-3 text-sm">
                <BadgeCheck className="size-4 text-primary" />
                Publicado. Link público:
                <Link
                  to="/publicacoes/$slug"
                  params={{ slug: pub.slug }}
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                >
                  /publicacoes/{pub.slug}
                  <ExternalLink className="size-3.5" />
                </Link>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex-wrap gap-2">
          {canPrepare && (
            <Button onClick={prepare} disabled={busy !== null || !author.trim()}>
              {busy === "prepare" ? <Loader2 className="animate-spin" /> : <ClipboardCheck />}
              {pub ? "Atualizar publicação" : "Preparar publicação"}
            </Button>
          )}
          {canSubmit && (
            <Button variant="secondary" onClick={submit} disabled={busy !== null}>
              {busy === "submit" ? <Loader2 className="animate-spin" /> : <Send />}
              Submeter à revisão
            </Button>
          )}
          {canReview && (
            <Button variant="secondary" onClick={review} disabled={busy !== null}>
              {busy === "review" ? <Loader2 className="animate-spin" /> : <ClipboardCheck />}
              Rodar revisão por pares
            </Button>
          )}
          {canPublish && pub?.status === "accepted" && (
            <Button onClick={publish} disabled={busy !== null}>
              {busy === "publish" ? <Loader2 className="animate-spin" /> : <BadgeCheck />}
              Publicar na área pública
            </Button>
          )}
          {pub && (
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={remove}
              disabled={busy !== null}
            >
              {busy === "delete" ? <Loader2 className="animate-spin" /> : <Trash2 />}
              Remover
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
