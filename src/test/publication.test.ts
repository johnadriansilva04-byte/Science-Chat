import { describe, expect, it } from "vitest";
import {
  assemblePublicationContent,
  contentHasAbstract,
  extractAbstract,
  extractKeywords,
  publicationCitation,
  yearOf,
} from "@/lib/publication";

const pages = [
  { page_number: 2, content: "Segunda página.", status: "approved" },
  { page_number: 1, content: "# Meu Título\n\nPrimeira página.", status: "approved" },
  { page_number: 3, content: "Rascunho ainda não aprovado.", status: "draft" },
];

describe("assemblePublicationContent", () => {
  it("junta apenas páginas aprovadas, em ordem, sem repetir o título", () => {
    const out = assemblePublicationContent("Meu Título", pages);
    expect(out.startsWith("# Meu Título")).toBe(true);
    expect(out).toContain("Primeira página.");
    expect(out).toContain("Segunda página.");
    expect(out).not.toContain("Rascunho");
    // só um H1 do título
    expect(out.match(/# Meu Título/g)?.length).toBe(1);
  });

  it("adiciona o título quando nenhuma página o traz", () => {
    const out = assemblePublicationContent("Título X", [
      { page_number: 1, content: "Só corpo.", status: "approved" },
    ]);
    expect(out.startsWith("# Título X")).toBe(true);
  });

  it("remove marcadores internos", () => {
    const out = assemblePublicationContent("T", [
      { page_number: 1, content: "# T\n\nFim.<!--ULTIMA-->", status: "approved" },
    ]);
    expect(out).not.toContain("ULTIMA");
  });
});

describe("extractAbstract / extractKeywords", () => {
  const md = `# Título

## Resumo

Este artigo discute a violência burocrática.

**Palavras-chave:** burocracia; violência; direitos

## Introdução

Texto.`;

  it("extrai o resumo", () => {
    expect(extractAbstract(md)).toContain("violência burocrática");
  });

  it("não inclui a linha de palavras-chave no resumo", () => {
    expect(extractAbstract(md)).not.toContain("burocracia; violência; direitos");
  });

  it("contentHasAbstract detecta a seção", () => {
    expect(contentHasAbstract(md)).toBe(true);
    expect(contentHasAbstract("# T\n\n## Introdução\n\nSó isso.")).toBe(false);
  });

  it("extrai as palavras-chave", () => {
    expect(extractKeywords(md)).toBe("burocracia; violência; direitos");
  });

  it("devolve null quando não há resumo", () => {
    expect(extractAbstract("# T\n\n## Introdução\n\nSó isso.")).toBeNull();
  });
});

describe("publicationCitation", () => {
  it("monta citação ABNT simplificada com DOI", () => {
    const c = publicationCitation({
      author_name: "Adrian, John",
      title: "La Máquina Mimada",
      year: "2026",
      doi: "10.1/abc",
    });
    expect(c).toContain("ADRIAN, JOHN");
    expect(c).toContain("La Máquina Mimada");
    expect(c).toContain("2026");
    expect(c).toContain("DOI: 10.1/abc");
  });

  it("omite DOI quando ausente", () => {
    const c = publicationCitation({ author_name: "Silva", title: "X" });
    expect(c).not.toContain("DOI");
  });
});

describe("yearOf", () => {
  it("extrai o ano", () => {
    expect(yearOf("2026-11-11T12:00:00Z")).toBe("2026");
    expect(yearOf(null)).toBe("");
  });
});
