import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Landmark, ExternalLink, Quote, Search, Sparkles, BookOpenText, X } from "lucide-react";
import { toast } from "sonner";
import {
  MUSEUM_SIZE,
  MUSEUM_WINGS,
  MUSEUM_WORKS,
  museumDoiUrl,
  type MuseumWingId,
  type MuseumWork,
} from "@/lib/museum";
import { addToInbox } from "@/lib/pracinha-inbox";
import { listArticles } from "@/lib/article.functions";
import { createArticle } from "@/components/app/ArticlesMenu";
import { BrandFooter } from "@/components/app/BrandFooter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import logo from "@/assets/sciencechat-logo.png";

export const Route = createFileRoute("/museu")({
  head: () => ({
    meta: [
      { title: "Museu de Artigos Científicos — ScienceChat" },
      {
        name: "description",
        content:
          "Acervo de artigos que mudaram o mundo: revolução científica, poder e violência institucional, psicologia e metacognição. Metadados reais, com DOI.",
      },
    ],
  }),
  component: MuseumPage,
});

function MuseumPage() {
  const navigate = useNavigate();
  const [wing, setWing] = useState<MuseumWingId | "todas">("todas");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const works = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MUSEUM_WORKS.filter((w) => wing === "todas" || w.wing === wing).filter((w) =>
      q
        ? `${w.title} ${w.titlePt} ${w.authors} ${w.venue} ${w.tags.join(" ")}`
            .toLowerCase()
            .includes(q)
        : true,
    );
  }, [wing, query]);

  // Atalho "/" foca a busca, como nos catálogos científicos.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function showToPracinha(w: MuseumWork) {
    setBusyId(w.id);
    try {
      addToInbox({
        title: w.title,
        authors: w.authors,
        year: w.year,
        venue: w.venue,
        doi: w.doi,
      });
      const rows = await listArticles();
      if (rows[0]) {
        toast.success("Obra enviada para o Pracinha", {
          description: `Abra o artigo "${rows[0].title}" — ela já está no chat.`,
        });
        navigate({ to: "/a/$articleId", params: { articleId: rows[0].id } });
      } else {
        toast.success("Obra guardada para o Pracinha", {
          description: "Vou abrir um artigo novo com ela.",
        });
        await createArticle(navigate, "Quero usar as obras que trouxe do museu.");
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="lab-bg min-h-screen bg-background">
      <header className="flex items-center gap-2 p-3">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="" width={28} height={28} />
          <span className="font-serif text-lg font-semibold">ScienceChat</span>
        </Link>
        <nav className="ml-auto flex items-center gap-3 text-sm">
          <Link
            to="/publicacoes"
            className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <BookOpenText className="size-4" />
            Publicações
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            Início
          </Link>
        </nav>
      </header>
      <div className="lab-rule" aria-hidden />

      <main className="mx-auto max-w-4xl px-6 pb-16 pt-10">
        <div className="flex items-center gap-3">
          <Landmark className="size-7 text-primary" />
          <h1 className="font-serif text-3xl font-semibold md:text-4xl">
            Museu de Artigos Científicos
          </h1>
        </div>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          As obras que mudaram o mundo — de Einstein a Turing — e a ciência que mostra como o poder
          exclui. Fontes reais, com DOI. Achou uma? Mande para o Pracinha: ela entra no seu artigo.
        </p>

        <div className="relative mt-6">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por tema, autor, teoria ou DOI… (ex.: tecnologia, burocracia, Turing)"
            className="h-11 w-full rounded-md border border-input bg-card pl-9 pr-9 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Limpar busca"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          ) : (
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:block">
              /
            </kbd>
          )}
        </div>
        <p className="mt-2 h-4 text-xs text-muted-foreground" aria-live="polite">
          {query.trim()
            ? `${works.length} ${works.length === 1 ? "obra encontrada" : "obras encontradas"} para “${query.trim()}”.`
            : ""}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setWing("todas")}
            className={cn("museum-chip", wing === "todas" && "museum-chip--active")}
          >
            Todas · {MUSEUM_SIZE}
          </button>
          {MUSEUM_WINGS.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => setWing(w.id)}
              className={cn("museum-chip", wing === w.id && "museum-chip--active")}
            >
              {w.label}
            </button>
          ))}
        </div>

        {wing !== "todas" && (
          <p className="mt-3 text-sm italic text-muted-foreground">
            {MUSEUM_WINGS.find((w) => w.id === wing)?.subtitle}
          </p>
        )}

        {works.length === 0 ? (
          <div className="mt-10 flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-muted-foreground">
              Nada encontrado para “{query}”. Tente outro termo — ou peça no chat: “ache DOI sobre
              …”.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {["tecnologia", "burocracia", "memória", "viés", "Turing"].map((t) => (
                <button key={t} type="button" className="museum-chip" onClick={() => setQuery(t)}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {works.map((w) => (
              <li key={w.id} className="museum-card">
                <div className="flex items-start justify-between gap-3">
                  <span className="museum-card__year tabular-nums">{w.year}</span>
                  <span className="museum-card__wing">
                    {MUSEUM_WINGS.find((x) => x.id === w.wing)?.label}
                  </span>
                </div>
                <h2 className="museum-card__title">{w.titlePt}</h2>
                <p className="museum-card__orig">{w.title}</p>
                <p className="museum-card__authors">{w.authors}</p>
                <p className="museum-card__venue">{w.venue}</p>
                <p className="museum-card__note">
                  <Quote className="mr-1 inline size-3.5 text-primary" />
                  {w.note}
                </p>
                <div className="museum-card__tags">
                  {w.tags.map((t) => (
                    <span key={t} className="museum-tag">
                      {t}
                    </span>
                  ))}
                </div>
                <div className="museum-card__foot">
                  <a
                    href={museumDoiUrl(w.doi)}
                    target="_blank"
                    rel="noreferrer"
                    className="museum-card__doi"
                  >
                    DOI {w.doi}
                    <ExternalLink className="size-3.5" />
                  </a>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="museum-card__send"
                    disabled={busyId === w.id}
                    onClick={() => void showToPracinha(w)}
                  >
                    <Sparkles className="size-3.5" />
                    Mostrar ao Pracinha
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-10 text-xs text-muted-foreground">
          Metadados verificados em Crossref e OpenAlex. As notas são leitura da ScienceChat; o texto
          é dos autores. Publique seu artigo aqui e, após a revisão por pares, ele pode entrar no
          acervo — com sua autoria preservada.
        </p>
      </main>
      <BrandFooter />
    </div>
  );
}
