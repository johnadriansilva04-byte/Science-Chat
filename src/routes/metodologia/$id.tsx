import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronDown,
  Eye,
  FlaskConical,
  Link2,
  Loader2,
  NotebookPen,
  Paperclip,
  PenLine,
  Save,
  ScanLine,
  Sparkles,
  Trash2,
  Unlink,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageResponse } from "@/components/ai-elements/message";
import { AppHeader } from "@/components/app/AppHeader";
import { useAuth } from "@/hooks/useAuth";
import { listArticles } from "@/lib/article.functions";
import { useIsMobile } from "@/hooks/use-mobile";
import { fileToBase64, formatSize } from "@/lib/file-upload";
import {
  cleanMethodologyReply,
  METHODOLOGY_SPEC_SECTIONS,
  methodologyProtocolCode,
  splitMethodReply,
  specSectionCoverage,
} from "@/lib/methodology";
import {
  approveMethodologySpec,
  deleteMethodologyDocument,
  generateMethodologySpec,
  getMethodologyWorkspace,
  importMethodologyFromArticle,
  linkMethodologyToArticle,
  saveMethodologySpec,
  sendMethodologyMessage,
  uploadMethodologyDocument,
  type MethodologyDocumentView,
  type MethodologyMessageView,
} from "@/lib/methodology.functions";

export const Route = createFileRoute("/metodologia/$id")({
  validateSearch: (search: Record<string, unknown>): { seed?: string | undefined } => ({
    seed: typeof search["seed"] === "string" ? (search["seed"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Caderno de método — ScienceChat" },
      {
        name: "description",
        content:
          "Entrevista de método, spec de metodologia e acoplamento opcional a um artigo — tudo separado do artigo.",
      },
    ],
  }),
  component: MethodologyWorkspace,
});

/** Rótulos rotativos do estado de escaneamento enquanto a IA pensa. */
const SCANNING = [
  "separando fonte primária de secundária…",
  "procurando o instrumento analítico…",
  "testando a reprodutibilidade do procedimento…",
  "conferindo se há dado inventado…",
];

type LinkedArticle = { id: string; title: string; phase: string; updated_at: string };
type ArticleOption = { id: string; title: string };

function Fold({
  icon,
  title,
  badge,
  open,
  onToggle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  badge: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="shrink-0 rounded-2xl border bg-card/40 backdrop-blur">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        {icon}
        <span className="font-serif text-sm font-semibold">{title}</span>
        <span className="method-kicker ml-auto">{badge}</span>
        <ChevronDown
          className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="border-t px-3 py-2.5">{children}</div>}
    </section>
  );
}

function entryText(m: MethodologyMessageView): string {
  return m.parts
    .map((p) => p.text ?? "")
    .join("")
    .trim();
}

function MethodologyWorkspace() {
  const { id } = Route.useParams();
  const { seed } = Route.useSearch();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [title, setTitle] = useState("");
  const [savedTitle, setSavedTitle] = useState("");
  const [status, setStatus] = useState("draft");
  const [messages, setMessages] = useState<MethodologyMessageView[]>([]);
  const [documents, setDocuments] = useState<MethodologyDocumentView[]>([]);
  const [articles, setArticles] = useState<LinkedArticle[]>([]);
  const [myArticles, setMyArticles] = useState<ArticleOption[]>([]);
  const [sourceArticleId, setSourceArticleId] = useState("");
  const [importing, setImporting] = useState(false);
  const [linking, setLinking] = useState(false);
  const [spec, setSpec] = useState("");
  const [savedSpec, setSavedSpec] = useState("");
  const [specMode, setSpecMode] = useState<"leitura" | "editor">("leitura");
  const [draft, setDraft] = useState("");
  const [feedback, setFeedback] = useState("");
  const [note, setNote] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mobilePane, setMobilePane] = useState<"caderno" | "spec">("caderno");
  const [scanIndex, setScanIndex] = useState(0);
  const [openPanel, setOpenPanel] = useState<"corpus" | "links" | null>(null);

  const lastReply = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const message = messages[i];
      if (message && message.role !== "user") {
        const text = cleanMethodologyReply(entryText(message));
        if (text) return splitMethodReply(text);
      }
    }
    return null;
  }, [messages]);

  const availableArticles = useMemo(
    () => myArticles.filter((a) => !articles.some((linked) => linked.id === a.id)),
    [myArticles, articles],
  );

  const seeded = useRef(false);
  const localSeq = useRef(0);
  const logRef = useRef<HTMLDivElement>(null);
  const specRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const load = useCallback(async () => {
    const data = await getMethodologyWorkspace({ data: { methodologyId: id } });
    setTitle(data.methodology.title);
    setSavedTitle(data.methodology.title);
    setStatus(data.methodology.status);
    setMessages(data.messages);
    setDocuments(data.documents);
    setArticles(data.articles);
    setSpec(data.methodology.content ?? "");
    setSavedSpec(data.methodology.content ?? "");
    return data;
  }, [id]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    listArticles()
      .then((rows) => {
        if (active) setMyArticles(rows.map((r) => ({ id: r.id, title: r.title })));
      })
      .catch(() => {
        if (active) setMyArticles([]);
      });
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoadingData(true);
    setLoadError(null);
    load()
      .catch((e) => {
        if (active) {
          setLoadError(e instanceof Error ? e.message : "Não foi possível abrir a metodologia");
        }
      })
      .finally(() => {
        if (active) setLoadingData(false);
      });
    return () => {
      active = false;
    };
  }, [user, load]);

  useEffect(() => {
    if (!sending) return;
    setScanIndex(0);
    const timer = setInterval(() => setScanIndex((i) => (i + 1) % SCANNING.length), 2200);
    return () => clearInterval(timer);
  }, [sending]);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, sending]);

  const send = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean) return;
      localSeq.current += 1;
      setMessages((prev) => [
        ...prev,
        {
          id: `local-${localSeq.current}`,
          role: "user",
          parts: [{ type: "text", text: clean }],
        },
      ]);
      setDraft("");
      setSending(true);
      try {
        const { reply } = await sendMethodologyMessage({
          data: { methodologyId: id, text: clean },
        });
        localSeq.current += 1;
        setMessages((prev) => [
          ...prev,
          {
            id: `local-${localSeq.current}`,
            role: "assistant",
            parts: [{ type: "text", text: reply }],
          },
        ]);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Não foi possível falar com o Pracinha");
      } finally {
        setSending(false);
      }
    },
    [id],
  );

  // Semente vinda da home: abre a entrevista já com a pergunta do pesquisador.
  // O `?seed=` é removido em seguida para um refresh não repetir o turno.
  useEffect(() => {
    if (loadingData || !seed || seeded.current || messages.length > 0) return;
    seeded.current = true;
    void send(seed);
    void navigate({ to: "/metodologia/$id", params: { id }, search: {}, replace: true });
  }, [loadingData, seed, messages.length, send, navigate, id]);

  const coverage = useMemo(() => specSectionCoverage(spec), [spec]);
  const covered = coverage.filter((c) => c.present).length;
  const dirty = spec !== savedSpec || title !== savedTitle;
  const approved = status === "approved";

  async function generate() {
    setGenerating(true);
    try {
      const res = await generateMethodologySpec({
        data: { methodologyId: id, ...(feedback.trim() ? { feedback: feedback.trim() } : {}) },
      });
      setSpec(res.content);
      setSavedSpec(res.content);
      setStatus("draft");
      setSpecMode("editor");
      setFeedback("");
      toast.success("Spec consolidada — revise e aprove");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível gerar a spec");
    } finally {
      setGenerating(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const res = await saveMethodologySpec({
        data: {
          methodologyId: id,
          content: spec,
          ...(title.trim() && title.trim() !== savedTitle ? { title: title.trim() } : {}),
        },
      });
      setSavedSpec(spec);
      setSavedTitle(title);
      setStatus(res.status);
      toast.success(
        res.status === "draft" && approved
          ? "Spec salva. Como o texto mudou, ela voltou a rascunho."
          : "Spec salva",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar");
    } finally {
      setSaving(false);
    }
  }

  async function approve() {
    setApproving(true);
    try {
      await approveMethodologySpec({ data: { methodologyId: id } });
      setStatus("approved");
      toast.success("Metodologia aprovada — já pode ser vinculada a um artigo");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível aprovar");
    } finally {
      setApproving(false);
    }
  }

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    let ok = 0;
    try {
      for (const file of Array.from(files)) {
        const base64 = await fileToBase64(file);
        await uploadMethodologyDocument({
          data: {
            methodologyId: id,
            filename: file.name,
            mime: file.type || "application/octet-stream",
            base64,
            ...(note.trim() ? { note: note.trim() } : {}),
          },
        });
        ok += 1;
      }
      setNote("");
      toast.success(ok === 1 ? "Fonte anexada ao corpus" : `${ok} fontes anexadas ao corpus`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível anexar a fonte");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function importSource(articleId: string) {
    if (!articleId) return;
    setImporting(true);
    try {
      const res = await importMethodologyFromArticle({ data: { methodologyId: id, articleId } });
      const data = await load();
      setMessages(data.messages);
      setSourceArticleId("");
      toast.success(
        `Metodologia de "${res.title}" importada (${res.chars.toLocaleString("pt-BR")} caracteres)`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível importar a seção");
    } finally {
      setImporting(false);
    }
  }

  async function removeDocument(documentId: string) {
    try {
      await deleteMethodologyDocument({ data: { methodologyId: id, documentId } });
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível remover");
    }
  }

  async function unlink(articleId: string) {
    try {
      await linkMethodologyToArticle({ data: { articleId, methodologyId: null } });
      setArticles((prev) => prev.filter((a) => a.id !== articleId));
      toast.success("Artigo desacoplado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível desacoplar");
    }
  }

  async function linkTo(articleId: string) {
    if (!articleId) return;
    setLinking(true);
    try {
      await linkMethodologyToArticle({ data: { articleId, methodologyId: id } });
      await load();
      toast.success("Metodologia acoplada ao artigo");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível acoplar");
    } finally {
      setLinking(false);
    }
  }

  function jumpToSection(section: string, present: boolean) {
    setSpecMode("editor");
    if (!present) {
      const next = `${spec.trimEnd()}\n\n## ${section}\n`;
      setSpec(next);
      toast.info("Seção criada no fim da spec");
      requestAnimationFrame(() => {
        const el = specRef.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(next.length, next.length);
        el.scrollTop = el.scrollHeight;
      });
      return;
    }
    requestAnimationFrame(() => {
      const el = specRef.current;
      if (!el) return;
      const at = spec.indexOf(`## ${section}`);
      el.focus();
      if (at >= 0) {
        el.setSelectionRange(at, at + section.length + 3);
        el.scrollTop = Math.max(0, (at / Math.max(spec.length, 1)) * el.scrollHeight - 40);
      }
    });
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-sm text-muted-foreground">{loadError}</p>
          <Button variant="outline" onClick={() => navigate({ to: "/" })}>
            Voltar ao início
          </Button>
        </div>
      </div>
    );
  }

  if (loading || loadingData) {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Abrindo o caderno de método…
        </div>
      </div>
    );
  }

  const protocol = methodologyProtocolCode(id);

  return (
    <div className="method-notebook flex h-[100dvh] flex-col">
      <AppHeader />

      {/* Cabeçalho de protocolo: identidade do caderno, status e cobertura. */}
      <div className="px-3 pb-2 pt-3">
        <div className="method-protocol mx-auto flex w-full max-w-[1500px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <Link
            to="/"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border/70 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Voltar ao início"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="method-code">{protocol}</span>
              <span className="text-muted-foreground/50">/</span>
              <span className="method-kicker">caderno de método</span>
            </div>
            <h1 className="truncate font-serif text-lg font-semibold leading-tight sm:text-xl">
              {title || "Metodologia"}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <span className="method-kicker">seções</span>
              <span className="method-meter" aria-label={`${covered} de 7 seções cobertas`}>
                {coverage.map((c) => (
                  <span
                    key={c.section}
                    className="method-meter__seg"
                    data-on={c.present ? "true" : "false"}
                    title={c.section}
                  />
                ))}
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">{covered}/7</span>
            </div>
            {approved ? (
              <span className="approve-seal">
                <Check className="size-3" />
                Aprovada
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-star-amber/40 bg-star-amber/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-star-amber">
                Rascunho
              </span>
            )}
          </div>
        </div>
      </div>

      <main className="mx-auto grid min-h-0 w-full max-w-[1500px] flex-1 grid-cols-1 gap-3 px-3 pb-3 lg:grid-cols-[1.02fr_0.98fr]">
        {/* 01 · Registro de campo */}
        <section
          className={`flex min-h-0 flex-col overflow-hidden rounded-2xl border bg-card/40 backdrop-blur ${
            isMobile && mobilePane !== "caderno" ? "hidden" : ""
          }`}
        >
          <header className="flex items-center gap-2 border-b px-4 py-2.5">
            <NotebookPen className="size-4 text-primary" />
            <h2 className="font-serif text-sm font-semibold">Registro de campo</h2>
            <span className="method-kicker ml-auto">
              {messages.length.toString().padStart(2, "0")} entradas
            </span>
          </header>

          <div ref={logRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {messages.length === 0 && !sending ? (
              <div className="mx-auto max-w-sm py-10 text-center">
                <FlaskConical className="mx-auto mb-3 size-7 text-primary/70" />
                <p className="font-serif text-base">O caderno está aberto.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Descreva o método que você quer usar — ou peça ajuda para escolher. A entrevista
                  separa tipo de estudo, corpus, procedimento e instrumento.
                </p>
              </div>
            ) : (
              <div className="method-log">
                {messages.map((m, i) => {
                  const isUser = m.role === "user";
                  // a última fala do Pracinha aparece fixa no card “pergunta atual”
                  if (!isUser && i === messages.length - 1) return null;
                  const raw = entryText(m);
                  const text = isUser ? raw : cleanMethodologyReply(raw);
                  if (!text) return null;
                  return (
                    <article
                      key={m.id}
                      className={`method-entry ${isUser ? "method-entry--obs" : ""}`}
                      data-role={m.role}
                    >
                      <div className="method-entry__head">
                        <span className="method-entry__tag">{isUser ? "OBS" : "PROT"}</span>
                        <span>{String(i + 1).padStart(2, "0")}</span>
                        <span className="normal-case tracking-normal">
                          {isUser ? "você" : "pracinha"}
                        </span>
                      </div>
                      <div className="method-entry__body">
                        {isUser ? (
                          <p className="whitespace-pre-wrap">{text}</p>
                        ) : (
                          (() => {
                            const { context, question } = splitMethodReply(text);
                            return (
                              <>
                                {context && (
                                  <p className="text-[13px] leading-relaxed text-muted-foreground">
                                    {context}
                                  </p>
                                )}
                                {question && (
                                  <p className="mt-1 font-serif text-[15px] leading-snug text-foreground">
                                    {question}
                                  </p>
                                )}
                              </>
                            );
                          })()
                        )}
                      </div>
                    </article>
                  );
                })}

                {sending && (
                  <article className="method-entry" data-role="assistant">
                    <div className="method-entry__head">
                      <span className="method-entry__tag">
                        <ScanLine className="size-3" />
                      </span>
                      <span>em leitura</span>
                    </div>
                    <div className="method-entry__body method-scan rounded-md border border-primary/25 bg-primary/5 px-3 py-2 text-sm text-primary/90">
                      {SCANNING[scanIndex]}
                    </div>
                  </article>
                )}
              </div>
            )}
          </div>

          <div className="border-t p-3">
            {lastReply?.question && !sending && (
              <div className="method-question mb-2">
                <span className="method-kicker">
                  pergunta atual · prot {messages.length.toString().padStart(2, "0")}
                </span>
                <p className="mt-1 font-serif text-[15px] leading-snug">{lastReply.question}</p>
                {lastReply.context && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-[11px] text-muted-foreground">
                      por que o Pracinha perguntou isso
                    </summary>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      {lastReply.context}
                    </p>
                  </details>
                )}
              </div>
            )}
            <div className="method-composer px-2.5 py-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (!sending && draft.trim()) void send(draft);
                  }
                }}
                rows={2}
                placeholder="Nova observação de método… (Enter registra, Shift+Enter quebra linha)"
                className="max-h-40 w-full resize-none bg-transparent px-1 py-1 text-sm outline-none placeholder:text-muted-foreground/70"
              />
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {["Não sei ainda", "Pular esta pergunta"].map((hint) => (
                  <button
                    key={hint}
                    type="button"
                    className="rounded-full border border-border/70 px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                    disabled={sending}
                    onClick={() => void send(hint)}
                  >
                    {hint}
                  </button>
                ))}
                {draft.trim().length > 0 && (
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {draft.trim().length} car.
                  </span>
                )}
                <Button
                  size="sm"
                  className="ml-auto h-8 gap-1.5"
                  disabled={sending || !draft.trim()}
                  onClick={() => void send(draft)}
                >
                  {sending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <PenLine className="size-3.5" />
                  )}
                  Registrar
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Coluna direita: spec, corpus e acoplamentos */}
        <aside
          className={`flex min-h-0 flex-col gap-3 overflow-y-auto ${
            isMobile && mobilePane !== "spec" ? "hidden" : ""
          }`}
        >
          {/* 02 · Spec */}
          <section className="method-spec flex min-h-[22rem] flex-col lg:min-h-0 lg:flex-1">
            <header className="method-spec__head flex flex-wrap items-center gap-2 px-3 py-2">
              <BookOpen className="size-4 text-primary" />
              <h2 className="font-serif text-sm font-semibold">Spec de metodologia</h2>
              <div className="ml-auto flex items-center gap-1">
                <Button
                  size="sm"
                  variant={specMode === "leitura" ? "secondary" : "ghost"}
                  className="h-7 gap-1 px-2 text-xs"
                  onClick={() => setSpecMode("leitura")}
                >
                  <Eye className="size-3.5" />
                  Leitura
                </Button>
                <Button
                  size="sm"
                  variant={specMode === "editor" ? "secondary" : "ghost"}
                  className="h-7 gap-1 px-2 text-xs"
                  onClick={() => setSpecMode("editor")}
                >
                  <PenLine className="size-3.5" />
                  Editor
                </Button>
              </div>
            </header>

            <div className="flex flex-wrap gap-1 px-3 py-2">
              {coverage.map((c, i) => (
                <button
                  key={c.section}
                  type="button"
                  className="method-pill"
                  data-on={c.present ? "true" : "false"}
                  onClick={() => jumpToSection(c.section, c.present)}
                  title={c.present ? c.section : `${c.section} — ainda não escrita`}
                >
                  <span className="font-mono">{i + 1}</span>
                  <span className="max-w-[9.5rem] truncate">{c.section}</span>
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {specMode === "editor" ? (
                <textarea
                  ref={specRef}
                  value={spec}
                  onChange={(e) => setSpec(e.target.value)}
                  spellCheck={false}
                  placeholder={`## ${METHODOLOGY_SPEC_SECTIONS[0]}\n\n## ${METHODOLOGY_SPEC_SECTIONS[1]}\n\n…`}
                  className="method-editor h-full min-h-[18rem] w-full border-0 px-4 py-3"
                />
              ) : spec.trim() ? (
                <div className="paper-sheet method-paper min-h-full">
                  <MessageResponse>{spec}</MessageResponse>
                </div>
              ) : (
                <div className="flex h-full flex-col justify-center px-4 py-5">
                  <div className="rounded-xl border border-border/70 bg-background/40 p-4">
                    <p className="font-serif text-sm font-semibold">A spec nasce da entrevista</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      Ela transforma o que você contou em um protocolo repetível de sete seções.
                    </p>
                    <ul className="mt-2 grid grid-cols-1 gap-x-4 gap-y-0.5 text-[11px] text-muted-foreground sm:grid-cols-2">
                      {METHODOLOGY_SPEC_SECTIONS.map((section, i) => (
                        <li key={section} className="truncate">
                          <span className="font-mono text-primary/70">{i + 1}</span> {section}
                        </li>
                      ))}
                    </ul>
                    <Button
                      size="sm"
                      className="mt-3 h-8 gap-1.5"
                      disabled={generating || sending || messages.length === 0}
                      onClick={() => void generate()}
                    >
                      {generating ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="size-3.5" />
                      )}
                      Gerar spec
                    </Button>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      {messages.length === 0
                        ? "Registre a primeira observação ao lado."
                        : "Ou escreva à mão no Editor."}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <footer className="border-t p-3">
              <label className="method-kicker mb-1 block" htmlFor="methodology-title">
                nome da metodologia
              </label>
              <Input
                id="methodology-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Método Pracinha — estudo de caso instrumental"
                className="h-8 w-full text-xs"
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5"
                  disabled={saving || !dirty}
                  onClick={() => void save()}
                >
                  {saving ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Save className="size-3.5" />
                  )}
                  Salvar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5"
                  disabled={generating || sending}
                  onClick={() => void generate()}
                >
                  {generating ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="size-3.5" />
                  )}
                  {spec.trim() ? "Gerar novamente" : "Gerar spec"}
                </Button>
                <Button
                  size="sm"
                  className="ml-auto h-8 gap-1.5"
                  disabled={approving || approved || dirty || !spec.trim()}
                  onClick={() => void approve()}
                  title={
                    dirty
                      ? "Salve as alterações antes de aprovar"
                      : approved
                        ? "Já aprovada"
                        : "Aprovar a spec"
                  }
                >
                  {approving ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Check className="size-3.5" />
                  )}
                  Aprovar
                </Button>
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer text-[11px] text-muted-foreground">
                  Ajustar antes de gerar (opcional)
                </summary>
                <Input
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Ex.: o corpus é só de fontes primárias"
                  className="mt-1.5 h-8 text-xs"
                  aria-label="Ajuste pedido para a spec"
                />
              </details>
              {dirty && (
                <p className="mt-1.5 text-[11px] text-star-amber">
                  Há alterações não salvas — a aprovação fica bloqueada até salvar.
                </p>
              )}
            </footer>
          </section>

          <Fold
            icon={<Paperclip className="size-4 text-primary" />}
            title="Corpus e fontes"
            badge={`${documents.length} anexos`}
            open={openPanel === "corpus"}
            onToggle={() => setOpenPanel(openPanel === "corpus" ? null : "corpus")}
          >
            <p className="mb-2 text-xs text-muted-foreground">
              Só o que está aqui pode ser citado na spec. Anexe os documentos primários que o método
              vai analisar.
            </p>
            <div className="space-y-1.5">
              {documents.map((d) => (
                <div key={d.id} className="method-corpus-row">
                  <span className="font-mono text-[10px] text-primary">
                    A{d.seq.toString().padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{d.filename}</p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {formatSize(d.size)} · {d.hasText ? "texto extraído" : "sem texto"}
                      {d.note ? ` · ${d.note}` : ""}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    aria-label={`Remover ${d.filename}`}
                    onClick={() => void removeDocument(d.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-2 flex flex-col gap-1.5 sm:flex-row">
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="O que esta fonte prova? (opcional)"
                className="h-8 text-xs"
                aria-label="Observação da fonte"
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
                variant="outline"
                className="h-8 shrink-0 gap-1.5"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Paperclip className="size-3.5" />
                )}
                Anexar
              </Button>
            </div>
            {myArticles.length > 0 && (
              <div className="mt-1.5 flex flex-col gap-1.5 sm:flex-row">
                <select
                  value={sourceArticleId}
                  onChange={(e) => setSourceArticleId(e.target.value)}
                  aria-label="Importar a seção Metodologia de um artigo"
                  className="h-8 min-w-0 flex-1 rounded-lg border border-input bg-background/70 px-2 text-xs outline-none focus:border-primary"
                >
                  <option value="">Importar metodologia de um artigo…</option>
                  {myArticles.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 shrink-0 gap-1.5"
                  disabled={importing || !sourceArticleId}
                  onClick={() => void importSource(sourceArticleId)}
                >
                  {importing ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <BookOpen className="size-3.5" />
                  )}
                  Importar
                </Button>
              </div>
            )}
          </Fold>

          {/* 04 · Acoplamentos */}
          <Fold
            icon={<Link2 className="size-4 text-primary" />}
            title="Artigos acoplados"
            badge={articles.length === 0 ? "nenhum" : `${articles.length} com este método`}
            open={openPanel === "links"}
            onToggle={() => setOpenPanel(openPanel === "links" ? null : "links")}
          >
            {!approved && (
              <p className="mb-2 text-xs text-star-amber">
                Aprove a spec para poder acoplar a um artigo.
              </p>
            )}
            {approved && availableArticles.length > 0 && (
              <ul className="mb-2.5 space-y-1.5">
                {availableArticles.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center gap-2 rounded-lg border bg-background/40 px-2 py-1.5"
                  >
                    <span className="min-w-0 flex-1 truncate text-xs">{a.title}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 shrink-0 gap-1.5 rounded-md px-2 text-[11px]"
                      disabled={linking}
                      onClick={() => void linkTo(a.id)}
                      aria-label={`Acoplar esta metodologia ao artigo ${a.title}`}
                    >
                      {linking ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Link2 className="size-3" />
                      )}
                      Acoplar
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {approved && myArticles.length > 0 && availableArticles.length === 0 && (
              <p className="mb-2 text-xs text-muted-foreground">
                Todos os seus artigos já usam esta metodologia.
              </p>
            )}
            {articles.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nenhum artigo usa esta metodologia ainda. Uma mesma metodologia serve para vários
                artigos: acople aqui ou peça no chat do artigo ("use a metodologia …").
              </p>
            ) : (
              <ul className="space-y-1.5">
                {articles.map((a) => (
                  <li key={a.id} className="flex items-center gap-2 rounded-lg border px-2 py-1.5">
                    <Link
                      to="/a/$articleId"
                      params={{ articleId: a.id }}
                      className="min-w-0 flex-1 truncate text-xs font-medium hover:underline"
                    >
                      {a.title}
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground"
                      aria-label="Desacoplar artigo"
                      onClick={() => void unlink(a.id)}
                    >
                      <Unlink className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Fold>
        </aside>
      </main>

      {isMobile && (
        <nav className="flex shrink-0 border-t bg-card pb-[env(safe-area-inset-bottom)]">
          <button
            type="button"
            onClick={() => setMobilePane("caderno")}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${
              mobilePane === "caderno" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <NotebookPen className="size-5" />
            Caderno
          </button>
          <button
            type="button"
            onClick={() => setMobilePane("spec")}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${
              mobilePane === "spec" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <BookOpen className="size-5" />
            Spec
          </button>
        </nav>
      )}
    </div>
  );
}
