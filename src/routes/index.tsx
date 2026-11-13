import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  BookMarked,
  BookOpenText,
  FilePlus2,
  MessageSquareText,
  ListChecks,
  FileText,
  Play,
  Sparkles,
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
        <h1 className="font-serif text-4xl font-semibold leading-tight md:text-5xl">
          Construa o seu artigo científico conversando.
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
          Primeiro investigamos. Depois planejamos. Depois escrevemos página por página — e a
          autoria é sempre sua.
        </p>
        <p className="mx-auto mt-3 max-w-md text-sm italic text-muted-foreground">
          Produzir ciência não exige pertencer a uma instituição. Exige investigar, argumentar,
          documentar e construir conhecimento.
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
            Só entra aqui o artigo que já passou pela revisão por pares e recebeu o aval do próprio
            autor. É a sua marca registrada — o conhecimento fica protegido e creditado.
          </p>
        </div>

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
