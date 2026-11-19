import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  ChevronDown,
  Copy,
  ExternalLink,
  Landmark,
  Quote,
  ScrollText,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MUSEUM_WINGS } from "@/lib/museum";
import { addToInbox } from "@/lib/pracinha-inbox";
import { listArticles } from "@/lib/article.functions";
import { createArticle } from "@/components/app/ArticlesMenu";
import { cn } from "@/lib/utils";
import type { AcervoItem } from "@/lib/acervo";

/**
 * Linha do acervo. Serve para as duas origens — clássicos do Museu e artigos
 * publicados na ScienceChat. Mostra só ano, título e autoria; o resto abre no
 * lugar, sem modal, para o leitor comparar obras sem perder a lista de vista.
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
    <article
      className={cn(
        "acervo-row",
        item.kind === "classico" && "acervo-row--classico",
        open && "is-open",
      )}
    >
      <button
        type="button"
        className="acervo-row__head"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="acervo-row__year tabular-nums">{item.year}</span>

        <span className="acervo-row__main">
          <span className="acervo-row__title">{item.title}</span>
          <span className="acervo-row__authors">{item.authors}</span>
        </span>

        {item.kind === "classico" ? (
          <span className="acervo-row__seal acervo-row__seal--classico" title="Acervo do Museu">
            <Landmark className="size-3.5" />
          </span>
        ) : item.reviewed ? (
          <span className="acervo-row__seal acervo-row__seal--ok" title="Revisado por pares">
            <BadgeCheck className="size-3.5" />
          </span>
        ) : (
          <span className="acervo-row__seal acervo-row__seal--pending" title="Ainda não revisado">
            <ScrollText className="size-3.5" />
          </span>
        )}

        <ChevronDown className="acervo-row__chevron size-4" aria-hidden />
      </button>

      <div className="acervo-row__body" hidden={!open}>
        {item.originalTitle && <p className="acervo-row__orig">{item.originalTitle}</p>}

        <p className="acervo-row__meta">
          {item.venue}
          {item.area ? ` · ${item.area}` : ""}
        </p>

        {item.summary && (
          <blockquote className="acervo-row__note">
            <Quote className="mr-1.5 inline size-3.5 text-primary" />
            {item.summary}
          </blockquote>
        )}

        {item.tags.length > 0 && (
          <div className="acervo-row__tags">
            {item.tags.map((t) => (
              <span key={t} className="museum-tag">
                {t}
              </span>
            ))}
          </div>
        )}

        {item.doi && (
          <a
            className="acervo-row__doi font-mono"
            href={item.doiUrl ?? `https://doi.org/${item.doi}`}
            target="_blank"
            rel="noreferrer"
          >
            DOI {item.doi}
            <ExternalLink className="size-3.5" />
          </a>
        )}

        <div className="acervo-row__actions">
          {item.kind === "classico" ? (
            <Button size="sm" variant="secondary" onClick={sendToPracinha} disabled={busy}>
              <Sparkles className="size-4" />
              Levar ao Pracinha
            </Button>
          ) : (
            item.slug && (
              <Button asChild size="sm">
                <Link to="/publicacoes/$slug" params={{ slug: item.slug }}>
                  Ler o artigo
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            )
          )}
          <Button size="sm" variant="ghost" onClick={copyCitation}>
            <Copy className="size-4" />
            Citar
          </Button>
        </div>
      </div>
    </article>
  );
}
