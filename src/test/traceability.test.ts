import { describe, expect, it } from "vitest";
import {
  bestExcerpt,
  buildMatrix,
  claimStateFor,
  exemptFromEvidence,
  extractClaims,
  guessCategory,
  looksContradicted,
  matchDegree,
  overlapRatio,
  significantTokens,
  stateCounts,
  type ClaimState,
} from "@/lib/traceability";

describe("rastreabilidade: classificação", () => {
  it("não trata ausência de documento como falsidade", () => {
    // Sem documento, uma afirmação de resultado fica "não verificável" — nunca falsa.
    expect(claimStateFor({ category: "resultado", degree: "nenhuma", hasDocument: false })).toBe(
      "nao_verificavel",
    );
    // Com documento, mas sem trecho localizado, fica "não localizada".
    expect(claimStateFor({ category: "resultado", degree: "nenhuma", hasDocument: true })).toBe(
      "nao_localizada",
    );
  });

  it("respeita categorias que dispensam prova documental direta", () => {
    expect(exemptFromEvidence("hipotese")).toBe(true);
    expect(exemptFromEvidence("tese")).toBe(true);
    expect(exemptFromEvidence("resultado")).toBe(false);
    expect(claimStateFor({ category: "hipotese", degree: "nenhuma", hasDocument: false })).toBe(
      "hipotese_em_investigacao",
    );
    expect(claimStateFor({ category: "contribuicao", degree: "nenhuma", hasDocument: false })).toBe(
      "contribuicao_original",
    );
  });

  it("mapeia o grau de correspondência para o estado", () => {
    expect(claimStateFor({ category: "dado", degree: "direta", hasDocument: true })).toBe(
      "sustentada",
    );
    expect(claimStateFor({ category: "dado", degree: "parcial", hasDocument: true })).toBe(
      "parcialmente_sustentada",
    );
    expect(claimStateFor({ category: "dado", degree: "indireta", hasDocument: true })).toBe(
      "indiretamente_sustentada",
    );
    expect(
      claimStateFor({ category: "dado", degree: "direta", hasDocument: true, contradicted: true }),
    ).toBe("contradita");
  });

  it("mede sobreposição de termos e gradua", () => {
    const ratio = overlapRatio(
      "o experimento apresentou aumento de trinta e cinco por cento",
      "o experimento apresentou um aumento de trinta e cinco por cento no resultado",
    );
    expect(ratio).toBeGreaterThan(0.5);
    expect(matchDegree(0.8)).toBe("direta");
    expect(matchDegree(0.5)).toBe("parcial");
    expect(matchDegree(0.25)).toBe("indireta");
    expect(matchDegree(0.05)).toBe("nenhuma");
  });

  it("ignora palavras curtas e stopwords nos termos significativos", () => {
    const tokens = significantTokens("sobre os dados experimentais com amostra");
    expect(tokens.has("dados")).toBe(true);
    expect(tokens.has("experimentais")).toBe(true);
    expect(tokens.has("sobre")).toBe(false);
    expect(tokens.has("com")).toBe(false);
  });

  it("escolhe o melhor trecho do documento", () => {
    const doc =
      "Este trabalho discute metodologia. O experimento apresentou aumento de trinta e cinco por cento no desempenho. Outro assunto qualquer entra aqui.";
    const { excerpt, ratio } = bestExcerpt(
      "o experimento apresentou aumento de trinta e cinco por cento",
      doc,
    );
    expect(excerpt).toContain("trinta e cinco por cento");
    expect(ratio).toBeGreaterThan(0.5);
  });

  it("sinaliza contradição de direção sem declarar falso", () => {
    expect(looksContradicted("houve aumento de 35%", "observou-se redução de 20%")).toBe(true);
    expect(looksContradicted("houve aumento de 35%", "confirmou-se o aumento")).toBe(false);
  });
});

describe("rastreabilidade: extração de afirmações", () => {
  it("ignora respostas de pulo e curtas demais", () => {
    const claims = extractClaims([
      { question: "Qual o resultado?", answer: "Pular" },
      { question: "Qual o método?", answer: "Curto" },
    ]);
    expect(claims.length).toBe(0);
  });

  it("extrai afirmações de respostas substantivas com categoria provável", () => {
    const claims = extractClaims([
      {
        question: "Qual o resultado do experimento?",
        answer:
          "O experimento apresentou um aumento de 35% no desempenho do sistema. Os dados vieram de 200 execuções controladas.",
      },
    ]);
    expect(claims.length).toBeGreaterThan(0);
    expect(claims[0]?.category).toBe("resultado");
    expect(claims[0]?.question).toContain("resultado");
  });

  it("reconhece categorias por palavra-chave", () => {
    expect(guessCategory("Minha hipótese é que existe relação causal")).toBe("hipotese");
    expect(guessCategory("A amostra foi coletada com questionário")).toBe("metodo");
    expect(guessCategory("A planilha contém a série histórica")).toBe("dado");
  });
});

describe("rastreabilidade: matriz", () => {
  it("agrupa evidências por afirmação e conta estados", () => {
    const claims = [
      {
        id: "c1",
        seq: 1,
        text: "a",
        category: "resultado" as const,
        state: "sustentada" as ClaimState,
        source_question: null,
        limitations: null,
      },
      {
        id: "c2",
        seq: 2,
        text: "b",
        category: "hipotese" as const,
        state: "hipotese_em_investigacao" as ClaimState,
        source_question: null,
        limitations: null,
      },
    ];
    const evidence = [
      {
        claim_id: "c1",
        document_id: "d1",
        location: "Anexo 1",
        excerpt: "trecho",
        match_degree: "direta" as const,
        state: "sustentada",
      },
    ];
    const rows = buildMatrix(claims, evidence);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.evidence).toHaveLength(1);
    expect(rows[1]?.evidence).toHaveLength(0);
    const counts = stateCounts(rows);
    expect(counts.sustentada).toBe(1);
    expect(counts.hipotese_em_investigacao).toBe(1);
  });
});
