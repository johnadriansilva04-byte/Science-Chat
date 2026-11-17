import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  BookOpenText,
  Flame,
  Landmark,
  ScrollText,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  getPublicPublication,
  listPublicPublications,
  type PublicationSummary,
} from "@/lib/publication.functions";
import { buildAcervo, type AcervoItem } from "@/lib/acervo";
import { MUSEUM_WINGS } from "@/lib/museum";
import { AcervoCard } from "@/components/app/AcervoCard";
import { BookReader } from "@/components/app/BookReader";
import { BrandFooter } from "@/components/app/BrandFooter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import logo from "@/assets/sciencechat-logo.png";

export const Route = createFileRoute("/publicacoes/")({
  head: () => ({
    meta: [
      { title: "Coletânea de artigos — ScienceChat" },
      {
        name: "description",
        content:
          "A coletânea da ScienceChat: clássicos do Museu, artigos revisados por pares e trabalhos ainda não revisados — tudo em uma só estante.",
      },
      { property: "og:title", content: "Coletânea de artigos — ScienceChat" },
      {
        property: "og:description",
        content:
          "Clássicos do Museu, artigos revisados por pares e trabalhos ainda não revisados da ScienceChat.",
      },
    ],
  }),
  component: AcervoPage,
});

type TabId = "todos" | "classicos" | "revisados" | "nao-revisados";

const TABS: { id: TabId; label: string; icon: ReactNode }[] = [
  { id: "todos", label: "Tudo", icon: <BookOpenText className="size-4" /> },
  { id: "classicos", label: "Clássicos do Museu", icon: <Landmark className="size-4" /> },
  { id: "revisados", label: "Revisados por pares", icon: <BadgeCheck className="size-4" /> },
  { id: "nao-revisados", label: "Ainda não revisados", icon: <ScrollText className="size-4" /> },
];

function AcervoPage() {
  const [pubs, setPubs] = useState<PublicationSummary[] | null>(null);
  const [tab, setTab] = useState<TabId>("todos");
  const [query, setQuery] = useState("");

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

  const q = query.trim().toLowerCase();
  const match = (i: AcervoItem) =>
    q
      ? `${i.title} ${i.originalTitle ?? ""} ${i.authors} ${i.venue} ${i.area ?? ""} ${i.tags.join(" ")}`
          .toLowerCase()
          .includes(q)
      : true;

  const counts: Record<TabId, number> = {
    todos: acervo.counts.total,
    classicos: acervo.counts.classics,
    revisados: acervo.counts.reviewed,
    "nao-revisados": acervo.counts.notReviewed,
  };

  const loading = pubs === null;

  return (
    <div className="publications-shell min-h-screen">
      <header className="flex items-center gap-2 border-b border-border/60 bg-card/60 px-4 py-3 backdrop-blur">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="" width={28} height={28} />
          <span className="font-serif text-lg font-semibold">ScienceChat</span>
        </Link>
        <nav className="ml-auto flex items-center gap-1 text-sm">
          <Link
            to="/museu"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:bg-white/60 hover:text-foreground"
          >
            <Landmark className="size-4" />
            Museu
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:bg-white/60 hover:text-foreground"
          >
            Início
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-16 pt-10">
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
            <BookOpenText className="size-6" />
          </span>
          <div>
            <h1 className="font-serif text-3xl font-semibold md:text-4xl">Coletânea de artigos</h1>
            <p className="text-sm text-muted-foreground">
              {loading
                ? "Carregando…"
                : `${acervo.counts.total} artigos — clássicos que mudaram o mundo e contribuições da comunidade.`}
            </p>
          </div>
        </div>

        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Uma só estante, três coleções. Os{" "}
          <strong className="text-foreground">clássicos do Museu</strong> são obras que reescreveram
          o que era possível pensar — metadados reais, com DOI, dignos de reverência. Os{" "}
          <strong className="text-foreground">revisados por pares</strong> são artigos cujo autor
          comprovou a revisão feita pela revista ou universidade. Os{" "}
          <strong className="text-foreground">ainda não revisados</strong> estão publicados, mas sem
          essa comprovação — a plataforma não revisa.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por tema, autor, teoria ou DOI…"
              className="h-11 w-full rounded-md border border-input bg-card pl-9 pr-9 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Limpar busca"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "museum-chip inline-flex items-center gap-1.5",
                tab === t.id && "museum-chip--active",
              )}
            >
              {t.icon}
              {t.label}
              <span className="tabular-nums opacity-70">· {counts[t.id]}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <p className="mt-10 text-sm text-muted-foreground">Carregando o acervo…</p>
        ) : (
          <div className="mt-8 space-y-10">
            {acervo.homages.length > 0 && (tab === "todos" || tab === "nao-revisados") && (
              <div className="space-y-4">
                {acervo.homages.filter(match).map((item) => (
                  <HomageBanner key={item.id} item={item} />
                ))}
              </div>
            )}

            {(tab === "todos" || tab === "classicos") &&
              acervo.classicsByWing.map((group) => {
                const items = group.items.filter(match);
                if (tab !== "todos" && items.length === 0) return null;
                const wing = MUSEUM_WINGS.find((w) => w.id === group.wing)!;
                return (
                  <Section
                    key={group.wing}
                    icon={<Landmark className="size-4" />}
                    title={wing.label}
                    hint={wing.subtitle}
                    tone="classico"
                    items={items}
                    empty="Nada aqui para esta busca."
                  />
                );
              })}

            {(tab === "todos" || tab === "revisados") && (
              <Section
                icon={<BadgeCheck className="size-4" />}
                title="Revisados por pares"
                hint="O autor comprovou a revisão (DOI ou registro do aceite)."
                tone="reviewed"
                items={acervo.reviewed.filter(match)}
                empty="Nenhum artigo com revisão comprovada ainda. Seja o primeiro."
              />
            )}

            {(tab === "todos" || tab === "nao-revisados") && (
              <Section
                icon={<ScrollText className="size-4" />}
                title="Ainda não revisados"
                hint="Publicados, mas ainda sem comprovação de revisão por pares."
                tone="pending"
                items={acervo.notReviewed.filter(match)}
                empty="Nenhum artigo nesta seção."
              />
            )}
          </div>
        )}

        <div className="mt-14 rounded-xl border border-primary/25 bg-accent/30 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Sparkles className="size-5 text-primary" />
            <p className="text-sm text-muted-foreground">
              Publicou seu artigo? Ele entra na coletânea na hora. Tem o comprovante da revisão por
              pares? Ele ganha o selo de revisado.
            </p>
            <Button asChild className="ml-auto">
              <Link to="/">Criar meu artigo</Link>
            </Button>
          </div>
        </div>
      </main>
      <BrandFooter />
    </div>
  );
}

function Section({
  icon,
  title,
  hint,
  tone,
  items,
  empty,
}: {
  icon: ReactNode;
  title: string;
  hint: string;
  tone: "classico" | "reviewed" | "pending";
  items: AcervoItem[];
  empty: string;
}) {
  const toneClass =
    tone === "reviewed" ? "text-success" : tone === "classico" ? "text-primary" : "text-foreground";

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border/60 pb-3">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 font-serif text-lg font-semibold",
            toneClass,
          )}
        >
          {icon}
          {title}
        </span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
          {items.length}
        </span>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </div>
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed bg-card/50 px-4 py-3 text-sm text-muted-foreground">
          {empty}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((i) => (
            <AcervoCard key={i.id} item={i} />
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * Faixa de homenagem: eleva um artigo da comunidade a tributo do ScienceChat.
 * Aqui, o ensaio sobre a adaptação cognitiva de Stephen Hawking — em memória do
 * cientista que provou que a mente não precisa de lousa.
 */
function HomageBanner({ item }: { item: AcervoItem }) {
  const homage = item.homage!;
  const [reading, setReading] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function openBook() {
    if (!item.slug) return;
    setLoading(true);
    try {
      const pub = await getPublicPublication({ data: { slug: item.slug } });
      if (pub?.content) {
        setContent(pub.content);
        setReading(true);
      } else {
        toast.error("Não foi possível abrir o ensaio");
      }
    } catch {
      toast.error("Não foi possível abrir o ensaio");
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className="acervo-homage">
      <span className="acervo-homage__flame" aria-hidden>
        <Flame className="size-5" />
      </span>
      <div className="acervo-homage__body">
        <span className="acervo-homage__kicker">Homenagem do ScienceChat</span>
        <h3 className="acervo-homage__title">
          <Link to="/publicacoes/$slug" params={{ slug: item.slug! }}>
            {item.title}
          </Link>
        </h3>
        <p className="acervo-homage__dedication">{homage.dedication}</p>
        <p className="acervo-homage__meta">
          {item.authors} · {item.venue} · {item.year} · {homage.honoree}
        </p>
      </div>
      <div className="acervo-homage__actions">
        <button
          type="button"
          className="acervo-homage__cta"
          onClick={() => void openBook()}
          disabled={loading}
        >
          <BookOpen className="size-4" />
          Ler o ensaio
          <ArrowRight className="size-4" />
        </button>
        <Link to="/publicacoes/$slug" params={{ slug: item.slug! }} className="acervo-homage__link">
          Ver ficha completa
        </Link>
      </div>
      {reading && content && (
        <BookReader title={item.title} content={content} onClose={() => setReading(false)} />
      )}
    </article>
  );
}
