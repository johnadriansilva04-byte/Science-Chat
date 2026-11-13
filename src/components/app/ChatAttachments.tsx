import { useRef, useState } from "react";
import { FileText, Loader2, Paperclip, Sparkles, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { deleteDocument, uploadDocument, type WorkspaceDocument } from "@/lib/article.functions";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.includes(",") ? result.slice(result.indexOf(",") + 1) : result);
    };
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo"));
    reader.readAsDataURL(file);
  });
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Anexos DENTRO do chat: só um clipe discreto no rodapé. Ao clicar, abre uma
 * gaveta lateral (estilo NotebookLM) com o dossiê — enviar, ver e pedir ao
 * Pracinha que use um anexo no artigo (ele decide onde encaixa).
 */
export function ChatAttachments({
  articleId,
  documents,
  onChanged,
  onUse,
  disabled,
}: {
  articleId: string;
  documents: WorkspaceDocument[];
  onChanged: () => void;
  onUse: (doc: WorkspaceDocument) => void;
  disabled?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  async function upload(files: FileList | null) {
    if (!files || !files.length) return;
    setBusy(true);
    let ok = 0;
    try {
      for (const file of Array.from(files)) {
        const base64 = await fileToBase64(file);
        await uploadDocument({
          data: {
            articleId,
            filename: file.name,
            mime: file.type || "application/octet-stream",
            base64,
            ...(note.trim() ? { note: note.trim() } : {}),
          },
        });
        ok += 1;
      }
      setNote("");
      toast.success(ok === 1 ? "Anexo enviado" : `${ok} anexos enviados`);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível enviar o anexo");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function remove(id: string, seq: number) {
    try {
      await deleteDocument({ data: { articleId, documentId: id } });
      toast.success(`Anexo ${seq} removido`);
      onChanged();
    } catch {
      toast.error("Não foi possível remover");
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="relative size-8"
          disabled={disabled}
          title="Anexos e provas"
          aria-label="Anexos e provas"
        >
          <Paperclip className="size-4" />
          {documents.length > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
              {documents.length}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-[min(92vw,420px)] flex-col gap-0 p-0">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="flex items-center gap-1.5 font-serif text-base">
            <Paperclip className="size-4" />
            Anexos e provas
          </SheetTitle>
          <SheetDescription className="text-xs">
            Solte aqui PDFs, planilhas, fotos ou códigos. Cada anexo recebe um número (Anexo 1, 2,
            …) e fica disponível para a IA citar e posicionar no artigo.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-2 border-b px-4 py-3">
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Observação opcional (ex.: prova do resultado)"
            className="h-8 text-xs"
          />
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => void upload(e.target.files)}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void upload(e.dataTransfer.files);
            }}
            className="flex flex-col items-center gap-1.5 rounded-lg border border-dashed px-4 py-5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:bg-accent/40 disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <UploadCloud className="size-5" />
            )}
            <span className="font-medium text-foreground">
              {busy ? "Enviando…" : "Enviar ou arrastar arquivos"}
            </span>
            <span>PDF, DOCX, CSV, XLSX, imagens, código — até 8 MB cada</span>
          </button>
        </div>

        <div className="dock-scroll min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {documents.length === 0 ? (
            <p className="rounded-md border border-dashed px-3 py-8 text-center text-xs text-muted-foreground">
              Nenhum anexo ainda. Adicione provas e eu relaciono cada uma às suas afirmações.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {documents.map((d) => (
                <li key={d.id} className="rounded-lg border bg-card p-2.5">
                  <div className="flex items-start gap-2">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {d.seq}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{d.filename}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {formatSize(d.size)}
                        {d.hasText ? " · texto lido" : " · sem texto legível"}
                        {d.note ? ` · ${d.note}` : ""}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-6"
                      aria-label={`Remover Anexo ${d.seq}`}
                      onClick={() => void remove(d.id, d.seq)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-7 flex-1 gap-1.5 text-[11px]"
                      onClick={() => {
                        onUse(d);
                        setOpen(false);
                      }}
                    >
                      <Sparkles className="size-3.5" />
                      Usar no artigo
                    </Button>
                    <FileText className="size-3.5 text-muted-foreground" />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
