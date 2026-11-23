import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpenText,
  FilePlus2,
  FlaskConical,
  Loader2,
  Play,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { listArticles } from "@/lib/article.functions";
import { JOURNEY_ACTS } from "@/lib/journey";
import {
  faqSeed,
  setPendingMethodology,
  setPendingQuestion,
  takePendingMethodology,
  takePendingQuestion,
} from "@/lib/onboarding";
import { createMethodology, listMyMethodologies } from "@/lib/methodology.functions";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/app/AppHeader";
import { createArticle } from "@/components/app/ArticlesMenu";
import { PublishedShelf } from "@/components/app/PublishedShelf";
import { ScienceAccessCard } from "@/components/app/ScienceAccessCard";
import { GameCard } from "@/components/app/GameCard";

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
  // Segunda entrada da home: a metodologia tem semente própria e nasce como
  // entidade separada (chat + spec), não como aba do artigo.
  const [methodSeed, setMethodSeed] = useState("");
  const [creatingMethod, setCreatingMethod] = useState(false);
  const [methodologies, setMethodologies] = useState<
    { id: string; title: string; status: string }[]
  >([]);
  // A inquietação é o ponto de partida do artigo: sem ela a entrevista começa
  // no vazio e a IA não tem o que interrogar. Por isso é obrigatória.
  const [ideaTouched, setIdeaTouched] = useState(false);
  const ideaReady = idea.trim().length >= 8;
  const heroRef = useRef<HTMLDivElement>(null);

  // O visitante sem conta continua vendo a home: é nela que fica o card
  // "Ciência sem crachá", cujo público é justamente quem ainda não entrou. Só o
  // botão de começar exige sessão — antes, um redirect para /auth escondia o
  // card de quem mais precisava dele.

  // Pergunta escolhida no cadastro ("Perguntar ao Pracinha"): ao entrar, ela vira
  // um artigo novo com a pergunta como semente — o chat já responde de cara.
  // `takePendingQuestion` devolve o texto E a origem: só a pergunta do FAQ leva
  // a instrução de resposta pronta; a inquietação digitada na home vai crua.
  const consumedQuestion = useRef(false);
  const consumedMethodology = useRef(false);
  useEffect(() => {
    if (loading || !user || consumedQuestion.current) return;
    const pending = takePendingQuestion();
    if (!pending) return;
    consumedQuestion.current = true;
    const seed = pending.fromFaq ? faqSeed(pending.text) : pending.text;
    void createArticle(navigate, seed, pending.text);
  }, [loading, user, navigate]);

  // Semente de metodologia escolhida antes do cadastro ("Criar metodologia" sem
  // conta): ao entrar, ela vira uma metodologia e abre o caderno de método.
  useEffect(() => {
    if (loading || !user || consumedMethodology.current) return;
    const pending = takePendingMethodology();
    if (!pending) return;
    consumedMethodology.current = true;
    void startMethodology(pending);
  }, [loading, user]);

  // Lista curta das metodologias do pesquisador: sem isso, o caderno só seria
  // alcançável pelo link recém-criado (não há índice público de metodologias).
  useEffect(() => {
    if (!user) {
      setMethodologies([]);
      return;
    }
    let active = true;
    listMyMethodologies()
      .then((rows) => {
        if (active)
          setMethodologies(rows.map((r) => ({ id: r.id, title: r.title, status: r.status })));
      })
      .catch(() => {
        if (active) setMethodologies([]);
      });
    return () => {
      active = false;
    };
  }, [user]);

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

  // Falha de sessão é diferente de visitante: só o erro merece uma tela própria.
  // Sem sessão, a home segue de pé — o visitante vê o guia e é convidado a entrar
  // quando tenta começar um artigo. E o `loading` NÃO bloqueia a renderização:
  // bloquear fazia o HTML inicial esconder o card de ensino de quem chega de fora.
  if (authError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="font-serif text-xl font-semibold">
          Não foi possível verificar sua sessão agora
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Recarregue a página; se continuar, entre novamente. Seus artigos continuam salvos.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button size="lg" className="h-11 rounded-xl" onClick={() => window.location.reload()}>
            Recarregar
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-11 rounded-xl"
            onClick={() => navigate({ to: "/auth" })}
          >
            Entrar
          </Button>
        </div>
      </div>
    );
  }

  /** Visitante: as ações que gravam exigem conta, então levamos ao cadastro. */
  function requireAccount(seed?: string) {
    // Inquietação digitada na home: vai crua, sem a instrução do FAQ.
    if (seed?.trim()) setPendingQuestion(seed.trim(), false);
    navigate({ to: "/auth" });
  }

  async function continueResearch() {
    if (!user) {
      requireAccount();
      return;
    }
    const rows = await listArticles();
    const first = rows[0];
    if (!first) {
      toast.error("Você ainda não tem artigos. Comece um novo.");
      return;
    }
    navigate({ to: "/a/$articleId", params: { articleId: first.id } });
  }

  async function startMethodology(seedText: string) {
    const clean = seedText.trim();
    if (!clean) return;
    if (!user) {
      setPendingMethodology(clean);
      navigate({ to: "/auth" });
      return;
    }
    setCreatingMethod(true);
    try {
      const { id } = await createMethodology({ data: { seed: clean, title: clean } });
      navigate({
        to: "/metodologia/$id",
        params: { id },
        search: { seed: clean },
      });
    } catch {
      toast.error("Não foi possível criar a metodologia");
    } finally {
      setCreatingMethod(false);
    }
  }

  async function ignite() {
    setIdeaTouched(true);
    if (!ideaReady) return;
    if (!user) {
      requireAccount(idea);
      return;
    }
    setCreating(true);
    try {
      await createArticle(navigate, idea);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="landing-shell flex min-h-screen flex-col">
      {/* No celular o herói não força 100vh: sem isso, o card "Ciência sem crachá"
          ficava uma tela inteira abaixo da dobra e ninguém o encontrava. */}
      <div ref={heroRef} className="landing-hero relative flex min-h-0 flex-col lg:min-h-screen">
        <AppHeader variant="overlay" />

        <main className="relative z-10 mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-4 pb-8 sm:px-6 lg:flex-1 lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:gap-10 lg:pb-10">
          {/* Coluna esquerda: a promessa e o começo */}
          <section className="order-1 flex min-h-0 flex-col justify-center">
            <span className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/30 bg-card/70 px-3 py-1 text-[11px] font-medium text-primary landing-badge backdrop-blur">
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
                  onBlur={() => setIdeaTouched(true)}
                  required
                  minLength={8}
                  aria-invalid={ideaTouched && !ideaReady}
                  aria-describedby="idea-hint"
                  placeholder="Qual inquietação você quer investigar?"
                  className="h-12 w-full rounded-xl border border-input bg-card/70 pl-9 pr-3 text-sm shadow-sm outline-none backdrop-blur transition focus:border-primary focus:ring-2 focus:ring-primary/25 aria-[invalid=true]:border-destructive"
                />
              </div>
              <Button
                type="submit"
                size="lg"
                disabled={creating || !ideaReady}
                className="landing-cta h-12 gap-1.5 rounded-xl"
              >
                <FilePlus2 />
                {creating ? "Acendendo…" : "Começar meu artigo"}
              </Button>
            </form>

            <p
              id="idea-hint"
              className={`mt-2 text-xs ${
                ideaTouched && !ideaReady ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              {ideaTouched && !ideaReady
                ? "Escreva a sua inquietação em uma frase — é ela que vira o problema da pesquisa."
                : "Uma frase basta. É dela que a entrevista parte."}
            </p>

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
                {user ? "Seus artigos ficam no menu ⋮ no topo." : "Você entra na hora de salvar."}
              </span>
            </div>

            <ol className="mt-6 hidden items-center gap-2 text-[11px] text-muted-foreground lg:flex">
              {JOURNEY_ACTS.map((act, i) => (
                <li key={act.id} className="flex items-center gap-2">
                  {i > 0 && <ArrowRight className="size-3 opacity-40" />}
                  <span className="inline-flex items-center gap-1.5 rounded-full border bg-card/60 px-2.5 py-1 backdrop-blur">
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

            {/* Segunda porta de entrada, logo abaixo do artigo: a metodologia é
                uma peça separada, com caderno próprio, e pode ser acoplada depois. */}
            <div className="mt-4 rounded-2xl border border-accent-2/30 bg-card/60 p-3.5 backdrop-blur lg:mt-5">
              <div className="flex items-center gap-2">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-2/15 text-accent-2">
                  <FlaskConical className="size-4" />
                </span>
                <div className="min-w-0">
                  <h2 className="font-serif text-sm font-semibold leading-tight">
                    Ou comece pelo método
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    Peça separada do artigo — acople depois, se quiser.
                  </p>
                </div>
              </div>

              <form
                className="mt-2.5 flex flex-col gap-2 sm:flex-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  void startMethodology(methodSeed);
                }}
              >
                <input
                  value={methodSeed}
                  onChange={(e) => setMethodSeed(e.target.value)}
                  placeholder="Que método você quer usar?"
                  aria-label="Que método você quer usar?"
                  className="h-10 flex-1 rounded-xl border border-input bg-background/60 px-3 text-sm outline-none transition focus:border-accent-2 focus:ring-2 focus:ring-accent-2/25"
                />
                <Button
                  type="submit"
                  variant="outline"
                  disabled={creatingMethod || methodSeed.trim().length < 6}
                  className="h-10 gap-1.5 rounded-xl border-accent-2/40 text-accent-2 hover:bg-accent-2/10 hover:text-accent-2"
                >
                  {creatingMethod ? <Loader2 className="animate-spin" /> : <FlaskConical />}
                  Criar metodologia
                </Button>
              </form>

              {/* A lista fica ao lado da semente: quem já tem metodologia reabre
                  o caderno em um clique, sem passar pelo menu do topo. */}
              {user && (
                <div className="mt-3 border-t border-border/60 pt-2.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      Suas metodologias
                    </span>
                    {methodologies.length > 0 && (
                      <span className="text-[10px] tabular-nums text-muted-foreground">
                        {methodologies.length}
                      </span>
                    )}
                  </div>

                  {methodologies.length === 0 ? (
                    <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
                      Nenhuma ainda. Escreva a semente acima para abrir o primeiro caderno.
                    </p>
                  ) : (
                    <ul className="mt-1.5 space-y-0.5">
                      {methodologies.map((m) => (
                        <li key={m.id}>
                          <Link
                            to="/metodologia/$id"
                            params={{ id: m.id }}
                            className="group flex items-center gap-2 rounded-lg border border-transparent px-1.5 py-1 transition-colors hover:border-border hover:bg-card/80"
                          >
                            <FlaskConical
                              className="size-3.5 shrink-0 text-accent-2/70"
                              aria-hidden
                            />
                            <span className="min-w-0 flex-1 truncate text-xs text-foreground/85 group-hover:text-foreground">
                              {m.title}
                            </span>
                            <span
                              className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] uppercase tracking-wider ${
                                m.status === "approved"
                                  ? "border-success/40 text-success"
                                  : "border-border text-muted-foreground"
                              }`}
                            >
                              {m.status === "approved" ? "aprovada" : "rascunho"}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Coluna direita: as duas portas de entrada, a coletânea e o Stop. */}
          <section className="order-3 flex min-h-0 flex-col gap-3 lg:order-2">
            {/* O card de ensino fica na coluna da direita, ao lado da promessa:
                é a primeira coisa que quem chega sem vínculo precisa ler, e ele
                é um cartão — não o guia inteiro. */}
            <ScienceAccessCard />

            <div className="landing-shelf-card card-accent--shelf rounded-2xl border bg-card/60 p-4 backdrop-blur">
              <div className="mb-3 flex items-baseline gap-2">
                <BookOpenText className="landing-shelf-card__accent size-4" />
                <h2 className="landing-shelf-card__accent font-serif text-base font-semibold">
                  Coletânea de artigos
                </h2>
                <Link
                  to="/publicacoes"
                  className="landing-shelf-card__accent ml-auto inline-flex min-h-11 shrink-0 items-center text-xs font-medium hover:underline"
                >
                  Ver tudo →
                </Link>
              </div>
              <PublishedShelf compact />
            </div>
            <GameCard className="card-accent--stop" />
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
