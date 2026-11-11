import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { EllipsisVertical, FilePlus2, LogOut, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import logo from "@/assets/sciencechat-logo.png";

type Row = { id: string; title: string; phase: string; updated_at: string };
const PHASE: Record<string, string> = { interview: "Entrevista", plan: "Plano", writing: "Escrevendo", done: "Concluído" };

export async function createArticle(navigate: ReturnType<typeof useNavigate>) {
  const { data, error } = await supabase.from("articles").insert({}).select("id").single();
  if (error || !data) return toast.error("Não foi possível criar o artigo");
  navigate({ to: "/a/$articleId", params: { articleId: data.id } });
}

export function ArticlesMenu({ activeId }: { activeId?: string }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    supabase.from("articles").select("id,title,phase,updated_at").order("updated_at", { ascending: false }).then(({ data }) => setRows(data ?? []));
  }, [open]);

  async function remove(id: string) {
    if (!confirm("Excluir este artigo e todo o seu conteúdo?")) return;
    const { error } = await supabase.from("articles").delete().eq("id", id);
    if (error) return toast.error("Não foi possível excluir");
    setRows((r) => r.filter((x) => x.id !== id));
    if (id === activeId) navigate({ to: "/" });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Meus artigos"><EllipsisVertical /></Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-80 flex-col bg-sidebar p-0">
        <SheetHeader className="border-b p-4">
          <SheetTitle className="flex items-center gap-2 font-serif text-xl"><img src={logo} alt="" width={28} height={28} />Meus artigos</SheetTitle>
        </SheetHeader>
        <div className="p-3">
          <Button className="w-full" onClick={() => { setOpen(false); createArticle(navigate); }}><FilePlus2 />Novo artigo</Button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {rows.length === 0 && <p className="px-2 py-4 text-sm text-muted-foreground">Nenhum artigo ainda.</p>}
          {rows.map((r) => (
            <div key={r.id} className={`group flex items-center rounded-md ${r.id === activeId ? "bg-sidebar-accent" : "hover:bg-sidebar-accent"}`}>
              <Link to="/a/$articleId" params={{ articleId: r.id }} onClick={() => setOpen(false)} className="min-w-0 flex-1 px-3 py-2">
                <div className="truncate text-sm font-medium">{r.title}</div>
                <div className="text-xs text-muted-foreground">{PHASE[r.phase] ?? r.phase}</div>
              </Link>
              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100" aria-label="Excluir" onClick={() => remove(r.id)}><Trash2 /></Button>
            </div>
          ))}
        </nav>
        <div className="border-t p-3">
          <Button variant="ghost" className="w-full justify-start" onClick={() => supabase.auth.signOut().then(() => navigate({ to: "/auth" }))}><LogOut />Sair</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
