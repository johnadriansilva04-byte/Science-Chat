import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { EllipsisVertical, FilePlus2, LogOut, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  createArticle as createArticleFn,
  deleteArticle,
  listArticles,
} from "@/lib/article.functions";
import { signOut } from "@/lib/auth.functions";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/assets/sciencechat-logo.png";

type Row = { id: string; title: string; phase: string; updated_at: string };
const PHASE: Record<string, string> = {
  interview: "Entrevista",
  plan: "Plano",
  writing: "Escrevendo",
  done: "Concluído",
};

/**
 * Cria um artigo e abre o chat.
 *
 * `title` existe porque a semente do chat nem sempre serve como título: quando a
 * pergunta vem do onboarding, a semente é a pergunta MAIS a instrução de
 * resposta ("… Me explique de forma clara e prática…"), e o menu de artigos
 * ficava com esse texto inteiro. A semente continua sendo o que o Pracinha
 * recebe; o título é só a pergunta.
 */
export async function createArticle(
  navigate: ReturnType<typeof useNavigate>,
  seed?: string,
  title?: string,
) {
  try {
    const clean = seed?.trim();
    // A inquietação digitada na home vira o título inicial do artigo (o
    // pesquisador pode renomear depois). Sem isto, todo artigo nascia como
    // "Novo artigo" mesmo quando ele já tinha escrito o tema.
    const cleanTitle = (title ?? seed)?.trim();
    const { id } = await createArticleFn({
      data: cleanTitle ? { title: cleanTitle } : {},
    });
    navigate({
      to: "/a/$articleId",
      params: { articleId: id },
      search: clean ? { seed: clean } : {},
    });
  } catch {
    toast.error("Não foi possível criar o artigo");
  }
}

export function ArticlesMenu({ activeId }: { activeId?: string }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const navigate = useNavigate();
  // O menu aparece também para quem não tem conta (a home é pública): aí ele é
  // a porta de entrada, não a lista de artigos.
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!open || !user) return;
    listArticles()
      .then((data) => setRows(data))
      .catch(() => setRows([]));
  }, [open, user]);

  async function remove(id: string) {
    if (!confirm("Excluir este artigo e todo o seu conteúdo?")) return;
    try {
      await deleteArticle({ data: { articleId: id } });
      setRows((r) => r.filter((x) => x.id !== id));
      if (id === activeId) navigate({ to: "/" });
    } catch {
      toast.error("Não foi possível excluir");
    }
  }

  async function logout() {
    await signOut();
    navigate({ to: "/auth" });
  }

  if (!loading && !user) {
    return (
      <Button
        asChild
        variant="ghost"
        className="min-h-11 gap-1.5 rounded-full px-3 text-sm font-medium"
      >
        <Link to="/auth">Entrar</Link>
      </Button>
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Meus artigos">
          <EllipsisVertical />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-80 flex-col bg-sidebar p-0">
        <SheetHeader className="border-b p-4">
          <SheetTitle className="flex items-center gap-2 font-serif text-xl">
            <img src={logo} alt="" width={28} height={28} />
            Meus artigos
          </SheetTitle>
        </SheetHeader>
        <div className="p-3">
          <Button
            className="w-full"
            onClick={() => {
              setOpen(false);
              createArticle(navigate);
            }}
          >
            <FilePlus2 />
            Novo artigo
          </Button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {rows.length === 0 && (
            <p className="px-2 py-4 text-sm text-muted-foreground">Nenhum artigo ainda.</p>
          )}
          {rows.map((r) => (
            <div
              key={r.id}
              className={`group flex items-center rounded-md ${r.id === activeId ? "bg-sidebar-accent" : "hover:bg-sidebar-accent"}`}
            >
              <Link
                to="/a/$articleId"
                params={{ articleId: r.id }}
                onClick={() => setOpen(false)}
                className="min-w-0 flex-1 px-3 py-2"
              >
                <div className="truncate text-sm font-medium">{r.title}</div>
                <div className="text-xs text-muted-foreground">{PHASE[r.phase] ?? r.phase}</div>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="touch-visible opacity-0 group-hover:opacity-100"
                aria-label="Excluir"
                onClick={() => remove(r.id)}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </nav>
        <div className="border-t p-3">
          <Button variant="ghost" className="w-full justify-start" onClick={logout}>
            <LogOut />
            Sair
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
