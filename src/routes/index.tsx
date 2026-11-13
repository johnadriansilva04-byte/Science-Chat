import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  BookMarked,
  BookOpenText,
  FilePlus2,
  Landmark,
  MessageSquareText,
  ListChecks,
  FileText,
  Play,
  Sparkles,
  Paperclip,
  ShieldCheck,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { listArticles } from "@/lib/article.functions";
import { Button } from "@/components/ui/button";
import { ArticlesMenu, createArticle } from "@/components/app/ArticlesMenu";
import { PublishedShelf } from "@/components/app/PublishedShelf";
import { BrandFooter } from "@/components/app/BrandFooter";
import logo from "@/assets/sciencechat-logo.png";

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

function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [idea, setIdea] = useState("");
  const [creating, setCreating] = useState(false);
  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);
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

  const steps = [
    {
      icon: MessageSquareText,
      t: "1. Ignição e interrogatório",
      d: "Você traz a inquietação; eu aperto cada lacuna até a tese ficar sólida.",
    },
    {
      icon: ListChecks,
      t: "2. Estrutura",
      d: "Organizo o material e mostro como o artigo vai ficar. Você aprova.",
    },
    {
      icon: FileText,
      t: "3. Produção e obra",
      d: "Escrevo uma página por vez — você aprova cada uma até virar um artigo completo.",
    },
  ];
  return (
    <div className="lab-bg min-h-screen bg-background">
      <header className="flex items-center gap-2 p-3">
        <ArticlesMenu />
        <span className="font-serif text-lg font-semibold">ScienceChat</span>
        <nav className="ml-auto flex items-center gap-3 text-sm">
          <Link
            to="/museu"
            className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <Landmark className="size-4" />
            Museu
          </Link>
          <Link
            to="/publicacoes"
            className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <BookOpenText className="size-4" />
            Publicações
          </Link>
        </nav>
      </header>
      <div className="lab-rule" aria-hidden />
      <main className="mx-auto max-w-2xl px-6 pb-16 pt-12 text-center">
        <img src={logo} alt="" width={72} height={72} className="mx-auto mb-6" />
        <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-[11px] font-medium text-primary">
          <Sparkles className="size-3.5" />
          Pesquisa independente · com documentação probatória
        </span>
        <h1 className="font-serif text-4xl font-semibold leading-tight md:text-5xl">
          Construa o seu artigo científico conversando.
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
          Primeiro investigamos. Depois planejamos. Depois escrevemos — página por página. A autoria
          é sua.
        </p>
        <p className="mx-auto mt-3 max-w-md text-sm italic text-muted-foreground">
          Ciência não é das instituições. É de quem investiga, argumenta e documenta.
        </p>

        <form
          className="mx-auto mt-8 flex max-w-xl flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            void ignite();
          }}
        >
          <div className="relative flex-1">
            <Sparkles className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary/70" />
            <input
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="Qual inquietação você quer investigar? (opcional)"
              className="h-11 w-full rounded-md border border-input bg-card pl-9 pr-3 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <Button type="submit" size="lg" disabled={creating} className="gap-1.5">
            <FilePlus2 />
            {creating ? "Acendendo…" : "Começar novo artigo"}
          </Button>
        </form>

        <div className="mt-4">
          <Button size="lg" variant="outline" onClick={continueResearch}>
            <Play />
            Continuar pesquisa
          </Button>
        </div>

        <div className="mt-12 text-left">
          <div className="mb-3 flex items-center gap-2">
            <BookMarked className="size-5 text-primary" />
            <h2 className="font-serif text-xl font-semibold">Mural de artigos publicados</h2>
          </div>
          <PublishedShelf />
          <p className="mt-2 text-xs text-muted-foreground">
            Só entra aqui o artigo já aprovado na revisão por pares — e liberado pelo autor. Seu
            conhecimento fica protegido e creditado.
          </p>
        </div>

        <Link to="/museu" className="museum-invite group mt-6 block text-left">
          <Landmark className="size-6 text-primary" />
          <div className="min-w-0">
            <div className="font-serif text-lg font-semibold">Museu de Artigos Científicos</div>
            <p className="text-sm text-muted-foreground">
              De Einstein a Turing; do poder e da exclusão à metacognição. Fontes reais, com DOI.
            </p>
          </div>
          <span className="ml-auto shrink-0 self-center text-sm font-medium text-primary">
            Entrar →
          </span>
        </Link>

        <section className="mt-12 text-left">
          <h2 className="font-serif text-xl font-semibold">Por que é diferente</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Não é um chatbot que devolve um texto pronto. São quatro mecanismos que sustentam a sua
            autoria.
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              {
                icon: MessageSquareText,
                t: "Entrevista científica inteligente",
                d: "Perguntas adaptativas, uma por vez, com a opção de pular o que não se aplica.",
              },
              {
                icon: Paperclip,
                t: "Dossiê documental",
                d: "Anexe provas — planilhas, fotos, códigos, PDFs — ligadas às suas afirmações.",
              },
              {
                icon: ShieldCheck,
                t: "Auditoria de rastreabilidade",
                d: "Cada afirmação é confrontada com a evidência: sustentada, parcial ou a confirmar.",
              },
              {
                icon: Layers,
                t: "Geração página por página",
                d: "O artigo nasce em folhas A4 que você aprova uma a uma — sem reescrever tudo.",
              },
            ].map((p) => (
              <li key={p.t} className="flex gap-3 rounded-lg border bg-card p-4">
                <p.icon className="mt-0.5 size-5 shrink-0 text-primary" />
                <div>
                  <div className="text-sm font-medium">{p.t}</div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{p.d}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-12 grid gap-4 text-left md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.t} className="rounded-lg border bg-card p-5">
              <s.icon className="mb-3 size-5 text-primary" />
              <div className="font-medium">{s.t}</div>
              <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-xs text-muted-foreground">
          Seus artigos ficam no menu ⋮ no canto superior esquerdo.
        </p>
      </main>
      <BrandFooter />
    </div>
  );
}
