import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, BookOpenText, FilePlus2, Play, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { listArticles } from "@/lib/article.functions";
import { JOURNEY_ACTS } from "@/lib/journey";
import { faqSeed, takePendingQuestion } from "@/lib/onboarding";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/app/AppHeader";
import { createArticle } from "@/components/app/ArticlesMenu";
import { PublishedShelf } from "@/components/app/PublishedShelf";
import { ScienceAccessCard } from "@/components/app/ScienceAccessCard";

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
  const { user, loading, error: authError } = useAuth();
  const navigate = useNavigate();
  const [idea, setIdea] = useState("");
  const [creating, setCreating] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Só manda para o login quando a ausência de usuário é legítima. Se a
    // sessão falhou (erro no servidor), mostramos o aviso — redirecionar aqui
    // escondia a causa e o login parecia "não funcionar".
    if (!loading && !user && !authError) navigate({ to: "/auth" });
  }, [loading, user, authError, navigate]);

  // Pergunta escolhida no cadastro ("Perguntar ao Pracinha"): ao entrar, ela vira
  // um artigo novo com a pergunta como semente — o chat já responde de cara.
  const consumedQuestion = useRef(false);
  useEffect(() => {
    if (loading || !user || consumedQuestion.current) return;
    const question = takePendingQuestion();
    if (!question) return;
    consumedQuestion.current = true;
    void createArticle(navigate, faqSeed(question));
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
    <div className="landing-shell flex min-h-screen flex-col bg-background lg:h-screen lg:overflow-hidden">
      <div
        ref={heroRef}
        className="landing-hero relative flex min-h-screen flex-col lg:h-full lg:min-h-0"
      >
        <AppHeader variant="overlay" />

        {authError && (
          <div
            role="alert"
            className="relative z-10 mx-auto mt-4 w-full max-w-6xl rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          >
            Não foi possível verificar sua sessão agora. Recarregue a página; se persistir, entre
            novamente.
          </div>
        )}

        <main className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-6 px-4 pb-8 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:overflow-hidden lg:pb-4">
          {/* Coluna esquerda: a promessa e o começo */}
          <section className="flex min-h-0 flex-col justify-center">
            <span className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/25 bg-white/70 px-3 py-1 text-[11px] font-medium text-primary landing-badge backdrop-blur">
              <Sparkles className="size-3.5" />
              Rascunho científico · entrevista inteligente · normas reais
            </span>
            <h1 className="font-serif text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl">
              Uma ideia só é válida se estiver{" "}
              <span className="landing-shimmer">estruturada no papel</span>.
            </h1>

            <p className="mt-5 font-serif text-sm italic text-primary/85 sm:text-base">
              (A menos que você seja o Stephen Hawking — mas se for, tá dispensado kkkk)
            </p>

            <p className="mt-4 max-w-lg text-muted-foreground">
              Responda uma entrevista rápida e receba o esqueleto do seu artigo acadêmico — já nas
              normas da sua revista de destino.
            </p>

            <form
              className="mt-7 flex max-w-xl flex-col gap-2 sm:flex-row"
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

            <div className="mt-4 flex flex-wrap items-center gap-3">
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

            <ScienceAccessCard className="mt-5 max-w-xl" onUseGuide={(seed) => setIdea(seed)} />

            <ol className="mt-6 hidden items-center gap-2 text-[11px] text-muted-foreground lg:flex">
              {JOURNEY_ACTS.map((act, i) => (
                <li key={act.id} className="flex items-center gap-2">
                  {i > 0 && <ArrowRight className="size-3 opacity-40" />}
                  <span className="inline-flex items-center gap-1.5 rounded-full border bg-white/60 px-2.5 py-1 backdrop-blur">
                    <span
                      className="flex size-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
                      style={{ background: act.color }}
                    >
                      {i + 1}
                    </span>
                    {act.label}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          {/* Coluna direita: o mural do acervo */}
          <section className="flex min-h-0 flex-col justify-center">
            <div className="landing-shelf-card rounded-2xl border bg-white/70 p-4 backdrop-blur">
              <div className="mb-3 flex items-baseline gap-2">
                <BookOpenText className="size-4 text-primary" />
                <h2 className="font-serif text-base font-semibold">Coletânea de artigos</h2>
                <span className="text-[11px] text-muted-foreground">clássicos e contribuições</span>
                <Link
                  to="/publicacoes"
                  className="ml-auto inline-flex shrink-0 items-center py-2 text-xs font-medium text-primary hover:underline sm:py-0"
                >
                  Ver tudo →
                </Link>
              </div>
              <PublishedShelf />
            </div>
          </section>
        </main>

        <div className="relative z-10 hidden items-center justify-between px-6 py-3 text-[11px] text-muted-foreground lg:flex">
          <span>Uma criação Variant · CEO John Adrian</span>
          <Link to="/museu" className="font-medium text-primary hover:underline">
            Explorar o Museu de Artigos Científicos →
          </Link>
        </div>
      </div>
    </div>
  );
}
