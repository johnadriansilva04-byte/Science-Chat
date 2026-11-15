import { describe, expect, it } from "vitest";
import {
  countWords,
  dedupeParagraphs,
  MIN_PAGE_WORDS,
  normalizePageText,
  pickLongerText,
} from "@/lib/article-page";

describe("countWords", () => {
  it("conta palavras ignorando espaços extras", () => {
    expect(countWords("  uma   duas três ")).toBe(3);
  });
});

describe("pickLongerText", () => {
  it("prefere a segunda versão quando é mais longa", () => {
    expect(pickLongerText("curta", "uma versão bem mais longa que a outra")).toBe(
      "uma versão bem mais longa que a outra",
    );
  });

  it("mantém a primeira quando a nova tentativa encolheu", () => {
    expect(pickLongerText("texto original mais longo aqui", "curta")).toBe(
      "texto original mais longo aqui",
    );
  });

  it("desempata pela primeira em caso de mesmo tamanho", () => {
    expect(pickLongerText("mesma coisa", "outra coisa")).toBe("mesma coisa");
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
    const out = dedupeParagraphs(
      "Primeiro argumento longo e distinto sobre o tema.\n\nSegundo argumento totalmente diferente aqui.",
    );
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

describe("normalizePageText", () => {
  it("quebra um bloco gigante em parágrafos", () => {
    const sentences = [
      "O trabalho remoto cresceu no setor de tecnologia após a pandemia de COVID-19.",
      "As equipes de software passaram a colaborar à distância com ferramentas digitais.",
      "Esse arranjo levanta dúvidas sobre produtividade individual e inovação coletiva.",
      "A produtividade individual mede a entrega de cada profissional no seu ritmo.",
      "A inovação coletiva depende da troca informal de conhecimento entre colegas.",
      "Este artigo investiga esses dois efeitos em equipes de software brasileiras.",
    ];
    const out = normalizePageText(sentences.join(" "));
    expect(out.split("\n\n").length).toBeGreaterThan(1);
    expect(out).toContain("produtividade individual");
  });

  it("remove frases quase repetidas dentro do bloco", () => {
    const repeated =
      "A justificativa deste estudo é compreender como o trabalho remoto impacta a produtividade das equipes de software no contexto brasileiro. A justificativa deste estudo é compreender como o trabalho remoto impacta a produtividade das equipes de software no contexto brasileiro.";
    const out = normalizePageText(repeated);
    const count = (out.match(/justificativa deste estudo/gi) ?? []).length;
    expect(count).toBe(1);
  });

  it("preserva títulos e parágrafos já bem formados", () => {
    const text =
      "## Introdução\n\nUm parágrafo curto e legível que já está bem dividido no texto original.";
    expect(normalizePageText(text)).toBe(text);
  });
});
