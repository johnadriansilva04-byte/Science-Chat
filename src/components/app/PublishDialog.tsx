import { useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  BookUp,
  ClipboardCheck,
  ExternalLink,
  FileUp,
  Loader2,
  ShieldCheck,
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
import {
  clearReviewProof,
  deletePublication,
  getArticlePublication,
  preparePublication,
  publishPublication,
  submitReviewProof,
  type PublicationView,
} from "@/lib/publication.functions";

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho — ainda não publicado",
  published: "Publicado no mural",
};

const MAX_PROOF_BYTES = 8 * 1024 * 1024;

/**
 * Ciclo de publicação de um artigo. Duas etapas independentes:
 * 1) Publicar no mural — entra na seção "Ainda não revisados".
 * 2) Comprovar a revisão por pares — o autor informa o DOI/registro do aceite
 *    e anexa o comprovante da revista/universidade; só então o artigo passa
 *    para a seção "Revisados por pares". A plataforma não faz a revisão.
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
  const [identifier, setIdentifier] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setProofFile(null);
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
          setIdentifier(row.doi ?? "");
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

  const publish = () =>
    run("publish", async () => {
      const res = await publishPublication({ data: { articleId } });
      setPub((p) => (p ? { ...p, status: "published", slug: res.slug } : p));
      toast.success("Publicado no mural — seção “Ainda não revisados”.");
      onPublished?.();
    });

  const proveReview = () =>
    run("prove", async () => {
      let file: { filename: string; mime: string; base64: string } | undefined;
      if (proofFile) {
        if (proofFile.size > MAX_PROOF_BYTES) {
          toast.error("O comprovante deve ter no máximo 8 MB.");
          return;
        }
        const buf = new Uint8Array(await proofFile.arrayBuffer());
        let binary = "";
        for (let i = 0; i < buf.length; i += 0x8000) {
          binary += String.fromCharCode(...buf.subarray(i, i + 0x8000));
        }
        file = {
          filename: proofFile.name,
          mime: proofFile.type || "application/octet-stream",
          base64: btoa(binary),
        };
      }
      await submitReviewProof({
        data: { articleId, identifier, ...(file ?? {}) },
      });
      setPub((p) => (p ? { ...p, review_status: "revisado", doi: identifier || p.doi } : p));
      setProofFile(null);
      if (fileRef.current) fileRef.current.value = "";
      toast.success("Revisão comprovada — o artigo foi para “Revisados por pares”.");
      onPublished?.();
    });

  const undoReview = () =>
    run("undo", async () => {
      await clearReviewProof({ data: { articleId } });
      setPub((p) => (p ? { ...p, review_status: "nao_revisado" } : p));
      toast.success("Comprovação removida — o artigo voltou para “Ainda não revisados”.");
      onPublished?.();
    });

  const remove = () =>
    run("delete", async () => {
      await deletePublication({ data: { articleId } });
      setPub(null);
      toast.success("Publicação removida.");
      onPublished?.();
    });

  const isPublished = pub?.status === "published";
  const isReviewed = pub?.review_status === "revisado";
  const canPrepare = !pub || pub.status === "draft";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif">
            <BookUp className="size-5 text-primary" />
            Publicar no mural
          </DialogTitle>
          <DialogDescription>
            Publicar é imediato. A revisão por pares é feita pelas revistas e universidades — quando
            você tiver o comprovante (DOI ou registro do aceite), anexe aqui para o artigo passar
            para a seção “Revisados por pares”.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            <Loader2 className="mx-auto mb-2 size-5 animate-spin" />
            Carregando…
          </p>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Estado:</span>
              <Badge variant={isPublished ? "default" : "outline"}>
                {pub ? (STATUS_LABEL[pub.status] ?? pub.status) : "Ainda não preparado"}
              </Badge>
              {isReviewed && (
                <Badge className="gap-1 bg-success text-success-foreground">
                  <BadgeCheck className="size-3.5" />
                  Revisão comprovada
                </Badge>
              )}
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

            {isPublished && (
              <>
                <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <ShieldCheck className="size-4 text-primary" />
                    Comprovar revisão por pares (opcional)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Quem revisa são as revistas e universidades. Informe o DOI ou o registro do
                    aceite e anexe o comprovante. Sem isso, o artigo continua em “Ainda não
                    revisados”.
                  </p>
                  <div className="space-y-1.5">
                    <Label htmlFor="pub-id">DOI ou registro do aceite</Label>
                    <Input
                      id="pub-id"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="Ex.: 10.1234/abcde ou nº do parecer"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pub-proof">Comprovante (PDF, imagem, DOCX…)</Label>
                    <Input
                      id="pub-proof"
                      ref={fileRef}
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.txt"
                      onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                    />
                    {pub.review_proof_filename && !proofFile && (
                      <p className="text-xs text-muted-foreground">
                        Comprovante atual:{" "}
                        <span className="font-mono">{pub.review_proof_filename}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-accent/40 p-3 text-sm">
                  <BadgeCheck className="size-4 text-primary" />
                  Link público:
                  <Link
                    to="/publicacoes/$slug"
                    params={{ slug: pub.slug }}
                    className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                  >
                    /publicacoes/{pub.slug}
                    <ExternalLink className="size-3.5" />
                  </Link>
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter className="flex-wrap gap-2">
          {canPrepare && (
            <Button onClick={prepare} disabled={busy !== null || !author.trim()}>
              {busy === "prepare" ? <Loader2 className="animate-spin" /> : <ClipboardCheck />}
              {pub ? "Atualizar dados" : "Preparar publicação"}
            </Button>
          )}
          {pub?.status === "draft" && (
            <Button onClick={publish} disabled={busy !== null}>
              {busy === "publish" ? <Loader2 className="animate-spin" /> : <BookUp />}
              Publicar no mural
            </Button>
          )}
          {isPublished && !isReviewed && (
            <Button
              variant="secondary"
              onClick={proveReview}
              disabled={busy !== null || (!identifier.trim() && !proofFile)}
            >
              {busy === "prove" ? <Loader2 className="animate-spin" /> : <FileUp />}
              Comprovar revisão
            </Button>
          )}
          {isPublished && isReviewed && (
            <Button variant="ghost" onClick={undoReview} disabled={busy !== null}>
              {busy === "undo" ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
              Remover comprovação
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
