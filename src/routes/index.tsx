import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { FilePlus2, MessageSquareText, ListChecks, FileText, Play } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { listArticles } from "@/lib/article.functions";
import { Button } from "@/components/ui/button";
import { ArticlesMenu, createArticle } from "@/components/app/ArticlesMenu";
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

  const steps = [
    {
      icon: MessageSquareText,
      t: "1. Conversa",
      d: "Respondo às perguntas sobre a sua pesquisa. Pode pular o que não souber.",
    },
    {
      icon: ListChecks,
      t: "2. Plano",
      d: "Mostro como o artigo vai ficar, página por página. Você aprova.",
    },
    {
      icon: FileText,
      t: "3. Páginas",
      d: "Escrevo uma página por vez. Você aprova ou pede correção.",
    },
  ];
  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-2 p-3">
        <ArticlesMenu />
        <span className="font-serif text-lg font-semibold">ScienceChat</span>
      </header>
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
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" onClick={() => createArticle(navigate)}>
            <FilePlus2 />
            Começar novo artigo
          </Button>
          <Button size="lg" variant="outline" onClick={continueResearch}>
            <Play />
            Continuar pesquisa
          </Button>
        </div>
        <div className="mt-14 grid gap-4 text-left md:grid-cols-3">
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
