import { describe, expect, it } from "vitest";
import {
  auditArticle,
  auditSummary,
  hypothesisAsFact,
  overgeneralizations,
  pendingData,
  pendingReferences,
  repeatedSentences,
} from "@/lib/audit";

const pages = [
  {
    page_number: 1,
    status: "approved",
    content:
      "# Meu artigo\n\n## Introdução\n\nContexto do problema investigado neste trabalho científico.",
  },
  {
    page_number: 2,
    status: "approved",
    content:
      "## Conclusão\n\nConcluímos que a hipótese se sustenta nos dados. Todos os casos confirmam o padrão observado.",
  },
  {
    page_number: 3,
    status: "approved",
    content: "## Referências\n\nSILVA, J. Obra citada. Editora, 2020.",
  },
];

describe("auditoria: integridade textual", () => {
  it("detecta citações pendentes e dados pendentes", () => {
    expect(pendingReferences("Como diz [REFERÊNCIA A CONFIRMAR], o dado é X.")).toHaveLength(1);
    expect(pendingData("Faltou [PENDENTE: valor da amostra] aqui.")).toHaveLength(1);
  });

  it("encontra frases repetidas entre páginas", () => {
    const repeats = repeatedSentences([
      {
        page_number: 1,
        content: "Esta é uma frase longa o suficiente para repetir entre páginas.",
      },
      {
        page_number: 2,
        content: "Esta é uma frase longa o suficiente para repetir entre páginas.",
      },
    ]);
    expect(repeats).toHaveLength(1);
    expect(repeats[0]?.pages).toEqual([1, 2]);
  });

  it("detecta generalizações absolutas", () => {
    expect(overgeneralizations("Todos os participantes sempre responderam igual.").length).toBe(1);
  });

  it("detecta hipótese apresentada como fato", () => {
    const text =
      "Poderia ser possível que o efeito exista, e o estudo provou que é fato consumado.";
    expect(hypothesisAsFact(text).length).toBe(1);
  });
});

describe("auditoria: relatório", () => {
  it("não acusa seções ausentes quando elas existem", () => {
    const result = auditArticle({ title: "Meu artigo", pages });
    const ids = result.findings.map((f) => f.id);
    expect(ids).not.toContain("secoes-faltando");
  });

  it("aponta generalização e resume por severidade", () => {
    const result = auditArticle({ title: "Meu artigo", pages });
    expect(result.findings.some((f) => f.id === "generalizacoes")).toBe(true);
    expect(result.report).toContain("# Relatório de auditoria científica");
    expect(auditSummary(result)).toMatch(/alta|média|baixa|Sem achados/);
  });

  it("não transforma ausência de documento em acusação de falsidade", () => {
    const result = auditArticle({
      title: "Meu artigo",
      pages,
      claims: [
        { seq: 1, text: "afirmação sem prova", category: "resultado", state: "nao_localizada" },
      ],
      documentCount: 1,
    });
    const finding = result.findings.find((f) => f.id === "afirmacoes-sem-prova");
    expect(finding).toBeDefined();
    expect(finding?.detail).toContain("NÃO significa que sejam falsas");
  });

  it("sinaliza contradição como severidade alta", () => {
    const result = auditArticle({
      title: "Meu artigo",
      pages,
      claims: [{ seq: 1, text: "x", category: "resultado", state: "contradita" }],
      documentCount: 1,
    });
    expect(result.findings.find((f) => f.id === "afirmacoes-contraditas")?.severity).toBe("alta");
  });
});
