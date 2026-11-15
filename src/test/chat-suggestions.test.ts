import { describe, expect, it } from "vitest";
import { suggestReplies } from "@/lib/chat-suggestions";

describe("suggestReplies", () => {
  it("oferece opções de natureza da pesquisa", () => {
    const out = suggestReplies("Qual é a natureza da pesquisa: teórica ou empírica?");
    expect(out[0]).toBe("É teórica");
    expect(out).toContain("É empírica");
  });

  it("propõe títulos quando a pergunta é sobre o título", () => {
    expect(suggestReplies("Qual título você quer para o artigo?")).toContain("Sugira 3 títulos");
  });

  it("propõe pesquisar referências", () => {
    expect(suggestReplies("Precisamos de literatura sobre o tema?")).toContain(
      "Pesquise referências",
    );
  });

  it("mantém as saídas de emergência quando não reconhece a pergunta", () => {
    const out = suggestReplies("Conte mais sobre o seu cotidiano.");
    expect(out).toEqual(["Não se aplica", "Ainda não sei", "Pular"]);
  });

  it("devolve só as saídas quando não há pergunta", () => {
    expect(suggestReplies(null)).toContain("Pular");
    expect(suggestReplies(undefined)).toHaveLength(3);
  });

  it("limita a quatro opções e remove duplicatas", () => {
    const out = suggestReplies("Qual a natureza da pesquisa?");
    expect(out.length).toBeLessThanOrEqual(4);
    expect(new Set(out).size).toBe(out.length);
  });

  it("ignora acentos e maiúsculas", () => {
    expect(suggestReplies("QUAL O DESTINO EDITORIAL?")).toContain("Revista nacional");
  });
});

describe("sugestões de ensino (mentoria)", () => {
  it("oferece ver exemplos quando a pergunta é sobre palavras-chave", () => {
    expect(suggestReplies("Quais palavras-chave você sugere?")).toContain("Ver exemplos");
  });

  it("oferece aprovar/ajustar quando o Pracinha mostra a estrutura", () => {
    const out = suggestReplies("Veja a estrutura do artigo. O que achou das seções?");
    expect(out).toContain("Aprovar estrutura");
    expect(out).toContain("Quero ajustar");
  });

  it("confirma o recapitulado da pesquisa", () => {
    expect(suggestReplies("Entendi sua pesquisa: é sobre X. Está certo?")).toContain("Sim, é isso");
  });
});
