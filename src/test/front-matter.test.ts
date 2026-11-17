import { describe, expect, it } from "vitest";

import { parseBlocks, serializeBlocks, type Block } from "@/lib/article-blocks";
import {
  buildFrontMatter,
  DEFAULT_NATURE,
  frontMatterBlocks,
  frontMatterMarkdown,
  frontMatterSequence,
  numberSections,
  placeLine,
  resolveDocumentMeta,
} from "@/lib/front-matter";

describe("resolveDocumentMeta", () => {
  it("cai para o autor informado e para o ano corrente", () => {
    const meta = resolveDocumentMeta(null, "Maria Pesquisadora");
    expect(meta.author).toBe("Maria Pesquisadora");
    expect(meta.year).toBe(String(new Date().getFullYear()));
    expect(meta.nature).toBe(DEFAULT_NATURE);
    expect(meta.city).toBeNull();
  });

  it("preserva os campos informados e limpa espaços", () => {
    const meta = resolveDocumentMeta(
      { author: "  João  ", city: " Florianópolis ", year: "2026", institution: "UFSC" },
      "fallback",
    );
    expect(meta.author).toBe("João");
    expect(meta.city).toBe("Florianópolis");
    expect(meta.year).toBe("2026");
    expect(meta.institution).toBe("UFSC");
  });

  it("trata campos só com espaços como ausentes", () => {
    const meta = resolveDocumentMeta({ author: "   ", city: "  " }, "Ana");
    expect(meta.author).toBe("Ana");
    expect(meta.city).toBeNull();
  });
});

describe("placeLine", () => {
  it("monta CIDADE — ANO em caixa alta", () => {
    expect(placeLine("Florianópolis", "2026")).toBe("FLORIANÓPOLIS — 2026");
  });
  it("omite a parte ausente", () => {
    expect(placeLine(null, "2026")).toBe("2026");
    expect(placeLine("Recife", null)).toBe("RECIFE");
    expect(placeLine(null, null)).toBe("");
  });
});

describe("buildFrontMatter", () => {
  it("usa um título padrão quando vazio", () => {
    const fm = buildFrontMatter(resolveDocumentMeta(null, "Autor"), "   ");
    expect(fm.title).toBe("Artigo científico");
    expect(fm.author).toBe("Autor");
  });
});

describe("frontMatterBlocks / frontMatterSequence", () => {
  const fm = buildFrontMatter(
    resolveDocumentMeta({ author: "Autor", city: "São Paulo", year: "2026" }, "Autor"),
    "Título do trabalho",
  );

  it("gera capa e folha de rosto", () => {
    const blocks = frontMatterBlocks(fm);
    expect(blocks.map((b) => (b.type === "frontmatter" ? b.kind : b.type))).toEqual([
      "cover",
      "titlepage",
    ]);
  });

  it("a sequência inclui quebras de página para os formatos com layout", () => {
    const types = frontMatterSequence(fm).map((b) => b.type);
    expect(types).toEqual(["frontmatter", "pagebreak", "frontmatter", "pagebreak"]);
  });

  it("a folha de rosto carrega a nota de natureza", () => {
    const titlepage = frontMatterBlocks(fm)[1];
    expect(titlepage?.type === "frontmatter" && titlepage.nature).toBe(DEFAULT_NATURE);
  });

  it("o Markdown textual traz autor, título e local/ano", () => {
    const md = frontMatterMarkdown(fm);
    expect(md).toContain("Autor");
    expect(md).toContain("# Título do trabalho");
    expect(md).toContain("SÃO PAULO — 2026");
  });
});

describe("numberSections", () => {
  const md = [
    "# Título do trabalho",
    "",
    "## Introdução",
    "",
    "Texto.",
    "",
    "## Fundamentação",
    "",
    "### Conceitos",
    "",
    "Texto.",
    "",
    "## Conclusão",
  ].join("\n");

  it("numera as seções em progressão, sem numerar o título", () => {
    const out = numberSections(parseBlocks(md));
    const headings = out
      .filter((b) => b.type === "heading")
      .map((b) => (b as { text: string }).text);
    expect(headings).toEqual([
      "Título do trabalho",
      "1 Introdução",
      "2 Fundamentação",
      "2.1 Conceitos",
      "3 Conclusão",
    ]);
  });

  it("preserva títulos que já começam com número e continua a contagem", () => {
    const out = numberSections(
      parseBlocks(["# T", "", "## 1 Introdução", "", "## Metodologia"].join("\n")),
    );
    const headings = out
      .filter((b) => b.type === "heading")
      .map((b) => (b as { text: string }).text);
    expect(headings).toEqual(["T", "1 Introdução", "2 Metodologia"]);
  });

  it("numera corretamente quando não há título (só seções de nível 2)", () => {
    const out = numberSections(parseBlocks(["## Primeira", "", "## Segunda"].join("\n")));
    const headings = out
      .filter((b) => b.type === "heading")
      .map((b) => (b as { text: string }).text);
    expect(headings).toEqual(["1 Primeira", "2 Segunda"]);
  });

  it("é reversível à serialização sem perder o corpo", () => {
    const out = numberSections(parseBlocks(md));
    const serialized = serializeBlocks(out);
    expect(serialized).toContain("1 Introdução");
    expect(serialized).toContain("2.1 Conceitos");
    expect(serialized).toContain("Texto.");
  });

  it("não altera documentos sem títulos", () => {
    const blocks: Block[] = [{ type: "paragraph", text: "Só texto." }];
    expect(numberSections(blocks)).toEqual(blocks);
  });
});
