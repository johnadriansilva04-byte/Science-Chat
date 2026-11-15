import { describe, expect, it } from "vitest";
import {
  SECTION_GUIDE,
  SECTION_GUIDE_ORDER,
  protocolSteps,
  protocolText,
  sectionGuideText,
} from "@/lib/section-guide";

describe("guia das seções (modo ensino)", () => {
  it("cobre as partes essenciais do artigo, na ordem", () => {
    expect(SECTION_GUIDE_ORDER).toEqual([
      "titulo",
      "resumo",
      "palavras-chave",
      "introducao",
      "fundamentacao",
      "metodologia",
      "resultados",
      "discussao",
      "conclusao",
      "referencias",
    ]);
  });

  it("cada parte explica o porquê e traz um exemplo", () => {
    for (const s of SECTION_GUIDE) {
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.why.length).toBeGreaterThan(20);
      expect(s.example.length).toBeGreaterThan(20);
    }
  });

  it("usa metáfora/linguagem direta em partes-chave", () => {
    const byKey = Object.fromEntries(SECTION_GUIDE.map((s) => [s.key, s]));
    expect(byKey["resumo"]?.why).toMatch(/trailer/i);
    expect(byKey["introducao"]?.why).toMatch(/funil/i);
    expect(byKey["palavras-chave"]?.why).toMatch(/encontrad/i);
  });

  it("numera o protocolo a partir de 1 e na ordem do guia", () => {
    const steps = protocolSteps();
    expect(steps[0]).toEqual({ n: 1, title: "Título" });
    expect(steps.map((s) => s.n)).toEqual(steps.map((_, i) => i + 1));
    expect(protocolText().startsWith("1. Título")).toBe(true);
  });

  it("gera o texto do guia para os prompts com 'por quê' e 'Exemplo'", () => {
    const text = sectionGuideText();
    expect(text).toContain("Título");
    expect(text).toContain("por quê:");
    expect(text).toContain("Exemplo:");
  });
});
