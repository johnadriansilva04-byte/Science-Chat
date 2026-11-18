import { describe, expect, it } from "vitest";

import { parseBlocks, serializeBlocks, type Block } from "@/lib/article-blocks";
import {
  buildFrontMatter,
  DEFAULT_NATURE,
  frontMatterBlocks,
  frontMatterMarkdown,
  frontMatterSequence,
  isValidOrcid,
  mergeDocumentMeta,
  normalizeOrcid,
  numberSections,
  orcidUrl,
  placeLine,
  resolveDocumentMeta,
} from "@/lib/front-matter";

describe("ORCID", () => {
  it("normaliza para o formato canônico", () => {
    expect(normalizeOrcid("0000000218250097")).toBe("0000-0002-1825-0097");
    expect(normalizeOrcid("0000 0002 1825 0097")).toBe("0000-0002-1825-0097");
    expect(normalizeOrcid("")).toBeNull();
    expect(normalizeOrcid(null)).toBeNull();
  });

  it("valida o dígito verificador (ISO 7064 MOD 11-2)", () => {
    expect(isValidOrcid("0000-0002-1825-0097")).toBe(true);
    expect(isValidOrcid("0000000218250097")).toBe(true);
    expect(isValidOrcid("0000-0002-1825-0098")).toBe(false);
    expect(isValidOrcid("123")).toBe(false);
    expect(isValidOrcid("")).toBe(false);
  });

  it("monta a URL pública", () => {
    expect(orcidUrl("0000-0002-1825-0097")).toBe("https://orcid.org/0000-0002-1825-0097");
  });
});

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

describe("mergeDocumentMeta", () => {
  it("preserva o ORCID existente quando o formulário não o traz", () => {
    const merged = mergeDocumentMeta(
      { author: "João", city: "Niterói" },
      { orcid: "0000-0002-1825-0097" },
    );
    expect(merged.orcid).toBe("0000-0002-1825-0097");
    expect(merged.author).toBe("João");
  });

  it("o ORCID do formulário vence o já gravado", () => {
    const merged = mergeDocumentMeta(
      { orcid: "0000-0002-1825-0097" },
      { orcid: "0000-0001-5109-3700" },
    );
    expect(merged.orcid).toBe("0000-0002-1825-0097");
  });

  it("vira null quando não há ORCID em nenhum lado", () => {
    expect(mergeDocumentMeta({ author: "Ana" }, null).orcid).toBeNull();
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

  it("leva o ORCID para a folha de rosto e para o Markdown quando informado", () => {
    const withOrcid = buildFrontMatter(
      resolveDocumentMeta({ author: "Autor", orcid: "0000000218250097" }, "Autor"),
      "Título do trabalho",
    );
    const titlepage = frontMatterBlocks(withOrcid)[1];
    expect(titlepage?.type === "frontmatter" && titlepage.orcid).toBe("0000-0002-1825-0097");
    expect(frontMatterMarkdown(withOrcid)).toContain("ORCID: 0000-0002-1825-0097");
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
