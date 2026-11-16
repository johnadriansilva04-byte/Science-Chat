import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { BadgeCheck, Landmark, ScrollText } from "lucide-react";
import { listPublicPublications, type PublicationSummary } from "@/lib/publication.functions";
import { buildAcervo, type AcervoItem } from "@/lib/acervo";
import { cn } from "@/lib/utils";

/**
 * O mural do acervo na home: uma coletânea de artigos, com títulos inteiros e
 * autoria visível — sem truncar, para honrar cada obra. O acervo completo vive
 * em `/publicacoes`.
 */
export function PublishedShelf({ className }: { className?: string }) {
  const [pubs, setPubs] = useState<PublicationSummary[] | null>(null);

  useEffect(() => {
    let active = true;
    listPublicPublications()
      .then((rows) => active && setPubs(rows))
      .catch(() => active && setPubs([]));
    return () => {
      active = false;
    };
  }, []);

  const acervo = useMemo(() => buildAcervo(pubs ?? []), [pubs]);

  if (pubs === null) {
    return (
      <p className={cn("py-3 text-sm text-muted-foreground", className)}>Carregando o acervo…</p>
    );
  }

  return (
    <div className={cn("acervo-mural", className)}>
      <Collection
        icon={<Landmark className="size-4" />}
        title="Clássicos do Museu"
        hint="Obras que mudaram o mundo."
        items={acervo.classics}
        tone="classico"
        limit={4}
      />
      <Collection
        icon={<BadgeCheck className="size-4" />}
        title="Revisados por pares"
        hint="Com comprovante da revista."
        items={acervo.reviewed}
        tone="reviewed"
        limit={4}
      />
      <Collection
        icon={<ScrollText className="size-4" />}
        title="Ainda não revisados"
        hint="Publicados, sem comprovação ainda."
        items={acervo.notReviewed}
        tone="pending"
        limit={4}
      />

      <Link
        to="/publicacoes"
        className="acervo-mural__more inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
      >
        Ver a coletânea completa ({acervo.counts.total} artigos) →
      </Link>
    </div>
  );
}

function Collection({
  icon,
  title,
  hint,
  items,
  tone,
  limit,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  items: AcervoItem[];
  tone: "classico" | "reviewed" | "pending";
  limit: number;
}) {
  const toneClass =
    tone === "reviewed" ? "text-success" : tone === "classico" ? "text-primary" : "text-foreground";
  const shown = items.slice(0, limit);

  return (
    <section className="acervo-mural__collection">
      <header className="acervo-mural__head">
        <span className={cn("acervo-mural__label", toneClass)}>
          {icon}
          {title}
          <span className="acervo-mural__count tabular-nums">{items.length}</span>
        </span>
        <span className="acervo-mural__hint">{hint}</span>
      </header>

      {items.length === 0 ? (
        <p className="acervo-mural__empty">Nada aqui ainda.</p>
      ) : (
        <ul className="acervo-mural__list">
          {shown.map((item) => (
            <li key={item.id}>
              <Entry item={item} tone={tone} />
            </li>
          ))}
          {items.length > shown.length && (
            <li>
              <Link to="/publicacoes" className="acervo-mural__more">
                +{items.length - shown.length} no acervo completo →
              </Link>
            </li>
          )}
        </ul>
      )}
    </section>
  );
}

function Entry({ item, tone }: { item: AcervoItem; tone: "classico" | "reviewed" | "pending" }) {
  const inner = (
    <>
      <span className="acervo-entry__title">{item.title}</span>
      <span className="acervo-entry__meta">
        <span className="acervo-entry__authors">{item.authors}</span>
        {item.venue && <span className="acervo-entry__venue"> · {item.venue}</span>}
        <span className="acervo-entry__year tabular-nums"> · {item.year}</span>
      </span>
    </>
  );
  const cls = cn("acervo-entry", tone === "classico" && "acervo-entry--classico");
  return item.slug ? (
    <Link to="/publicacoes/$slug" params={{ slug: item.slug }} className={cls}>
      {inner}
    </Link>
  ) : (
    <Link to="/publicacoes" className={cls}>
      {inner}
    </Link>
  );
}
