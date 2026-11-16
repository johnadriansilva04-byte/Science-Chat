import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { BadgeCheck, Landmark, ScrollText } from "lucide-react";
import { listPublicPublications, type PublicationSummary } from "@/lib/publication.functions";
import { buildAcervo, type AcervoItem } from "@/lib/acervo";
import { cn } from "@/lib/utils";

/**
 * Vitrine do acervo na home: três coleções, só com os NOMES dos artigos —
 * limpo, sem resumo. O acervo completo (com fichas) vive em `/publicacoes`.
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
    <section className={cn("space-y-2.5", className)} aria-label="Acervo da ScienceChat">
      <Row
        icon={<Landmark className="size-3.5" />}
        title="Clássicos do Museu"
        items={acervo.classics}
        tone="classico"
      />
      <Row
        icon={<BadgeCheck className="size-3.5" />}
        title="Revisados por pares"
        items={acervo.reviewed}
        tone="reviewed"
      />
      <Row
        icon={<ScrollText className="size-3.5" />}
        title="Ainda não revisados"
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
  items,
  tone,
}: {
  icon: ReactNode;
  title: string;
  items: AcervoItem[];
  tone: "classico" | "reviewed" | "pending";
}) {
  const toneClass =
    tone === "reviewed" ? "text-success" : tone === "classico" ? "text-primary" : "text-foreground";
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 font-serif text-xs font-semibold",
          toneClass,
        )}
      >
        {icon}
        {title}
        <span className="tabular-nums text-muted-foreground">{items.length}</span>
      </span>
      <span className="flex flex-wrap gap-1.5">
        {items.length === 0 ? (
          <span className="text-[11px] text-muted-foreground">—</span>
        ) : (
          items.slice(0, 3).map((i) => <ItemChip key={i.id} item={i} tone={tone} />)
        )}
        {items.length > 3 && (
          <Link
            to="/publicacoes"
            className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
          >
            +{items.length - 3}
          </Link>
        )}
      </span>
    </div>
  );
}

function ItemChip({ item, tone }: { item: AcervoItem; tone: "classico" | "reviewed" | "pending" }) {
  const label = item.title.length > 42 ? `${item.title.slice(0, 42)}…` : item.title;
  const cls = cn(
    "max-w-full truncate rounded-full border px-2 py-0.5 text-[11px] transition-colors",
    tone === "classico"
      ? "border-primary/30 bg-primary/5 text-foreground hover:border-primary hover:bg-primary/10"
      : "border-border bg-card text-foreground hover:border-primary/50",
  );
  if (item.slug) {
    return (
      <Link to="/publicacoes/$slug" params={{ slug: item.slug }} className={cls} title={item.title}>
        {label}
      </Link>
    );
  }
  return (
    <Link to="/publicacoes" className={cls} title={item.title}>
      {label}
    </Link>
  );
}
