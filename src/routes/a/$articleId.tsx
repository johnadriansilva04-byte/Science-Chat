import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArticlesMenu } from "@/components/app/ArticlesMenu";
import { ChatDock } from "@/components/app/ChatDock";
import { DocumentCanvas } from "@/components/app/DocumentCanvas";
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
        content: "Documento A4 aberto com o chat científico integrado, página por página.",
      },
    ],
  }),
  component: ArticleWorkspace,
});

function ArticleWorkspace() {
  const { articleId } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [article, setArticle] = useState<WorkspaceArticle | null>(null);
  const [messages, setMessages] = useState<WorkspaceMessage[]>([]);
  const [liveMessages, setLiveMessages] = useState<UIMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [pages, setPages] = useState<WorkspacePage[]>([]);
  const [selectedPage, setSelectedPage] = useState<number>(1);
  const [autoBuild, setAutoBuild] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
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
    setLoadError(null);
    getWorkspace({ data: { articleId } })
      .then((data) => {
        if (!active) return;
        setArticle(data.article);
        setMessages(data.messages);
        setPages(data.pages);
      })
      .catch((e) => {
        if (!active) return;
        setLoadError(e instanceof Error ? e.message : "Não foi possível carregar o artigo");
      })
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

  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="flex items-center gap-2 border-b p-3">
          <ArticlesMenu activeId={articleId} />
          <span className="font-serif text-lg font-semibold">ScienceChat</span>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-sm text-muted-foreground">{loadError}</p>
          <Button variant="outline" onClick={() => navigate({ to: "/" })}>
            Voltar ao início
          </Button>
        </div>
      </div>
    );
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

  // Prefere as mensagens ao vivo (inclui o streaming em andamento) para o documento
  // refletir o que o pesquisador acabou de responder; cai nas persistidas ao recarregar.
  const canvasMessages =
    liveMessages.length >= initialMessages.length ? liveMessages : initialMessages;

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex flex-wrap items-center gap-2 border-b bg-card px-3 py-2 print:hidden">
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

      <main className="min-h-0 flex-1">
        <DocumentCanvas
          articleId={articleId}
          title={article.title}
          plan={article.plan}
          pages={pages}
          messages={canvasMessages}
          liveWriting={busy && pages.length === 0}
          phase={article.phase}
          currentPage={currentPage}
          currentNumber={currentNumber}
          isVirtualNext={isVirtualNext}
          autoBuild={autoBuild}
          panelOpen={panelOpen}
          onPanelOpenChange={setPanelOpen}
          onPagesChanged={() => void reload()}
          onPlanChanged={() => {
            setAutoBuild(false);
            void reload();
          }}
          onPlanApproved={() => {
            setAutoBuild(false);
            setSelectedPage(1);
            void reload();
          }}
          onPageApproved={(n) => setSelectedPage(n + 1)}
        />
      </main>

      <div className="print:hidden">
        <ChatDock
          articleId={articleId}
          initialMessages={initialMessages}
          phase={article.phase}
          shiftLeft={panelOpen}
          onActivity={() => void reload()}
          onLiveMessages={setLiveMessages}
          onBusyChange={setBusy}
          onRequestPlan={() => {
            setAutoBuild(true);
            setPanelOpen(true);
          }}
        />
      </div>
    </div>
  );
}
