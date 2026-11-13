import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { Block } from "@/lib/article-blocks";

/** Dimensões físicas reais de uma folha A4, em milímetros. */
export const A4 = {
  widthMm: 210,
  heightMm: 297,
  marginXMm: 22,
  marginYMm: 20,
} as const;

/** Altura útil do conteúdo em mm (A4 menos as margens superior e inferior). */
export const A4_CONTENT_HEIGHT_MM = A4.heightMm - A4.marginYMm * 2;

const MM_PER_INCH = 25.4;
const CSS_DPI = 96;

/** Converte milímetros em pixels CSS (1in = 96px). */
export function mmToPx(mm: number): number {
  return (mm / MM_PER_INCH) * CSS_DPI;
}

/**
 * Distribui blocos já medidos (alturas em px) em folhas A4. Um bloco maior que a
 * folha fica sozinho e transborda com aviso, em vez de ser cortado em silêncio.
 */
export function paginateBlocks(heights: number[], contentHeightPx: number): number[][] {
  const pages: number[][] = [];
  let current: number[] = [];
  let used = 0;
  heights.forEach((height, index) => {
    if (current.length > 0 && used + height > contentHeightPx) {
      pages.push(current);
      current = [];
      used = 0;
    }
    current.push(index);
    used += height;
  });
  if (current.length) pages.push(current);
  return pages.length ? pages : [[]];
}

export type PlacedBlock = { block: Block; index: number };

export type Pagination = {
  /** Blocos agrupados por folha, com o índice global de cada bloco. */
  pages: PlacedBlock[][];
  /** true quando algum bloco é maior que uma folha inteira. */
  overflowing: boolean;
  /** Ref que deve ser ligada ao contêiner oculto de medição. */
  measureRef: React.RefObject<HTMLDivElement | null>;
};

/**
 * Mede os blocos num contêiner oculto com a largura real de uma A4 e devolve a
 * distribuição em folhas. `revision` força o recálculo após edições, mudança de
 * fonte ou de configuração de página.
 */
export function useA4Pagination(blocks: Block[], revision: unknown): Pagination {
  const measureRef = useRef<HTMLDivElement | null>(null);
  const [pages, setPages] = useState<PlacedBlock[][]>(() =>
    blocks.length ? [blocks.map((block, index) => ({ block, index }))] : [[]],
  );
  const [overflowing, setOverflowing] = useState(false);

  const recompute = useCallback(() => {
    const container = measureRef.current;
    if (!container) return;
    const children = Array.from(container.children) as HTMLElement[];
    const heights = children.map((el) => el.getBoundingClientRect().height);
    const contentHeightPx = mmToPx(A4_CONTENT_HEIGHT_MM);
    const groups = paginateBlocks(heights, contentHeightPx);
    setOverflowing(heights.some((h) => h > contentHeightPx));
    setPages(
      groups.map((group) =>
        group.map((i) => ({ block: blocks[i]!, index: i })).filter((p) => p.block),
      ),
    );
  }, [blocks]);

  useLayoutEffect(() => {
    recompute();
  }, [recompute, revision]);

  // Repagina quando as fontes web terminam de carregar (a altura muda).
  useLayoutEffect(() => {
    if (typeof document === "undefined" || !("fonts" in document)) return;
    const fonts = (document as Document & { fonts: FontFaceSet }).fonts;
    let active = true;
    void fonts.ready.then(() => {
      if (active) recompute();
    });
    return () => {
      active = false;
    };
  }, [recompute]);

  return { pages, overflowing, measureRef };
}
