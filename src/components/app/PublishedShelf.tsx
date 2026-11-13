import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { BadgeCheck, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { listPublicPublications, type PublicationSummary } from "@/lib/publication.functions";
import { yearOf } from "@/lib/publication";
import { cn } from "@/lib/utils";

/**
 * Mural de artigos publicados: uma estante viva. Um livro fica em destaque (capa
 * com título, autoria e resumo) e a fileira de lombadas ao lado gira sozinha —
 * um livro passa, depois o outro. Só entram aqui artigos com status 'published',
 * isto é, que já passaram pela revisão por pares e foram liberados pelo autor.
 * A autoria é sempre preservada: o mural existe para proteger o conhecimento.
 */
export function PublishedShelf({ className }: { className?: string }) {
  const [items, setItems] = useState<PublicationSummary[] | null>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    listPublicPublications()
      .then((rows) => active && setItems(rows))
      .catch(() => active && setItems([]));
    return () => {
      active = false;
    };
  }, []);

  const count = items?.length ?? 0;
  const featured = useMemo(
    () => (items && count > 0 ? items[index % count] : null),
    [items, index, count],
  );

  // O livro da vez troca sozinho, como uma estante que respira. Pausa no hover/foco.
  useEffect(() => {
    if (paused || count <= 1) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), 5200);
    return () => window.clearInterval(id);
  }, [paused, count]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-spine="${index}"]`);
    el?.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" });
  }, [index]);

  const go = (dir: 1 | -1) => setIndex((i) => (i + dir + count) % count);

  if (items !== null && count === 0) {
    return (
      <section className={cn("shelf-empty", className)}>
        <span className="shelf-empty__ruler" aria-hidden />
        <p className="text-sm text-muted-foreground">
          O mural está em branco — e isso é uma promessa. Aqui só entra o trabalho que passou pela{" "}
          <strong>revisão por pares</strong> e recebeu o aval do próprio autor. Seja o primeiro a
          deixar a sua marca.
        </p>
      </section>
    );
  }

  return (
    <section
      className={cn("shelf", className)}
      aria-label="Mural de artigos publicados, revisados por pares"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <header className="shelf__head">
        <span className="shelf__eyebrow">
          <BadgeCheck className="size-3.5" />
          Revisados por pares
        </span>
        <span className="shelf__count tabular-nums">
          {items === null ? "…" : `${count} ${count === 1 ? "artigo" : "artigos"}`}
        </span>
      </header>

      <div className="shelf__stage">
        <div className="shelf__feature" key={featured?.id ?? "empty"}>
          <span className="shelf__feature-tag">Em destaque</span>
          <h3 className="shelf__title">
            {featured ? (
              <Link to="/publicacoes/$slug" params={{ slug: featured.slug }}>
                {featured.title}
              </Link>
            ) : (
              "Carregando o acervo…"
            )}
          </h3>
          {featured && (
            <>
              <p className="shelf__author">{featured.author_name}</p>
              {featured.abstract && <p className="shelf__abstract">{featured.abstract}</p>}
              <div className="shelf__meta">
                {featured.area && (
                  <span className="inline-flex items-center gap-1">
                    <FileText className="size-3.5" />
                    {featured.area}
                  </span>
                )}
                {featured.published_at && <span>{yearOf(featured.published_at)}</span>}
                {featured.doi && <span className="font-mono">DOI {featured.doi}</span>}
                <Link
                  to="/publicacoes/$slug"
                  params={{ slug: featured.slug }}
                  className="ml-auto font-medium text-primary hover:underline"
                >
                  Ler o artigo →
                </Link>
              </div>
            </>
          )}
        </div>

        {count > 1 && (
          <div className="shelf__rail-wrap">
            <button
              type="button"
              className="shelf__nav"
              onClick={() => go(-1)}
              aria-label="Livro anterior"
            >
              <ChevronLeft className="size-4" />
            </button>
            <div className="shelf__rail dock-scroll" ref={listRef}>
              {items?.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  data-spine={i}
                  onClick={() => setIndex(i)}
                  aria-label={`Ver ${p.title}`}
                  aria-current={i === index}
                  className={cn("shelf__spine", i === index && "shelf__spine--active")}
                  title={`${p.title} — ${p.author_name}`}
                >
                  <span className="shelf__spine-title">{p.title}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="shelf__nav"
              onClick={() => go(1)}
              aria-label="Próximo livro"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
