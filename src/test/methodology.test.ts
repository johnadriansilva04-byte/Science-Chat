import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  METHODOLOGY_SPEC_SECTIONS,
  methodologyLinkError,
  methodologyProtocolCode,
  methodologySpecBlock,
  methodologyTitleFromSeed,
  specCoverageRatio,
  specSectionCoverage,
  type MethodologyLike,
} from "@/lib/methodology";
import { buildPagePrompt } from "@/lib/article-page";

const APPROVED_SPEC = `## Tipo de estudo e justificativa
Estudo de caso instrumental (Stake).

## Instrumento analítico
Método Pracinha — A = fato empírico de documento primário; B = variáveis administrativas; D = ato decorrente.
`;

function methodology(overrides: Partial<MethodologyLike> = {}): MethodologyLike {
  return {
    id: "m1",
    user_id: "u1",
    status: "approved",
    content: APPROVED_SPEC,
    title: "Método do caso único",
    ...overrides,
  };
}

const PAGE_INPUT = {
  plan: "PLANO APROVADO DO ARTIGO",
  transcript: "ENTREVISTA DO ARTIGO",
  anexos: "",
  number: 3,
};

describe("methodologySpecBlock", () => {
  it("não injeta nada sem metodologia", () => {
    expect(methodologySpecBlock(null)).toBe("");
    expect(methodologySpecBlock(undefined)).toBe("");
  });

  it("não injeta uma metodologia em rascunho", () => {
    expect(methodologySpecBlock(methodology({ status: "draft" }))).toBe("");
  });

  it("não injeta metodologia aprovada sem conteúdo", () => {
    expect(methodologySpecBlock(methodology({ content: null }))).toBe("");
    expect(methodologySpecBlock(methodology({ content: "   " }))).toBe("");
  });

  it("injeta a spec aprovada com o cabeçalho do bloco", () => {
    const block = methodologySpecBlock(methodology());
    expect(block).toContain("METODOLOGIA APROVADA (spec vinculada)");
    expect(block).toContain("Método Pracinha");
  });
});

describe("buildPagePrompt — injeção da metodologia", () => {
  it("sem spec, o prompt é idêntico ao comportamento anterior", () => {
    const plain = buildPagePrompt(PAGE_INPUT);
    expect(buildPagePrompt({ ...PAGE_INPUT, methodologySpec: "" })).toBe(plain);
    expect(buildPagePrompt({ ...PAGE_INPUT, methodologySpec: undefined })).toBe(plain);
    expect(plain).not.toContain("METODOLOGIA APROVADA");
    expect(plain).toContain("PLANO APROVADO");
    expect(plain).toContain("ENTREVISTA");
  });

  it("uma metodologia em rascunho não altera o prompt", () => {
    const plain = buildPagePrompt(PAGE_INPUT);
    const withDraft = buildPagePrompt({
      ...PAGE_INPUT,
      methodologySpec: methodologySpecBlock(methodology({ status: "draft" })),
    });
    expect(withDraft).toBe(plain);
  });

  it("uma metodologia aprovada entra no prompt, depois do plano", () => {
    const prompt = buildPagePrompt({
      ...PAGE_INPUT,
      methodologySpec: methodologySpecBlock(methodology()),
    });
    expect(prompt).toContain("METODOLOGIA APROVADA (spec vinculada)");
    expect(prompt).toContain("Método Pracinha");
    expect(prompt.indexOf("METODOLOGIA APROVADA")).toBeGreaterThan(
      prompt.indexOf("PLANO APROVADO"),
    );
  });
});

describe("methodologyLinkError — vínculo artigo ↔ metodologia", () => {
  it("recusa metodologia inexistente", () => {
    expect(methodologyLinkError(null, "u1")).toBe("Metodologia não encontrada");
  });

  it("recusa metodologia de outro pesquisador", () => {
    expect(methodologyLinkError(methodology({ user_id: "u2" }), "u1")).toBe(
      "Esta metodologia não é sua",
    );
  });

  it("recusa metodologia em rascunho", () => {
    expect(methodologyLinkError(methodology({ status: "draft" }), "u1")).toBe(
      "A metodologia precisa estar aprovada antes de ser vinculada",
    );
  });

  it("aceita metodologia aprovada do mesmo pesquisador", () => {
    expect(methodologyLinkError(methodology(), "u1")).toBeNull();
  });
});

describe("cobertura das sete seções da spec", () => {
  it("reconhece as seções por título de Markdown", () => {
    const coverage = specSectionCoverage(APPROVED_SPEC);
    const present = coverage.filter((c) => c.present).map((c) => c.section);
    expect(present).toContain("Tipo de estudo e justificativa");
    expect(present).toContain("Instrumento analítico");
    expect(present).not.toContain("Limitações");
  });

  it("reconhece seções escritas sem Markdown", () => {
    const coverage = specSectionCoverage(
      "Tipo de estudo: documental. Corpus e fontes: autos. Limitações: caso único.",
    );
    expect(coverage.every((c) => c.present)).toBe(false);
    expect(coverage.find((c) => c.section === "Limitações")?.present).toBe(true);
  });

  it("devolve as sete seções fixas, na ordem", () => {
    const coverage = specSectionCoverage("");
    expect(coverage.map((c) => c.section)).toEqual([...METHODOLOGY_SPEC_SECTIONS]);
    expect(specCoverageRatio("")).toBe(0);
  });
});

describe("identidade do caderno", () => {
  it("gera um código de protocolo estável e legível", () => {
    const code = methodologyProtocolCode("abc123");
    expect(code).toMatch(/^PROT-[0-9A-F]{6}$/);
    expect(methodologyProtocolCode("abc123")).toBe(code);
    expect(methodologyProtocolCode("outro")).not.toBe(code);
  });

  it("usa a semente como título sem inventar método", () => {
    expect(methodologyTitleFromSeed("  Análise   documental  ")).toBe("Análise documental");
    expect(methodologyTitleFromSeed("")).toBe("Metodologia sem título");
    expect(methodologyTitleFromSeed(undefined)).toBe("Metodologia sem título");
  });
});

describe("migration 0007_methodologies.sql", () => {
  const sql = readFileSync(join(process.cwd(), "migrations", "0007_methodologies.sql"), "utf8");

  it("cria as tabelas da metodologia como entidade própria", () => {
    expect(sql).toMatch(/create\s+table\s+if\s+not\s+exists\s+methodologies/i);
    expect(sql).toMatch(/create\s+table\s+if\s+not\s+exists\s+methodology_messages/i);
    expect(sql).toMatch(/create\s+table\s+if\s+not\s+exists\s+methodology_documents/i);
  });

  it("acopla o artigo com vínculo opcional e reversível", () => {
    expect(sql).toMatch(
      /alter\s+table\s+articles\s+add\s+column\s+methodology_id\s+text\s+references\s+methodologies\(id\)\s+on\s+delete\s+set\s+null/i,
    );
  });

  it("apaga mensagens e documentos junto com a metodologia", () => {
    expect(sql).toMatch(
      /methodology_id\s+text\s+not\s+null\s+references\s+methodologies\(id\)\s+on\s+delete\s+cascade/i,
    );
  });
});
