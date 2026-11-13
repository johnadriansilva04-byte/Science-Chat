import { describe, expect, it } from "vitest";
import {
  DEFAULT_EDITORIAL,
  destinationLabel,
  editorialSummary,
  formatReference,
  proposedStructure,
  requirementsFor,
  standardLabel,
  type EditorialConfig,
} from "@/lib/editorial";

describe("editorial: estrutura proposta", () => {
  it("pesquisa teórica dispensa metodologia e resultados", () => {
    const structure = proposedStructure({ destination: "independente", empirical: false });
    expect(structure).toContain("Introdução");
    expect(structure).not.toContain("Metodologia");
    expect(structure).not.toContain("Resultados");
  });

  it("pesquisa empírica mantém metodologia e resultados", () => {
    const structure = proposedStructure({ destination: "udelar", empirical: true });
    expect(structure).toContain("Metodologia");
    expect(structure).toContain("Resultados");
  });
});

describe("editorial: requisitos", () => {
  it("marca exigências da Udelar como 'a verificar', nunca como inventadas", () => {
    const config: EditorialConfig = { ...DEFAULT_EDITORIAL, destination: "udelar" };
    const reqs = requirementsFor(config);
    const toVerify = reqs.filter((r) => r.level === "verificar");
    expect(toVerify.length).toBeGreaterThan(0);
    expect(reqs.some((r) => r.label.includes("Diretrizes oficiais"))).toBe(true);
  });

  it("pesquisa independente não impõe exigências institucionais", () => {
    const reqs = requirementsFor({ ...DEFAULT_EDITORIAL, destination: "independente" });
    expect(reqs.some((r) => r.level === "verificar")).toBe(false);
    expect(reqs.some((r) => r.label.includes("Estrutura científica"))).toBe(true);
  });

  it("rotula destino e norma em português", () => {
    expect(destinationLabel("udelar")).toContain("Udelar");
    expect(standardLabel("abnt")).toBe("ABNT");
  });
});

describe("editorial: referências", () => {
  const ref = {
    authors: "SILVA, J.",
    year: 2020,
    title: "Uma obra",
    venue: "Revista Científica",
    doi: "10.1000/xyz",
    url: null,
  };

  it("formata em ABNT com ano e link", () => {
    const out = formatReference(ref, "abnt");
    expect(out).toContain("SILVA, J.");
    expect(out).toContain("2020");
    expect(out).toContain("https://doi.org/10.1000/xyz");
  });

  it("formata em APA com autor–data", () => {
    const out = formatReference(ref, "apa");
    expect(out).toContain("(2020)");
  });

  it("não inventa ano quando ausente", () => {
    const out = formatReference({ ...ref, year: null }, "abnt");
    expect(out).toContain("s.d.");
  });
});

describe("editorial: resumo", () => {
  it("avisa quando não há diretrizes registradas", () => {
    const summary = editorialSummary(DEFAULT_EDITORIAL);
    expect(summary).toContain("precisam ser verificadas");
  });

  it("mostra a data quando há diretrizes conferidas", () => {
    const summary = editorialSummary({
      ...DEFAULT_EDITORIAL,
      destination: "udelar",
      guidelines: "Instruções oficiais...",
      verified_at: "2026-01-02",
    });
    expect(summary).toContain("conferidas em 2026-01-02");
  });
});
