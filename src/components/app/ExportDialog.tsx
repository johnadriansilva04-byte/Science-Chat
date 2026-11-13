import { useState } from "react";
import {
  Download,
  FileCode2,
  FileDown,
  FileText,
  FileType2,
  Loader2,
  Paperclip,
  Printer,
  Table2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { downloadBase64File, downloadBytes } from "@/lib/file-upload";
import { buildDossier, buildExport } from "@/lib/export.functions";
import { slugify } from "@/lib/article-export";

/**
 * Exportação do artigo e dos produtos separados (dossiê e matriz). Reúne as
 * páginas APROVADAS — a exportação nunca reescreve o texto com IA.
 */
export function ExportDialog({
  articleId,
  open,
  onOpenChange,
  author,
}: {
  articleId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  author?: string;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  async function withBundle(
    action: (bundle: Awaited<ReturnType<typeof buildExport>>) => void,
    key: string,
    ok: string,
  ) {
    setBusy(key);
    try {
      const bundle = await buildExport({
        data: { articleId, ...(author ? { author } : {}) },
      });
      action(bundle);
      toast.success(ok);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível exportar");
    } finally {
      setBusy(null);
    }
  }

  async function exportDossier(format: "md" | "txt") {
    setBusy("dossier");
    try {
      const res = await buildDossier({ data: { articleId } });
      const filename = `dossie-${slugify("dossie")}.${format}`;
      downloadBytes(
        new TextEncoder().encode(format === "md" ? res.markdown : res.plainText),
        filename,
        format === "md" ? "text/markdown;charset=utf-8" : "text/plain;charset=utf-8",
      );
      toast.success("Dossiê exportado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível exportar o dossiê");
    } finally {
      setBusy(null);
    }
  }

  const rows: {
    key: string;
    icon: React.ReactNode;
    title: string;
    detail: string;
    run: () => void;
  }[] = [
    {
      key: "docx",
      icon: <FileText className="size-4" />,
      title: "Word (.docx)",
      detail: "Documento OOXML com estilos, tabelas e a assinatura.",
      run: () =>
        withBundle(
          (b) =>
            downloadBase64File(
              b.docxBase64,
              `${slugify(b.title)}.docx`,
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ),
          "docx",
          "DOCX exportado",
        ),
    },
    {
      key: "latex",
      icon: <FileCode2 className="size-4" />,
      title: "LaTeX (.tex)",
      detail: "Documento pronto para compilar em artigo A4.",
      run: () =>
        withBundle(
          (b) =>
            downloadBytes(
              new TextEncoder().encode(b.latex),
              `${slugify(b.title)}.tex`,
              "application/x-tex",
            ),
          "latex",
          "LaTeX exportado",
        ),
    },
    {
      key: "html",
      icon: <FileType2 className="size-4" />,
      title: "HTML",
      detail: "Página autocontida, pronta para imprimir ou publicar.",
      run: () =>
        withBundle(
          (b) =>
            downloadBytes(
              new TextEncoder().encode(b.html),
              `${slugify(b.title)}.html`,
              "text/html;charset=utf-8",
            ),
          "html",
          "HTML exportado",
        ),
    },
    {
      key: "md",
      icon: <FileDown className="size-4" />,
      title: "Markdown (.md)",
      detail: "Documento mestre em Markdown.",
      run: () =>
        withBundle(
          (b) =>
            downloadBytes(
              new TextEncoder().encode(b.markdown),
              `${slugify(b.title)}.md`,
              "text/markdown;charset=utf-8",
            ),
          "md",
          "Markdown exportado",
        ),
    },
    {
      key: "txt",
      icon: <FileDown className="size-4" />,
      title: "Texto (.txt)",
      detail: "Somente o texto, sem marcação.",
      run: () =>
        withBundle(
          (b) =>
            downloadBytes(
              new TextEncoder().encode(b.plainText),
              `${slugify(b.title)}.txt`,
              "text/plain;charset=utf-8",
            ),
          "txt",
          "Texto exportado",
        ),
    },
    {
      key: "dossier",
      icon: <Paperclip className="size-4" />,
      title: "Dossiê documental (.md)",
      detail: "Documentos e matriz de rastreabilidade, como produto separado.",
      run: () => exportDossier("md"),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif">Exportar</DialogTitle>
          <DialogDescription>
            A exportação reúne as páginas aprovadas na ordem correta. O texto não é reescrito.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          {rows.map((row) => (
            <button
              key={row.key}
              type="button"
              onClick={row.run}
              disabled={busy !== null}
              className="flex items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted disabled:opacity-60"
            >
              <span className="mt-0.5 text-primary">
                {busy === row.key ? <Loader2 className="size-4 animate-spin" /> : row.icon}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{row.title}</span>
                <span className="block text-xs text-muted-foreground">{row.detail}</span>
              </span>
              <Download className="ml-auto size-4 shrink-0 text-muted-foreground" />
            </button>
          ))}
          <Button variant="outline" className="gap-1.5" onClick={() => window.print()}>
            <Printer className="size-4" />
            Imprimir / salvar PDF
          </Button>
        </div>
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Table2 className="size-3" />A matriz de rastreabilidade também acompanha o dossiê
          exportado.
        </p>
      </DialogContent>
    </Dialog>
  );
}
