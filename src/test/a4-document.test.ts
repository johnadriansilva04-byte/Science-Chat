import { describe, expect, it } from "vitest";

import { documentSections, parseBlocks, parseInline, serializeBlocks } from "@/lib/article-blocks";
import { A4, A4_CONTENT_HEIGHT_MM, mmToPx, paginateBlocks } from "@/lib/a4";
import { countWords, MIN_PAGE_WORDS } from "@/lib/article-page";

describe("parseBlocks / serializeBlocks", () => {
  it("parses headings, paragraphs, lists and quotes", () => {
    const blocks = parseBlocks(
      [
        "# Título",
        "",
        "Um parágrafo de exemplo.",
        "",
        "- item 1",
        "- item 2",
        "",
        "> citação",
      ].join("\n"),
    );
    expect(blocks.map((b) => b.type)).toEqual(["heading", "paragraph", "list", "quote"]);
    const heading = blocks[0];
    expect(heading).toEqual({ type: "heading", level: 1, text: "Título" });
  });

  it("parses simple tables and drops the separator row", () => {
    const blocks = parseBlocks(["| A | B |", "|---|---|", "| 1 | 2 |"].join("\n"));
    expect(blocks[0]).toEqual({
      type: "table",
      rows: [
        ["A", "B"],
        ["1", "2"],
      ],
    });
  });

  it("round-trips through serialize without losing structure", () => {
    const md = "# T\n\nParágrafo.\n\n- a\n- b";
    expect(serializeBlocks(parseBlocks(md))).toBe(md);
  });

  it("joins wrapped paragraph lines into a single block", () => {
    const blocks = parseBlocks("linha um\nlinha dois\n\noutro");
    expect(blocks[0]).toEqual({ type: "paragraph", text: "linha um linha dois" });
  });
});

describe("parseInline", () => {
  it("splits bold segments", () => {
    expect(parseInline("texto **forte** fim")).toEqual([
      { bold: false, text: "texto " },
      { bold: true, text: "forte" },
      { bold: false, text: " fim" },
    ]);
  });
});

describe("documentSections", () => {
  it("reports section titles with the sheet where they appear", () => {
    const pages = [
      [{ block: { type: "heading", level: 1, text: "Introdução" } as const }],
      [{ block: { type: "heading", level: 2, text: "Metodologia" } as const }],
    ];
    expect(documentSections(pages)).toEqual([
      { title: "Introdução", level: 1, page: 1 },
      { title: "Metodologia", level: 2, page: 2 },
    ]);
  });
});

describe("A4 geometry", () => {
  it("uses real A4 dimensions", () => {
    expect(A4.widthMm).toBe(210);
    expect(A4.heightMm).toBe(297);
    expect(A4_CONTENT_HEIGHT_MM).toBe(297 - 20 * 2);
  });

  it("converts millimetres to CSS pixels", () => {
    expect(Math.round(mmToPx(25.4))).toBe(96);
    expect(Math.round(mmToPx(210))).toBe(794);
  });
});

describe("paginateBlocks", () => {
  it("keeps blocks on a sheet while they fit and opens a new sheet when they don't", () => {
    // Altura útil de 100: dois blocos de 40 cabem; o terceiro abre folha nova.
    const pages = paginateBlocks([40, 40, 40], 100);
    expect(pages).toEqual([[0, 1], [2]]);
  });

  it("places an oversized block alone on its own sheet", () => {
    const pages = paginateBlocks([30, 250, 30], 100);
    expect(pages).toEqual([[0], [1], [2]]);
  });

  it("always returns at least one sheet", () => {
    expect(paginateBlocks([], 100)).toEqual([[]]);
  });
});

describe("page size rule", () => {
  it("counts words and flags pages below the minimum", () => {
    const short = "Uma frase curta.";
    expect(countWords(short)).toBeLessThan(MIN_PAGE_WORDS);
    const long = Array.from({ length: MIN_PAGE_WORDS + 10 }, () => "palavra").join(" ");
    expect(countWords(long)).toBeGreaterThanOrEqual(MIN_PAGE_WORDS);
  });
});
