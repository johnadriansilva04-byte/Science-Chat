import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { MessageResponse } from "@/components/ai-elements/message";
import { Button } from "@/components/ui/button";
import { stripMarkers } from "@/lib/article-marker";
import { ARTICLE_SIGNATURE, type ExportPage } from "@/lib/article-export";
import { splitContentIntoLeaves } from "@/lib/publication";

type Leaf =
  { kind: "cover" } | { kind: "page"; number: number; content: string } | { kind: "signature" };

/**
 * Leitura do artigo montado como um livro: capa, uma folha por página aprovada
 * (ou por seção, quando o texto vem de uma publicação) e a assinatura da Variant.
 */
export function BookReader({
  title,
  pages,
  content,
  onClose,
}: {
  title: string;
  pages?: ExportPage[];
  /** Conteúdo integral (Markdown). Usado quando não há páginas separadas. */
  content?: string;
  onClose: () => void;
}) {
  const leaves = useMemo<Leaf[]>(() => {
    let body: { number: number; content: string }[];
    if (pages && pages.length) {
      body = pages
        .filter((p) => p.status === "approved")
        .sort((a, b) => a.page_number - b.page_number)
        .map((p) => ({ number: p.page_number, content: stripMarkers(p.content) }));
    } else if (content) {
      body = splitContentIntoLeaves(stripMarkers(content)).map((leaf, i) => ({
        number: i + 1,
        content: leaf.title ? `## ${leaf.title}\n\n${leaf.body}` : leaf.body,
      }));
    } else {
      body = [];
    }
    return [
      { kind: "cover" },
      ...body.map((p) => ({ kind: "page" as const, number: p.number, content: p.content })),
      { kind: "signature" },
    ];
  }, [pages, content]);

  const [index, setIndex] = useState(0);
  const [flip, setFlip] = useState<"next" | "prev" | null>(null);
  const prevIndex = useRef(0);

  useEffect(() => {
    if (index > prevIndex.current) setFlip("next");
    else if (index < prevIndex.current) setFlip("prev");
    prevIndex.current = index;
    const timer = window.setTimeout(() => setFlip(null), 320);
    return () => window.clearTimeout(timer);
  }, [index]);

  const go = useCallback(
    (dir: "next" | "prev") =>
      setIndex((i) => (dir === "next" ? Math.min(i + 1, leaves.length - 1) : Math.max(i - 1, 0))),
    [leaves.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go("next");
      if (e.key === "ArrowLeft") go("prev");
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [go, onClose]);

  const leaf = leaves[index];
  const atStart = index === 0;
  const atEnd = index === leaves.length - 1;
  if (!leaf) return null;

  const sectionTitle =
    leaf.kind === "page" ? (leaf.content.match(/^#{1,6}\s+(.+)$/m)?.[1]?.trim() ?? "") : "";
  const progress = leaves.length > 1 ? (index / (leaves.length - 1)) * 100 : 0;

  return (
    <div
      className="book-overlay fixed inset-0 z-50 overflow-y-auto bg-neutral-900/90 p-2 backdrop-blur-sm print:hidden sm:p-3"
      role="dialog"
      aria-modal="true"
      aria-label={`Leitura do artigo ${title}`}
      onClick={onClose}
    >
      <div
        className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex w-full items-center justify-between gap-3 text-neutral-200">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">{title}</p>
            {sectionTitle && (
              <p className="truncate text-[11px] text-neutral-400">{sectionTitle}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-xs tabular-nums">
              {index + 1} / {leaves.length}
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="text-neutral-200 hover:bg-neutral-700 hover:text-white"
              onClick={onClose}
              aria-label="Fechar leitura"
            >
              <X />
            </Button>
          </div>
        </div>

        <div
          className="mb-2 h-0.5 w-full overflow-hidden rounded-full bg-neutral-700"
          role="progressbar"
          aria-label="Progresso da leitura"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
        >
          <div
            className="h-full rounded-full bg-neutral-100 transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="book-stage relative w-full">
          <article
            key={index}
            className={`paper-sheet book-leaf mx-auto max-h-[calc(100dvh-9rem)] max-w-3xl overflow-y-auto rounded-lg border sm:max-h-[82vh] ${
              flip === "next" ? "book-flip-next" : flip === "prev" ? "book-flip-prev" : ""
            }`}
          >
            {leaf.kind === "cover" && (
              <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
                <span className="paper-muted text-xs uppercase tracking-[0.3em]">
                  Artigo científico
                </span>
                <h1 className="font-serif text-3xl font-semibold leading-tight">{title}</h1>
                <span className="paper-muted text-sm italic">
                  Uma criação <span className="font-serif font-semibold not-italic">Variant</span>
                </span>
                {!atEnd && (
                  <Button variant="secondary" className="mt-2" onClick={() => go("next")}>
                    Começar a leitura
                  </Button>
                )}
              </div>
            )}

            {leaf.kind === "page" && (
              <div className="book-page-body">
                <MessageResponse>{leaf.content}</MessageResponse>
              </div>
            )}

            {leaf.kind === "signature" && (
              <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
                <p className="paper-muted text-sm">Fim</p>
                <p className="variant-signature">{ARTICLE_SIGNATURE}</p>
                <Button variant="outline" className="mt-2" onClick={onClose}>
                  Voltar à ficha
                </Button>
              </div>
            )}
          </article>
        </div>

        <div className="mt-3 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => go("prev")}
            disabled={atStart}
            aria-label="Página anterior"
            className="book-nav shrink-0 disabled:opacity-30"
          >
            <ChevronLeft className="size-5" />
          </button>
          <div className="flex max-w-full items-center justify-center gap-1.5 overflow-x-auto px-1">
            {leaves.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Ir para a folha ${i + 1}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setIndex(i);
                }}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-6 bg-neutral-100" : "w-1.5 bg-neutral-500 hover:bg-neutral-300"
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => go("next")}
            disabled={atEnd}
            aria-label="Próxima página"
            className="book-nav shrink-0 disabled:opacity-30"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
