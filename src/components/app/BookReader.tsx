import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { MessageResponse } from "@/components/ai-elements/message";
import { Button } from "@/components/ui/button";
import { stripMarkers } from "@/lib/article-marker";
import { ARTICLE_SIGNATURE, type ExportPage } from "@/lib/article-export";

type Leaf =
  { kind: "cover" } | { kind: "page"; number: number; content: string } | { kind: "signature" };

/** Leitura do artigo montado como um livro: capa, uma folha por página aprovada e a assinatura da Variant. */
export function BookReader({
  title,
  pages,
  onClose,
}: {
  title: string;
  pages: ExportPage[];
  onClose: () => void;
}) {
  const leaves = useMemo<Leaf[]>(() => {
    const approved = pages
      .filter((p) => p.status === "approved")
      .sort((a, b) => a.page_number - b.page_number);
    return [
      { kind: "cover" },
      ...approved.map((p) => ({
        kind: "page" as const,
        number: p.page_number,
        content: stripMarkers(p.content),
      })),
      { kind: "signature" },
    ];
  }, [pages]);

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

  return (
    <div
      className="book-overlay fixed inset-0 z-50 flex flex-col items-center justify-center bg-neutral-900/90 p-3 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Leitura do artigo ${title}`}
      onClick={onClose}
    >
      <div className="mb-2 flex w-full max-w-3xl items-center justify-between text-neutral-200">
        <span className="text-xs">
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

      <div className="book-stage relative w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => go("prev")}
          disabled={atStart}
          aria-label="Página anterior"
          className="book-nav absolute left-0 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 disabled:opacity-30"
        >
          <ChevronLeft className="size-6" />
        </button>

        <article
          key={index}
          className={`paper-sheet book-leaf mx-auto min-h-[70vh] max-w-3xl rounded-lg border ${
            flip === "next" ? "book-flip-next" : flip === "prev" ? "book-flip-prev" : ""
          }`}
        >
          {leaf.kind === "cover" && (
            <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
              <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Artigo científico
              </span>
              <h1 className="font-serif text-3xl font-semibold leading-tight">{title}</h1>
              <span className="text-sm italic text-muted-foreground">
                Uma criação <span className="font-serif font-semibold not-italic">Variant</span>
              </span>
            </div>
          )}

          {leaf.kind === "page" && (
            <div className="book-page-body">
              <MessageResponse>{leaf.content}</MessageResponse>
            </div>
          )}

          {leaf.kind === "signature" && (
            <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
              <p className="text-sm text-muted-foreground">Fim</p>
              <p className="variant-signature">{ARTICLE_SIGNATURE}</p>
            </div>
          )}
        </article>

        <button
          type="button"
          onClick={() => go("next")}
          disabled={atEnd}
          aria-label="Próxima página"
          className="book-nav absolute right-0 top-1/2 z-10 translate-x-1/2 -translate-y-1/2 disabled:opacity-30"
        >
          <ChevronRight className="size-6" />
        </button>
      </div>

      <div className="mt-3 flex items-center gap-1.5">
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
    </div>
  );
}
