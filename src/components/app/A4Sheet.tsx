import { useLayoutEffect, useRef, useState } from "react";
import { Check, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseInline, serializeBlock, type Block } from "@/lib/article-blocks";
import { A4, A4_CONTENT_HEIGHT_MM, mmToPx, type PlacedBlock } from "@/lib/a4";

/** Corpo tipográfico de um bloco (títulos, parágrafos, listas, citações, tabelas). */
export function BlockBody({ block }: { block: Block }) {
  switch (block.type) {
    case "heading": {
      const sizes = ["text-[1.55rem]", "text-[1.25rem]", "text-[1.08rem]", "text-[1rem]"];
      const align = block.level === 1 ? "text-center" : "";
      return (
        <h2 className={`font-serif font-semibold ${sizes[block.level - 1]} ${align} leading-snug`}>
          {renderInline(block.text)}
        </h2>
      );
    }
    case "paragraph":
      return <p className="text-justify">{renderInline(block.text)}</p>;
    case "quote":
      return (
        <blockquote className="border-l-2 border-border pl-4 italic text-muted-foreground">
          {renderInline(block.text)}
        </blockquote>
      );
    case "list":
      return block.ordered ? (
        <ol className="list-decimal space-y-1 pl-6">
          {block.items.map((it, i) => (
            <li key={i}>{renderInline(it)}</li>
          ))}
        </ol>
      ) : (
        <ul className="list-disc space-y-1 pl-6">
          {block.items.map((it, i) => (
            <li key={i}>{renderInline(it)}</li>
          ))}
        </ul>
      );
    case "table": {
      const [head, ...rest] = block.rows;
      return (
        <table className="w-full border-collapse text-[0.95em]">
          <thead>
            <tr>
              {head?.map((cell, i) => (
                <th
                  key={i}
                  className="border border-border bg-muted/60 px-2 py-1 text-left font-semibold"
                >
                  {renderInline(cell)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rest.map((row, r) => (
              <tr key={r}>
                {row.map((cell, i) => (
                  <td key={i} className="border border-border px-2 py-1 align-top">
                    {renderInline(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    case "rule":
      return <hr className="border-border" />;
  }
}

function renderInline(text: string) {
  return parseInline(text).map((seg, i) =>
    seg.bold ? <strong key={i}>{seg.text}</strong> : <span key={i}>{seg.text}</span>,
  );
}

/**
 * Uma folha A4 editável. Fora do modo de edição mostra o texto como no PDF; no
 * modo de edição cada bloco vira um campo de texto salvo no documento mestre.
 */
export function A4Sheet({
  pageNumber,
  blocks,
  editing,
  live = false,
  sectionHighlight,
  onChangeBlock,
  onDeleteBlock,
}: {
  pageNumber: number;
  blocks: PlacedBlock[];
  editing: boolean;
  live?: boolean;
  sectionHighlight: string | null;
  onChangeBlock: (index: number, block: Block) => void;
  onDeleteBlock: (index: number) => void;
}) {
  const contentStyle = {
    paddingLeft: `${A4.marginXMm}mm`,
    paddingRight: `${A4.marginXMm}mm`,
    paddingTop: `${A4.marginYMm}mm`,
    paddingBottom: `${A4.marginYMm}mm`,
  } as const;

  const lastIndex = blocks.length - 1;

  return (
    <section
      className={`a4-sheet paper-sheet relative mx-auto ${live ? "a4-sheet--live" : ""}`}
      style={{ width: `${A4.widthMm}mm`, minHeight: `${A4.heightMm}mm` }}
      aria-label={`Folha ${pageNumber}`}
    >
      <div style={contentStyle} className="flex h-full flex-col gap-[0.85em]">
        {blocks.map(({ block, index }) => (
          <div
            key={index}
            data-block-index={index}
            className={`a4-block group/block relative ${
              sectionHighlight && block.type === "heading" && block.text === sectionHighlight
                ? "a4-block--active"
                : ""
            } ${live && index === lastIndex ? "a4-writing-caret" : ""}`}
          >
            {editing ? (
              <BlockEditor
                block={block}
                onChange={(b) => onChangeBlock(index, b)}
                onDelete={() => onDeleteBlock(index)}
              />
            ) : (
              <BlockBody block={block} />
            )}
          </div>
        ))}
      </div>
      <span className="a4-page-number">{pageNumber}</span>
    </section>
  );
}

/**
 * Contêiner oculto com a largura real de uma A4, usado apenas para medir a altura
 * de cada bloco e paginar o documento. Não é exibido.
 */
export function A4Measure({
  blocks,
  measureRef,
}: {
  blocks: Block[];
  measureRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div aria-hidden className="pointer-events-none fixed -left-[9999px] top-0 opacity-0">
      <div
        ref={measureRef}
        className="paper-sheet flex flex-col gap-[0.85em]"
        style={{
          width: `${A4.widthMm}mm`,
          paddingLeft: `${A4.marginXMm}mm`,
          paddingRight: `${A4.marginXMm}mm`,
        }}
      >
        {blocks.map((block, index) => (
          <div key={index}>
            <BlockBody block={block} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Editor de um único bloco: clique, reescreva e confirme. */
function BlockEditor({
  block,
  onChange,
  onDelete,
}: {
  block: Block;
  onChange: (block: Block) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => serializeBlock(block));
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    if (editing) {
      setDraft(serializeBlock(block));
      ref.current?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  if (!editing) {
    return (
      <button
        type="button"
        className="w-full cursor-text rounded-sm text-left hover:bg-accent/40"
        onClick={() => setEditing(true)}
        title="Clique para editar"
      >
        <BlockBody block={block} />
        <Pencil className="pointer-events-none absolute -left-6 top-1 size-3.5 text-muted-foreground opacity-0 group-hover/block:opacity-100" />
      </button>
    );
  }

  return (
    <div className="space-y-1">
      <textarea
        ref={ref}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={Math.max(2, draft.split("\n").length + 1)}
        className="w-full resize-y rounded-sm border border-primary/40 bg-background/60 p-2 font-serif text-[1.02em] leading-relaxed outline-none"
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => {
            const parsed = parseSingleBlock(draft);
            if (parsed) onChange(parsed);
            setEditing(false);
          }}
        >
          <Check />
          Salvar
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
          Cancelar
        </Button>
        <Button size="sm" variant="ghost" className="text-destructive" onClick={onDelete}>
          Excluir bloco
        </Button>
      </div>
    </div>
  );
}

/** Converte o texto editado de um bloco de volta em Block (mantém o tipo). */
function parseSingleBlock(text: string): Block | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const heading = trimmed.match(/^(#{1,4})\s+(.*)$/);
  if (heading) {
    const level = Math.min(4, heading[1]?.length ?? 1) as 1 | 2 | 3 | 4;
    return { type: "heading", level, text: heading[2]?.trim() ?? "" };
  }
  if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) return { type: "rule" };
  const lines = trimmed.split("\n").filter(Boolean);
  if (lines.every((l) => /^\s*[-*+]\s+/.test(l))) {
    return { type: "list", ordered: false, items: lines.map((l) => l.replace(/^\s*[-*+]\s+/, "")) };
  }
  if (lines.every((l) => /^\s*\d+\.\s+/.test(l))) {
    return { type: "list", ordered: true, items: lines.map((l) => l.replace(/^\s*\d+\.\s+/, "")) };
  }
  if (lines.every((l) => /^\s*\|.*\|\s*$/.test(l))) {
    return {
      type: "table",
      rows: lines
        .map((l) =>
          l
            .trim()
            .replace(/^\|/, "")
            .replace(/\|$/, "")
            .split("|")
            .map((c) => c.trim()),
        )
        .filter((row) => !row.every((c) => /^:?-{2,}:?$/.test(c))),
    };
  }
  if (lines.every((l) => /^\s*>\s?/.test(l))) {
    return { type: "quote", text: lines.map((l) => l.replace(/^\s*>\s?/, "")).join(" ") };
  }
  return { type: "paragraph", text: lines.join(" ") };
}

/** Altura útil de uma folha em px (exportada para os testes). */
export const A4_CONTENT_HEIGHT_PX = mmToPx(A4_CONTENT_HEIGHT_MM);
