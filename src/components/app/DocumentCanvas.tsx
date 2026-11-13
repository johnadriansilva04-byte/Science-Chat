import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Check,
  Download,
  FileDown,
  Landmark,
  ListChecks,
  Link2,
  Minus,
  PanelRight,
  Paperclip,
  Pencil,
  Plus,
  Printer,
  Save,
  ScanSearch,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { A4Measure, A4Sheet } from "@/components/app/A4Sheet";
import { BookReader } from "@/components/app/BookReader";
import { DocumentsPanel } from "@/components/app/DocumentsPanel";
import { PagePanel } from "@/components/app/PagePanel";
import { PlanPanel } from "@/components/app/PlanPanel";
import { TraceabilityPanel } from "@/components/app/TraceabilityPanel";
import { AuditPanel } from "@/components/app/AuditPanel";
import { EditorialPanel } from "@/components/app/EditorialPanel";
import { ExportDialog } from "@/components/app/ExportDialog";
import { documentSections, parseBlocks, serializeBlocks, type Block } from "@/lib/article-blocks";
import { useA4Pagination } from "@/lib/a4";
import { stripMarkers } from "@/lib/article-marker";
import { ARTICLE_SIGNATURE, startsWithTitleHeading } from "@/lib/article-export";
import { countWords, MIN_PAGE_WORDS } from "@/lib/article-page";
import { groupNotesBySection, interviewNotes, type InterviewNote } from "@/lib/interview-notes";
import {
  savePage,
  updateTitle,
  type WorkspacePage,
  type WorkspaceDocument,
} from "@/lib/article.functions";

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
    text: "_Documento em construção ao vivo — organizado por seção conforme o Pracinha entende suas respostas. Ainda não é o texto final: a redação página por página começa após você aprovar o plano._",
  });

  // Seções do plano (se houver) ou a estrutura científica padrão.
  const planSections = plan
    ? plan
        .split("\n")
        .map((l) => l.match(/^[-*]\s+(?:\*\*)?([^*—:-]+)/)?.[1]?.trim())
        .filter((s): s is string => Boolean(s) && s!.length < 60)
    : [];
  const template = planSections.length >= 3 ? planSections : PRELIMINARY_SECTIONS;

  const grouped = groupNotesBySection(notes);
  const bySection = new Map(grouped.map((g) => [g.section, g.notes]));

  // Mostra primeiro as seções já alimentadas, depois o restante da estrutura.
  const ordered = [...grouped.map((g) => g.section), ...template.filter((s) => !bySection.has(s))];

  for (const section of ordered) {
    blocks.push({ type: "heading", level: 2, text: section });
    const sectionNotes = bySection.get(section);
    if (sectionNotes?.length) {
      for (const note of sectionNotes) {
        blocks.push({ type: "paragraph", text: note.answer });
      }
    } else {
      blocks.push({ type: "paragraph", text: "[A preencher durante a entrevista.]" });
    }
  }
  return blocks;
}

export function DocumentCanvas({
  articleId,
  title,
  plan,
  pages,
  documents,
  messages,
  liveWriting = false,
  phase,
  currentPage,
  currentNumber,
  isVirtualNext,
  autoBuild,
  panelOpen,
  onPanelOpenChange,
  onPagesChanged,
  onPlanChanged,
  onPlanApproved,
  onPageApproved,
}: {
  articleId: string;
  title: string;
  plan: string | null;
  pages: WorkspacePage[];
  documents: WorkspaceDocument[];
  messages: { role: string; parts: { type: string; text?: string }[] }[];
  liveWriting?: boolean;
  phase: string;
  currentPage: WorkspacePage | null;
  currentNumber: number;
  isVirtualNext: boolean;
  autoBuild: boolean;
  panelOpen: boolean;
  onPanelOpenChange: (open: boolean) => void;
  onPagesChanged: () => void;
  onPlanChanged: () => void;
  onPlanApproved: () => void;
  onPageApproved: (pageNumber: number) => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [editing, setEditing] = useState(false);
  const [reading, setReading] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [celebrateFirst, setCelebrateFirst] = useState(false);
  const [panelTab, setPanelTab] = useState<
    "plan" | "pages" | "docs" | "trace" | "audit" | "editorial"
  >(phase === "interview" ? "plan" : "pages");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [highlight, setHighlight] = useState<string | null>(null);
  const [activeSheet, setActiveSheet] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const sheetRefs = useRef<Record<number, HTMLElement | null>>({});

  // Abre o painel contextual quando o pesquisador pede o plano (ou já está escrevendo),
  // mantendo plano e produção fora do chat.
  useEffect(() => {
    if (autoBuild) {
      setPanelTab("plan");
      onPanelOpenChange(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoBuild]);

  useEffect(() => {
    if (phase === "writing" || phase === "done") setPanelTab("pages");
  }, [phase]);

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
  // Sumário sem ruído: remove o título do artigo (já está no topo) e headings
  // repetidos consecutivos (a IA às vezes repete o nome da seção em cada folha).
  const outline = useMemo(() => {
    const titleKey = title.trim().toLowerCase();
    const seen = new Set<string>();
    const out: typeof sections = [];
    for (const s of sections) {
      const key = s.title.trim().toLowerCase();
      if (key === titleKey || seen.has(key)) continue;
      seen.add(key);
      out.push(s);
    }
    return out;
  }, [sections, title]);

  // Seção "atual" conforme a folha visível, para o sumário acompanhar a rolagem.
  const activeSection = useMemo(() => {
    const visible = outline.filter((s) => s.page - 1 <= activeSheet);
    const last = visible[visible.length - 1];
    return last ? last.title : null;
  }, [outline, activeSheet]);

  const wordTotal = useMemo(
    () => pages.reduce((sum, p) => sum + countWords(stripMarkers(p.content)), 0),
    [pages],
  );
  const shortPages = useMemo(
    () => pages.filter((p) => countWords(stripMarkers(p.content)) < MIN_PAGE_WORDS),
    [pages],
  );

  // Progresso honesto: páginas aprovadas sobre o total já conhecido (aprovadas +
  // em revisão + a próxima a escrever). Cresce a cada aprovação, sem prometer um
  // total que ainda não existe.
  const progressPct = useMemo(() => {
    const approved = approvedPages.length;
    const inReview = pages.length - approved;
    const total = approved + inReview + (inReview === 0 ? 1 : 0);
    if (total === 0) return 0;
    return Math.round((approved / total) * 100);
  }, [approvedPages.length, pages.length]);

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

  const handlePageApproved = useCallback(
    (pageNumber: number) => {
      if (pageNumber === 1) {
        setCelebrateFirst(true);
        window.setTimeout(() => setCelebrateFirst(false), 2800);
      }
      onPageApproved(pageNumber);
    },
    [onPageApproved],
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

  // Mantém a folha em foco no rail conforme o usuário rola o documento.
  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const onScroll = () => {
      const mid = root.scrollTop + root.clientHeight / 3;
      let best = 0;
      for (const [i, el] of Object.entries(sheetRefs.current)) {
        if (el && el.offsetTop <= mid) best = Number(i);
      }
      setActiveSheet(best);
    };
    root.addEventListener("scroll", onScroll, { passive: true });
    return () => root.removeEventListener("scroll", onScroll);
  }, []);

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
        {liveWriting && (
          <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-primary">
            <span className="a4-live-dot" />
            Pracinha está preenchendo ao vivo
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
            onClick={() => setExportOpen(true)}
          >
            <Download className="size-3.5" />
            Exportar
          </Button>
          <Button
            size="sm"
            variant={panelOpen ? "secondary" : "outline"}
            className={`h-7 gap-1 text-xs ${
              !panelOpen && !isPreliminary && pages.some((p) => p.status === "draft")
                ? "attention-pulse border-primary text-primary"
                : ""
            }`}
            onClick={() => {
              setPanelTab(isPreliminary ? "plan" : "pages");
              onPanelOpenChange(!panelOpen);
            }}
            title={
              isPreliminary
                ? "Plano de produção"
                : pages.some((p) => p.status === "draft")
                  ? "Há uma página aguardando a sua revisão"
                  : "Produção página por página"
            }
          >
            <PanelRight className="size-3.5" />
            {isPreliminary
              ? "Plano"
              : pages.some((p) => p.status === "draft")
                ? "Revisar página"
                : "Produção"}
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

      {!isPreliminary && (
        <div className="flex items-center gap-3 border-b bg-card px-3 py-1 text-[11px] text-muted-foreground">
          <span className="tabular-nums">
            {approvedPages.length} aprovada(s)
            {pages.length > approvedPages.length
              ? ` · ${pages.length - approvedPages.length} em revisão`
              : ""}
          </span>
          <div
            className="production-strip h-1.5 flex-1 rounded-full"
            style={{ "--p": `${progressPct}%` } as React.CSSProperties}
          />
          <span className="tabular-nums">{Math.round(progressPct)}%</span>
        </div>
      )}

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
        <nav className="dock-scroll hidden w-56 shrink-0 flex-col overflow-y-auto border-r bg-card px-2 py-2 lg:flex">
          <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Sumário
          </p>
          {outline.length === 0 && (
            <p className="px-2 py-1 text-xs text-muted-foreground">Sem seções ainda.</p>
          )}
          {outline.map((s, i) => {
            const isActive = highlight ? highlight === s.title : activeSection === s.title;
            return (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setHighlight(s.title);
                  setActiveSheet(s.page - 1);
                  scrollToSheet(s.page - 1);
                }}
                className={`group flex w-full items-baseline gap-2 rounded-md px-2 py-1 text-left text-sm transition-colors ${
                  isActive ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                }`}
                title={`${s.title} — folha ${s.page}`}
              >
                <span
                  className={`shrink-0 tabular-nums text-[11px] ${
                    isActive ? "text-primary" : "text-muted-foreground/70"
                  }`}
                >
                  {s.page}
                </span>
                <span
                  className={`min-w-0 flex-1 truncate ${
                    s.level === 1
                      ? "font-semibold"
                      : "text-muted-foreground group-hover:text-foreground"
                  }`}
                >
                  {s.title}
                </span>
              </button>
            );
          })}
        </nav>

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
                  blocks={sheet}
                  editing={editing && !isPreliminary}
                  live={liveWriting && i === sheets.length - 1}
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

        {panelOpen && (
          <aside className="dock-enter flex w-[min(92vw,440px)] shrink-0 flex-col border-l bg-card">
            <div className="dock-scroll flex items-center gap-1 overflow-x-auto border-b px-2 py-1.5">
              {(
                [
                  { id: "plan", icon: ListChecks, label: "Plano" },
                  { id: "pages", icon: FileDown, label: "Produção" },
                  { id: "docs", icon: Paperclip, label: "Anexos", badge: documents.length },
                  { id: "trace", icon: Link2, label: "Rastreabilidade" },
                  { id: "audit", icon: ScanSearch, label: "Auditoria" },
                  { id: "editorial", icon: Landmark, label: "Editorial" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPanelTab(tab.id)}
                  className={`flex shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    panelTab === tab.id
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <tab.icon className="size-3.5" />
                  {tab.label}
                  {"badge" in tab && tab.badge ? (
                    <span className="ml-0.5 rounded-full bg-primary/15 px-1 text-[10px] font-semibold text-primary">
                      {tab.badge}
                    </span>
                  ) : null}
                </button>
              ))}
              <Button
                size="icon"
                variant="ghost"
                className="ml-auto size-7 shrink-0"
                onClick={() => onPanelOpenChange(false)}
                aria-label="Fechar painel"
              >
                <X className="size-4" />
              </Button>
            </div>
            <div className="dock-scroll min-h-0 flex-1 overflow-y-auto">
              {panelTab === "plan" ? (
                <PlanPanel
                  articleId={articleId}
                  plan={plan}
                  currentTitle={title}
                  autoBuild={autoBuild}
                  onChanged={onPlanChanged}
                  onApproved={onPlanApproved}
                />
              ) : panelTab === "pages" ? (
                <PagePanel
                  articleId={articleId}
                  page={currentPage}
                  pageNumber={currentNumber}
                  isVirtualNext={isVirtualNext}
                  onChanged={onPagesChanged}
                  onApproved={handlePageApproved}
                />
              ) : panelTab === "docs" ? (
                <DocumentsPanel
                  articleId={articleId}
                  documents={documents}
                  onChanged={onPagesChanged}
                />
              ) : panelTab === "trace" ? (
                <div className="p-3">
                  <TraceabilityPanel articleId={articleId} documents={documents} />
                </div>
              ) : panelTab === "audit" ? (
                <div className="p-3">
                  <AuditPanel articleId={articleId} />
                </div>
              ) : (
                <div className="p-3">
                  <EditorialPanel articleId={articleId} />
                </div>
              )}
            </div>
          </aside>
        )}
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

      <ExportDialog articleId={articleId} open={exportOpen} onOpenChange={setExportOpen} />

      {celebrateFirst && (
        <div className="first-page-reveal" role="status" aria-live="polite">
          <div className="first-page-reveal__card">
            <span className="first-page-reveal__mark">
              <Check className="size-5" />
            </span>
            <p className="first-page-reveal__title">Primeira página selada.</p>
            <p className="first-page-reveal__sub">
              É oficial: você começou a escrever. A partir daqui é só somar — uma página aprovada
              por vez.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
