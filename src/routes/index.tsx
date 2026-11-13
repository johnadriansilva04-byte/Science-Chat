import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  BookOpenText,
  FilePlus2,
  Landmark,
  Layers,
  MessageSquareText,
  Paperclip,
  Play,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { listArticles } from "@/lib/article.functions";
import { Button } from "@/components/ui/button";
import { ArticlesMenu, createArticle } from "@/components/app/ArticlesMenu";
import { PublishedShelf } from "@/components/app/PublishedShelf";
import { BrandFooter } from "@/components/app/BrandFooter";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ScienceChat — seu artigo científico, página por página" },
      {
        name: "description",
        content:
          "Converse, responda às perguntas e veja seu artigo científico nascer página por página.",
      },
      { property: "og:title", content: "ScienceChat — seu artigo científico, página por página" },
      {
        property: "og:description",
        content:
          "Converse, responda às perguntas e veja seu artigo científico nascer página por página.",
      },
    ],
  }),
  component: Index,
});

const MECHANISMS = [
  {
    icon: MessageSquareText,
    title: "Entrevista científica",
    desc: "Perguntas adaptativas, uma por vez. Pule o que não se aplica.",
    accent: "oklch(0.55 0.16 275)",
  },
  {
    icon: Paperclip,
    title: "Dossiê documental",
    desc: "Planilhas, fotos, códigos e PDFs ligados às suas afirmações.",
    accent: "oklch(0.58 0.14 195)",
  },
  {
    icon: ShieldCheck,
    title: "Auditoria de rastreabilidade",
    desc: "Cada afirmação confrontada com a evidência que a sustenta.",
    accent: "oklch(0.55 0.15 155)",
  },
  {
    icon: Layers,
    title: "Geração página por página",
    desc: "Folhas A4 que você aprova uma a uma — sem reescrever tudo.",
    accent: "oklch(0.58 0.17 40)",
  },
];

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
    <div className="landing-shell h-screen overflow-hidden bg-background">
      <div ref={heroRef} className="landing-hero relative flex h-full flex-col">
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
              Publicações
            </Link>
          </nav>
        </header>

        <main className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-6 overflow-y-auto px-4 pb-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:overflow-hidden">
          {/* Coluna esquerda: a promessa e o começo */}
          <section className="flex min-h-0 flex-col justify-center">
            <span className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/25 bg-white/70 px-3 py-1 text-[11px] font-medium text-primary shadow-sm backdrop-blur">
              <Sparkles className="size-3.5" />
              Pesquisa independente · com documentação probatória
            </span>
            <h1 className="font-serif text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl">
              Construa o seu artigo <span className="landing-shimmer">científico</span> conversando.
            </h1>
            <p className="mt-4 max-w-lg text-muted-foreground">
              Primeiro investigamos. Depois planejamos. Depois escrevemos — página por página. A
              autoria é sua.
            </p>
            <p className="mt-3 max-w-md text-sm italic text-primary/80">
              Ciência não é das instituições. É de quem investiga, argumenta e documenta.
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
                {creating ? "Acendendo…" : "Começar novo artigo"}
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

            <ol className="mt-8 hidden items-center gap-2 text-[11px] text-muted-foreground lg:flex">
              {["Ignição e interrogatório", "Estrutura", "Produção e obra"].map((label, i) => (
                <li key={label} className="flex items-center gap-2">
                  {i > 0 && <ArrowRight className="size-3 opacity-40" />}
                  <span className="inline-flex items-center gap-1.5 rounded-full border bg-white/60 px-2.5 py-1 backdrop-blur">
                    <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                      {i + 1}
                    </span>
                    {label}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          {/* Coluna direita: os quatro mecanismos + estante */}
          <section className="flex min-h-0 flex-col justify-center gap-4">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {MECHANISMS.map((m, i) => (
                <article
                  key={m.title}
                  className="landing-card group rounded-xl border bg-white/70 p-3.5 backdrop-blur"
                  style={
                    { "--accent": m.accent, animationDelay: `${i * 70}ms` } as React.CSSProperties
                  }
                >
                  <span className="landing-card__icon">
                    <m.icon className="size-4" />
                  </span>
                  <h3 className="mt-2.5 text-sm font-semibold">{m.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{m.desc}</p>
                </article>
              ))}
            </div>

            <div className="landing-shelf-card rounded-xl border bg-white/70 p-3.5 backdrop-blur">
              <div className="mb-2 flex items-center gap-2">
                <BadgeCheck className="size-4 text-primary" />
                <h2 className="font-serif text-sm font-semibold">Mural de artigos publicados</h2>
                <Link
                  to="/publicacoes"
                  className="ml-auto text-xs font-medium text-primary hover:underline"
                >
                  Ver todos →
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
      <BrandFooter className="lg:hidden" />
    </div>
  );
}
