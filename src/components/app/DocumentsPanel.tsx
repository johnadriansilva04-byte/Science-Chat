import { useRef, useState } from "react";
import { Download, FileText, Loader2, Paperclip, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  deleteDocument,
  getDocumentFile,
  uploadDocument,
  type WorkspaceDocument,
} from "@/lib/article.functions";
import { fileToBase64, formatSize, openBase64File } from "@/lib/file-upload";

/**
 * Dossiê de documentos primários. Cada anexo recebe um número estável ("Anexo N")
 * usado pela IA para citar e posicionar o material no artigo.
 */
export function DocumentsPanel({
  articleId,
  documents,
  onChanged,
}: {
  articleId: string;
  documents: WorkspaceDocument[];
  onChanged: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

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

  async function openFile(id: string) {
    try {
      const file = await getDocumentFile({ data: { articleId, documentId: id } });
      openBase64File(file.base64, file.filename, file.mime);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível abrir o arquivo");
    }
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      <div>
        <h3 className="flex items-center gap-1.5 font-serif text-sm font-semibold">
          <Paperclip className="size-4" />
          Documentos primários
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Anexe provas, fotos, planilhas, PDFs ou códigos. Cada anexo recebe um número (Anexo 1, 2,
          ...). Depois, peça no chat: “coloque o Anexo 3 após o 3º parágrafo da página 2” — a IA lê
          e posiciona.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Observação opcional (ex.: prova do erro no nome)"
          className="h-8 text-xs"
        />
        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => void upload(e.target.files)}
        />
        <Button
          size="sm"
          className="gap-1.5"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
          Anexar documento
        </Button>
      </div>

      {documents.length === 0 ? (
        <p className="rounded-md border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
          Nenhum documento anexado ainda.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {documents.map((d) => (
            <li
              key={d.id}
              className="flex items-center gap-2 rounded-md border bg-card px-2 py-1.5 text-xs"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                {d.seq}
              </span>
              <FileText className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{d.filename}</span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {formatSize(d.size)}
                  {d.hasText ? " · texto lido" : " · sem texto legível"}
                  {d.note ? ` · ${d.note}` : ""}
                </span>
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="size-6"
                aria-label={`Abrir original do Anexo ${d.seq}`}
                title="Abrir original"
                onClick={() => void openFile(d.id)}
              >
                <Download className="size-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-6"
                aria-label={`Remover Anexo ${d.seq}`}
                onClick={() => void remove(d.id, d.seq)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
