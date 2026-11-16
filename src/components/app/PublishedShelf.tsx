import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { BadgeCheck, Landmark, Quote, ScrollText } from "lucide-react";
import { listPublicPublications, type PublicationSummary } from "@/lib/publication.functions";
import { buildAcervo, type AcervoItem } from "@/lib/acervo";
import { cn } from "@/lib/utils";

/**
 * Vitrine do acervo na página inicial. Mostra, em linguagem simples, as três
 * coleções — clássicos do Museu, revisados por pares e ainda não revisados —
 * com título + resumo, sem poluir. O acervo completo vive em `/publicacoes`.
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
    <section className={cn("space-y-3", className)} aria-label="Acervo da ScienceChat">
      <Row
        icon={<Landmark className="size-3.5" />}
        title="Clássicos do Museu"
        hint="Obras que mudaram o mundo."
        items={acervo.classics}
        tone="classico"
      />
      <Row
        icon={<BadgeCheck className="size-3.5" />}
        title="Revisados por pares"
        hint="Com comprovante da revista."
        items={acervo.reviewed}
        tone="reviewed"
      />
      <Row
        icon={<ScrollText className="size-3.5" />}
        title="Ainda não revisados"
        hint="Publicados, sem comprovação ainda."
        items={acervo.notReviewed}
        tone="pending"
      />
      <Link
        to="/publicacoes"
        className="inline-block text-xs font-medium text-primary hover:underline"
      >
        Ver o acervo completo ({acervo.counts.total}) →
      </Link>
    </section>
  );
}

function Row({
  icon,
  title,
  hint,
  items,
  tone,
}: {
  icon: ReactNode;
  title: string;
  hint: string;
  items: AcervoItem[];
  tone: "classico" | "reviewed" | "pending";
}) {
  const toneClass =
    tone === "reviewed" ? "text-success" : tone === "classico" ? "text-primary" : "text-foreground";
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 font-serif text-xs font-semibold",
            toneClass,
          )}
        >
          {icon}
          {title}
        </span>
        <span className="rounded-full bg-muted px-1.5 text-[11px] font-medium tabular-nums text-muted-foreground">
          {items.length}
        </span>
        <span className="text-[11px] text-muted-foreground">{hint}</span>
      </div>
      {items.length === 0 ? (
        <p className="rounded-md border border-dashed px-3 py-1.5 text-[11px] text-muted-foreground">
          Nada aqui ainda.
        </p>
      ) : (
        <ul className="space-y-1">
          {items.slice(0, 2).map((i) => (
            <li key={i.id} className="flex items-start gap-2 text-sm">
              <Quote className="mt-0.5 size-3 shrink-0 text-primary/60" />
              <span className="min-w-0">
                <ItemLink item={i} />
                {i.summary && (
                  <span className="line-clamp-1 text-xs text-muted-foreground"> — {i.summary}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ItemLink({ item }: { item: AcervoItem }) {
  if (item.slug) {
    return (
      <Link to="/publicacoes/$slug" params={{ slug: item.slug }}>
        <span className="font-medium text-foreground hover:text-primary">{item.title}</span>
      </Link>
    );
  }
  return (
    <Link to="/publicacoes">
      <span className="font-medium text-foreground hover:text-primary">{item.title}</span>
    </Link>
  );
}
