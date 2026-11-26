import { describe, expect, it } from "vitest";
import {
  buildMethodologyPromptBlock,
  CLOSING_SECTION,
  DEFAULT_FORMULA,
  DEFAULT_LEGEND,
  formatLegend,
  legendToJson,
  missingLegendSymbols,
  normalizeSymbol,
  parseLegend,
  symbolsInFormula,
  toPromptMethodology,
  withMethodologyPrompt,
  type Methodology,
} from "@/lib/methodology";

const reference: Methodology = {
  id: "m1",
  name: "Confronto documental",
  description: "Tese contra resposta estatal sobre a mesma realidade.",
  formula: DEFAULT_FORMULA,
  legend: DEFAULT_LEGEND,
  structureHint: "Fórmula em página própria; replicação com casos reais; fechamento.",
};

describe("metodologia: parsing da legenda", () => {
  it("lê a legenda em JSON estruturado", () => {
    const legend = parseLegend(
      JSON.stringify([
        { symbol: "A", meaning: "realidade factual" },
        { symbol: "D", meaning: "decisão" },
      ]),
    );
    expect(legend).toEqual([
      { symbol: "A", meaning: "realidade factual" },
      { symbol: "D", meaning: "decisão" },
    ]);
  });

  it("lê a legenda em objeto {símbolo: significado}", () => {
    const legend = parseLegend('{"A":"realidade factual","B₂":"resposta do Estado"}');
    expect(legend).toContainEqual({ symbol: "A", meaning: "realidade factual" });
    expect(legend).toContainEqual({ symbol: "B₂", meaning: "resposta do Estado" });
  });

  it("lê a legenda em texto livre, uma definição por linha ou por ponto e vírgula", () => {
    const legend = parseLegend("A = realidade factual\nB¹: tese do cidadão; D — decisão");
    expect(legend).toHaveLength(3);
    expect(legend[1]).toEqual({ symbol: "B¹", meaning: "tese do cidadão" });
    expect(legend[2]).toEqual({ symbol: "D", meaning: "decisão" });
  });

  it("não lança com JSON inválido: cai para texto livre", () => {
    expect(parseLegend('["A = realidade factual"')).toEqual([]);
    expect(parseLegend(null)).toEqual([]);
  });

  it("faz ida e volta pelo JSON gravado no banco", () => {
    const json = legendToJson(DEFAULT_LEGEND);
    expect(parseLegend(json)).toEqual(DEFAULT_LEGEND);
  });
});

describe("metodologia: símbolos da fórmula", () => {
  it("extrai os símbolos na ordem, sem repetir", () => {
    expect(symbolsInFormula("A + B¹/B₂ = D")).toEqual(["A", "B¹", "B₂", "D"]);
    expect(symbolsInFormula("T + O/E = R e R")).toEqual(["T", "O", "E", "R"]);
  });

  it("trata B¹ e B1 como o mesmo símbolo ao comparar", () => {
    expect(normalizeSymbol("B¹")).toBe(normalizeSymbol("B1"));
    expect(normalizeSymbol("b₂")).toBe(normalizeSymbol("B2"));
  });

  it("aponta símbolos da fórmula sem legenda", () => {
    expect(missingLegendSymbols("A + B¹/B₂ = D", [{ symbol: "A", meaning: "x" }])).toEqual([
      "B¹",
      "B₂",
      "D",
    ]);
    expect(missingLegendSymbols("A + B¹/B₂ = D", DEFAULT_LEGEND)).toEqual([]);
  });

  it("formata a legenda para exibição", () => {
    expect(formatLegend([{ symbol: "A", meaning: "realidade factual" }])).toBe(
      "A = realidade factual",
    );
  });
});

describe("metodologia: injeção no prompt", () => {
  it("não injeta nada quando não há metodologia", () => {
    expect(buildMethodologyPromptBlock(null)).toBe("");
    expect(
      buildMethodologyPromptBlock({
        name: "vazia",
        formula: "  ",
        legend: [],
        structureHint: null,
      }),
    ).toBe("");
    expect(withMethodologyPrompt("PROMPT", null)).toBe("PROMPT");
  });

  it("injeta fórmula, legenda e as regras de rigor do artigo de referência", () => {
    const block = buildMethodologyPromptBlock(reference);
    expect(block).toContain("METODOLOGIA DO PESQUISADOR");
    expect(block).toContain(DEFAULT_FORMULA);
    expect(block).toContain("A = realidade factual");
    expect(block).toContain("B¹ = tese ou prova apresentada pelo pesquisador");
    expect(block).toContain("B₂ = resposta ou omissão do Estado");
    // Harmonia dos símbolos entre seções.
    expect(block).toMatch(/em TODAS as seções/i);
    // Bloco próprio da fórmula com a legenda posicional.
    expect(block).toMatch(/página ou bloco próprio/i);
    // Replicação com exemplos reais do corpus documental.
    expect(block).toMatch(/replicação/i);
    expect(block).toMatch(/corpus documental/i);
    // Fechamento obrigatório.
    expect(block).toContain(CLOSING_SECTION);
    // Citação com página/seção exata da fonte primária.
    expect(block).toMatch(/fonte primária/i);
    expect(block).toMatch(/\[Anexo \d, p\. \d\]/);
  });

  it("obedece a uma fórmula do usuário, sem vazar os símbolos do modelo padrão", () => {
    const custom = buildMethodologyPromptBlock({
      name: "Tríade causal",
      description: "Causa, obstáculo e resultado.",
      formula: "T + O/E = R",
      legend: [
        { symbol: "T", meaning: "tese do pesquisador" },
        { symbol: "O", meaning: "obstáculo institucional" },
        { symbol: "E", meaning: "evidência documental" },
        { symbol: "R", meaning: "resultado observado" },
      ],
      structureHint: "Uma seção por confronto e fechamento próprio.",
    });
    expect(custom).toContain("T + O/E = R");
    expect(custom).toContain("O = obstáculo institucional");
    expect(custom).toContain("Uma seção por confronto e fechamento próprio.");
    expect(custom).not.toContain("B¹");
    expect(custom).not.toContain("B₂");
  });

  it("muda a orientação conforme a etapa (plano ou página)", () => {
    expect(buildMethodologyPromptBlock(reference, { stage: "plan" })).toMatch(
      /No plano, liste as seções/i,
    );
    expect(buildMethodologyPromptBlock(reference, { stage: "page" })).toMatch(
      /Na página que você escrever agora/i,
    );
  });

  it("anexa o bloco ao prompt preservando o texto original", () => {
    const injected = withMethodologyPrompt("PLANO APROVADO: ...", reference, { stage: "page" });
    expect(injected.startsWith("PLANO APROVADO: ...")).toBe(true);
    expect(injected).toContain("METODOLOGIA DO PESQUISADOR");
    expect(injected).toContain(DEFAULT_FORMULA);
  });

  it("converte a linha do banco (legenda em JSON) no insumo do prompt", () => {
    const input = toPromptMethodology({
      name: "Confronto documental",
      description: null,
      formula: DEFAULT_FORMULA,
      legend: legendToJson(DEFAULT_LEGEND),
      structure_hint: "Estrutura X",
    });
    expect(input.legend).toEqual(DEFAULT_LEGEND);
    expect(buildMethodologyPromptBlock(input)).toContain("B₂ = resposta ou omissão do Estado");
  });
});
