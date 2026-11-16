import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, BookOpenText, FilePlus2, Landmark, Play, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { listArticles } from "@/lib/article.functions";
import { JOURNEY_ACTS } from "@/lib/journey";
import { Button } from "@/components/ui/button";
import { ArticlesMenu, createArticle } from "@/components/app/ArticlesMenu";
import { PublishedShelf } from "@/components/app/PublishedShelf";
import { BrandFooter } from "@/components/app/BrandFooter";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ScienceChat — seu rascunho científico em 5 minutos" },
      {
        name: "description",
        content:
          "Uma entrevista inteligente estrutura seu rascunho acadêmico real, nas normas da sua revista de destino.",
      },
      { property: "og:title", content: "ScienceChat — seu rascunho científico em 5 minutos" },
      {
        property: "og:description",
        content:
          "Uma entrevista inteligente estrutura seu rascunho acadêmico real, nas normas da sua revista de destino.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [idea, setIdea] = useState("");
  const [creating, setCreating] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  // O brilho acompanha o ponteiro — dá vida ao fundo sem custo de render.
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${((e.clientX - rect.left) / rect.width) * 100}%`);
      el.style.setProperty("--my", `${((e.clientY - rect.top) / rect.height) * 100}%`);
    };
    el.addEventListener("pointermove", onMove);
    return () => el.removeEventListener("pointermove", onMove);
  }, []);

  if (!user) return <div className="min-h-screen bg-background" />;

  async function continueResearch() {
    const rows = await listArticles();
    const first = rows[0];
    if (!first) {
      toast.error("Você ainda não tem artigos. Comece um novo.");
      return;
    }
    navigate({ to: "/a/$articleId", params: { articleId: first.id } });
  }

  async function ignite() {
    setCreating(true);
    try {
      await createArticle(navigate, idea);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="landing-shell min-h-screen bg-background">
      <div ref={heroRef} className="landing-hero relative flex min-h-screen flex-col">
        <header className="relative z-10 flex items-center gap-2 px-4 py-3 sm:px-6">
          <ArticlesMenu />
          <span className="font-serif text-lg font-semibold">ScienceChat</span>
          <nav className="ml-auto flex items-center gap-1 text-sm">
            <Link
              to="/museu"
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:bg-white/60 hover:text-foreground"
            >
              <Landmark className="size-4" />
              Museu
            </Link>
            <Link
              to="/publicacoes"
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:bg-white/60 hover:text-foreground"
            >
              <BookOpenText className="size-4" />
              Acervo
            </Link>
          </nav>
        </header>

        <main className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 pb-16 pt-6 sm:px-6">
          <div className="text-center">
            <span className="mb-5 inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/25 bg-white/70 px-3 py-1 text-[11px] font-medium text-primary shadow-sm backdrop-blur">
              <Sparkles className="size-3.5" />
              Rascunho científico · entrevista inteligente · normas reais
            </span>
            <h1 className="font-serif text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
              Uma ideia só é válida se estiver{" "}
              <span className="landing-shimmer">estruturada no papel</span>.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-balance text-muted-foreground">
              Responda uma entrevista rápida e receba o esqueleto do seu artigo acadêmico — já nas
              normas da sua revista de destino.
            </p>
          </div>

          <form
            className="mx-auto mt-8 flex w-full max-w-2xl flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              void ignite();
            }}
          >
            <div className="group relative flex-1">
              <Sparkles className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary/70 transition-transform group-focus-within:scale-110" />
              <input
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="Qual inquietação você quer investigar? (opcional)"
                className="h-12 w-full rounded-xl border border-input bg-white/80 pl-9 pr-3 text-sm shadow-sm outline-none backdrop-blur transition focus:border-primary focus:ring-2 focus:ring-primary/25"
              />
            </div>
            <Button
              type="submit"
              size="lg"
              disabled={creating}
              className="landing-cta h-12 gap-1.5 rounded-xl"
            >
              <FilePlus2 />
              {creating ? "Acendendo…" : "Começar meu artigo"}
            </Button>
          </form>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <Button
              size="lg"
              variant="outline"
              className="h-11 rounded-xl"
              onClick={continueResearch}
            >
              <Play />
              Continuar pesquisa
            </Button>
            <span className="text-xs text-muted-foreground">
              Seus artigos ficam no menu ⋮ no topo.
            </span>
          </div>

          <Journey />
        </main>
      </div>

      <section className="mx-auto w-full max-w-5xl px-4 pb-14 sm:px-6">
        <div className="mb-4 flex items-center gap-2">
          <BookOpenText className="size-4 text-primary" />
          <h2 className="font-serif text-lg font-semibold">Acervo</h2>
          <Link
            to="/publicacoes"
            className="ml-auto text-xs font-medium text-primary hover:underline"
          >
            Ver tudo →
          </Link>
        </div>
        <PublishedShelf />
      </section>

      <BrandFooter />
    </div>
  );
}

/** O caminho, do zero à obra — a mesma jornada de cinco atos usada dentro do app. */
function Journey() {
  return (
    <ol className="mx-auto mt-12 flex w-full max-w-3xl flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-0">
      {JOURNEY_ACTS.map((act, i) => {
        const Icon = act.icon;
        const last = i === JOURNEY_ACTS.length - 1;
        return (
          <li key={act.id} className="flex flex-1 items-center gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-xl border bg-white/60 px-3 py-2 backdrop-blur">
              <span
                className="grid size-7 shrink-0 place-items-center rounded-lg"
                style={{
                  color: act.color,
                  background: `color-mix(in oklab, ${act.color} 14%, transparent)`,
                }}
              >
                <Icon className="size-4" />
              </span>
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="text-[11px] font-semibold">{act.label}</span>
                <span className="truncate text-[10px] text-muted-foreground">{act.tagline}</span>
              </span>
            </div>
            {!last && (
              <ArrowRight className="hidden size-3.5 shrink-0 text-muted-foreground/50 sm:block" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
