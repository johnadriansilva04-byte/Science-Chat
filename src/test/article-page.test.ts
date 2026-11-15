import { describe, expect, it } from "vitest";
import { countWords, dedupeParagraphs, MIN_PAGE_WORDS } from "@/lib/article-page";

describe("countWords", () => {
  it("conta palavras ignorando espaços extras", () => {
    expect(countWords("  uma   duas três ")).toBe(3);
  });
});

describe("dedupeParagraphs", () => {
  it("remove parágrafos repetidos (quase idênticos)", () => {
    const p1 =
      "A violência institucional é um fenômeno complexo que afeta a vida de muitas pessoas e grupos vulneráveis.";
    const p2 =
      "A violência institucional é um fenômeno complexo que afeta a vida de muitas pessoas, grupos vulneráveis e cidadãos.";
    const out = dedupeParagraphs([p1, p2, p1].join("\n\n"));
    expect(out.split("\n\n")).toHaveLength(1);
  });

  it("preserva parágrafos distintos", () => {
    const out = dedupeParagraphs("Primeiro argumento longo e distinto sobre o tema.\n\nSegundo argumento totalmente diferente aqui.");
    expect(out.split("\n\n")).toHaveLength(2);
  });

  it("preserva títulos, mesmo repetidos", () => {
    const out = dedupeParagraphs("## Metodologia\n\n## Metodologia");
    expect(out).toBe("## Metodologia\n\n## Metodologia");
  });

  it("não remove parágrafos curtos iguais", () => {
    const out = dedupeParagraphs("Sim.\n\nSim.");
    expect(out.split("\n\n")).toHaveLength(2);
  });

  it("respeita o mínimo de palavras da página", () => {
    expect(MIN_PAGE_WORDS).toBe(400);
  });
});
