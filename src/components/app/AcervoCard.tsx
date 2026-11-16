import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  Copy,
  ExternalLink,
  Landmark,
  Quote,
  ScrollText,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MUSEUM_WINGS } from "@/lib/museum";
import { addToInbox } from "@/lib/pracinha-inbox";
import { listArticles } from "@/lib/article.functions";
import { createArticle } from "@/components/app/ArticlesMenu";
import { cn } from "@/lib/utils";
import type { AcervoItem } from "@/lib/acervo";

/**
 * Cartão do acervo. Serve para as duas origens — clássicos do Museu e artigos
 * publicados na ScienceChat — mostrando o essencial e abrindo uma ficha
 * completa ao clique (metadados, nota curada, DOI, citação).
 */
export function AcervoCard({ item }: { item: AcervoItem }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const wing = item.wing ? MUSEUM_WINGS.find((w) => w.id === item.wing)?.label : null;

  async function sendToPracinha() {
    setBusy(true);
    try {
      addToInbox({
        title: item.originalTitle ?? item.title,
        authors: item.authors,
        year: Number(item.year) || new Date().getFullYear(),
        venue: item.venue,
        doi: item.doi ?? "",
      });
      const rows = await listArticles();
      if (rows[0]) {
        toast.success("Obra enviada para o Pracinha", {
          description: `Abra o artigo "${rows[0].title}" — ela já está no chat.`,
        });
        setOpen(false);
        navigate({ to: "/a/$articleId", params: { articleId: rows[0].id } });
      } else {
        toast.success("Obra guardada para o Pracinha");
        setOpen(false);
        await createArticle(navigate, "Quero usar as obras que trouxe do acervo.");
      }
    } finally {
      setBusy(false);
    }
  }

  function copyCitation() {
    const citation = `${item.authors} (${item.year}). ${item.title}. ${item.venue}.${
      item.doi ? ` DOI: ${item.doi}` : ""
    }`;
    void navigator.clipboard?.writeText(citation).then(
      () => toast.success("Citação copiada."),
      () => toast.error("Não foi possível copiar."),
    );
  }

  return (
    <>
      <article className={cn("acervo-card", item.kind === "classico" && "acervo-card--classico")}>
        <button type="button" className="acervo-card__hit" onClick={() => setOpen(true)}>
          <span className="acervo-card__top">
            <span className="acervo-card__year tabular-nums">{item.year}</span>
            {item.kind === "classico" ? (
              <span className="acervo-card__seal acervo-card__seal--classico">
                <Landmark className="size-3" />
                Clássico
              </span>
            ) : item.reviewed ? (
              <span className="acervo-card__seal acervo-card__seal--ok">
                <BadgeCheck className="size-3" />
                Revisado
              </span>
            ) : (
              <span className="acervo-card__seal acervo-card__seal--pending">
                <ScrollText className="size-3" />
                Não revisado
              </span>
            )}
          </span>

          <h3 className="acervo-card__title">{item.title}</h3>
          {item.originalTitle && <p className="acervo-card__orig">{item.originalTitle}</p>}

          <p className="acervo-card__authors">{item.authors}</p>
          <p className="acervo-card__venue">{item.venue}</p>

          {item.summary && <p className="acervo-card__note">{item.summary}</p>}

          <span className="acervo-card__foot">
            {item.doi ? (
              <span className="acervo-card__doi font-mono">DOI {item.doi}</span>
            ) : (
              <span className="acervo-card__venue">{wing ?? "ScienceChat"}</span>
            )}
            <span className="acervo-card__open">
              Abrir ficha
              <ArrowRight className="size-3.5" />
            </span>
          </span>
        </button>
      </article>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="acervo-sheet max-h-[88vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="acervo-card__year tabular-nums">{item.year}</span>
              {item.kind === "classico" ? (
                <span className="acervo-card__seal acervo-card__seal--classico">
                  <Landmark className="size-3" />
                  Acervo do Museu
                </span>
              ) : item.reviewed ? (
                <span className="acervo-card__seal acervo-card__seal--ok">
                  <BadgeCheck className="size-3" />
                  Revisado por pares
                </span>
              ) : (
                <span className="acervo-card__seal acervo-card__seal--pending">
                  <ScrollText className="size-3" />
                  Ainda não revisado
                </span>
              )}
              {wing && <span className="text-muted-foreground">{wing}</span>}
            </div>
            <DialogTitle className="font-serif text-2xl leading-snug">{item.title}</DialogTitle>
            {item.originalTitle && (
              <DialogDescription className="font-serif italic">
                {item.originalTitle}
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="acervo-sheet__meta">
            <p>
              <span className="text-muted-foreground">Autoria: </span>
              {item.authors}
            </p>
            <p>
              <span className="text-muted-foreground">Veículo: </span>
              {item.venue}
            </p>
            {item.area && (
              <p>
                <span className="text-muted-foreground">Área: </span>
                {item.area}
              </p>
            )}
          </div>

          {item.summary && (
            <blockquote className="acervo-sheet__note">
              <Quote className="mr-1.5 inline size-4 text-primary" />
              {item.summary}
            </blockquote>
          )}

          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.tags.map((t) => (
                <span key={t} className="museum-tag">
                  {t}
                </span>
              ))}
            </div>
          )}

          <div className="acervo-sheet__actions">
            {item.kind === "classico" ? (
              <>
                {item.doiUrl && (
                  <Button asChild variant="outline">
                    <a href={item.doiUrl} target="_blank" rel="noreferrer">
                      Ver no editor
                      <ExternalLink className="size-4" />
                    </a>
                  </Button>
                )}
                <Button variant="secondary" onClick={sendToPracinha} disabled={busy}>
                  <Sparkles className="size-4" />
                  Levar ao Pracinha
                </Button>
              </>
            ) : (
              item.slug && (
                <Button asChild>
                  <Link to="/publicacoes/$slug" params={{ slug: item.slug }}>
                    Ler o artigo completo
                  </Link>
                </Button>
              )
            )}
            <Button variant="ghost" onClick={copyCitation}>
              <Copy className="size-4" />
              Copiar citação
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
