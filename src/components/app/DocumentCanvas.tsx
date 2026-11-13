import { useCallback, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Check,
  Download,
  FileDown,
  Minus,
  Pencil,
  Plus,
  Printer,
  Save,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { A4Measure, A4Sheet } from "@/components/app/A4Sheet";
import { BookReader } from "@/components/app/BookReader";
import { documentSections, parseBlocks, serializeBlocks, type Block } from "@/lib/article-blocks";
import { useA4Pagination } from "@/lib/a4";
import { stripMarkers } from "@/lib/article-marker";
import {
  ARTICLE_SIGNATURE,
  assembleMarkdown,
  downloadFile,
  markdownToPlainText,
  slugify,
  startsWithTitleHeading,
} from "@/lib/article-export";
import { countWords, MIN_PAGE_WORDS } from "@/lib/article-page";
import { interviewNotes, type InterviewNote } from "@/lib/interview-notes";
import { savePage, updateTitle, type WorkspacePage } from "@/lib/article.functions";

/** Bloco do documento com a página (unidade de produção) que o originou. */
type DocBlock = { block: Block; dbPage: number; dbIndex: number };

type SaveState = "idle" | "saving" | "saved" | "error";

const PRELIMINARY_SECTIONS = [
  "Resumo",
  "Introdução",
  "Fundamentação teórica",
  "Metodologia",
  "Resultados",
  "Discussão",
  "Conclusão",
  "Referências",
];

function buildDocument(pages: WorkspacePage[], title: string): DocBlock[] {
  const sorted = [...pages].sort((a, b) => a.page_number - b.page_number);
  const out: DocBlock[] = [];
  const first = sorted[0];
  const needsTitle = !first || !startsWithTitleHeading(stripMarkers(first.content));
  if (needsTitle) {
    out.push({ block: { type: "heading", level: 1, text: title }, dbPage: 0, dbIndex: -1 });
  }
  for (const p of sorted) {
    const blocks = parseBlocks(stripMarkers(p.content));
    blocks.forEach((block, dbIndex) => out.push({ block, dbPage: p.page_number, dbIndex }));
  }
  return out;
}

/** Estrutura preliminar (durante a entrevista): título + seções do plano. */
function preliminaryDocument(title: string, plan: string | null, notes: InterviewNote[]): Block[] {
  const blocks: Block[] = [{ type: "heading", level: 1, text: title }];
  blocks.push({
    type: "paragraph",
    text: "_Estrutura preliminar — em construção ao vivo. Nada aqui é texto científico final: as seções são preenchidas conforme você responde à entrevista._",
  });
  if (notes.length) {
    blocks.push({ type: "heading", level: 2, text: "Informações coletadas na entrevista" });
    for (const note of notes) {
      blocks.push({ type: "paragraph", text: `**${note.question}**` });
      blocks.push({ type: "paragraph", text: note.answer });
    }
  }
  const sections = plan
    ? plan
        .split("\n")
        .map((l) => l.match(/^[-*]\s+(?:\*\*)?([^*—:-]+)/)?.[1]?.trim())
        .filter((s): s is string => Boolean(s) && s!.length < 60)
    : [];
  const list = sections.length >= 3 ? sections : PRELIMINARY_SECTIONS;
  for (const s of list) {
    blocks.push({ type: "heading", level: 2, text: s });
    blocks.push({ type: "paragraph", text: "[A preencher durante a produção.]" });
  }
  return blocks;
}

export function DocumentCanvas({
  articleId,
  title,
  plan,
  pages,
  messages,
  onPagesChanged,
}: {
  articleId: string;
  title: string;
  plan: string | null;
  pages: WorkspacePage[];
  messages: { role: string; parts: { type: string; text?: string }[] }[];
  onPagesChanged: () => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [editing, setEditing] = useState(false);
  const [reading, setReading] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [highlight, setHighlight] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const sheetRefs = useRef<Record<number, HTMLElement | null>>({});

  const isPreliminary = pages.length === 0;

  const approvedPages = useMemo(
    () =>
      pages.filter((p) => p.status === "approved").sort((a, b) => a.page_number - b.page_number),
    [pages],
  );

  const doc = useMemo(
    () => (isPreliminary ? [] : buildDocument(pages, title)),
    [isPreliminary, pages, title],
  );
  const flatBlocks = useMemo(() => doc.map((d) => d.block), [doc]);
  const notes = useMemo(() => interviewNotes(messages), [messages]);
  const prelimBlocks = useMemo(
    () => (isPreliminary ? preliminaryDocument(title, plan, notes) : []),
    [isPreliminary, title, plan, notes],
  );

  const revision = useMemo(
    () =>
      `${pages.map((p) => `${p.page_number}:${p.status}:${p.content.length}`).join("|")}|${title}|${notes.length}`,
    [pages, title, notes.length],
  );

  const measureBlocks = isPreliminary ? prelimBlocks : flatBlocks;
  const { pages: sheets, overflowing, measureRef } = useA4Pagination(measureBlocks, revision);
  const sections = useMemo(() => documentSections(sheets), [sheets]);

  const wordTotal = useMemo(
    () => pages.reduce((sum, p) => sum + countWords(stripMarkers(p.content)), 0),
    [pages],
  );
  const shortPages = useMemo(
    () => pages.filter((p) => countWords(stripMarkers(p.content)) < MIN_PAGE_WORDS),
    [pages],
  );

  const persist = useCallback(
    async (pageNumber: number, blocks: Block[]) => {
      setSaveState("saving");
      try {
        await savePage({ data: { articleId, pageNumber, content: serializeBlocks(blocks) } });
        setSaveState("saved");
        onPagesChanged();
        window.setTimeout(() => setSaveState("idle"), 1500);
      } catch (e) {
        setSaveState("error");
        toast.error(e instanceof Error ? e.message : "Não foi possível salvar");
      }
    },
    [articleId, onPagesChanged],
  );

  const changeBlock = useCallback(
    (globalIndex: number, block: Block) => {
      const target = doc[globalIndex];
      if (!target) return;
      if (target.dbPage === 0) {
        void (async () => {
          setSaveState("saving");
          try {
            await updateTitle({
              data: { articleId, title: block.type === "heading" ? block.text : title },
            });
            setSaveState("saved");
            onPagesChanged();
            window.setTimeout(() => setSaveState("idle"), 1500);
          } catch {
            setSaveState("error");
          }
        })();
        return;
      }
      const pageBlocks = doc.filter((d) => d.dbPage === target.dbPage);
      const next = pageBlocks.map((d) => d.block);
      next[target.dbIndex] = block;
      void persist(target.dbPage, next);
    },
    [doc, articleId, title, onPagesChanged, persist],
  );

  const deleteBlock = useCallback(
    (globalIndex: number) => {
      const target = doc[globalIndex];
      if (!target || target.dbPage === 0) return;
      const pageBlocks = doc.filter((d) => d.dbPage === target.dbPage).map((d) => d.block);
      pageBlocks.splice(target.dbIndex, 1);
      if (!pageBlocks.length) {
        toast.error("Não é possível esvaziar a página inteira. Use os controles de produção.");
        return;
      }
      void persist(target.dbPage, pageBlocks);
    },
    [doc, persist],
  );

  function scrollToSheet(index: number) {
    sheetRefs.current[index]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const masterMarkdown = useMemo(
    () => assembleMarkdown(title, approvedPages),
    [title, approvedPages],
  );
  const filename = slugify(title);

  const saveLabel: Record<SaveState, string> = {
    idle: "",
    saving: "Salvando...",
    saved: "Salvo",
    error: "Erro ao salvar",
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-muted/40">
      <div className="flex flex-wrap items-center gap-2 border-b bg-card px-3 py-1.5 text-xs">
        <span className="font-medium text-muted-foreground">
          {sheets.length} {sheets.length === 1 ? "folha A4" : "folhas A4"}
        </span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">{wordTotal} palavras</span>
        {isPreliminary && (
          <span className="rounded-full bg-accent px-2 py-0.5 text-accent-foreground">
            Estrutura preliminar
          </span>
        )}
        {saveLabel[saveState] && (
          <span className="flex items-center gap-1 text-muted-foreground">
            <Save className="size-3" />
            {saveLabel[saveState]}
          </span>
        )}

        <div className="ml-auto flex items-center gap-1">
          <Button
            size="sm"
            variant={editing ? "secondary" : "outline"}
            className="h-7 gap-1 text-xs"
            onClick={() => setEditing((v) => !v)}
            disabled={isPreliminary}
          >
            {editing ? <Check className="size-3.5" /> : <Pencil className="size-3.5" />}
            {editing ? "Concluir edição" : "Editar no papel"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-xs"
            onClick={() => window.print()}
          >
            <Printer className="size-3.5" />
            PDF
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-xs"
            disabled={approvedPages.length === 0}
            onClick={() => setReading(true)}
          >
            <BookOpen className="size-3.5" />
            Livro
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-xs"
            disabled={approvedPages.length === 0}
            onClick={() =>
              downloadFile(`${filename}.md`, masterMarkdown, "text/markdown;charset=utf-8")
            }
          >
            <Download className="size-3.5" />
            .md
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-xs"
            disabled={approvedPages.length === 0}
            onClick={() => downloadFile(`${filename}.txt`, markdownToPlainText(masterMarkdown))}
          >
            <FileDown className="size-3.5" />
            .txt
          </Button>
          <div className="flex items-center gap-0.5 rounded-md border">
            <Button
              size="icon"
              variant="ghost"
              className="size-6"
              onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))}
              aria-label="Diminuir zoom"
            >
              <Minus className="size-3.5" />
            </Button>
            <span className="w-9 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
            <Button
              size="icon"
              variant="ghost"
              className="size-6"
              onClick={() => setZoom((z) => Math.min(2, +(z + 0.1).toFixed(2)))}
              aria-label="Aumentar zoom"
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {shortPages.length > 0 && !isPreliminary && (
        <p className="border-b bg-amber-50 px-3 py-1 text-xs text-amber-800">
          {shortPages.length} página(s) com menos de {MIN_PAGE_WORDS} palavras — podem estar
          incompletas. Use "Refazer" na produção para gerar uma página A4 completa.
        </p>
      )}
      {overflowing && (
        <p className="border-b bg-amber-50 px-3 py-1 text-xs text-amber-800">
          Um trecho é maior que uma folha A4 e pode transbordar. Divida-o em parágrafos menores.
        </p>
      )}

      <div className="flex min-h-0 flex-1">
        {sections.length > 0 && (
          <nav className="hidden w-56 shrink-0 overflow-y-auto border-r bg-card p-2 lg:block">
            <p className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Seções
            </p>
            {sections.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setHighlight(s.title);
                  scrollToSheet(s.page - 1);
                }}
                className={`block w-full truncate rounded-md px-2 py-1 text-left text-sm hover:bg-muted ${
                  s.level === 1 ? "font-semibold" : "pl-4"
                }`}
                title={s.title}
              >
                {s.title}
              </button>
            ))}
          </nav>
        )}

        <div ref={scroller} className="min-h-0 flex-1 overflow-auto p-4 md:p-8">
          <div
            className="mx-auto flex w-fit flex-col items-center gap-6"
            style={{ zoom: editing ? 1 : zoom }}
          >
            {sheets.map((sheet, i) => (
              <div
                key={i}
                ref={(el) => {
                  sheetRefs.current[i] = el;
                }}
              >
                <A4Sheet
                  pageNumber={i + 1}
                  blocks={isPreliminary ? sheet : sheet}
                  editing={editing && !isPreliminary}
                  sectionHighlight={highlight}
                  onChangeBlock={changeBlock}
                  onDeleteBlock={deleteBlock}
                />
              </div>
            ))}
            <p className="variant-signature w-full max-w-[210mm]">{ARTICLE_SIGNATURE}</p>
          </div>
          <A4Measure blocks={measureBlocks} measureRef={measureRef} />
        </div>
      </div>

      {editing && (
        <div className="flex items-center gap-2 border-t bg-accent/60 px-3 py-1.5 text-xs text-accent-foreground">
          <X className="size-3.5" />
          Modo de edição: clique em qualquer trecho da folha para reescrever. As alterações são
          salvas automaticamente no documento mestre.
        </div>
      )}

      {reading && (
        <BookReader title={title} pages={approvedPages} onClose={() => setReading(false)} />
      )}
    </div>
  );
}
