import { describe, expect, it } from "vitest";

import { isLastPage, stripMarkers } from "@/lib/article-marker";
import {
  ARTICLE_SIGNATURE,
  assembleMarkdown,
  markdownToPlainText,
  slugify,
} from "@/lib/article-export";

describe("article markers", () => {
  it("detects the last-page marker", () => {
    expect(isLastPage("texto final <!--ULTIMA-->")).toBe(true);
    expect(isLastPage("texto comum")).toBe(false);
  });

  it("strips the marker without touching the content", () => {
    expect(stripMarkers("Conclusão.\n<!--ULTIMA-->")).toBe("Conclusão.");
  });
});

describe("assembleMarkdown", () => {
  const pages = [
    { page_number: 2, content: "Segunda página.", status: "approved" },
    { page_number: 1, content: "Primeira página.", status: "approved" },
    { page_number: 3, content: "Rascunho não aprovado.", status: "draft" },
  ];

  it("joins approved pages in order and ignores drafts", () => {
    const md = assembleMarkdown("Meu artigo", pages);
    expect(md).toContain("# Meu artigo");
    expect(md.indexOf("Primeira página.")).toBeLessThan(md.indexOf("Segunda página."));
    expect(md).not.toContain("Rascunho não aprovado.");
  });

  it("falls back to a default title", () => {
    expect(assembleMarkdown("   ", []).startsWith("# Artigo científico")).toBe(true);
  });

  it("does not duplicate the title when the first page already has the H1", () => {
    const withHeading = [
      {
        page_number: 1,
        content: "# Meu artigo\n\n## Introdução\n\nTexto.",
        status: "approved",
      },
    ];
    const md = assembleMarkdown("Meu artigo", withHeading);
    expect(md.match(/^#\s+Meu artigo$/gm) ?? []).toHaveLength(1);
  });

  it("appends the Variant signature at the end of the assembled document", () => {
    const md = assembleMarkdown("Meu artigo", pages);
    expect(md.trimEnd().endsWith(ARTICLE_SIGNATURE)).toBe(true);
  });

  it("omits the signature when there is no approved page", () => {
    expect(assembleMarkdown("Meu artigo", [])).not.toContain(ARTICLE_SIGNATURE);
  });
});

describe("markdownToPlainText", () => {
  it("removes heading and emphasis syntax", () => {
    const text = markdownToPlainText("## Título\n\nTexto **forte** e *ênfase*.\n\n- item");
    expect(text).not.toContain("#");
    expect(text).not.toContain("**");
    expect(text).toContain("Título");
    expect(text).toContain("forte");
    expect(text).toContain("• item");
  });
});

describe("slugify", () => {
  it("normalizes accents and spaces", () => {
    expect(slugify("Introdução à Pesquisa Científica")).toBe("introducao-a-pesquisa-cientifica");
  });

  it("falls back when there is nothing usable", () => {
    expect(slugify("***")).toBe("artigo");
  });
});
