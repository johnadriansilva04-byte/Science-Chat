import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, FileText, ListChecks, MessageSquareText, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArticlesMenu } from "@/components/app/ArticlesMenu";
import { InterviewChat } from "@/components/app/InterviewChat";
import { PlanPanel } from "@/components/app/PlanPanel";
import { PagePanel } from "@/components/app/PagePanel";
import { DocumentPanel } from "@/components/app/DocumentPanel";
import {
  getWorkspace,
  updateTitle,
  type WorkspaceArticle,
  type WorkspaceMessage,
  type WorkspacePage,
} from "@/lib/article.functions";
import type { UIMessage } from "ai";

export const Route = createFileRoute("/a/$articleId")({
  head: () => ({
    meta: [
      { title: "Artigo — ScienceChat" },
      {
        name: "description",
        content: "Entrevista, plano e produção do artigo, página por página.",
      },
    ],
  }),
  component: ArticleWorkspace,
});

type Tab = "interview" | "plan" | "production" | "document";

function initialTab(phase: string): Tab {
  if (phase === "plan") return "plan";
  if (phase === "writing" || phase === "done") return "production";
  return "interview";
}

function ArticleWorkspace() {
  const { articleId } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [article, setArticle] = useState<WorkspaceArticle | null>(null);
  const [messages, setMessages] = useState<WorkspaceMessage[]>([]);
  const [pages, setPages] = useState<WorkspacePage[]>([]);
  const [tab, setTab] = useState<Tab>("interview");
  const [selectedPage, setSelectedPage] = useState<number>(1);
  const [autoBuild, setAutoBuild] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const reload = useCallback(async () => {
    const data = await getWorkspace({ data: { articleId } });
    setArticle(data.article);
    setMessages(data.messages);
    setPages(data.pages);
    return data;
  }, [articleId]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoadingData(true);
    getWorkspace({ data: { articleId } })
      .then((data) => {
        if (!active) return;
        setArticle(data.article);
        setMessages(data.messages);
        setPages(data.pages);
        setTab(initialTab(data.article.phase));
      })
      .catch((e) =>
        toast.error(e instanceof Error ? e.message : "Não foi possível carregar o artigo"),
      )
      .finally(() => {
        if (active) setLoadingData(false);
      });
    return () => {
      active = false;
    };
  }, [articleId, user]);

  const approvedPages = useMemo(
    () =>
      pages.filter((p) => p.status === "approved").sort((a, b) => a.page_number - b.page_number),
    [pages],
  );
  const draftPage = useMemo(() => pages.find((p) => p.status === "draft") ?? null, [pages]);
  const nextNumber = useMemo(
    () => pages.reduce((max, p) => Math.max(max, p.page_number), 0) + 1,
    [pages],
  );

  const currentPage =
    draftPage ?? approvedPages.find((p) => p.page_number === selectedPage) ?? null;
  const currentNumber = draftPage?.page_number ?? selectedPage;
  const isVirtualNext = !draftPage && currentNumber === nextNumber;

  const phaseLabel: Record<string, string> = {
    interview: "Entrevista",
    plan: "Plano",
    writing: "Escrevendo",
    done: "Concluído",
  };

  const planApproved = article ? article.phase === "writing" || article.phase === "done" : false;

  async function saveTitle() {
    if (!article) return;
    const value = titleDraft.trim();
    setEditingTitle(false);
    if (!value || value === article.title) return;
    try {
      const res = await updateTitle({ data: { articleId, title: value } });
      setArticle({ ...article, title: res.title });
      toast.success("Título atualizado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar o título");
    }
  }

  if (loading || loadingData || !article) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="flex items-center gap-2 border-b p-3">
          <ArticlesMenu activeId={articleId} />
          <span className="font-serif text-lg font-semibold">ScienceChat</span>
        </header>
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Carregando artigo...
        </div>
      </div>
    );
  }

  const initialMessages = messages.map((m) => ({
    id: m.id,
    role: m.role as UIMessage["role"],
    parts: m.parts as UIMessage["parts"],
  })) as UIMessage[];

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex flex-wrap items-center gap-2 border-b bg-card px-3 py-2">
        <ArticlesMenu activeId={articleId} />
        {editingTitle ? (
          <Input
            autoFocus
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveTitle();
              if (e.key === "Escape") setEditingTitle(false);
            }}
            className="h-8 max-w-sm"
          />
        ) : (
          <button
            type="button"
            className="group flex min-w-0 items-center gap-1.5 text-left"
            onClick={() => {
              setTitleDraft(article.title);
              setEditingTitle(true);
            }}
            title="Editar título"
          >
            <span className="truncate font-serif text-lg font-semibold">{article.title}</span>
            <Pencil className="size-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
          </button>
        )}
        <Badge variant="outline" className="ml-auto">
          {phaseLabel[article.phase] ?? article.phase}
        </Badge>
      </header>

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as Tab)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="border-b px-3 pt-2">
          <TabsList className="h-auto flex-wrap">
            <TabsTrigger value="interview" className="gap-1.5">
              <MessageSquareText className="size-4" />
              Entrevista
            </TabsTrigger>
            <TabsTrigger value="plan" className="gap-1.5">
              <ListChecks className="size-4" />
              Plano
              {article.plan && <Check className="size-3.5 text-success" />}
            </TabsTrigger>
            <TabsTrigger value="production" className="gap-1.5">
              <FileText className="size-4" />
              Produção
            </TabsTrigger>
            <TabsTrigger value="document" className="gap-1.5">
              <FileText className="size-4" />
              Documento
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="interview" className="m-0 min-h-0 flex-1 data-[state=inactive]:hidden">
          <InterviewChat
            articleId={articleId}
            initialMessages={initialMessages}
            planApproved={planApproved}
            onActivity={() => void reload()}
            onRequestPlan={() => {
              setAutoBuild(true);
              setTab("plan");
            }}
          />
        </TabsContent>

        <TabsContent
          value="plan"
          className="m-0 min-h-0 flex-1 overflow-y-auto data-[state=inactive]:hidden"
        >
          <PlanPanel
            articleId={articleId}
            plan={article.plan}
            autoBuild={autoBuild}
            onChanged={() => {
              setAutoBuild(false);
              void reload();
            }}
            onApproved={() => {
              setAutoBuild(false);
              void reload();
              setSelectedPage(1);
              setTab("production");
            }}
          />
        </TabsContent>

        <TabsContent value="production" className="m-0 min-h-0 flex-1 data-[state=inactive]:hidden">
          <div className="grid h-full min-h-0 grid-cols-1 md:grid-cols-[220px_1fr]">
            <aside className="hidden min-h-0 flex-col border-r md:flex">
              <div className="border-b px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Páginas
              </div>
              <nav className="min-h-0 flex-1 overflow-y-auto p-2">
                {pages.length === 0 && (
                  <p className="px-2 py-4 text-xs text-muted-foreground">Nenhuma página ainda.</p>
                )}
                {[...pages]
                  .sort((a, b) => a.page_number - b.page_number)
                  .map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPage(p.page_number)}
                      className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm ${
                        currentNumber === p.page_number && !isVirtualNext
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-muted"
                      }`}
                    >
                      <span>Página {p.page_number}</span>
                      {p.status === "approved" ? (
                        <Check className="size-3.5 text-success" />
                      ) : (
                        <span className="size-2 rounded-full bg-primary" />
                      )}
                    </button>
                  ))}
                <button
                  type="button"
                  onClick={() => setSelectedPage(nextNumber)}
                  className={`mt-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground ${
                    isVirtualNext ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                  }`}
                >
                  Próxima — {nextNumber}
                </button>
              </nav>
              <div className="border-t px-3 py-2 text-xs text-muted-foreground">
                {approvedPages.length} aprovada(s)
              </div>
            </aside>

            <div className="min-h-0 overflow-y-auto p-4">
              <PagePanel
                articleId={articleId}
                page={currentPage}
                pageNumber={currentNumber}
                isVirtualNext={isVirtualNext}
                onChanged={() => void reload()}
                onApproved={(n) => setSelectedPage(n + 1)}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent
          value="document"
          className="m-0 min-h-0 flex-1 overflow-y-auto data-[state=inactive]:hidden"
        >
          <DocumentPanel title={article.title} pages={pages} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
